import { randomUUID } from "node:crypto";
import { CommerceServiceError, configurationError } from "../errors.js";
import {
  AUTH_TTL,
  opaque,
  hashToken,
  authError,
  email,
  password,
  text,
  exact,
  hashPassword,
  verifyPassword,
  checkBreachedPassword,
} from "./security.js";
import {
  tx,
  audit,
  activeAccess,
  invalidCredentials,
  invalidLink,
  accountContext,
  publicProfile,
  revokeSessions,
  consumeAllTokens,
  publishVerifiedProfile,
} from "./runtime.js";
import { issueToken, queueNotice } from "./mail.js";
import { publishSessionAccess } from "./projections.js";

const GENERIC = {
  message:
    "Se la richiesta può essere completata, riceverai un’email con le istruzioni.",
};
const accountLock = async (runtime, account, session) => {
  const result = await runtime.models.accounts.updateOne(
    {
      _id: account._id,
      shopId: runtime.shopId,
      credentialVersion: account.credentialVersion,
    },
    { $inc: { revision: 1 } },
    { session },
  );
  if (result.matchedCount !== 1) invalidCredentials();
};
export async function register(runtime, body, requestId) {
  if (
    !runtime.env.ECOMMERCE_AUTH_TERMS_VERSION ||
    !runtime.env.ECOMMERCE_AUTH_PRIVACY_VERSION
  )
    throw configurationError();
  const input = exact(body, [
    "email",
    "password",
    "name",
    "kind",
    "termsVersion",
    "privacyVersion",
  ]);
  const normalized = email(input.email),
    chosen = password(input.password, true),
    name = text(input.name, 200);
  if (!["individual", "company"].includes(input.kind))
    authError(400, "INVALID_INPUT", "Scegli il tipo di account.");
  const termsVersion = text(input.termsVersion, 80),
    privacyVersion = text(input.privacyVersion, 80);
  if (
    termsVersion !== runtime.env.ECOMMERCE_AUTH_TERMS_VERSION ||
    privacyVersion !== runtime.env.ECOMMERCE_AUTH_PRIVACY_VERSION
  )
    authError(
      400,
      "TERMS_CHANGED",
      "Rileggi le informative aggiornate prima di continuare.",
    );
  await checkBreachedPassword(chosen);
  const encoded = await hashPassword(chosen);
  try {
    await tx(runtime, async (session) => {
      const existing = await runtime.models.accounts
        .findOne({ shopId: runtime.shopId, emailNormalized: normalized })
        .session(session)
        .lean();
      if (existing) {
        // Never replace a password based only on an unverified registration request.
        if (
          existing.status === "pending_verification" &&
          (await activeAccess(runtime, existing._id, session))
        ) {
          await accountLock(runtime, existing, session);
          await issueToken(
            runtime,
            existing,
            "verify_email",
            requestId,
            session,
          );
        }
        return;
      }
      const account = await new runtime.models.accounts({
        shopId: runtime.shopId,
        publicId: randomUUID(),
        emailNormalized: normalized,
        passwordHash: encoded,
      }).save({ session });
      await new runtime.models.registrationProfiles({
        shopId: runtime.shopId,
        accountId: account._id,
        displayName: name,
        kind: input.kind,
        termsVersion,
        privacyVersion,
        acceptedAt: new Date(),
      }).save({ session });
      await new runtime.models.accountAccess({
        shopId: runtime.shopId,
        accountId: account._id,
        status: "active",
        accessVersion: 0,
      }).save({ session });
      await issueToken(runtime, account, "verify_email", requestId, session);
      await audit(
        runtime,
        "registered",
        account._id,
        requestId,
        session,
        "anonymous",
      );
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  } // Concurrent registration must have the same public result.
  return GENERIC;
}
export async function requestMailToken(runtime, body, purpose, requestId) {
  const input = exact(body, ["email"]),
    normalized = email(input.email);
  await tx(runtime, async (session) => {
    const account = await runtime.models.accounts
      .findOne({ shopId: runtime.shopId, emailNormalized: normalized })
      .session(session)
      .lean();
    if (
      !account ||
      !["active", "pending_verification"].includes(account.status) ||
      (purpose === "verify_email" &&
        account.status !== "pending_verification") ||
      !(await activeAccess(runtime, account._id, session))
    )
      return;
    await accountLock(runtime, account, session);
    await issueToken(runtime, account, purpose, requestId, session);
  });
  return GENERIC;
}
async function tokenAccount(runtime, raw, purpose) {
  if (typeof raw !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(raw))
    invalidLink();
  const token = await runtime.models.authTokens
    .findOne({
      shopId: runtime.shopId,
      tokenHash: hashToken(runtime.config, `token:${purpose}`, raw),
      purpose,
      expiresAt: { $gt: new Date() },
      consumedAt: { $exists: false },
    })
    .lean();
  if (!token) invalidLink();
  const account = await runtime.models.accounts
    .findOne({
      _id: token.accountId,
      shopId: runtime.shopId,
      credentialVersion: token.credentialVersion,
    })
    .select("+passwordHash")
    .lean();
  if (
    !account?.publicId ||
    !["active", "pending_verification"].includes(account.status)
  )
    invalidLink();
  return { token, account };
}
async function claimToken(runtime, token, account, session) {
  const access = await activeAccess(runtime, account._id, session);
  if (!access || token.accessVersion !== access.accessVersion) invalidLink();
  const claimed = await runtime.models.authTokens.updateOne(
    {
      _id: token._id,
      shopId: runtime.shopId,
      credentialVersion: account.credentialVersion,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() }, $inc: { revision: 1 } },
    { session },
  );
  if (claimed.matchedCount !== 1) invalidLink();
  return access;
}
export async function verifyEmail(runtime, body, requestId) {
  const input = exact(body, ["token", "password"]),
    { token, account } = await tokenAccount(
      runtime,
      input.token,
      "verify_email",
    );
  if (!(await verifyPassword(password(input.password), account.passwordHash)))
    invalidLink();
  await tx(runtime, async (session) => {
    await claimToken(runtime, token, account, session);
    const result = await runtime.models.accounts.updateOne(
      {
        _id: account._id,
        shopId: runtime.shopId,
        status: "pending_verification",
        credentialVersion: token.credentialVersion,
      },
      {
        $set: { status: "active", verifiedAt: new Date() },
        $inc: { revision: 1, credentialVersion: 1 },
      },
      { session },
    );
    if (result.matchedCount !== 1) invalidLink();
    await consumeAllTokens(runtime, account._id, session);
    await revokeSessions(runtime, account._id, session);
    await publishVerifiedProfile(runtime, account, session, requestId);
    await audit(runtime, "verified", account._id, requestId, session);
  });
  return { message: "Email verificata. Ora puoi accedere al negozio." };
}
export async function login(runtime, body, requestId, networkHash) {
  const input = exact(body, ["email", "password"]),
    normalized = email(input.email),
    chosen = password(input.password);
  const observed = await runtime.models.accounts
    .findOne({ shopId: runtime.shopId, emailNormalized: normalized })
    .select("+passwordHash")
    .lean();
  const correct = await verifyPassword(chosen, observed?.passwordHash);
  if (!observed || !correct) {
    await audit(
      runtime,
      "login_failed",
      observed?._id,
      requestId,
      undefined,
      "anonymous",
      undefined,
      networkHash,
    );
    invalidCredentials();
  }
  return tx(runtime, async (session) => {
    const account = await runtime.models.accounts
      .findOne({
        _id: observed._id,
        shopId: runtime.shopId,
        credentialVersion: observed.credentialVersion,
        status: "active",
        verifiedAt: { $exists: true },
      })
      .session(session)
      .lean();
    const access = account
      ? await activeAccess(runtime, account._id, session)
      : null;
    const profile = account
      ? await runtime.models.accountProfiles
          .findOne({
            shopId: runtime.shopId,
            accountId: account._id,
            verifiedEmail: account.emailNormalized,
          })
          .session(session)
          .lean()
      : null;
    if (!account?.publicId || !access || !profile) invalidCredentials();
    await accountLock(runtime, account, session);
    const raw = opaque(),
      now = new Date();
    const storedSession = await new runtime.models.sessions({
      shopId: runtime.shopId,
      accountId: account._id,
      tokenHash: hashToken(runtime.config, "session", raw),
      credentialVersion: account.credentialVersion,
      accessVersion: access.accessVersion,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + AUTH_TTL.idle * 1000),
      absoluteExpiresAt: new Date(now.getTime() + AUTH_TTL.absolute * 1000),
    }).save({ session });
    await publishSessionAccess(runtime, storedSession, session, raw);
    await audit(
      runtime,
      "login_succeeded",
      account._id,
      requestId,
      session,
      "customer",
      String(account._id),
      networkHash,
    );
    return { raw, profile: publicProfile({ account, profile }) };
  }).catch(async (error) => {
    if (
      error instanceof CommerceServiceError &&
      error.code === "AUTH_INVALID_CREDENTIALS"
    ) {
      await audit(
        runtime,
        "login_failed",
        observed._id,
        requestId,
        undefined,
        "anonymous",
        undefined,
        networkHash,
      );
    }
    throw error;
  });
}
export async function resetPassword(runtime, body, requestId) {
  const input = exact(body, ["token", "newPassword"]),
    chosen = password(input.newPassword, true);
  const { token, account } = await tokenAccount(
    runtime,
    input.token,
    "reset_password",
  );
  await checkBreachedPassword(chosen);
  const encoded = await hashPassword(chosen);
  await tx(runtime, async (session) => {
    if (!["active", "pending_verification"].includes(account.status))
      invalidLink();
    await claimToken(runtime, token, account, session);
    const result = await runtime.models.accounts.updateOne(
      {
        _id: account._id,
        shopId: runtime.shopId,
        credentialVersion: token.credentialVersion,
        status: account.status,
      },
      {
        $set: {
          passwordHash: encoded,
          status: "active",
          verifiedAt: new Date(),
        },
        $inc: { revision: 1, credentialVersion: 1 },
      },
      { session },
    );
    if (result.matchedCount !== 1) invalidLink();
    await consumeAllTokens(runtime, account._id, session);
    await revokeSessions(runtime, account._id, session);
    if (account.status === "pending_verification")
      await publishVerifiedProfile(runtime, account, session, requestId);
    await queueNotice(
      runtime,
      { ...account, credentialVersion: account.credentialVersion + 1 },
      "password_changed_notice",
      account.emailNormalized,
      requestId,
      session,
    );
    await audit(runtime, "password_reset", account._id, requestId, session);
  });
  return { message: "Password aggiornata. Accedi nuovamente al negozio." };
}
async function reauthenticate(runtime, request, currentPassword) {
  const context = await accountContext(runtime, request);
  const credential = await runtime.models.accounts
    .findOne({ _id: context.account._id, shopId: runtime.shopId })
    .select("+passwordHash")
    .lean();
  if (
    !credential ||
    credential.credentialVersion !== context.account.credentialVersion ||
    !(await verifyPassword(password(currentPassword), credential.passwordHash))
  )
    invalidCredentials();
  return context;
}
export async function logout(runtime, request, body, all, requestId) {
  const input = exact(body, all ? ["currentPassword"] : []);
  let observed;
  try {
    observed = all
      ? await reauthenticate(runtime, request, input.currentPassword)
      : await accountContext(runtime, request);
  } catch (error) {
    if (!all && error instanceof CommerceServiceError && error.status === 401)
      return;
    throw error;
  }
  await tx(runtime, async (session) => {
    const current = await accountContext(runtime, request, session);
    if (
      current.account.credentialVersion !== observed.account.credentialVersion
    )
      invalidCredentials();
    if (all) {
      const changed = await runtime.models.accounts.updateOne(
        {
          _id: current.account._id,
          shopId: runtime.shopId,
          credentialVersion: observed.account.credentialVersion,
        },
        { $inc: { credentialVersion: 1, revision: 1 } },
        { session },
      );
      if (changed.matchedCount !== 1) invalidCredentials();
      await revokeSessions(runtime, current.account._id, session);
      await consumeAllTokens(runtime, current.account._id, session);
    } else {
      await runtime.models.sessionAccess.updateOne(
        { shopId: runtime.shopId, sessionId: current.stored._id },
        { $set: { revokedAt: new Date() }, $inc: { revision: 1 } },
        { session },
      );
      await runtime.models.sessions.updateOne(
        { _id: current.stored._id, shopId: runtime.shopId },
        { $set: { revokedAt: new Date() }, $inc: { revision: 1 } },
        { session },
      );
    }
    await audit(
      runtime,
      all ? "logout_all" : "logout",
      current.account._id,
      requestId,
      session,
    );
  });
}
export async function changePassword(runtime, request, body, requestId) {
  const input = exact(body, ["currentPassword", "newPassword"]),
    observed = await reauthenticate(runtime, request, input.currentPassword);
  const chosen = password(input.newPassword, true);
  await checkBreachedPassword(chosen);
  const encoded = await hashPassword(chosen);
  await tx(runtime, async (session) => {
    const current = await accountContext(runtime, request, session);
    if (
      current.account.credentialVersion !== observed.account.credentialVersion
    )
      invalidCredentials();
    const changed = await runtime.models.accounts.updateOne(
      {
        _id: current.account._id,
        shopId: runtime.shopId,
        credentialVersion: observed.account.credentialVersion,
      },
      {
        $set: { passwordHash: encoded },
        $inc: { credentialVersion: 1, revision: 1 },
      },
      { session },
    );
    if (changed.matchedCount !== 1) invalidCredentials();
    await consumeAllTokens(runtime, current.account._id, session);
    await revokeSessions(runtime, current.account._id, session);
    await queueNotice(
      runtime,
      {
        ...current.account,
        credentialVersion: current.account.credentialVersion + 1,
      },
      "password_changed_notice",
      current.account.emailNormalized,
      requestId,
      session,
    );
    await audit(
      runtime,
      "password_changed",
      current.account._id,
      requestId,
      session,
    );
  });
}
export async function requestEmailChange(runtime, request, body, requestId) {
  const input = exact(body, ["email", "currentPassword"]),
    target = email(input.email),
    observed = await reauthenticate(runtime, request, input.currentPassword);
  await tx(runtime, async (session) => {
    const current = await accountContext(runtime, request, session);
    if (
      current.account.credentialVersion !== observed.account.credentialVersion
    )
      invalidCredentials();
    if (
      target === current.account.emailNormalized ||
      (await runtime.models.accounts
        .exists({ shopId: runtime.shopId, emailNormalized: target })
        .session(session))
    )
      return;
    await accountLock(runtime, current.account, session);
    await issueToken(
      runtime,
      current.account,
      "change_email",
      requestId,
      session,
      target,
    );
  });
  return GENERIC;
}
export async function confirmEmailChange(runtime, request, body, requestId) {
  const input = exact(body, ["token", "currentPassword"]),
    observed = await reauthenticate(runtime, request, input.currentPassword);
  const { token, account } = await tokenAccount(
    runtime,
    input.token,
    "change_email",
  );
  if (
    String(account._id) !== observed.principal.accountId ||
    !token.targetEmail
  )
    invalidLink();
  try {
    await tx(runtime, async (session) => {
      const current = await accountContext(runtime, request, session);
      if (
        current.account.credentialVersion !==
          observed.account.credentialVersion ||
        current.account.credentialVersion !== token.credentialVersion
      )
        invalidLink();
      await claimToken(runtime, token, account, session);
      const changed = await runtime.models.accounts
        .findOneAndUpdate(
          {
            _id: account._id,
            shopId: runtime.shopId,
            credentialVersion: token.credentialVersion,
          },
          {
            $set: {
              emailNormalized: token.targetEmail,
              verifiedAt: new Date(),
            },
            $inc: { credentialVersion: 1, revision: 1 },
          },
          { session, new: true },
        )
        .lean();
      if (!changed) invalidLink();
      await consumeAllTokens(runtime, account._id, session);
      await revokeSessions(runtime, account._id, session);
      await publishVerifiedProfile(
        runtime,
        changed,
        session,
        requestId,
        "email_changed",
      );
      await queueNotice(
        runtime,
        changed,
        "email_changed_notice",
        account.emailNormalized,
        requestId,
        session,
      );
      await queueNotice(
        runtime,
        changed,
        "email_changed_notice",
        changed.emailNormalized,
        requestId,
        session,
      );
      await audit(runtime, "email_changed", account._id, requestId, session);
    });
  } catch (error) {
    if (error?.code === 11000) invalidLink();
    throw error;
  }
}
export async function updateProfile(runtime, request, body, requestId) {
  const input = exact(body, ["name", "phone"]),
    fields = {};
  if (Object.hasOwn(input, "name")) fields.displayName = text(input.name, 200);
  if (Object.hasOwn(input, "phone")) fields.phone = text(input.phone, 40, 0);
  if (!Object.keys(fields).length)
    authError(400, "INVALID_INPUT", "Nessuna modifica indicata.");
  return tx(runtime, async (session) => {
    const current = await accountContext(runtime, request, session);
    const { phone, ...set } = fields;
    current.profile = await runtime.models.accountProfiles
      .findOneAndUpdate(
        { _id: current.profile._id, shopId: runtime.shopId },
        {
          $set: { ...set, ...(phone ? { phone } : {}) },
          ...(!phone && Object.hasOwn(fields, "phone")
            ? { $unset: { phone: 1 } }
            : {}),
          $inc: { revision: 1 },
        },
        { new: true, session },
      )
      .lean();
    await audit(
      runtime,
      "profile_changed",
      current.account._id,
      requestId,
      session,
    );
    return publicProfile(current);
  });
}
