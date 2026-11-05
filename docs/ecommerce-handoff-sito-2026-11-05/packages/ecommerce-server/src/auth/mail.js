import { randomUUID } from "node:crypto";
import { CommerceServiceError, configurationError } from "../errors.js";
import {
  AUTH_TTL,
  opaque,
  hashToken,
  sealMail,
  openMail,
  secretEqual,
  email,
  boundedBody,
} from "./security.js";

export function mailTransportConfig(env) {
  const apiKey = env.ECOMMERCE_AUTH_RESEND_API_KEY,
    from = env.ECOMMERCE_AUTH_MAIL_FROM;
  if (
    typeof apiKey !== "string" ||
    !/^re_[A-Za-z0-9_-]+$/.test(apiKey) ||
    typeof from !== "string" ||
    from.length > 254
  )
    throw configurationError();
  try {
    if (email(from) !== from) throw new Error();
  } catch {
    throw configurationError();
  }
  return { apiKey, from };
}
export async function queueNotice(
  runtime,
  account,
  kind,
  destination,
  requestId,
  session,
  token,
  tokenId,
) {
  mailTransportConfig(runtime.env); // Do not silently accept requests into an unconfigured email pipeline.
  const publicId = randomUUID(),
    payload = { to: destination, ...(token ? { token } : {}) };
  await new runtime.models.authDeliveries({
    shopId: runtime.shopId,
    publicId,
    accountId: account._id,
    kind,
    ...(tokenId ? { tokenId } : {}),
    credentialVersion: account.credentialVersion,
    envelope: sealMail(runtime.env, runtime.config, publicId, payload),
    availableAt: new Date(),
    deliverBy: new Date(Date.now() + 15 * 60000),
    expiresAt: new Date(Date.now() + 7 * 86400000),
  }).save({ session });
}
export async function issueToken(
  runtime,
  account,
  purpose,
  requestId,
  session,
  targetEmail,
) {
  const access = await runtime.models.accountAccess
    .findOne({
      shopId: runtime.shopId,
      accountId: account._id,
      status: "active",
    })
    .session(session)
    .lean();
  if (!access)
    throw new CommerceServiceError(
      401,
      "SESSION_INVALID",
      "Account non disponibile.",
    );
  await runtime.models.authTokens.updateMany(
    {
      shopId: runtime.shopId,
      accountId: account._id,
      purpose,
      consumedAt: { $exists: false },
    },
    { $set: { consumedAt: new Date() }, $inc: { revision: 1 } },
    { session },
  );
  const raw = opaque(),
    record = await new runtime.models.authTokens({
      shopId: runtime.shopId,
      accountId: account._id,
      tokenHash: hashToken(runtime.config, `token:${purpose}`, raw),
      purpose,
      credentialVersion: account.credentialVersion,
      accessVersion: access.accessVersion,
      ...(targetEmail ? { targetEmail } : {}),
      expiresAt: new Date(Date.now() + AUTH_TTL[purpose] * 1000),
    }).save({ session });
  await queueNotice(
    runtime,
    account,
    purpose,
    targetEmail || account.emailNormalized,
    requestId,
    session,
    raw,
    record._id,
  );
}
function message(config, job, payload) {
  const name = "Il tuo negozio";
  const templates = {
    verify_email: {
      subject: "Conferma il tuo account del negozio",
      path: "/account/verify-email",
      description:
        "Apri il link e conferma la password scelta alla registrazione. Se non hai richiesto questo account, ignora il messaggio.",
    },
    reset_password: {
      subject: "Recupero password del negozio",
      path: "/account/reset-password",
      description:
        "Apri il link per scegliere una nuova password. Se non hai richiesto il recupero, ignora il messaggio.",
    },
    change_email: {
      subject: "Conferma il nuovo indirizzo email",
      path: "/account/confirm-email",
      description:
        "Apri il link e conferma dall’account del negozio con la tua password corrente.",
    },
    email_changed_notice: {
      subject: "Indirizzo email del negozio modificato",
      description:
        "L’indirizzo di accesso del tuo account è stato modificato. Se non riconosci l’operazione, contatta l’assistenza del sito.",
    },
    password_changed_notice: {
      subject: "Password del negozio modificata",
      description:
        "La password del tuo account è stata modificata e le sessioni precedenti sono state revocate. Se non riconosci l’operazione, richiedi subito il recupero dal sito.",
    },
  };
  const template = templates[job.kind];
  if (!template) throw new Error("AUTH_MAIL_TEMPLATE_INVALID");
  return {
    subject: template.subject,
    text: `${name}\n\n${template.description}${template.path ? `\n\n${config.origin}${template.path}#token=${payload.token}` : ""}\n\nMessaggio di servizio. Non rispondere con password o codici.`,
  };
}
export function authorizeMailDelivery(request, env) {
  const expected = env.ECOMMERCE_AUTH_DELIVERY_SECRET,
    actual = request.headers.get("authorization") || "";
  if (
    typeof expected !== "string" ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(expected) ||
    expected === env.NEXTAUTH_SECRET
  )
    throw configurationError();
  if (!secretEqual(actual, `Bearer ${expected}`))
    throw new CommerceServiceError(
      401,
      "MAIL_SERVICE_REQUIRED",
      "Servizio non autorizzato.",
    );
  if (request.headers.has("origin"))
    throw new CommerceServiceError(
      403,
      "MAIL_SERVICE_REQUIRED",
      "Canale riservato ai servizi.",
    );
}
/** A caller-triggered worker. No provider call is made by register/reset or by importing this module. */
export async function deliverPendingMail(runtime, limit = 5) {
  const { apiKey, from } = mailTransportConfig(runtime.env);
  let sent = 0,
    skipped = 0,
    failed = 0;
  for (let index = 0; index < Math.min(limit, 10); index++) {
    const now = new Date(),
      leaseToken = randomUUID();
    const job = await runtime.models.authDeliveries
      .findOneAndUpdate(
        {
          shopId: runtime.shopId,
          attempts: { $lt: 5 },
          deliverBy: { $gt: now },
          $or: [
            { state: "pending", availableAt: { $lte: now } },
            { state: "running", leaseUntil: { $lte: now } },
          ],
        },
        {
          $set: {
            state: "running",
            leaseToken,
            leaseUntil: new Date(Date.now() + 60000),
          },
          $inc: { attempts: 1, revision: 1 },
        },
        { new: true, sort: { availableAt: 1, _id: 1 } },
      )
      .select("+envelope")
      .lean();
    if (!job) break;
    const filter = {
      _id: job._id,
      shopId: runtime.shopId,
      state: "running",
      leaseToken,
      leaseUntil: { $gt: new Date() },
    };
    try {
      const account = await runtime.models.accounts
        .findOne({ _id: job.accountId, shopId: runtime.shopId })
        .lean();
      const token = job.tokenId
        ? await runtime.models.authTokens
            .findOne({
              _id: job.tokenId,
              shopId: runtime.shopId,
              expiresAt: { $gt: new Date() },
              consumedAt: { $exists: false },
            })
            .select("+tokenHash")
            .lean()
        : null;
      const access = job.tokenId
        ? await runtime.models.accountAccess
            .findOne({
              shopId: runtime.shopId,
              accountId: job.accountId,
              status: "active",
            })
            .lean()
        : null;
      if (
        !account ||
        (job.tokenId &&
          (!token ||
            !access ||
            token.accessVersion !== access.accessVersion ||
            token.credentialVersion !== account.credentialVersion ||
            job.credentialVersion !== account.credentialVersion))
      ) {
        await runtime.models.authDeliveries.updateOne(filter, {
          $set: { state: "dead", lastErrorCode: "TOKEN_OBSOLETE" },
          $unset: { envelope: 1, leaseToken: 1, leaseUntil: 1 },
          $inc: { revision: 1 },
        });
        skipped++;
        continue;
      }
      const payload = openMail(
        runtime.env,
        runtime.config,
        job.publicId,
        job.envelope,
      );
      payload.to = email(payload.to);
      if (
        job.tokenId &&
        (typeof payload.token !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(payload.token) ||
          token.purpose !== job.kind ||
          hashToken(runtime.config, `token:${job.kind}`, payload.token) !==
            token.tokenHash ||
          payload.to !== (token.targetEmail || account.emailNormalized))
      )
        throw new Error("AUTH_MAIL_PAYLOAD_INVALID");
      const content = message(runtime.config, job, payload);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `storefront-auth/${job.publicId}`,
        },
        body: JSON.stringify({
          from,
          to: [payload.to],
          subject: content.subject,
          text: content.text,
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("AUTH_MAIL_PROVIDER_REJECTED");
      }
      const data = JSON.parse(await boundedBody(response, 8192));
      if (
        typeof data.id !== "string" ||
        !data.id.trim() ||
        data.id.length > 200
      )
        throw new Error("AUTH_MAIL_PROVIDER_RESPONSE_INVALID");
      await runtime.models.authDeliveries.updateOne(filter, {
        $set: { state: "sent", providerId: data.id },
        $unset: { envelope: 1, leaseToken: 1, leaseUntil: 1, lastErrorCode: 1 },
        $inc: { revision: 1 },
      });
      sent++;
    } catch {
      await runtime.models.authDeliveries.updateOne(filter, {
        $set: {
          state: job.attempts >= 5 ? "dead" : "pending",
          lastErrorCode: "DELIVERY_FAILED",
          availableAt: new Date(
            Date.now() + Math.min(300000, 5000 * 2 ** job.attempts),
          ),
        },
        $unset: {
          leaseToken: 1,
          leaseUntil: 1,
          ...(job.attempts >= 5 ? { envelope: 1 } : {}),
        },
        $inc: { revision: 1 },
      });
      failed++;
    }
  }
  await runtime.models.authDeliveries.updateMany(
    {
      shopId: runtime.shopId,
      state: { $in: ["pending", "running"] },
      $or: [
        { deliverBy: { $lte: new Date() } },
        { attempts: { $gte: 5 }, leaseUntil: { $lte: new Date() } },
      ],
    },
    {
      $set: { state: "dead", lastErrorCode: "DELIVERY_EXPIRED" },
      $unset: { envelope: 1, leaseToken: 1, leaseUntil: 1 },
      $inc: { revision: 1 },
    },
  );
  return { sent, skipped, failed };
}
