import "server-only";
import { randomUUID } from "node:crypto";
import {
  calculateLineTotals,
  replaceCommerceRecord,
  type CommerceActor,
} from "@evolve/ecommerce-server/persistence";
import {
  getAtlasCommerceStorage,
  withAtlasCommerceTransaction,
  type AtlasCommerceTransaction,
} from "../persistence/atlas-storage";
import { appendCommerceAudit } from "../persistence/core-adapters";
import { minorText } from "../catalog/validation";
import { checkoutError, parsePolicy } from "./validation";
export const emptyPolicy = () => ({
  publicId: null,
  revision: null,
  enabled: false,
  termsVersion: "",
  countries: [] as string[],
  maxLines: 50,
  maxQuantity: 100,
  maxGross: "10000.00",
  quoteTtlMinutes: 15,
  requireIndividualTaxCode: false,
  requireCompanyVat: false,
  mixedRevenueCategory: "",
  mixedRevenueVariant: "",
  options: [] as any[],
});
export function staffPolicy(policy: any) {
  return !policy
    ? emptyPolicy()
    : {
        publicId: policy.publicId,
        revision: policy.revision,
        enabled: policy.enabled,
        termsVersion: policy.termsVersion || "",
        countries: policy.countries,
        maxLines: policy.maxLines,
        maxQuantity: policy.maxQuantity,
        maxGross: minorText(policy.maxGrossMinor),
        quoteTtlMinutes: policy.quoteTtlSeconds / 60,
        requireIndividualTaxCode: policy.requireIndividualTaxCode,
        requireCompanyVat: policy.requireCompanyVat,
        mixedRevenueCategory: policy.mixedRevenue?.category || "",
        mixedRevenueVariant: policy.mixedRevenue?.variant || "",
        options: policy.options.map((item: any) => ({
          publicId: item.publicId,
          enabled: item.enabled,
          mode: item.mode,
          label: item.label,
          details: item.details || "",
          countries: item.countries,
          amount: minorText(item.price.unitMinor),
          taxMode: item.price.taxMode,
          taxRate: minorText(item.price.taxRateBps),
          revenueCategory: item.revenueCategory || "",
          revenueVariant: item.revenueVariant || "",
        })),
      };
}
export async function readStaffPolicy() {
  const storage = await getAtlasCommerceStorage();
  return staffPolicy(
    await storage.internal.checkoutPolicies
      .findOne({ shopId: process.env.ECOMMERCE_SHOP_ID })
      .lean(),
  );
}
export async function saveCheckoutPolicy(actor: CommerceActor, value: unknown) {
  const { expectedRevision, termsVersion, ...input } = parsePolicy(value);
  if (
    input.enabled &&
    (!termsVersion ||
      !input.countries.length ||
      !input.options.some((item) => item.enabled))
  )
    checkoutError(
      400,
      "CHECKOUT_INCOMPLETE",
      "Configura condizioni, Paesi e almeno una modalità prima di abilitare i riepiloghi.",
    );
  if (
    input.maxGrossMinor < 1 ||
    input.options.some(
      (item) =>
        item.countries.some((country) => !input.countries.includes(country)) ||
        (item.enabled && item.mode === "pickup" && !item.details),
    )
  )
    checkoutError(
      400,
      "CHECKOUT_INCOMPLETE",
      "Verifica importo massimo, Paesi e istruzioni di ritiro.",
    );
  return withAtlasCommerceTransaction(actor, async (tx) => {
    const previous = await tx.internal.checkoutPolicies
      .findOne({ shopId: tx.shopId })
      .session(tx.session)
      .lean();
    if ((previous?.revision ?? null) !== expectedRevision)
      checkoutError(
        409,
        "POLICY_CHANGED",
        "Impostazioni modificate. Ricarica la pagina.",
      );
    const change = { ...input, termsVersion: termsVersion || undefined, actor };
    const saved = previous
      ? await replaceCommerceRecord(
          tx.internal.checkoutPolicies,
          {
            shopId: tx.shopId,
            id: String(previous._id),
            expectedRevision: previous.revision,
          },
          change,
          tx.session,
        )
      : await new tx.internal.checkoutPolicies({
          shopId: tx.shopId,
          publicId: randomUUID(),
          ...change,
        }).save({ session: tx.session });
    await appendCommerceAudit(tx, {
      action: "checkout.policy_saved",
      objectType: "checkout_policy",
      objectId: saved.publicId,
      outcome: "succeeded",
    });
    return staffPolicy(saved.toObject());
  });
}
export async function lockPolicy(
  tx: AtlasCommerceTransaction,
  enabled: boolean,
) {
  const row = await tx.internal.checkoutPolicies
    .findOneAndUpdate(
      { shopId: tx.shopId, ...(enabled ? { enabled: true } : {}) },
      { $inc: { guard: 1 } },
      { session: tx.session, new: true },
    )
    .lean();
  if (enabled && !row)
    checkoutError(
      503,
      "CHECKOUT_DISABLED",
      "La generazione dei riepiloghi non è disponibile.",
    );
  return row;
}
export function publicPolicy(policy: any) {
  return {
    revision: policy.revision,
    termsVersion: policy.termsVersion,
    countries: policy.countries,
    maxLines: policy.maxLines,
    maxQuantity: policy.maxQuantity,
    maxGrossMinor: policy.maxGrossMinor,
    quoteTtlSeconds: policy.quoteTtlSeconds,
    requireIndividualTaxCode: policy.requireIndividualTaxCode,
    requireCompanyVat: policy.requireCompanyVat,
    options: policy.options
      .filter((item: any) => item.enabled)
      .map((item: any) => ({
        publicId: item.publicId,
        mode: item.mode,
        label: item.label,
        details: item.details || "",
        countries: item.countries,
        price: { ...item.price },
        totals: calculateLineTotals(item.price, 1),
      })),
  };
}
