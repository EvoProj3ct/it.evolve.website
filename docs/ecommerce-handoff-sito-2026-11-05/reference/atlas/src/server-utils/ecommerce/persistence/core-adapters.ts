import "server-only";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import {
  assertCommerceSession,
  insertCommerceRecord,
  validateTotals,
  type MoneyTotals,
} from "@evolve/ecommerce-server/persistence";
import { buildCreateDataObject } from "@/server-utils/service/Anagrafiche/mutations/builders/data";
import type { AtlasCommerceTransaction } from "./atlas-storage";

function assertContext(tx: AtlasCommerceTransaction) {
  assertCommerceSession(tx.coreConnection, tx.session);
  assertCommerceSession(tx.commerceConnection, tx.session);
}
function coreAudit(tx: AtlasCommerceTransaction, key: string) {
  const staffId =
    tx.actor.kind === "staff" ? new mongoose.Types.ObjectId(tx.actor.id) : null;
  return {
    owner: tx.responsibleOwnerId,
    createdBy: staffId,
    updatedBy: staffId,
    visibilityRoles: tx.visibilityRoles,
    commerceOrigin: { shopId: tx.shopId, key, actor: tx.actor },
  };
}
export async function appendCommerceAudit(
  tx: AtlasCommerceTransaction,
  event: {
    action: string;
    objectType: string;
    objectId: string;
    outcome: "accepted" | "rejected" | "succeeded" | "failed";
    reasonCode?: string;
  },
) {
  assertContext(tx);
  return insertCommerceRecord(
    tx.internal.auditEvents,
    { ...event, shopId: tx.shopId, actor: tx.actor, occurredAt: new Date() },
    tx.session,
  );
}

export interface CommerceCustomerDraft {
  accountId: string;
  name: string;
  verifiedEmail: string;
  kind: "individual" | "company";
  taxCode?: string;
  vatNumber?: string;
}
/** Private writer; the caller holds the customer registry guard and authorizes the association. */
export async function insertCommerceCustomer(
  tx: AtlasCommerceTransaction,
  draft: CommerceCustomerDraft,
) {
  assertContext(tx);
  if (
    tx.actor.kind === "provider" ||
    (tx.actor.kind === "customer" && tx.actor.id !== draft.accountId) ||
    !/^[a-f0-9]{24}$/.test(draft.accountId) ||
    !draft.name ||
    draft.name.length > 200 ||
    draft.verifiedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.verifiedEmail) ||
    !["individual", "company"].includes(draft.kind) ||
    (draft.taxCode?.length ?? 0) > 40 ||
    (draft.vatNumber?.length ?? 0) > 40
  )
    throw new Error("COMMERCE_INVALID_CUSTOMER_DRAFT");
  const data = buildCreateDataObject("clienti", {
    ragioneSociale: draft.name,
    email: draft.verifiedEmail,
    tipoCliente: draft.kind === "company" ? "azienda" : "privato",
    codicefiscale: draft.taxCode,
    piva: draft.vatNumber,
  });
  const record = new tx.core.customers({
    data,
    ...coreAudit(
      tx,
      `customer:${createHash("sha256").update(`${draft.accountId}\0${draft.verifiedEmail}`).digest("hex")}`,
    ),
  });
  await record.save({ session: tx.session });
  await appendCommerceAudit(tx, {
    action: "customer.created",
    objectType: "customer",
    objectId: String(record._id),
    outcome: "succeeded",
  });
  return record;
}

export interface CommerceRevenueDraft {
  orderId: string;
  customerId: string;
  orderNumber: string;
  billingName: string;
  totals: MoneyTotals;
  category: "stampa3d" | "consulenza" | "sviluppoSoftware" | "atlas" | "altro";
  variant: string;
}
interface OrderForRevenue {
  customerId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  number: string;
  billing: { name: string };
  operationalStatus: string;
  paymentStatus: string;
  totals: MoneyTotals;
  revenueMapping?: { category: string; variant: string };
}
/** Used inside the order-confirmation transaction; no separate transaction or fake staff session. */
export async function insertProgrammedCommerceRevenue(
  tx: AtlasCommerceTransaction,
  draft: CommerceRevenueDraft,
) {
  assertContext(tx);
  validateTotals(draft.totals);
  if (
    !["stampa3d", "consulenza", "sviluppoSoftware", "atlas", "altro"].includes(
      draft.category,
    ) ||
    !draft.variant ||
    draft.variant.length > 100 ||
    !draft.billingName ||
    draft.billingName.length > 200 ||
    !draft.orderNumber ||
    draft.orderNumber.length > 80 ||
    !/^[a-f0-9]{24}$/.test(draft.orderId) ||
    !/^[a-f0-9]{24}$/.test(draft.customerId)
  )
    throw new Error("COMMERCE_INVALID_REVENUE_DRAFT");
  const order = await tx.internal.orders
    .findOne({ _id: draft.orderId, shopId: tx.shopId })
    .session(tx.session)
    .lean<OrderForRevenue | null>();
  if (
    !order ||
    String(order.customerId) !== draft.customerId ||
    order.number !== draft.orderNumber ||
    order.billing.name !== draft.billingName ||
    order.operationalStatus !== "open" ||
    order.paymentStatus !== "awaiting" ||
    order.revenueMapping?.category !== draft.category ||
    order.revenueMapping?.variant !== draft.variant ||
    order.totals.netMinor !== draft.totals.netMinor ||
    order.totals.taxMinor !== draft.totals.taxMinor ||
    order.totals.grossMinor !== draft.totals.grossMinor ||
    order.totals.currency !== draft.totals.currency
  )
    throw new Error("COMMERCE_REVENUE_ORDER_MISMATCH");
  if (tx.actor.kind === "customer" && String(order.accountId) !== tx.actor.id)
    throw new Error("COMMERCE_ORDER_OWNER_MISMATCH");
  const customer = await tx.core.customers
    .exists({ _id: draft.customerId })
    .session(tx.session);
  if (!customer) throw new Error("COMMERCE_CUSTOMER_NOT_FOUND");
  // Conversion to Atlas's existing euro-valued fields happens only at this boundary.
  const data = buildCreateDataObject("ricavi", {
    variantId: draft.variant,
    statoFatturazione: "programmato",
    ragioneSocialeRicavo: draft.billingName,
    categoriaRicavo: draft.category,
    clienteVendita: draft.customerId,
    totaleNetto: draft.totals.netMinor / 100,
    importoIva: draft.totals.taxMinor / 100,
    totaleLordo: draft.totals.grossMinor / 100,
    provenienzaCliente: "sitoWeb",
    descrizione: `Ordine e-commerce ${draft.orderNumber}`,
  });
  const revenue = new tx.core.revenues({
    data,
    ...coreAudit(tx, `revenue:${draft.orderId}`),
  });
  await revenue.save({ session: tx.session });
  await insertCommerceRecord(
    tx.internal.revenueLinks,
    {
      shopId: tx.shopId,
      orderId: draft.orderId,
      revenueId: revenue._id,
      totals: draft.totals,
      category: draft.category,
      variant: draft.variant,
      actor: tx.actor,
    },
    tx.session,
  );
  await appendCommerceAudit(tx, {
    action: "revenue.programmed",
    objectType: "revenue",
    objectId: String(revenue._id),
    outcome: "succeeded",
  });
  return revenue;
}
