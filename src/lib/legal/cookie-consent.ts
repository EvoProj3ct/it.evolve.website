export const COOKIE_CONSENT_NAME = "evolve_cookie_consent";
export const COOKIE_CONSENT_VERSION = "2026-06-privacy-v1";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 183;

export type CookieConsentChoice = "all" | "selected" | "rejected";

export const COOKIE_CATEGORIES = [
  { id: "necessary", label: "Necessari", active: true, status: "Sempre attivi", description: "Permettono al sito di funzionare e di ricordare la tua scelta sui cookie." },
  { id: "preferences", label: "Preferenze", active: false, status: "Non utilizzati", description: "Servirebbero a ricordare impostazioni personalizzate. Al momento non li utilizziamo." },
  { id: "analytics", label: "Statistiche", active: false, status: "Non utilizzati", description: "Servirebbero a misurare le visite e l'utilizzo del sito. Al momento non li utilizziamo." },
  { id: "marketing", label: "Marketing", active: false, status: "Non utilizzati", description: "Servirebbero per pubblicità e profilazione. Al momento non li utilizziamo." },
] as const;

export type CookieConsentState = {
  version: string;
  necessary: true;
  preferences: false;
  analytics: false;
  marketing: false;
  choice: CookieConsentChoice;
  updatedAt: string;
};

export function createDefaultCookieConsentState(choice: CookieConsentChoice = "selected"): CookieConsentState {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
    choice,
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

    if (typeof parsed.updatedAt !== "string") return null;
    const updatedAt = Date.parse(parsed.updatedAt);
    const age = Date.now() - updatedAt;
    if (!Number.isFinite(updatedAt) || age < -300_000 || age >= COOKIE_CONSENT_MAX_AGE_SECONDS * 1000) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      choice: parsed.choice === "all" || parsed.choice === "rejected" ? parsed.choice : "selected",
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeCookieConsent(state: CookieConsentState): string {
  return encodeURIComponent(JSON.stringify(state));
}
