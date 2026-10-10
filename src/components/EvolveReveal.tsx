"use client";

import Image from "next/image";
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import styles from "./EvolveReveal.module.css";

export function EvolveReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const scrollYProgress = useMotionValue(0);
  const automaticProgress = useMotionValue(0);
  const progress = useSpring(scrollYProgress, { stiffness: 95, damping: 32, mass: 0.8 });
  const scale = useTransform<number, number>(
    [automaticProgress, progress],
    ([automatic, scroll]) => Math.min(1, 0.74 + automatic * 0.235 + scroll * 0.025),
  );
  const radius = useTransform<number, number>(
    [automaticProgress, progress],
    ([automatic, scroll]) => Math.max(0, 30 - automatic * 20 - scroll * 10),
  );
  const logoY = useTransform(progress, [0, 1], [10, -14]);
  const ambientY = useTransform(progress, [0, 1], [24, -32]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || reduceMotion) return;

    let frame = 0;
    let opened = false;
    let opening: ReturnType<typeof animate> | undefined;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const value = travel > 0 ? -rect.top / travel : 1;
      scrollYProgress.set(Math.max(0, Math.min(1, value)));

      if (!opened && rect.top < window.innerHeight * 0.15 && rect.bottom > 0) {
        opened = true;
        opening = animate(automaticProgress, 1, { duration: 1.55, ease: [0.45, 0, 0.2, 1] });
      } else if (opened && rect.top >= window.innerHeight) {
        opening?.stop();
        automaticProgress.set(0);
        opened = false;
      }
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(section);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.cancelAnimationFrame(frame);
      opening?.stop();
    };
  }, [automaticProgress, reduceMotion, scrollYProgress]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let lockedUntil = 0;
    let touchStartY = 0;
    let completionTimer = 0;
    let exiting = false;
    const active = () => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 96 && rect.bottom > window.innerHeight * 0.35;
    };
    const goToNextSection = () => {
      const next = section.nextElementSibling;
      if (!(next instanceof HTMLElement)) return;
      lockedUntil = performance.now() + 900;
      next.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    };
    const completeExpansion = () => {
      const rect = section.getBoundingClientRect();
      const remaining = Math.max(0, rect.height - window.innerHeight + rect.top);
      lockedUntil = performance.now() + 750;
      window.scrollBy({ top: remaining, behavior: reduceMotion ? "auto" : "smooth" });
    };
    const checkCompletion = () => {
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel > 0 && -rect.top / travel < 0.98) exiting = false;
      const full = automaticProgress.get() >= 0.98
        && rect.bottom <= window.innerHeight + 2
        && rect.bottom >= window.innerHeight - 2;
      if (!full || exiting) {
        window.clearTimeout(completionTimer);
        completionTimer = 0;
        return;
      }
      if (completionTimer) return;
      completionTimer = window.setTimeout(() => {
        completionTimer = 0;
        const latest = section.getBoundingClientRect();
        if (!active() || latest.bottom > window.innerHeight + 2
          || latest.bottom < window.innerHeight - 2) return;
        exiting = true;
        goToNextSection();
      }, 420);
    };
    const unsubscribeAutomatic = automaticProgress.on("change", checkCompletion);
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0 || event.ctrlKey || !active()
        || !(event.target instanceof Node) || !section.contains(event.target)) return;
      event.preventDefault();
      if (performance.now() < lockedUntil) return;
      if (reduceMotion) goToNextSection();
      else if (scrollYProgress.get() < 0.995) completeExpansion();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? touchStartY;
      if (touchStartY - currentY > 8 && active()) event.preventDefault();
    };
    const onTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      if (touchStartY - endY <= 45 || !active() || performance.now() < lockedUntil) return;
      if (reduceMotion) goToNextSection();
      else if (scrollYProgress.get() < 0.995) completeExpansion();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", checkCompletion, { passive: true });
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: false });
    section.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", checkCompletion);
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchmove", onTouchMove);
      section.removeEventListener("touchend", onTouchEnd);
      unsubscribeAutomatic();
      window.clearTimeout(completionTimer);
    };
  }, [automaticProgress, reduceMotion, scrollYProgress]);

  return (
    <section ref={sectionRef} className={styles.section} aria-label="Evolve">
      <div className={styles.sticky}>
        <motion.div
          className={styles.frame}
          style={reduceMotion ? undefined : { scale, borderRadius: radius }}
        >
          <motion.div
            className={styles.ambient}
            aria-hidden="true"
            style={reduceMotion ? undefined : { y: ambientY }}
          />
          <motion.div className={styles.identity} style={reduceMotion ? undefined : { y: logoY }}>
            <Image src="/logo_bianco.png" alt="Evolve" width={345} height={286} className={styles.logo} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
