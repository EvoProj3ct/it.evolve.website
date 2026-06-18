"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

type Preferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  consentVersion: string;
};

const STORAGE_KEY = "evolve_cookie_preferences";
const CONSENT_VERSION = "cookie-v1";
const OPEN_EVENT = "open-cookie-preferences";
const CHANGED_EVENT = "cookie-preferences-changed";

function buildPreferences(input: Omit<Preferences, "updatedAt" | "consentVersion" | "necessary">): Preferences {
  return {
    necessary: true,
    functional: input.functional,
    analytics: input.analytics,
    marketing: input.marketing,
    updatedAt: new Date().toISOString(),
    consentVersion: CONSENT_VERSION,
  };
}

function readStoredPreferences() {
  if (typeof window === "undefined") {
    return {
      isOpen: false,
      preferences: buildPreferences({ functional: false, analytics: false, marketing: false }),
    };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      isOpen: true,
      preferences: buildPreferences({ functional: false, analytics: false, marketing: false }),
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Preferences>;

    if (parsed.consentVersion !== CONSENT_VERSION) {
      return {
        isOpen: true,
        preferences: buildPreferences({ functional: false, analytics: false, marketing: false }),
      };
    }

    return {
      isOpen: false,
      preferences: buildPreferences({
        functional: Boolean(parsed.functional),
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
      }),
    };
  } catch {
    return {
      isOpen: true,
      preferences: buildPreferences({ functional: false, analytics: false, marketing: false }),
    };
  }
}

function shouldOpenBySnapshot() {
  if (typeof window === "undefined") return false;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return true;

  try {
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return parsed.consentVersion !== CONSENT_VERSION;
  } catch {
    return true;
  }
}

function subscribeToConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGED_EVENT, onStoreChange);
  };
}

export default function CookieConsent() {
  const [forcedOpen, setForcedOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [preferences, setPreferences] = useState(buildPreferences({ functional: false, analytics: false, marketing: false }));
  const shouldOpenByStorage = useSyncExternalStore(subscribeToConsent, shouldOpenBySnapshot, () => false);
  const isOpen = forcedOpen || shouldOpenByStorage;

  const save = (value: Preferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGED_EVENT));
    setPreferences(value);
    setForcedOpen(false);
    setCustomize(false);
  };

  useEffect(() => {
    const onOpen = () => {
      const state = readStoredPreferences();
      setPreferences(state.preferences);
      setForcedOpen(true);
      setCustomize(true);
    };

    window.addEventListener(OPEN_EVENT, onOpen);

    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title" className="fixed right-4 bottom-4 left-4 z-50 w-auto rounded-2xl border border-zinc-300 bg-white p-4 shadow-2xl sm:left-auto sm:max-w-xl sm:p-5">
      <h3 id="cookie-consent-title" className="text-lg font-semibold text-zinc-900">Gestione cookie e consenso</h3>
      <p className="mt-2 text-sm text-zinc-600">
        Usiamo cookie necessari e, previo consenso, cookie funzionali, analitici e marketing. Puoi modificare le preferenze in ogni momento.
      </p>

      {customize ? (
        <div className="mt-4 space-y-2 text-sm text-zinc-700">
          <label className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2"><span>Necessari</span><span className="text-zinc-500">Sempre attivi</span></label>
          <Toggle label="Funzionali" value={preferences.functional} onChange={(value) => setPreferences((prev) => ({ ...prev, functional: value }))} />
          <Toggle label="Analitici" value={preferences.analytics} onChange={(value) => setPreferences((prev) => ({ ...prev, analytics: value }))} />
          <Toggle label="Marketing" value={preferences.marketing} onChange={(value) => setPreferences((prev) => ({ ...prev, marketing: value }))} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800"
          onClick={() => save(buildPreferences({ functional: true, analytics: true, marketing: true }))}
        >
          Accetta tutto
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-amber-300 hover:bg-amber-50 active:bg-amber-100"
          onClick={() => save(buildPreferences({ functional: false, analytics: false, marketing: false }))}
        >
          Rifiuta non essenziali
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-amber-300 hover:bg-amber-50 active:bg-amber-100"
          onClick={() => setCustomize((prev) => !prev)}
        >
          {customize ? "Chiudi personalizzazione" : "Personalizza"}
        </button>
        {customize ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-amber-300 hover:bg-amber-50 active:bg-amber-100"
            onClick={() => save(preferences)}
          >
            Salva preferenze
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Dettagli in <Link href="/chiedilo-all-ia/privacy" className="underline">Privacy Policy</Link> e <Link href="/chiedilo-all-ia/cookie-policy" className="underline">Cookie Policy</Link>.
      </p>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
