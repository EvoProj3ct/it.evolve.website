// Only the two core collections needed by commerce. No global unique-email constraint.
export const CORE_COMMERCE_COLLECTIONS = Object.freeze({
  customers: "anagrafiche__clienti",
  revenues: "anagrafiche__ricavi",
});
export const CORE_COMMERCE_INDEX = Object.freeze({
  name: "commerce_origin_once_v1",
  key: { "commerceOrigin.shopId": 1, "commerceOrigin.key": 1 },
  unique: true,
  partialFilterExpression: {
    "commerceOrigin.shopId": { $type: "string" },
    "commerceOrigin.key": { $type: "string" },
  },
});
export const CUSTOMER_REGISTRY_COLLECTION = "commerce_customer_registry";
export const CORE_FULFILLMENT_COLLECTIONS = Object.freeze({
  deliveries: "anagrafiche__consegne-ecommerce",
  deliveryEvents: "eventi__consegna_ecommerce",
  progressEvents: "eventi__avanzamento_ecommerce",
});
export const CORE_FULFILLMENT_EVENT_INDEXES = [
  {
    name: "fulfillment_event_once",
    key: { "commerceFulfillment.shopId": 1, "commerceFulfillment.publicId": 1 },
    unique: true,
    partialFilterExpression: {
      "commerceFulfillment.publicId": { $type: "string" },
    },
  },
  {
    name: "fulfillment_order_events",
    key: {
      "commerceFulfillment.shopId": 1,
      "commerceFulfillment.orderPublicId": 1,
      startAt: 1,
    },
  },
];
