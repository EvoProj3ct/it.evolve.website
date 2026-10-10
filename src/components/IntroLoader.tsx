"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./IntroLoader.module.css";

type Phase = "identity" | "line" | "reveal";

const LINE_START_MS = 650;
const LINE_DURATION_MS = 780;
const REVEAL_START_MS = LINE_START_MS + LINE_DURATION_MS + 90;
const CURTAIN_DELAY_S = 0.22;
const CURTAIN_DURATION_S = 0.66;
const HIDE_MS = REVEAL_START_MS + (CURTAIN_DELAY_S + CURTAIN_DURATION_S) * 1000 + 100;

export function IntroLoader() {
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState<Phase>("identity");
  const [topLogoReady, setTopLogoReady] = useState(false);
  const [bottomLogoReady, setBottomLogoReady] = useState(false);
  const logoReady = topLogoReady && bottomLogoReady;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(false);
      return;
    }
    if (!logoReady) return;

    const lineTimer = window.setTimeout(() => setPhase("line"), LINE_START_MS);
    const revealTimer = window.setTimeout(() => setPhase("reveal"), REVEAL_START_MS);
    const hideTimer = window.setTimeout(() => setShow(false), HIDE_MS);
    return () => {
      window.clearTimeout(lineTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(hideTimer);
    };
  }, [logoReady]);

  if (!show) return null;

  return (
    <div className={styles.loader} data-intro-loader role="status" aria-label="Caricamento di Evolve">
      <motion.div
        className={`${styles.curtain} ${styles.curtainTop}`}
        initial={{ y: "0%" }}
        animate={{ y: phase === "reveal" ? "-102%" : "0%" }}
        transition={{ duration: CURTAIN_DURATION_S, delay: phase === "reveal" ? CURTAIN_DELAY_S : 0, ease: [0.76, 0, 0.2, 1] }}
      >
        <div className={`${styles.logoPiece} ${styles.logoTop}`}>
          <Image src="/logo_bianco.png" alt="" width={345} height={286} priority onLoad={() => setTopLogoReady(true)} onError={() => setTopLogoReady(true)} />
        </div>
      </motion.div>
      <motion.div
        className={`${styles.curtain} ${styles.curtainBottom}`}
        initial={{ y: "0%" }}
        animate={{ y: phase === "reveal" ? "102%" : "0%" }}
        transition={{ duration: CURTAIN_DURATION_S, delay: phase === "reveal" ? CURTAIN_DELAY_S : 0, ease: [0.76, 0, 0.2, 1] }}
      >
        <div className={`${styles.logoPiece} ${styles.logoBottom}`}>
          <Image src="/logo_bianco.png" alt="" width={345} height={286} priority onLoad={() => setBottomLogoReady(true)} onError={() => setBottomLogoReady(true)} />
        </div>
      </motion.div>

      <motion.div
        className={styles.line}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase === "identity" ? 0 : 1, opacity: phase === "line" ? 1 : 0 }}
        transition={phase === "line"
          ? { scaleX: { duration: LINE_DURATION_MS / 1000, ease: [0.62, 0, 0.22, 1] }, opacity: { duration: 0.06 } }
          : { scaleX: { duration: 0 }, opacity: { duration: phase === "reveal" ? 0.22 : 0 } }}
      />
    </div>
  );
}
