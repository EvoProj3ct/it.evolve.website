"use client";

import { useEffect, useState } from "react";
import { GhostLoading } from "@/components/GhostLoading";
import { homepageGhostBody } from "@/components/ghost-shape";
import styles from "./Storefront.module.css";

export function PaymentReturnFeedback({ checking, confirmed }: { checking: boolean; confirmed: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!confirmed) return;
    const timeout = window.setTimeout(() => setDismissed(true), 5000);
    return () => window.clearTimeout(timeout);
  }, [confirmed]);

  if (confirmed && !dismissed) {
    return <div className={styles.paymentOverlay} data-confirmed="true">
      <div className={styles.paymentOverlayCard} role="status" aria-live="polite" aria-atomic="true">
        <svg className={styles.paymentGhost} viewBox="-14 -14 28 28" aria-hidden="true">
          <path d={homepageGhostBody} fill="#72c94f" />
          <path d="M-6-2h4v5h-4zM2-2h4v5H2z" fill="#fcfdfb" />
          <path d="M-4 0h2v2h-2zM4 0h2v2H4z" fill="#172a1b" />
          <circle cx="9" cy="8" r="5.5" fill="#214c2b" />
          <path d="m6.5 8 1.5 1.5 3-3" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <strong>Pagamento effettuato con successo</strong>
      </div>
    </div>;
  }
  if (checking) {
    return <div className={styles.paymentOverlay}>
      <div className={styles.paymentOverlayCard}>
        <GhostLoading label="Stiamo verificando il pagamento…" />
      </div>
    </div>;
  }
  return null;
}
