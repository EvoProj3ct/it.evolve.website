"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BrandStatement.module.css";

const STATEMENT = "In Evolve, crediamo che la conoscenza delle tecnologie più moderne sia il bene più importante di un'azienda moderna.";
const CHARACTERS = Array.from(STATEMENT);

export function BrandStatement() {
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleCount(CHARACTERS.length);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setStarted(true);
      observer.disconnect();
    }, { threshold: 0.4 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || visibleCount >= CHARACTERS.length) return;
    const previous = CHARACTERS[visibleCount - 1];
    const delay = previous === "." ? 260 : previous === "," ? 150 : 34;
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 1), delay);
    return () => window.clearTimeout(timer);
  }, [started, visibleCount]);

  const visible = CHARACTERS.slice(0, visibleCount).join("");

  return (
    <section ref={sectionRef} className={styles.section} aria-label="La visione di Evolve">
      <h2 className={styles.statement} aria-label={STATEMENT}>
        <span aria-hidden="true">
          {visibleCount > 0 && (
            <>
              {visible.slice(0, -1)}
              <span key={visibleCount} className={styles.latest}>{visible.slice(-1)}</span>
            </>
          )}
          <span className={styles.caret} />
        </span>
      </h2>
    </section>
  );
}
