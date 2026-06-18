"use client";

import Link from "next/link";
import { useCookieConsent } from "./cookie-consent-provider";

const categories = [
  { label: "Tecnici", description: "Necessari al funzionamento della webapp.", enabled: true, disabled: true },
  { label: "Preferenze", description: "Non utilizzati al momento.", enabled: false, disabled: true },
  { label: "Analytics", description: "Non utilizzati al momento.", enabled: false, disabled: true },
  { label: "Marketing e profilazione", description: "Non utilizzati al momento.", enabled: false, disabled: true },
];

export function CookiePreferencesModal() {
  const { modalOpen, closePreferences, confirmSettings } = useCookieConsent();

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 text-zinc-900 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="cookie-preferences-title" className="text-xl font-semibold">Preferenze cookie</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              I cookie tecnici sono sempre attivi. Le categorie non tecniche sono predisposte per eventuali evoluzioni future, ma oggi sono disattivate e non utilizzate.
            </p>
          </div>
          <button type="button" onClick={closePreferences} className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50" aria-label="Chiudi preferenze cookie">
            Chiudi
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {categories.map((category) => (
            <label key={category.label} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <span>
                <span className="block font-medium text-zinc-900">{category.label}</span>
                <span className="mt-1 block text-sm text-zinc-600">{category.description}</span>
              </span>
              <input type="checkbox" checked={category.enabled} disabled={category.disabled} readOnly className="mt-1" />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={confirmSettings} className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-emerald-700 hover:to-teal-700">
            Conferma impostazioni
          </button>
          <Link href="/cookie-policy" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
            Vai alla Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
