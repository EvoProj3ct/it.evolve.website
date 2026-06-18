export const COOKIE_CONSENT_NAME = "evolve_cookie_consent";
export const COOKIE_CONSENT_VERSION = "2026-06-privacy-v1";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 183;

export type CookieConsentState = {
  version: string;
  necessary: true;
  preferences: false;
  analytics: false;
  marketing: false;
  updatedAt: string;
};

export function createDefaultCookieConsentState(): CookieConsentState {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
    updatedAt: new Date().toISOString(),
  };
}

export function parseCookieConsent(value: string | undefined): CookieConsentState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<CookieConsentState>;

    if (parsed.version !== COOKIE_CONSENT_VERSION || parsed.necessary !== true) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeCookieConsent(state: CookieConsentState): string {
  return encodeURIComponent(JSON.stringify(state));
}
