import "server-only";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
import {
  commerceCapabilitiesForRole,
  hasCommerceCapability,
} from "@/config/access/ecommerce-access.config";
import { commerceSectionsForRole } from "@/config/ecommerce-workspace.config";
import type { CommerceStaffPrincipal } from "./staff-auth";

/** Public-to-staff DTO, built only after requireCommerceStaffPage/Api. No account hashes, env values or business data. */
export function commerceWorkspaceForStaff(principal: CommerceStaffPrincipal) {
  return {
    version: 1 as const,
    capabilities: commerceCapabilitiesForRole(principal.role),
    sections: commerceSectionsForRole(principal.role).map(
      ({ id, label, href, description, availability }) => ({
        id,
        label,
        href,
        description,
        availability,
      }),
    ),
  };
}

export interface CommerceConnectionSummary {
  id: "shop" | "identity" | "database" | "ownership" | "payments";
  label: string;
  state: "missing_configuration" | "verification_required";
  description: string;
}
/** Presence only; it neither connects to services nor declares connectivity/security verified. */
export function commerceConnectionSummary(
  principal: CommerceStaffPrincipal,
): CommerceConnectionSummary[] {
  if (
    principal.kind !== "staff" ||
    !hasCommerceCapability(principal.role, "ecommerce.integration.view")
  ) {
    throw new CommerceServiceError(
      403,
      "STAFF_ACCESS_DENIED",
      "Operazione non consentita per questo profilo.",
    );
  }
  const groups = [
    { id: "shop", label: "Negozio", keys: ["ECOMMERCE_SHOP_ID"] },
    {
      id: "payments",
      label: "Pagamenti Stripe",
      keys: [
        "ECOMMERCE_STRIPE_ENABLED",
        "ECOMMERCE_STRIPE_MODE",
        "ECOMMERCE_STRIPE_ACCOUNT_ID",
        "ECOMMERCE_STRIPE_SECRET_KEY",
        "ECOMMERCE_STRIPE_WEBHOOK_SECRET",
        "ECOMMERCE_STRIPE_PAYMENT_METHODS",
        "ECOMMERCE_PAYMENTS_WORKER_SECRET",
      ],
    },
    {
      id: "identity",
      label: "Identità del sito",
      keys: [
        "ECOMMERCE_OIDC_ISSUER",
        "ECOMMERCE_INTERNAL_AUDIENCE",
        "ECOMMERCE_SITE_SUBJECT",
        "ECOMMERCE_SITE_PROJECT_ID",
        "ECOMMERCE_SITE_OWNER_ID",
        "ECOMMERCE_SITE_ENVIRONMENT",
        "ECOMMERCE_ASSERTION_ISSUER",
      ],
    },
    {
      id: "database",
      label: "Dati e-commerce",
      keys: [
        "ECOMMERCE_PROCESSOR_MONGODB_URI",
        "ECOMMERCE_MONGODB_DB",
        "MONGODB_DB",
      ],
    },
    {
      id: "ownership",
      label: "Responsabile interno",
      keys: ["ECOMMERCE_RECORD_OWNER_ID"],
    },
  ] as const;
  return groups.map<CommerceConnectionSummary>(({ id, label, keys }) => {
    const present = keys.every((key) => !!process.env[key]?.trim());
    return {
      id,
      label,
      state: present ? "verification_required" : "missing_configuration",
      description: present
        ? "Impostazioni presenti. Il collegamento deve essere verificato nell’ambiente di prova."
        : "Configurazione da completare nell’ambiente di Atlas.",
    };
  });
}
