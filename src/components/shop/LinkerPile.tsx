"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Hand, HandGrab, RotateCcw, Shuffle } from "lucide-react";
import { GhostLoading } from "@/components/GhostLoading";
import { ProductMark } from "./ProductMark";
import { SHOP_COLORS } from "./products";
import type { createLinkerPile } from "./linkerPileScene";
import styles from "./LinkerPile.module.css";

const fallbackMarks = SHOP_COLORS.map(({ hex }, index) => {
  const radius = Math.sqrt((index + 1) / SHOP_COLORS.length);
  const angle = index * 2.4;
  return {
    color: hex,
    ink: ["#171B19", "#114928", "#49504E", "#202D5A", "#660000", "#795442", "#3154F4"].includes(hex) ? "#F5F1E8" : "#263c42",
    left: `${50 + Math.cos(angle) * radius * 41}%`,
    top: `${50 + Math.sin(angle) * radius * 36}%`,
    rotation: `${Math.sin(index * 6.4) * 155}deg`,
  };
});

export function LinkerPile() {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<ReturnType<typeof createLinkerPile> | null>(null);
  const [phase, setPhase] = useState<"waiting" | "loading" | "ready" | "fallback">("waiting");

  useEffect(() => {
    const stage = host.current;
    if (!stage) return;
    let cancelled = false;
    const useFallback = () => {
      if (cancelled) return;
      controls.current?.dispose();
      controls.current = null;
      setPhase("fallback");
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPhase("loading");
      void import("./linkerPileScene").then(({ createLinkerPile }) => {
        if (cancelled) return;
        controls.current = createLinkerPile(stage, useFallback);
        setPhase("ready");
      }).catch(useFallback);
    }, { rootMargin: "180px" });
    observer.observe(stage);
    return () => {
      cancelled = true;
      observer.disconnect();
      controls.current?.dispose();
      controls.current = null;
    };
  }, []);

  return <section className={styles.section} aria-labelledby="linker-pile-title">
    <h2 id="linker-pile-title">Smucina la pila<span>.</span></h2>
    <div className={styles.panel}>
      <div ref={host} className={styles.stage} data-phase={phase}>
        <span className={styles.hand} aria-hidden="true"><Hand size={26} /><HandGrab size={26} /></span>
        {phase === "loading" && <div className={styles.loading}><GhostLoading label="Prepariamo il mucchio…" /></div>}
        {phase === "fallback" && <div className={styles.fallback} role="img" aria-label="Una pila di portachiavi e-linker colorati">
          {fallbackMarks.map(mark => <span key={mark.color} style={{ left: mark.left, top: mark.top, "--rotation": mark.rotation } as CSSProperties}>
            <ProductMark product="e-linker" primary={mark.color} secondary={mark.ink} />
          </span>)}
        </div>}
      </div>
      <div className={styles.toolbar}>
        <p>{phase === "fallback" ? "Anteprima 3D non disponibile su questo dispositivo." : "Passa la mano nel mucchio o trascina un e-linker."}</p>
        {phase !== "fallback" && <div className={styles.controls}>
          <button type="button" disabled={phase !== "ready"} onClick={() => controls.current?.stir()}><Shuffle size={16} aria-hidden="true" /> Mescola</button>
          <button type="button" disabled={phase !== "ready"} onClick={() => controls.current?.reset()}><RotateCcw size={16} aria-hidden="true" /> Ricomponi</button>
        </div>}
      </div>
    </div>
  </section>;
}
