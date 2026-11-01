"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  COOKIE_CONSENT_NAME,
  type CookieConsentState,
  type CookieConsentChoice,
  createDefaultCookieConsentState,
  parseCookieConsent,
  serializeCookieConsent,
} from "@/lib/legal/cookie-consent";

type CookieConsentContextValue = {
  consent: CookieConsentState | null;
  bannerOpen: boolean;
  modalOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  confirmSettings: (choice?: CookieConsentChoice) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);
const OPEN_EVENT = "open-cookie-preferences";

function readConsentCookie() {
  if (typeof document === "undefined") return null;

  try {
    const raw = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${COOKIE_CONSENT_NAME}=`))
      ?.slice(COOKIE_CONSENT_NAME.length + 1);
    return parseCookieConsent(raw);
  } catch {
    return null;
  }
}

function writeConsentCookie(state: CookieConsentState) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_CONSENT_NAME}=${serializeCookieConsent(state)}; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // The in-memory choice still applies if the browser blocks cookie storage.
  }
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setConsent(readConsentCookie());
    setReady(true);

    const onOpen = () => setModalOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);

    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const openPreferences = useCallback(() => setModalOpen(true), []);
  const closePreferences = useCallback(() => setModalOpen(false), []);
  const confirmSettings = useCallback((choice: CookieConsentChoice = "selected") => {
    const next = createDefaultCookieConsentState(choice);
    writeConsentCookie(next);
    setConsent(next);
    setModalOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      bannerOpen: ready && !consent,
      modalOpen,
      openPreferences,
      closePreferences,
      confirmSettings,
    }),
    [consent, modalOpen, ready, openPreferences, closePreferences, confirmSettings],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error("useCookieConsent must be used inside CookieConsentProvider");
  }

  return context;
}

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}
