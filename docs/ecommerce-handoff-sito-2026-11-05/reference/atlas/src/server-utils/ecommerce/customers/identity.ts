import "server-only";
import { createHash } from "node:crypto";
import { stableJson } from "@evolve/ecommerce-server/persistence";
const hash = (value: unknown) =>
  createHash("sha256").update(stableJson(value)).digest("hex");
export const canonical = (value: unknown): string =>
  typeof value === "string"
    ? value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ")
    : "";
export const emailHash = (shopId: string, email: string) =>
  hash([shopId, email.trim().toLowerCase()]);
/** A→B→A email changes must not revive an old binding. Contact/name edits are not commercial identity proof. */
export const profileIdentityHash = (shopId: string, profile: any) =>
  hash([
    shopId,
    String(profile.accountId),
    profile.verifiedEmail,
    profile.verifiedAt.toISOString(),
    profile.kind,
  ]);
export const customerIdentityHash = (record: any) =>
  hash([
    String(record._id),
    ...["ragioneSociale", "email", "tipoCliente", "codicefiscale", "piva"].map(
      (key) =>
        typeof record.data?.[key] === "string"
          ? record.data[key].normalize("NFC").trim()
          : (record.data?.[key] ?? null),
    ),
  ]);
export const escaped = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const CUSTOMER_FIELDS = {
  _id: 1,
  "data.ragioneSociale": 1,
  "data.email": 1,
  "data.tipoCliente": 1,
  "data.codicefiscale": 1,
  "data.piva": 1,
} as const;
export function customerSummary(record: any) {
  const field = (key: string, max: number) =>
    typeof record.data?.[key] === "string"
      ? record.data[key].slice(0, max)
      : typeof record.data?.[key] === "number"
        ? String(record.data[key]).slice(0, max)
        : "";
  return {
    id: String(record._id),
    name: field("ragioneSociale", 200),
    email: field("email", 254),
    kind: field("tipoCliente", 80),
    taxCode: field("codicefiscale", 120),
    vatNumber: field("piva", 120),
    identityHash: customerIdentityHash(record),
  };
}
export function safePublicLink(
  link: any,
  currentProfileHash: string,
  customerValid = true,
) {
  const status =
    link?.status === "blocked"
      ? "blocked"
      : link &&
          (link.profileIdentityHash !== currentProfileHash || !customerValid)
        ? "review_required"
        : link?.status || "pending";
  return {
    status,
    checkoutReady: status === "linked",
    message:
      status === "linked"
        ? "Profilo commerciale pronto."
        : status === "pending"
          ? "Preparazione del profilo commerciale in corso."
          : "Il profilo commerciale richiede una verifica dell’assistenza.",
  };
}
