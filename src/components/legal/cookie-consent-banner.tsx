"use client";

import Link from "next/link";
import Image from "next/image";
import { useCookieConsent } from "./cookie-consent-provider";
import { CookieCategories } from "./cookie-categories";
import { CookieConsentActions } from "./cookie-consent-actions";
import styles from "./cookie-consent.module.css";

export function CookieConsentBanner() {
  const { bannerOpen, confirmSettings, openPreferences } = useCookieConsent();

  if (!bannerOpen) return null;

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="cookie-banner-title" aria-describedby="cookie-banner-description" className={styles.banner}>
      <div className={styles.bannerInner}>
        <div className={styles.brand}>
          <Image src="/logoEvolve.png" alt="Evolve" width={64} height={51} />
        </div>
        <div className={styles.content}>
          <p className={styles.eyebrow}><span className={styles.statusDot} aria-hidden="true" /> IL CONTROLLO RESTA A TE</p>
          <h2 id="cookie-banner-title" className={styles.title}>La tua privacy, le tue scelte.</h2>
          <p id="cookie-banner-description" className={styles.description}>
            Usiamo solo cookie necessari per far funzionare il sito e ricordare la tua scelta.
            Le categorie facoltative non sono utilizzate. Puoi rivedere le impostazioni in qualsiasi momento dal footer.
          </p>
          <div className={styles.categoryBar}>
            <CookieCategories />
          </div>
          <div className={styles.contentFooter}>
            <button type="button" onClick={openPreferences} className={styles.detailsButton} aria-haspopup="dialog">
              Mostra dettagli
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.2" /></svg>
            </button>
            <Link href="/cookie-policy" className={styles.policyLink}>Cookie Policy</Link>
          </div>
        </div>
        <CookieConsentActions />
      </div>
      <button type="button" className={styles.closeButton} onClick={() => confirmSettings("rejected")} aria-label="Chiudi e continua solo con i cookie necessari">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="m4 4 9 9M13 4l-9 9" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
    </section>
  );
}
