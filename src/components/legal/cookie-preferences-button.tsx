"use client";

import { openCookiePreferences } from "./cookie-consent-provider";

export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className} data-open-cookie-preferences="true">
      Preferenze cookie
    </button>
  );
}
