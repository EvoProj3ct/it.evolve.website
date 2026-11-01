"use client";

import { useCookieConsent } from "./cookie-consent-provider";
import styles from "./cookie-consent.module.css";

export function CookieConsentActions() {
  const { confirmSettings } = useCookieConsent();

  return (
    <div className={styles.actions}>
      <button type="button" className={`${styles.action} ${styles.acceptAction}`} onClick={() => confirmSettings("all")}>Accetta tutti</button>
      <button type="button" className={styles.action} onClick={() => confirmSettings("selected")}>Accetta selezionati</button>
      <button type="button" className={styles.action} onClick={() => confirmSettings("rejected")}>Rifiuta</button>
    </div>
  );
}
