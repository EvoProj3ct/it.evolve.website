import "server-only";

function internalPath(value: string | undefined) {
  if (!value || !/^\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value)) return "";
  return value;
}
export function storefrontLegal() {
  const termsVersion = process.env.ECOMMERCE_AUTH_TERMS_VERSION || "";
  const privacyVersion = process.env.ECOMMERCE_AUTH_PRIVACY_VERSION || "";
  const termsPath = internalPath(process.env.ECOMMERCE_AUTH_TERMS_PATH);
  const privacyPath = internalPath(process.env.ECOMMERCE_AUTH_PRIVACY_PATH);
  const checkoutTermsPath = internalPath(process.env.ECOMMERCE_CHECKOUT_TERMS_PATH);
  const checkoutTermsVersion = process.env.ECOMMERCE_CHECKOUT_TERMS_VERSION || "";
  return { termsVersion, privacyVersion, termsPath, privacyPath, checkoutTermsPath, checkoutTermsVersion, registrationReady: !!(termsVersion && privacyVersion && termsPath && privacyPath) };
}
