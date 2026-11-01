"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CookieCategories } from "./cookie-categories";
import { CookieConsentActions } from "./cookie-consent-actions";
import { useCookieConsent } from "./cookie-consent-provider";
import styles from "./cookie-consent.module.css";

export function CookiePreferencesModal() {
  const { modalOpen, closePreferences } = useCookieConsent();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!modalOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modalOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.preferencesDialog}
      aria-labelledby="cookie-preferences-title"
      aria-describedby="cookie-preferences-description"
      onCancel={(event) => { event.preventDefault(); closePreferences(); }}
      onClose={closePreferences}
      onClick={(event) => { if (event.target === event.currentTarget) closePreferences(); }}
    >
      <div className={styles.preferencesInner}>
        <div className={styles.preferencesHeader}>
          <span className={styles.eyebrow}><span className={styles.statusDot} aria-hidden="true" /> Evolve / Privacy</span>
          <button type="button" onClick={closePreferences} className={styles.closeButton} aria-label="Chiudi preferenze cookie" autoFocus>
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="m4 4 9 9M13 4l-9 9" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
        <h2 id="cookie-preferences-title" className={styles.preferencesTitle}>Le tue preferenze.</h2>
        <p id="cookie-preferences-description" className={styles.description}>
          I cookie necessari sono sempre attivi. Al momento non usiamo cookie di preferenza, statistiche o marketing:
          queste categorie restano disattivate anche scegliendo «Accetta tutti».
        </p>
        <CookieCategories detailed />
        <div className={styles.preferencesFooter}>
          <Link href="/cookie-policy" onClick={closePreferences} className={styles.policyLink}>Leggi la Cookie Policy</Link>
          <span>Puoi tornare qui dal footer, quando vuoi.</span>
        </div>
        <CookieConsentActions />
      </div>
    </dialog>
  );
}
