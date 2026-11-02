"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./BrandStatement.module.css";

const STATEMENT = "In Evolve, crediamo che la conoscenza delle tecnologie più moderne sia lo strumento più importante a disposizione dell'imprenditore moderno.";
type BrandStatementProps = {
  text?: string;
  variant?: "light" | "inverted";
  label?: string;
};

export function BrandStatement({ text = STATEMENT, variant = "light", label = "La visione di Evolve" }: BrandStatementProps) {
  const characters = useMemo(() => Array.from(text), [text]);
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const complete = visibleCount >= characters.length;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    setStarted(false);
    setVisibleCount(0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleCount(characters.length);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setStarted(true);
      observer.disconnect();
    }, { threshold: 0.4 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [characters]);

  useEffect(() => {
    if (!started || visibleCount >= characters.length) return;
    const previous = characters[visibleCount - 1];
    const delay = previous === "." ? 260 : previous === "," ? 150 : 34;
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 1), delay);
    return () => window.clearTimeout(timer);
  }, [started, visibleCount, characters]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || complete) return;

    let touchStartY = 0;
    const active = () => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 4 && rect.bottom > window.innerHeight * 0.35;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY > 0 && !event.ctrlKey && active()) event.preventDefault();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchStartY;
      if (touchStartY > currentY && active()) event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "ArrowDown" || event.key === "PageDown" || event.key === " " || event.key === "End") && active()) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [complete]);

  const visible = characters.slice(0, visibleCount).join("");

  return (
    <section ref={sectionRef} className={`${styles.section} ${variant === "inverted" ? styles.inverted : ""}`} aria-label={label} data-brand-statement data-typing-complete={complete ? "true" : "false"}>
      <h2 className={styles.statement} aria-label={text}>
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
