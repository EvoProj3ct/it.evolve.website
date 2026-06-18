"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  COOKIE_CONSENT_NAME,
  type CookieConsentState,
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
  confirmSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);
const OPEN_EVENT = "open-cookie-preferences";

function readConsentCookie() {
  if (typeof document === "undefined") return null;

  const raw = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${COOKIE_CONSENT_NAME}=`))
    ?.split("=")[1];

  return parseCookieConsent(raw);
}

function writeConsentCookie(state: CookieConsentState) {
  document.cookie = `${COOKIE_CONSENT_NAME}=${serializeCookieConsent(state)}; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
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

  const confirmSettings = () => {
    const next = createDefaultCookieConsentState();
    writeConsentCookie(next);
    setConsent(next);
    setModalOpen(false);
  };

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      bannerOpen: ready && !consent && !modalOpen,
      modalOpen,
      openPreferences: () => setModalOpen(true),
      closePreferences: () => setModalOpen(false),
      confirmSettings,
    }),
    [consent, modalOpen, ready],
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
