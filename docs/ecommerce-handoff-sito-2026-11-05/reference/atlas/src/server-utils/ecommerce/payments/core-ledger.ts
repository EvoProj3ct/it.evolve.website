import "server-only";
import { buildCreateDataObject } from "@/server-utils/service/Anagrafiche/mutations/builders/data";
import type { AtlasCommerceTransaction } from "../persistence/atlas-storage";
import { PaymentReviewError } from "./config";
/** Financial writes use the same transaction as the verified provider receipt. */
export async function primaryRevenue(tx: AtlasCommerceTransaction, order: any) {
  const link = await tx.internal.revenueLinks
    .findOne({ shopId: tx.shopId, orderId: order._id })
    .session(tx.session)
    .lean();
  const row = link
    ? await tx.core.revenues.findById(link.revenueId).session(tx.session).lean()
    : null;
  if (
    !row ||
    !link ||
    row.commerceOrigin?.shopId !== tx.shopId ||
    row.commerceOrigin.key !== `revenue:${order._id}` ||
    String(row.data.clienteVendita) !== String(order.customerId) ||
    row.data.ragioneSocialeRicavo !== order.billing.name ||
    row.data.categoriaRicavo !== link.category ||
    row.data.variantId !== link.variant ||
    ["netMinor", "taxMinor", "grossMinor"].some(
      (key) => link.totals[key] !== order.totals[key],
    ) ||
    [
      ["totaleNetto", "netMinor"],
      ["importoIva", "taxMinor"],
      ["totaleLordo", "grossMinor"],
    ].some(
      ([field, key]) =>
        typeof row.data[field] !== "number" ||
        !Number.isFinite(row.data[field]) ||
        Math.round(row.data[field] * 100) !== order.totals[key],
    )
  )
    throw new PaymentReviewError("REVENUE_MISMATCH");
  return { link, row };
}
export async function postPayment(
  tx: AtlasCommerceTransaction,
  order: any,
  paidAt: Date,
  existingReceipt: any,
) {
  const { row, link } = await primaryRevenue(tx, order),
    status = row.data.statoFatturazione;
  if (existingReceipt) {
    if (
      String(existingReceipt.revenueId) !== String(row._id) ||
      status !== "pagato" ||
      new Date(row.data.dataPagamento).getTime() !==
        new Date(existingReceipt.paidAt).getTime()
    )
      throw new PaymentReviewError("POSTED_REVENUE_CHANGED");
    return row._id;
  }
  if (
    !["programmato", "fatturato"].includes(status) &&
    !(status === "stornato" && order.operationalStatus === "cancelled")
  )
    throw new PaymentReviewError("REVENUE_NOT_PAYABLE");
  if (row.data.dataPagamento)
    throw new PaymentReviewError("REVENUE_PAYMENT_DATE_EXISTS");
  const result = await tx.core.revenues.updateOne(
    {
      _id: row._id,
      "commerceOrigin.shopId": tx.shopId,
      "data.statoFatturazione": status,
      "data.dataPagamento": { $exists: false },
    },
    {
      $set: {
        "data.statoFatturazione": "pagato",
        "data.dataPagamento": paidAt,
        updatedBy: null,
      },
    },
    { session: tx.session },
  );
  if (result.matchedCount !== 1)
    throw new PaymentReviewError("REVENUE_CHANGED");
  return link.revenueId;
}
export async function postRefund(
  tx: AtlasCommerceTransaction,
  order: any,
  refund: any,
  confirmedAt: Date,
  previousGross: number,
  previousNet: number,
) {
  const { link } = await primaryRevenue(tx, order),
    gross = order.totals.grossMinor;
  const cumulative = previousGross + refund.amount;
  if (!Number.isSafeInteger(cumulative) || cumulative > gross || cumulative < 1)
    throw new PaymentReviewError("REFUND_AMOUNT_MISMATCH");
  // Allocate internal reversals cumulatively, so a full refund reverses every cent once.
  const targetNet = Number(
      (2n * BigInt(order.totals.netMinor) * BigInt(cumulative) +
        BigInt(gross)) /
        (2n * BigInt(gross)),
    ),
    netMinor = targetNet - previousNet,
    taxMinor = refund.amount - netMinor;
  if (!Number.isSafeInteger(netMinor) || netMinor < 0 || taxMinor < 0)
    throw new PaymentReviewError("REFUND_ALLOCATION_INVALID");
  const adjustment = await new tx.core.revenues({
    data: buildCreateDataObject("ricavi", {
      variantId: link.variant,
      statoFatturazione: "pagato",
      ragioneSocialeRicavo: order.billing.name,
      categoriaRicavo: link.category,
      clienteVendita: String(order.customerId),
      totaleNetto: -netMinor / 100,
      importoIva: -taxMinor / 100,
      totaleLordo: -refund.amount / 100,
      dataPagamento: confirmedAt,
      provenienzaCliente: "sitoWeb",
      descrizione: `Rettifica rimborso ordine ${order.number}`,
    }),
    owner: tx.responsibleOwnerId,
    createdBy: null,
    updatedBy: null,
    visibilityRoles: tx.visibilityRoles,
    commerceOrigin: {
      shopId: tx.shopId,
      key: `refund:${refund.merchantId}:${refund.mode}:${refund.id}`,
      actor: tx.actor,
    },
  }).save({ session: tx.session });
  return { adjustmentRevenueId: adjustment._id, netMinor, taxMinor };
}
export async function cancelUnpaidRevenue(
  tx: AtlasCommerceTransaction,
  order: any,
) {
  const { row } = await primaryRevenue(tx, order);
  if (row.data.statoFatturazione === "stornato" && !row.data.dataPagamento)
    return;
  if (row.data.statoFatturazione !== "programmato" || row.data.dataPagamento)
    throw new PaymentReviewError("REVENUE_CANCELLATION_REVIEW");
  const result = await tx.core.revenues.updateOne(
    {
      _id: row._id,
      "data.statoFatturazione": "programmato",
      "data.dataPagamento": { $exists: false },
    },
    { $set: { "data.statoFatturazione": "stornato", updatedBy: null } },
    { session: tx.session },
  );
  if (result.matchedCount !== 1)
    throw new PaymentReviewError("REVENUE_CHANGED");
}
