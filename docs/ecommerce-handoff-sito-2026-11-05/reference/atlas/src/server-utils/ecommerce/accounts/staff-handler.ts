import "server-only";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import {
  commerceErrorResponse,
  commerceJson,
  commerceRequestId,
  CommerceServiceError,
} from "@evolve/ecommerce-server/identity";
import { withCommerceTransaction } from "@evolve/ecommerce-server/persistence";
import {
  requireCommerceStaffApi,
  type CommerceStaffPrincipal,
} from "../staff-auth";
import { readCommerceStaffMutation } from "../staff-request";
import {
  getAtlasCommerceStorage,
  type AtlasCommerceStorage,
} from "../persistence/atlas-storage";
import { integer, objectWithKeys, text } from "../catalog/validation";
import UserModel from "@/server-utils/models/User";
import type { CommerceAccountRow } from "./types";
import { profileIdentityHash } from "../customers/identity";

const fail = (status: number, code: string, message: string): never => {
  throw new CommerceServiceError(status, code, message);
};
const objectId = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/.test(value))
    fail(400, "INVALID_INPUT", "Profilo non valido.");
  return new mongoose.Types.ObjectId(value as string);
};
function row(profile: any, access: any, link?: any): CommerceAccountRow {
  return {
    id: String(profile._id),
    name: profile.displayName || "",
    email: profile.verifiedEmail,
    kind: profile.kind,
    verifiedAt: profile.verifiedAt.toISOString(),
    status: access?.status || "unavailable",
    accessVersion: access?.accessVersion ?? 0,
    ...(link === undefined
      ? {}
      : {
          customerLinkStatus:
            link?.status === "blocked"
              ? "blocked"
              : link &&
                  link.profileIdentityHash !==
                    profileIdentityHash(process.env.ECOMMERCE_SHOP_ID!, profile)
                ? "review_required"
                : link?.status || "pending",
        }),
  };
}
export async function reauthenticateCommerceStaff(
  storage: AtlasCommerceStorage,
  staff: CommerceStaffPrincipal,
  password: unknown,
  shopId: string,
  requestId: string,
) {
  if (
    typeof password !== "string" ||
    !password ||
    Buffer.byteLength(password, "utf8") > 512
  )
    fail(400, "INVALID_INPUT", "Inserisci la tua password Atlas.");
  // Private, atomic bucket. It stores only the staff ID and time window, never a password.
  const filter = {
    shopId,
    key: `staff-reauth:${staff.userId}:${Math.floor(Date.now() / 900000)}`,
  };
  let bucket;
  try {
    bucket = await storage.internal.counters.findOneAndUpdate(
      filter,
      { $inc: { value: 1, revision: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    bucket = await storage.internal.counters.findOneAndUpdate(
      filter,
      { $inc: { value: 1, revision: 1 } },
      { new: true },
    );
  }
  if (!bucket || bucket.value > 10)
    fail(
      429,
      "STAFF_REAUTH_LIMITED",
      "Troppi tentativi. Attendi prima di riprovare.",
    );
  // Only the CURRENT staff member's hash is read through the existing Atlas connection.
  const user = await UserModel.findOne({
    _id: staff.userId,
    approved: true,
    role: staff.role,
  })
    .select("+password")
    .lean();
  if (
    !user?.password ||
    !(await bcrypt.compare(password as string, user.password))
  ) {
    await new storage.internal.auditEvents({
      shopId,
      actor: { kind: "staff", id: staff.userId, requestId },
      action: "identity.staff_reauth_failed",
      objectType: "staff",
      objectId: staff.userId,
      outcome: "rejected",
      occurredAt: new Date(),
    }).save();
    fail(
      403,
      "STAFF_REAUTH_REQUIRED",
      "Conferma la tua password Atlas corrente.",
    );
  }
}
export async function staffAccountsHandler(
  request: Request,
  operation: "list" | "access",
  id?: string,
) {
  const requestId = commerceRequestId();
  try {
    const staff = await requireCommerceStaffApi(
      operation === "list"
        ? "ecommerce.accounts.view"
        : "ecommerce.accounts.suspend",
    );
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some(
        (key) =>
          operation !== "list" ||
          !["email", "cursor"].includes(key) ||
          params.getAll(key).length !== 1,
      )
    )
      fail(400, "INVALID_QUERY", "Parametri non validi.");
    const storage = await getAtlasCommerceStorage(),
      shopId = process.env.ECOMMERCE_SHOP_ID!;
    const { accountProfiles, accountAccess, authAudit } = storage.storefront;
    if (operation === "list") {
      const search = params.has("email")
        ? text(params.get("email"), 254).toLowerCase()
        : undefined;
      const profiles = await accountProfiles
        .find({
          shopId,
          ...(search ? { verifiedEmail: search } : {}),
          ...(params.has("cursor")
            ? { _id: { $gt: objectId(params.get("cursor")) } }
            : {}),
        })
        .sort({ _id: 1 })
        .limit(51)
        .lean();
      const page = profiles.slice(0, 50),
        access = await accountAccess
          .find({
            shopId,
            accountId: { $in: page.map((profile: any) => profile.accountId) },
          })
          .lean();
      const byAccount = new Map<string, any>(
        access.map((entry: any): [string, any] => [
          String(entry.accountId),
          entry,
        ]),
      );
      const links = await storage.internal.customerLinks
        .find({
          shopId,
          accountId: { $in: page.map((profile: any) => profile.accountId) },
        })
        .lean();
      const byLink = new Map<string, any>(
        links.map((link: any): [string, any] => [String(link.accountId), link]),
      );
      return commerceJson(
        {
          items: page.map((profile: any) =>
            row(
              profile,
              byAccount.get(String(profile.accountId)),
              byLink.get(String(profile.accountId)) || null,
            ),
          ),
          nextCursor: profiles.length > 50 ? String(page.at(-1)!._id) : null,
        },
        { requestId },
      );
    }
    const body = objectWithKeys(await readCommerceStaffMutation(request), [
      "status",
      "expectedAccessVersion",
      "reason",
      "currentPassword",
    ]);
    if (body.status !== "active" && body.status !== "suspended")
      fail(400, "INVALID_INPUT", "Stato di accesso non valido.");
    const expected = integer(body.expectedAccessVersion),
      reason = text(body.reason, 80),
      profileId = objectId(id);
    if (/[\u0000-\u001f\u007f]/.test(reason))
      fail(400, "INVALID_INPUT", "Motivazione non valida.");
    await reauthenticateCommerceStaff(
      storage,
      staff,
      body.currentPassword,
      shopId,
      requestId,
    );
    const result = await withCommerceTransaction(
      storage.coreConnection,
      async (session) => {
        const profile = await accountProfiles
          .findOne({ _id: profileId, shopId })
          .session(session)
          .lean();
        if (!profile) fail(404, "NOT_FOUND", "Profilo non disponibile.");
        const changed = await accountAccess
          .findOneAndUpdate(
            {
              shopId,
              accountId: profile!.accountId,
              accessVersion: expected,
              status: { $in: ["active", "suspended"] },
            },
            {
              $set: { status: body.status, reasonCode: reason },
              $inc: { accessVersion: 1, revision: 1, guard: 1 },
            },
            { session, new: true },
          )
          .lean();
        if (!changed)
          fail(
            409,
            "ACCESS_CHANGED",
            "L’accesso è stato modificato. Ricarica il profilo.",
          );
        await new authAudit({
          shopId,
          accountId: profile!.accountId,
          event:
            body.status === "suspended"
              ? "access_suspended"
              : "access_restored",
          actorKind: "staff",
          actorId: staff.userId,
          requestId,
          outcome: "succeeded",
          occurredAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 86400000),
        }).save({ session });
        await new storage.internal.auditEvents({
          shopId,
          actor: { kind: "staff", id: staff.userId, requestId },
          action: `identity.access_${body.status}`,
          objectType: "storefront_account",
          objectId: String(profile!.accountId),
          outcome: "succeeded",
          reasonCode: reason,
          occurredAt: new Date(),
        }).save({ session });
        return row(profile, changed);
      },
    );
    return commerceJson({ account: result }, { requestId });
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
