"use client";

import Image from "next/image";
import Link from "next/link";
import { openCookiePreferences } from "@/components/legal/cookie-consent-provider";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 text-center text-zinc-100 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-6 sm:mb-5">
          <Image
            src="/chiedilo-all-ia/logo-bcc-no-bg.png"
            alt="BCC"
            width={347}
            height={160}
            className="h-10 w-auto rounded bg-white/95 px-2 py-1 drop-shadow-sm sm:h-12 lg:h-14"
          />
          <Image
            src="/chiedilo-all-ia/logo_bianco.png"
            alt="Evolve"
            width={347}
            height={288}
            className="h-10 w-auto drop-shadow-sm sm:h-12 lg:h-14"
          />
        </div>
        <p className="text-base sm:text-lg">© 2026 Evolve Srls - Chiedilo all’IA</p>
        <p className="mt-2 text-sm text-zinc-400">Evento promosso da BCC e realizzato da Evolve.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-300 sm:mt-5">
          <Link href="/privacy" className="underline-offset-2 transition-colors hover:text-amber-300 hover:underline">Privacy Policy</Link>
          <Link href="/cookie-policy" className="underline-offset-2 transition-colors hover:text-amber-300 hover:underline">Cookie Policy</Link>
          <Link href="/sicurezza" className="underline-offset-2 transition-colors hover:text-amber-300 hover:underline">Sicurezza</Link>
          <button type="button" onClick={openCookiePreferences} className="underline-offset-2 transition-colors hover:text-amber-300 hover:underline" data-open-cookie-preferences="true">
            Preferenze cookie
          </button>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6 sm:gap-5">
          <a
            href="https://www.linkedin.com/company/evolve-srls/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Evolve"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 transition-colors hover:border-amber-400 hover:text-amber-300 sm:text-sm"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
              <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19ZM8.14 10.5H5.74V18H8.14V10.5ZM6.94 6.75A1.39 1.39 0 1 0 6.94 9.53A1.39 1.39 0 1 0 6.94 6.75ZM18.26 13.7C18.26 11.44 17.05 10.37 15.44 10.37C14.14 10.37 13.56 11.09 13.24 11.6V10.5H10.84C10.87 11.23 10.84 18 10.84 18H13.24V13.81C13.24 13.58 13.26 13.35 13.33 13.19C13.51 12.73 13.92 12.25 14.6 12.25C15.49 12.25 15.85 12.93 15.85 13.94V18H18.26V13.7Z" />
            </svg>
            LinkedIn
          </a>
          <a
            href="https://www.instagram.com/evolvecompany.tech"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Evolve"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 transition-colors hover:border-amber-400 hover:text-amber-300 sm:text-sm"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
              <path d="M7.8 2H16.2C19.4 2 22 4.6 22 7.8V16.2C22 19.4 19.4 22 16.2 22H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2ZM7.6 4A3.6 3.6 0 0 0 4 7.6V16.4C4 18.39 5.61 20 7.6 20H16.4C18.39 20 20 18.39 20 16.4V7.6C20 5.61 18.39 4 16.4 4H7.6ZM17.25 5.5A1.25 1.25 0 1 1 17.25 8A1.25 1.25 0 0 1 17.25 5.5ZM12 7A5 5 0 1 1 7 12A5 5 0 0 1 12 7ZM12 9A3 3 0 1 0 15 12A3 3 0 0 0 12 9Z" />
            </svg>
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
