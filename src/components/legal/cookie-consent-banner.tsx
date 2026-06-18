"use client";

import Link from "next/link";
import { useCookieConsent } from "./cookie-consent-provider";

export function CookieConsentBanner() {
  const { bannerOpen, confirmSettings, openPreferences } = useCookieConsent();

  if (!bannerOpen) return null;

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cookie-banner-title" className="fixed right-4 bottom-4 left-4 z-50 rounded-2xl border border-zinc-300 bg-white p-4 text-zinc-900 shadow-2xl sm:left-auto sm:max-w-xl sm:p-5">
      <h2 id="cookie-banner-title" className="text-lg font-semibold">Cookie tecnici</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Usiamo cookie tecnici necessari al funzionamento della webapp. Al momento non utilizziamo cookie analytics, marketing o profilazione. Puoi consultare o modificare le preferenze in qualsiasi momento.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={confirmSettings} className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-emerald-700 hover:to-teal-700">
          Conferma impostazioni
        </button>
        <button type="button" onClick={openPreferences} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
          Gestisci preferenze
        </button>
        <Link href="/cookie-policy" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
          Vai alla Cookie Policy
        </Link>
      </div>
    </div>
  );
}
