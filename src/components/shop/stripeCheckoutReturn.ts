export type ShopPaymentReturn = "success" | "cancelled" | undefined;

const storageKey = "evolve:shop-stripe-return";
const maxAgeMs = 24 * 60 * 60 * 1000;

export function rememberStripeCheckout(orderId: string) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ orderId, startedAt: Date.now() }));
  } catch {
    // The Stripe return URL still works when browser storage is unavailable.
  }
}

function storedCheckout(): { orderId?: string; startedAt?: number } | null {
  try {
    return JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

export function hasStripeCheckout(orderId: string) {
  const checkout = storedCheckout();
  if (checkout?.orderId !== orderId || typeof checkout.startedAt !== "number") return false;
  const age = Date.now() - checkout.startedAt;
  return age >= 0 && age < maxAgeMs;
}

export function forgetStripeCheckout(orderId: string) {
  try {
    if (storedCheckout()?.orderId === orderId) window.sessionStorage.removeItem(storageKey);
  } catch {
    // No stored checkout to remove when browser storage is unavailable.
  }
}
