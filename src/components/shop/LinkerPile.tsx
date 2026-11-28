"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Hand } from "lucide-react";
import styles from "./LinkerPile.module.css";

export function LinkerPile({ children }: { children: ReactNode }) {
  const playground = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const area = playground.current;
    const button = surface.current;
    const drawing = canvas.current;
    if (!area || !button || !drawing) return;
    const controller = new AbortController();
    const { signal } = controller;
    let cleanup: (() => void) | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || signal.aborted) return;
      observer.disconnect();
      void import("./linkerCarpet").then(({ drawLinkerCarpet }) => drawLinkerCarpet(area, button, drawing, signal)).then(dispose => {
        if (signal.aborted) dispose?.();
        else cleanup = dispose;
      }).catch(() => {
        if (!signal.aborted) setUnavailable(true);
      });
    }, { rootMargin: "320px" });
    observer.observe(button);

    return () => {
      controller.abort();
      observer.disconnect();
      cleanup?.();
    };
  }, []);

  return <div className={styles.playground} ref={playground}>
    <div className={styles.carpet}>
      <button type="button" className={styles.surface} ref={surface} disabled={unavailable} aria-label="Sposta i portachiavi e-linker" />
    </div>
    {!unavailable && <canvas className={styles.artwork} ref={canvas} aria-hidden="true" />}
    <span className={styles.hand} aria-hidden="true"><Hand size={29} /></span>
    {children}
  </div>;
}
