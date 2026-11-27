import { accountContext, audit, tx } from "./runtime.js";
import { authError, email, exact, text } from "./security.js";

function parseBillingProfile(value, kind) {
  const allowed = ["name", "taxCode", "address"];
  if (kind === "company") allowed.push("vatNumber", "recipientCode", "certifiedEmail");
  const input = exact(value, allowed);
  const address = exact(input.address, ["name", "line1", "line2", "city", "postalCode", "region", "country"]);
  const country = text(address.country, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country))
    authError(400, "INVALID_INPUT", "Indica il codice di due lettere del Paese.");
  const optional = (value, max) => value === undefined ? "" : text(value, max, 0);
  const line2 = optional(address.line2, 200), region = optional(address.region, 100);
  const taxCode = optional(input.taxCode, 40), vatNumber = optional(input.vatNumber, 40);
  const recipientCode = optional(input.recipientCode, 20);
  const certifiedEmail = optional(input.certifiedEmail, 254);
  return {
    name: text(input.name, 200),
    ...(taxCode && { taxCode }),
    ...(vatNumber && { vatNumber }),
    ...(recipientCode && { recipientCode }),
    ...(certifiedEmail && { certifiedEmail: email(certifiedEmail) }),
    address: {
      name: text(address.name, 200),
      line1: text(address.line1, 200),
      ...(line2 && { line2 }),
      city: text(address.city, 100),
      postalCode: text(address.postalCode, 20),
      ...(region && { region }),
      country,
    },
  };
}

export async function readBillingProfile(runtime, request) {
  const context = await accountContext(runtime, request, undefined, true, { includeBilling: true });
  return context.account.billingProfile ?? null;
}

export async function updateBillingProfile(runtime, request, body, requestId) {
  const input = exact(body, ["billing"]);
  return tx(runtime, async (session) => {
    const current = await accountContext(runtime, request, session, true);
    const billing = parseBillingProfile(input.billing, current.profile.kind);
    const saved = await runtime.models.accounts.updateOne(
      { shopId: runtime.shopId, _id: current.account._id, status: "active", credentialVersion: current.account.credentialVersion },
      { $set: { billingProfile: billing }, $inc: { revision: 1 } },
      { session, runValidators: true },
    );
    if (saved.matchedCount !== 1)
      authError(401, "SESSION_INVALID", "Accedi nuovamente al negozio.");
    await audit(runtime, "profile_changed", current.account._id, requestId, session);
    return billing;
  });
}
