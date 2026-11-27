"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { LinkerStoryArtwork } from "./LinkerStoryArtwork";
import { PRODUCTS } from "./products";
import styles from "./Shop.module.css";

const autoplayDelay = 7000;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function cardSpacing(track: HTMLDivElement) {
  const first = track.children.item(0);
  const second = track.children.item(1);
  return first && second ? second.getBoundingClientRect().left - first.getBoundingClientRect().left : 0;
}

function scrollToPosition(track: HTMLDivElement, left: number) {
  track.scrollTo({ left, behavior: matchMedia(reducedMotionQuery).matches ? "auto" : "smooth" });
}

function scrollByCard(track: HTMLDivElement, direction: -1 | 1) {
  const step = cardSpacing(track);
  const limit = track.scrollWidth - track.clientWidth;
  if (step <= 0 || limit <= 0) return;

  const position = track.scrollLeft;
  const nextIndex = direction === 1 ? Math.floor((position + 1) / step) + 1 : Math.ceil((position - 1) / step) - 1;
  const destination = direction === 1 && position >= limit - 1 ? 0
    : direction === -1 && position <= 1 ? limit
    : Math.max(0, Math.min(limit, nextIndex * step));
  scrollToPosition(track, destination);
}

export function LinkerStoryCarousel() {
  const trackId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; left: number } | null>(null);
  const resumeAt = useRef(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || paused) return;

    const motion = matchMedia(reducedMotionQuery);
    const hover = matchMedia("(hover: hover)");
    let timer: number | undefined;
    let direction: -1 | 1 = 1;
    const observer = new IntersectionObserver(([entry]) => {
      if (timer !== undefined) window.clearInterval(timer);
      if (!entry || entry.intersectionRatio < 0.25) return;
      timer = window.setInterval(() => {
        if (motion.matches || document.hidden || drag.current || Date.now() < resumeAt.current ||
            track.matches(":focus-within") || (hover.matches && track.matches(":hover"))) return;

        if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 1) direction = -1;
        else if (track.scrollLeft <= 1) direction = 1;
        scrollByCard(track, direction);
      }, autoplayDelay);
    }, { threshold: 0.25 });
    observer.observe(track);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [paused]);

  function deferAutoplay() {
    resumeAt.current = Date.now() + autoplayDelay;
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    deferAutoplay();
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    event.preventDefault();
    const track = event.currentTarget;
    drag.current = { id: event.pointerId, x: event.clientX, left: track.scrollLeft };
    track.dataset.dragging = "true";
    track.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (gesture?.id !== event.pointerId) return;
    event.currentTarget.scrollLeft = gesture.left + (gesture.x - event.clientX) * 1.25;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    deferAutoplay();
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    const track = event.currentTarget;
    const step = cardSpacing(track);
    const position = track.scrollLeft;
    const limit = track.scrollWidth - track.clientWidth;
    delete track.dataset.dragging;
    if (step <= 0) return;
    const nearestCard = Math.max(0, Math.min(limit, Math.round(position / step) * step));
    scrollToPosition(track, limit - position < Math.abs(nearestCard - position) ? limit : nearestCard);
  }

  function moveCard(direction: -1 | 1) {
    deferAutoplay();
    if (trackRef.current) scrollByCard(trackRef.current, direction);
  }

  return <>
    <div id={trackId} ref={trackRef} className={`${styles.steps} ${styles.linkerStoryTrack}`}
      role="region" aria-label="Esempi d’uso NFC" tabIndex={0}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
      onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onWheel={event => { if (event.deltaX || event.shiftKey) deferAutoplay(); }}>
      {PRODUCTS["e-linker"].steps.map((step, index) => (
        <article key={step.scene} className={styles.step}>
          <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
          <div className={styles.stepGraphic}><LinkerStoryArtwork scene={step.scene} /></div>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </article>
      ))}
    </div>
    <div className={styles.linkerStoryControls}>
      <button type="button" aria-label="Esempio precedente" aria-controls={trackId} onClick={() => moveCard(-1)}><ChevronLeft size={17} aria-hidden="true" /></button>
      <button type="button" className={styles.linkerStoryPlayback} aria-controls={trackId}
        aria-label={paused ? "Riprendi lo scorrimento automatico" : "Metti in pausa lo scorrimento automatico"}
        onClick={() => setPaused(current => !current)}>
        {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
      </button>
      <button type="button" aria-label="Esempio successivo" aria-controls={trackId} onClick={() => moveCard(1)}><ChevronRight size={17} aria-hidden="true" /></button>
    </div>
  </>;
}
