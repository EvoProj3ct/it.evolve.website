"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./ClientsGrid.module.css";

type Client = {
  name: string;
  href: string;
  logo: string;
  wide?: boolean;
};

const clients: Client[] = [
  { name: "Devit", href: "https://www.devit.cloud/", logo: "/clients/logo_devit.png" },
  { name: "Schulz", href: "https://schulzitalia.com", logo: "/clients/logo_schulz.png" },
  { name: "Centro Idea Casa", href: "https://www.centroideacasa.it/", logo: "/clients/logo_centroideacasa.png" },
  { name: "Ediljomida", href: "https://ediljomida.it/", logo: "/clients/logo_ediljomida.png" },
  { name: "Centro Airone", href: "https://www.instagram.com/centroolistico_airone/", logo: "/clients/logo_airone.png" },
  { name: "Billy's", href: "https://www.instagram.com/billys_ristopub/", logo: "/clients/logo_billys.png" },
  { name: "Eurometal", href: "https://www.eurometalvalmontone.it/", logo: "/clients/logo_eurometal.png", wide: true },
  { name: "japporomano", href: "https://japporomano.com", logo: "/clients/logo_japporomano.png" },
  { name: "FIMEP", href: "https://fimep.it/", logo: "/clients/logo_fimep.png" },
  { name: "NG Infissi", href: "https://www.nginfissisrl.com/", logo: "/clients/logo_ng.png" },
];

export function ClientsGrid() {
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const settleRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);
  const touchActiveRef = useRef(false);
  const step = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const first = track.children[0] as HTMLElement | undefined;
    const second = track.children[1] as HTMLElement | undefined;
    if (!first || !second) return 0;
    return second.getBoundingClientRect().left - first.getBoundingClientRect().left;
  };
  const cycleWidth = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const first = track.children[0] as HTMLElement | undefined;
    const repeat = track.children[clients.length] as HTMLElement | undefined;
    if (!first || !repeat) return 0;
    return repeat.getBoundingClientRect().left - first.getBoundingClientRect().left;
  };
  const normalize = () => {
    const track = trackRef.current;
    const cycle = cycleWidth();
    if (!track || !cycle) return;
    if (track.scrollLeft < cycle - 1) track.scrollLeft += cycle;
    else if (track.scrollLeft >= cycle * 2 - 1) track.scrollLeft -= cycle;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let previousCycle = cycleWidth();
    track.scrollLeft = previousCycle;
    const onResize = () => {
      const nextCycle = cycleWidth();
      if (!nextCycle || Math.abs(nextCycle - previousCycle) < 0.5) return;
      const relativePosition = previousCycle ? (track.scrollLeft - previousCycle) / previousCycle : 0;
      track.scrollLeft = nextCycle * (1 + relativePosition);
      previousCycle = nextCycle;
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(track);
    return () => {
      observer.disconnect();
      if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    };
  }, []);

  const onTrackScroll = () => {
    if (animationRef.current !== null || touchActiveRef.current) return;
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(settle, 420);
  };

  const cardsToMove = () => {
    const track = trackRef.current;
    const cardStep = step();
    if (!track || !cardStep) return 0;
    return track.clientWidth / cardStep < 2 ? 3 : 4;
  };

  const animate = (distance: number, duration = 1950) => {
    const track = trackRef.current;
    if (!track || !distance) return;
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
    const start = track.scrollLeft;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      track.scrollLeft = start + distance;
      normalize();
      wheelLockRef.current = false;
      return;
    }
    track.style.scrollSnapType = "none";
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      track.scrollLeft = start + distance * eased;
      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(tick);
      } else {
        animationRef.current = null;
        normalize();
        track.style.scrollSnapType = "";
        wheelLockRef.current = false;
      }
    };
    animationRef.current = window.requestAnimationFrame(tick);
  };

  const settle = () => {
    const track = trackRef.current;
    if (!track) return;
    if (!window.matchMedia("(max-width: 700px)").matches) {
      normalize();
      return;
    }
    const cardStep = step();
    const cycle = cycleWidth();
    if (!cardStep || !cycle) return;
    const nearest = cycle + Math.round((track.scrollLeft - cycle) / cardStep) * cardStep;
    const distance = nearest - track.scrollLeft;
    if (Math.abs(distance) > 1) animate(distance, 520);
    else normalize();
  };

  const move = (direction: -1 | 1) => animate(step() * cardsToMove() * direction);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (wheelLockRef.current) return;
      const delta = event.deltaX || event.deltaY;
      if (!delta) return;
      wheelLockRef.current = true;
      animate(step() * cardsToMove() * Math.sign(delta));
    };
    const onTouchStart = () => {
      touchActiveRef.current = true;
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    };
    const onTouchEnd = () => {
      touchActiveRef.current = false;
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
      settleRef.current = window.setTimeout(settle, 420);
    };

    track.addEventListener("wheel", onWheel, { passive: false });
    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchend", onTouchEnd, { passive: true });
    track.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      track.removeEventListener("wheel", onWheel);
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <section className={styles.section} aria-labelledby="clients-title" data-clients-section>
      <div className={styles.heading}>
        <h2 id="clients-title">I nostri clienti</h2>
      </div>

      <div className={styles.track} ref={trackRef} onScroll={onTrackScroll} aria-label="Clienti Evolve">
        {[0, 1, 2].flatMap((copy) => clients.map((client) => (
          <Link
            key={`${copy}-${client.name}`}
            data-client-card
            href={client.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.card}
            aria-hidden={copy !== 1}
            tabIndex={copy === 1 ? 0 : -1}
            aria-label={`Apri ${client.name} in una nuova scheda`}
          >
            <span className={styles.media}>
              <img
                className={`${styles.logo} ${client.wide ? styles.wideLogo : ""}`}
                src={client.logo}
                alt=""
                loading="lazy"
              />
            </span>
            <span className={styles.cardTitle}>{client.name}</span>
            <span className={styles.visit}>Visita il sito <span aria-hidden="true">↗</span></span>
          </Link>
        )))}
      </div>

      <div className={styles.controls}>
        <div className={styles.arrows}>
          <button type="button" onClick={() => move(-1)} aria-label="Clienti precedenti">←</button>
          <button type="button" onClick={() => move(1)} aria-label="Clienti successivi">→</button>
        </div>
      </div>
    </section>
  );
}
