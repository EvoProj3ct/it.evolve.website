export const stripeCheckoutUrlMaxLength = 8192;

// The server checks the session against the order before exposing Stripe's URL.
export function stripeCheckoutUrlIssue(value) {
  if (
    typeof value !== "string" ||
    value.length > stripeCheckoutUrlMaxLength ||
    !value.startsWith("https://") ||
    /[\u0000-\u0020\u007f\\]/.test(value)
  ) return "CHECKOUT_URL_INVALID";

  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname === "/")
      return "CHECKOUT_URL_INVALID";
    return url.origin === "https://checkout.stripe.com" ? null : "CHECKOUT_ORIGIN_UNEXPECTED";
  } catch {
    return "CHECKOUT_URL_INVALID";
  }
}
