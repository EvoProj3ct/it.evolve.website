import "server-only";
import mongoose from "mongoose";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
import {
  replaceCommerceRecord,
  claimCommerceJob,
  finishCommerceJob,
  reapExhaustedCommerceJobs,
  type CommerceActor,
} from "@evolve/ecommerce-server/persistence";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import {
  appendCommerceAudit,
  insertCommerceCustomer,
} from "../persistence/core-adapters";
import { withCustomerRegistryLock } from "../persistence/customer-registry";
import {
  canonical,
  emailHash,
  profileIdentityHash,
  customerIdentityHash,
  escaped,
  CUSTOMER_FIELDS,
  customerSummary,
  safePublicLink,
} from "./identity";

type Tx = AtlasCommerceTransaction;
const error = (status: number, code: string, message: string): never => {
  throw new CommerceServiceError(status, code, message);
};
export interface CustomerLinkIdentity {
  accountId: string;
  accessVersion: number;
}
async function identity(tx: Tx, accountId: string, accessVersion?: number) {
  const access = await tx.storefront.accountAccess
    .findOneAndUpdate(
      {
        shopId: tx.shopId,
        accountId,
        status: "active",
        ...(accessVersion === undefined ? {} : { accessVersion }),
      },
      { $inc: { guard: 1, revision: 1 } },
      { session: tx.session, new: true },
    )
    .lean();
  const profile = access
    ? await tx.storefront.accountProfiles
        .findOne({ shopId: tx.shopId, accountId })
        .session(tx.session)
        .lean()
    : null;
  if (!profile)
    error(401, "ACCOUNT_UNAVAILABLE", "Profilo del negozio non disponibile.");
  return profile;
}
async function candidates(tx: Tx, email: string) {
  // Broader than exact equality: legacy arrays/multiple addresses/near matches require review.
  return tx.core.customers
    .find({ "data.email": new RegExp(escaped(email), "i") })
    .select(CUSTOMER_FIELDS)
    .limit(21)
    .session(tx.session)
    .lean();
}
async function currentLink(tx: Tx, accountId: string) {
  return tx.internal.customerLinks
    .findOne({ shopId: tx.shopId, accountId })
    .session(tx.session)
    .lean();
}
async function saveLink(
  tx: Tx,
  profile: any,
  previous: any,
  patch: Record<string, unknown>,
) {
  const change = {
    profileIdentityHash: profileIdentityHash(tx.shopId, profile),
    verifiedEmailHash: emailHash(tx.shopId, profile.verifiedEmail),
    actor: tx.actor,
    ...patch,
  };
  const result = previous
    ? await replaceCommerceRecord(
        tx.internal.customerLinks,
        {
          shopId: tx.shopId,
          id: String(previous._id),
          expectedRevision: previous.revision,
        },
        change,
        tx.session,
      )
    : await new tx.internal.customerLinks({
        shopId: tx.shopId,
        accountId: profile.accountId,
        ...change,
      }).save({ session: tx.session });
  await appendCommerceAudit(tx, {
    action: `customer_link.${result.status}`,
    objectType: "storefront_account",
    objectId: String(profile.accountId),
    outcome: "succeeded",
    reasonCode: result.evidenceCode,
  });
  return result.toObject();
}
const clearBinding = {
  customerId: undefined,
  customerIdentityHash: undefined,
  linkedAt: undefined,
  source: undefined,
};
async function review(tx: Tx, profile: any, link: any, code: string) {
  return saveLink(tx, profile, link, {
    ...clearBinding,
    status: link?.status === "blocked" ? "blocked" : "review_required",
    evidenceCode: link?.status === "blocked" ? link.evidenceCode : code,
    reviewCandidateId: link?.customerId || link?.reviewCandidateId,
  });
}
async function bind(
  tx: Tx,
  profile: any,
  link: any,
  customer: any,
  source: string,
  evidenceCode: string,
) {
  return saveLink(tx, profile, link, {
    status: "linked",
    customerId: customer._id,
    customerIdentityHash: customerIdentityHash(customer),
    source,
    evidenceCode,
    linkedAt: new Date(),
    reviewCandidateId: undefined,
  });
}
async function bindingValid(tx: Tx, profile: any, link: any) {
  if (
    !link?.customerId ||
    link.profileIdentityHash !== profileIdentityHash(tx.shopId, profile)
  )
    return false;
  const customer = await tx.core.customers
    .findById(link.customerId)
    .select(CUSTOMER_FIELDS)
    .session(tx.session)
    .lean();
  if (!customer || link.customerIdentityHash !== customerIdentityHash(customer))
    return false;
  if (String(link.source).startsWith("automatic_")) {
    const matches = await candidates(tx, profile.verifiedEmail);
    if (matches.length !== 1 || String(matches[0]._id) !== String(customer._id))
      return false;
  }
  return true;
}
/** Must run with the core registry lock held, in the common cross-db transaction. */
async function autoResolve(tx: Tx, profile: any, reconsider = false) {
  const accountId = String(profile.accountId),
    link = await currentLink(tx, accountId),
    proof = profileIdentityHash(tx.shopId, profile);
  if (link?.status === "blocked") {
    return link.profileIdentityHash === proof
      ? link
      : review(tx, profile, link, "PROFILE_CHANGED");
  }
  if (link && link.profileIdentityHash !== proof)
    return review(tx, profile, link, "VERIFIED_IDENTITY_CHANGED");
  if (link?.status === "linked")
    return (await bindingValid(tx, profile, link))
      ? link
      : review(tx, profile, link, "CUSTOMER_CHANGED");
  if (
    link?.status === "review_required" &&
    (!reconsider ||
      link.reviewCandidateId ||
      ["LEGACY_BINDING_REVIEW", "VERIFIED_IDENTITY_CHANGED"].includes(
        link.evidenceCode,
      ))
  )
    return link;
  const matches = await candidates(tx, profile.verifiedEmail);
  if (profile.kind !== "individual")
    return review(tx, profile, link, "COMPANY_AUTHORIZATION_REQUIRED");
  if (matches.length > 1)
    return review(tx, profile, link, "AMBIGUOUS_CUSTOMERS");
  if (matches.length === 1) {
    const record = matches[0];
    if (
      typeof record.data.email !== "string" ||
      record.data.email.trim().toLowerCase() !== profile.verifiedEmail ||
      record.data.tipoCliente !== "privato" ||
      !canonical(profile.displayName) ||
      canonical(record.data.ragioneSociale) !== canonical(profile.displayName)
    )
      return review(tx, profile, link, "PROFILE_MISMATCH");
    return bind(
      tx,
      profile,
      link,
      record,
      "automatic_existing",
      "UNIQUE_VERIFIED_PRIVATE",
    );
  }
  if (!profile.displayName?.trim() || profile.verifiedEmail.length > 200)
    return review(tx, profile, link, "CUSTOMER_DATA_REQUIRED");
  // Global core guard + per-email commerce guard + unique origin make retries/concurrency safe.
  await tx.internal.customerClaims.findOneAndUpdate(
    {
      shopId: tx.shopId,
      identityHash: emailHash(tx.shopId, profile.verifiedEmail),
    },
    { $inc: { guard: 1, revision: 1 } },
    { session: tx.session, upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const created = await insertCommerceCustomer(tx, {
    accountId,
    name: profile.displayName,
    verifiedEmail: profile.verifiedEmail,
    kind: "individual",
  });
  return bind(
    tx,
    profile,
    link,
    created,
    "automatic_created",
    "NO_CUSTOMER_MATCH",
  );
}
export async function customerLinkForSite(
  principal: CustomerLinkIdentity,
  requestId: string,
  resolve: boolean,
) {
  return withAtlasCommerceTransaction(
    { kind: "customer", id: principal.accountId, requestId },
    (tx) =>
      withCustomerRegistryLock(tx.coreConnection, tx.session, async () => {
        const profile = await identity(
          tx,
          principal.accountId,
          principal.accessVersion,
        );
        const link = resolve
          ? await autoResolve(tx, profile)
          : await currentLink(tx, principal.accountId);
        const valid =
          link?.status !== "linked" || (await bindingValid(tx, profile, link));
        return safePublicLink(
          link,
          profileIdentityHash(tx.shopId, profile),
          valid,
        );
      }),
  );
}
/** Commercial guard only: the caller must authenticate the session/command separately.
 * Future quote/order work runs inside this guard; a stored customerId is never authority. */
export async function withLinkedCommerceCustomer<T>(
  tx: Tx,
  principal: CustomerLinkIdentity,
  work: (customerId: mongoose.Types.ObjectId) => Promise<T>,
): Promise<T> {
  if (tx.actor.kind === "customer" && tx.actor.id !== principal.accountId)
    error(403, "ACCOUNT_MISMATCH", "Operazione non consentita.");
  return withCustomerRegistryLock(tx.coreConnection, tx.session, async () => {
    const profile = await identity(
        tx,
        principal.accountId,
        principal.accessVersion,
      ),
      link = await currentLink(tx, principal.accountId);
    if (link?.status !== "linked" || !(await bindingValid(tx, profile, link)))
      error(
        409,
        "CUSTOMER_REVIEW_REQUIRED",
        "Il profilo commerciale richiede una verifica dell’assistenza.",
      );
    const changed = await tx.internal.customerLinks.updateOne(
      {
        _id: link!._id,
        shopId: tx.shopId,
        revision: link!.revision,
        status: "linked",
      },
      { $inc: { guard: 1 } },
      { session: tx.session },
    );
    if (changed.matchedCount !== 1)
      error(
        409,
        "CUSTOMER_LINK_CHANGED",
        "Profilo commerciale modificato. Riprova.",
      );
    return work(link!.customerId);
  });
}
export async function reconcileCustomerIdentities(requestId: string) {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID!;
  // Anti-join jobs rather than a high-water cursor: late commits cannot be skipped.
  const events = await storage.storefront.identityEvents
    .aggregate([
      { $match: { shopId } },
      {
        $lookup: {
          from: "commerce_identity_jobs",
          let: { event: "$_id" },
          pipeline: [
            { $match: { shopId, $expr: { $eq: ["$eventId", "$$event"] } } },
            { $limit: 1 },
          ],
          as: "job",
        },
      },
      { $match: { "job.0": { $exists: false } } },
      { $sort: { _id: 1 } },
      { $limit: 20 },
      { $project: { _id: 1, accountId: 1 } },
    ])
    .option({ maxTimeMS: 5000 });
  let planned = 0,
    processed = 0,
    deferred = 0,
    failed = 0;
  for (const event of events) {
    try {
      await new storage.internal.identityJobs({
        shopId,
        eventId: event._id,
        accountId: event.accountId,
        availableAt: new Date(),
      }).save();
      planned++;
    } catch (reason: any) {
      if (reason?.code !== 11000) throw reason;
    }
  }
  await reapExhaustedCommerceJobs(storage.internal.identityJobs, { shopId });
  for (let index = 0; index < 10; index++) {
    const job = await claimCommerceJob(storage.internal.identityJobs, {
      shopId,
      workerId: "customer-identity",
      leaseMs: 30000,
    });
    if (!job) break;
    const key = {
      shopId,
      id: String(job._id),
      expectedRevision: job.revision,
      leaseToken: job.lease.token,
    };
    try {
      await withAtlasCommerceTransaction(
        { kind: "system", id: "customer-identity-worker", requestId },
        (tx) =>
          withCustomerRegistryLock(tx.coreConnection, tx.session, async () => {
            if (
              !(await tx.internal.identityReceipts
                .exists({ shopId, eventId: job.eventId })
                .session(tx.session))
            ) {
              const profile = await identity(tx, String(job.accountId));
              await autoResolve(tx, profile);
              await new tx.internal.identityReceipts({
                shopId,
                eventId: job.eventId,
                accountId: job.accountId,
                profileIdentityHash: profileIdentityHash(shopId, profile),
              }).save({ session: tx.session });
            }
            await finishCommerceJob(
              tx.internal.identityJobs,
              key,
              { state: "succeeded" },
              tx.session,
            );
          }),
      );
      processed++;
    } catch (reason) {
      const unavailable =
        reason instanceof CommerceServiceError &&
        reason.code === "ACCOUNT_UNAVAILABLE";
      try {
        await withAtlasCommerceTransaction(
          { kind: "system", id: "customer-identity-worker", requestId },
          (tx) =>
            finishCommerceJob(
              tx.internal.identityJobs,
              key,
              {
                state: job.attempts >= 10 ? "dead" : "failed",
                errorCode: unavailable
                  ? "ACCOUNT_UNAVAILABLE"
                  : "IDENTITY_PROCESSING_FAILED",
                availableAt: new Date(
                  Date.now() +
                    (unavailable
                      ? 3600000
                      : Math.min(3600000, 15000 * 2 ** job.attempts)),
                ),
              },
              tx.session,
            ),
        );
      } catch {
        /* Another worker may have reclaimed the expired lease; never overwrite its result. */
      }
      if (unavailable) deferred++;
      else failed++;
    }
  }
  return { planned, processed, deferred, failed };
}
export async function staffCustomerLinkDetails(profileId: string, query = "") {
  const storage = await getAtlasCommerceStorage(),
    shopId = process.env.ECOMMERCE_SHOP_ID!;
  const profile = await storage.storefront.accountProfiles
    .findOne({ shopId, _id: profileId })
    .lean();
  if (!profile) error(404, "NOT_FOUND", "Profilo non disponibile.");
  const link = await storage.internal.customerLinks
    .findOne({ shopId, accountId: profile!.accountId })
    .lean();
  const records = await storage.core.customers
    .find(
      query
        ? {
            $or: [
              { "data.email": new RegExp(escaped(query), "i") },
              { "data.ragioneSociale": new RegExp(escaped(query), "i") },
            ],
          }
        : { "data.email": new RegExp(escaped(profile!.verifiedEmail), "i") },
    )
    .select(CUSTOMER_FIELDS)
    .sort({ _id: 1 })
    .limit(21)
    .maxTimeMS(5000)
    .lean();
  const linked = link?.customerId
    ? await storage.core.customers
        .findById(link.customerId)
        .select(CUSTOMER_FIELDS)
        .lean()
    : null;
  const previous = link?.reviewCandidateId
    ? await storage.core.customers
        .findById(link.reviewCandidateId)
        .select(CUSTOMER_FIELDS)
        .lean()
    : null;
  return {
    profile: {
      id: profileId,
      name: profile!.displayName || "",
      email: profile!.verifiedEmail,
      kind: profile!.kind,
      identityHash: profileIdentityHash(shopId, profile),
    },
    link: {
      status: link?.status || "pending",
      revision: link?.revision ?? null,
      evidenceCode: link?.evidenceCode || "",
      profileChanged:
        !!link &&
        link.profileIdentityHash !== profileIdentityHash(shopId, profile),
      customerChanged:
        (!!linked &&
          link?.customerIdentityHash !== customerIdentityHash(linked)) ||
        (!!link?.customerId && !linked),
    },
    linkedCustomer: linked ? customerSummary(linked) : null,
    previousCandidate: previous ? customerSummary(previous) : null,
    candidates: records.slice(0, 20).map(customerSummary),
    moreCandidates: records.length > 20,
  };
}
export interface StaffCustomerResolution {
  action: "existing" | "create" | "block" | "retry";
  expectedRevision: number | null;
  expectedProfileHash: string;
  reason: string;
  customerId?: string;
  expectedCustomerHash?: string;
  draft?: {
    name: string;
    kind: "individual" | "company";
    taxCode?: string;
    vatNumber?: string;
  };
}
export async function resolveCustomerByStaff(
  actor: CommerceActor,
  profileId: string,
  input: StaffCustomerResolution,
) {
  return withAtlasCommerceTransaction(actor, (tx) =>
    withCustomerRegistryLock(tx.coreConnection, tx.session, async () => {
      const profile = await tx.storefront.accountProfiles
        .findOne({ shopId: tx.shopId, _id: profileId })
        .session(tx.session)
        .lean();
      if (!profile) error(404, "NOT_FOUND", "Profilo non disponibile.");
      await identity(tx, String(profile!.accountId));
      const link = await currentLink(tx, String(profile!.accountId));
      if (
        (link?.revision ?? null) !== input.expectedRevision ||
        profileIdentityHash(tx.shopId, profile) !== input.expectedProfileHash
      )
        error(
          409,
          "CUSTOMER_LINK_CHANGED",
          "Profilo o collegamento modificato. Ricarica i dati.",
        );
      if (input.action === "retry") {
        await autoResolve(tx, profile, true);
        await appendCommerceAudit(tx, {
          action: "customer_link.reconsidered",
          objectType: "storefront_account",
          objectId: String(profile!.accountId),
          outcome: "succeeded",
          reasonCode: input.reason,
        });
        return { message: "Valutazione aggiornata." };
      }
      if (input.action === "block") {
        await saveLink(tx, profile, link, {
          ...clearBinding,
          status: "blocked",
          evidenceCode: input.reason,
          reviewCandidateId: link?.customerId || link?.reviewCandidateId,
        });
        return { message: "Collegamento commerciale bloccato." };
      }
      let customer;
      if (input.action === "existing") {
        customer = await tx.core.customers
          .findById(input.customerId)
          .select(CUSTOMER_FIELDS)
          .session(tx.session)
          .lean();
        if (
          !customer ||
          customerIdentityHash(customer) !== input.expectedCustomerHash
        )
          error(
            409,
            "CUSTOMER_CHANGED",
            "Cliente modificato o non disponibile. Ricarica i dati.",
          );
      } else {
        const draft = input.draft!;
        if (draft.kind !== profile!.kind)
          error(
            400,
            "CUSTOMER_KIND_MISMATCH",
            "Il tipo cliente deve corrispondere al profilo verificato.",
          );
        const matches = await candidates(tx, profile!.verifiedEmail);
        if (
          matches.some(
            (record) =>
              typeof record.data.email !== "string" ||
              record.data.email.trim().toLowerCase() === profile!.verifiedEmail,
          ) ||
          matches.length > 20
        )
          error(
            409,
            "CUSTOMER_MATCH_EXISTS",
            "Esiste già una corrispondenza. Verifica e scegli l’anagrafica esistente.",
          );
        if (profile!.verifiedEmail.length > 200)
          error(
            400,
            "CUSTOMER_DATA_REQUIRED",
            "Email oltre il limite dell’anagrafica Clienti.",
          );
        customer = await insertCommerceCustomer(tx, {
          ...draft,
          accountId: String(profile!.accountId),
          verifiedEmail: profile!.verifiedEmail,
        });
      }
      await bind(
        tx,
        profile,
        link,
        customer,
        input.action === "existing" ? "staff_existing" : "staff_created",
        input.reason,
      );
      return { message: "Collegamento commerciale confermato." };
    }),
  );
}
