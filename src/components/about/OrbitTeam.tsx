"use client";

import Image from "next/image";
import { motion, useAnimationControls, useAnimationFrame, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { team } from "./team";
import styles from "./OrbitTeam.module.css";

const TAU = Math.PI * 2;
const STEP = TAU / team.length;
const TILT = -8 * Math.PI / 180;
const COS = Math.cos(TILT);
const SIN = Math.sin(TILT);
const RX = 430;
const RY = 96;
const INITIAL_PHASE = 210 * Math.PI / 180;
const CRUISING_SPEED = TAU / 36_000;
const MAX_FLING_SPEED = CRUISING_SPEED * 4;
const MOMENTUM_DECAY_MS = 900;

// The SVG rail and the portraits use the same projection, including its tilt.
function orbitPoint(angle: number) {
  const depth = (Math.sin(angle) + 1) / 2;
  return {
    x: 600 + RX * Math.cos(angle) * COS - RY * Math.sin(angle) * SIN,
    y: 260 + RX * Math.cos(angle) * SIN + RY * Math.sin(angle) * COS,
    scale: 0.84 + depth * 0.16,
    rotate: -5 + Math.cos(angle) * 13,
    opacity: 0.74 + depth * 0.26,
    layer: Math.round(10 + depth * 20),
  };
}

function pointerAngle(x: number, y: number, bounds: DOMRect) {
  const dx = (x - bounds.left) / bounds.width * 1200 - 600;
  const dy = (y - bounds.top) / bounds.height * 520 - 260;
  return Math.atan2((-dx * SIN + dy * COS) / RY, (dx * COS + dy * SIN) / RX);
}

type PhotoOrigin = { x: number; y: number; width: number; height: number; rotate: number };
type DragSession = {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  time: number;
  moved: boolean;
  velocity: number;
  bounds: DOMRect;
};

function OrbitMarker({ phase, offset }: { phase: MotionValue<number>; offset: number }) {
  const cx = useTransform(phase, value => orbitPoint(value + offset).x);
  const cy = useTransform(phase, value => orbitPoint(value + offset).y);
  return <motion.circle cx={cx} cy={cy} r="4" className={styles.railMarker} />;
}

function OrbitPortrait({ index, phase, selected, register, onOpen }: {
  index: number;
  phase: MotionValue<number>;
  selected: boolean;
  register: (button: HTMLButtonElement | null) => void;
  onOpen: () => void;
}) {
  const person = team[index];
  const point = useTransform(phase, value => orbitPoint(value - index * STEP));
  const left = useTransform(point, value => `${value.x / 12}%`);
  const top = useTransform(point, value => `${value.y / 5.2}%`);
  const scale = useTransform(point, value => value.scale);
  const rotate = useTransform(point, value => value.rotate);
  const opacity = useTransform(point, value => value.opacity);
  const zIndex = useTransform(point, value => value.layer);

  return (
    <motion.div className={styles.portraitPosition} style={{ left, top, x: "-50%", y: "-50%", scale, rotate, opacity: selected ? 0 : opacity, zIndex }}>
      <button ref={register} type="button" className={styles.portrait} onClick={onOpen} aria-label={`Conosci ${person.name} ${person.surname}`} aria-haspopup="dialog" aria-controls="team-profile">
        <span className={styles.photo} data-orbit-photo="">
          <Image src={person.image} alt={`${person.name} ${person.surname}`} fill sizes="(max-width: 700px) 29vw, (max-width: 1200px) 21vw, 242px" style={{ objectPosition: person.position }} draggable={false} priority />
          <span className={styles.photoIndex}>0{index + 1}</span>
        </span>
        <span className={styles.caption}><span>{person.name}<br />{person.surname}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.4" /></svg></span>
      </button>
    </motion.div>
  );
}

function ProfileDialog({ index, getOrigin, onClosed }: { index: number; getOrigin: () => PhotoOrigin | null; onClosed: () => void }) {
  const person = team[index];
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const originRef = useRef(getOrigin);
  const controls = useAnimationControls();
  const [leaving, setLeaving] = useState(false);
  originRef.current = getOrigin;

  const travelToOrigin = useCallback(() => {
    const origin = originRef.current();
    const bounds = slotRef.current?.getBoundingClientRect();
    if (!origin || !bounds || !bounds.width || !bounds.height) return { x: 0, y: 18, width: "100%", height: "100%", rotate: 0 };
    return {
      x: origin.x - bounds.left - origin.width / 2,
      y: origin.y - bounds.top - origin.height / 2,
      width: origin.width,
      height: origin.height,
      rotate: origin.rotate,
    };
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousGutter = root.style.scrollbarGutter;
    root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    dialog.showModal();
    let disposed = false;
    const destination = slotRef.current?.getBoundingClientRect();
    controls.set({ ...travelToOrigin(), opacity: 1 });
    void controls.start({ x: 0, y: 0, width: destination?.width ?? "100%", height: destination?.height ?? "100%", rotate: 0, opacity: 1, transition: reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 230, damping: 28, mass: 1 } }).then(() => {
      if (!disposed && !closingRef.current) controls.set({ width: "100%", height: "100%" });
    });
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      disposed = true;
      controls.stop();
      dialog.close();
      root.style.overflow = previousOverflow;
      root.style.scrollbarGutter = previousGutter;
    };
  }, [controls, reduceMotion, travelToOrigin]);

  const close = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setLeaving(true);
    await controls.start({ ...travelToOrigin(), opacity: 1, transition: { duration: reduceMotion ? 0 : .46, ease: [.22, 1, .36, 1] } });
    onClosed();
  }, [controls, onClosed, reduceMotion, travelToOrigin]);

  return (
    <dialog ref={dialogRef} id="team-profile" className={styles.profileDialog} aria-labelledby="team-profile-title" aria-describedby="team-profile-biography" onCancel={event => { event.preventDefault(); void close(); }}>
      <motion.div className={styles.profileScrim} aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : .3 }} onClick={() => void close()} />
      <div className={styles.profileViewport} onClick={event => { if (event.target === event.currentTarget) void close(); }}>
        <article className={styles.profileSheet}>
          <motion.div className={styles.profilePaper} initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : .24, delay: leaving || reduceMotion ? 0 : .15 }} />
          <div ref={slotRef} className={styles.profileSlot}>
            <motion.div className={styles.profilePhoto} initial={{ opacity: 0 }} animate={controls}>
              <Image src={person.image} alt={`Ritratto di ${person.name} ${person.surname}`} fill sizes="(max-width: 700px) 90vw, 430px" style={{ objectPosition: person.position }} draggable={false} priority />
              <span className={styles.profilePhotoIndex}>EVOLVE / 0{index + 1}</span>
            </motion.div>
          </div>
          <motion.div className={styles.profileCopy} initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: leaving ? 0 : 1, y: leaving && !reduceMotion ? 8 : 0 }} transition={{ duration: reduceMotion ? 0 : .28, delay: leaving || reduceMotion ? 0 : .22 }}>
            <p className={styles.profileEyebrow}>0{index + 1} / EVOLVE</p>
            <h2 id="team-profile-title">{person.name}<br />{person.surname}<span>.</span></h2>
            <div className={styles.profileBiography}>
              <p className={styles.bioLabel}>DESCRIZIONE IN ARRIVO</p>
              <p id="team-profile-biography">{person.biography}</p>
            </div>
          </motion.div>
          <motion.button ref={closeRef} type="button" className={styles.profileClose} onClick={() => void close()} aria-label="Chiudi la scheda e torna alle foto" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : .2, delay: leaving || reduceMotion ? 0 : .28 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" /></svg>
          </motion.button>
        </article>
      </div>
    </dialog>
  );
}

export function OrbitTeam() {
  const reduceMotion = useReducedMotion();
  const phase = useMotionValue(INITIAL_PHASE);
  const stageRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const dragRef = useRef<DragSession | null>(null);
  const velocityRef = useRef(CRUISING_SPEED);
  const directionRef = useRef(1);
  const visibleRef = useRef(true);
  const suppressClickRef = useRef(false);
  const selectedRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useAnimationFrame((_time, delta) => {
    if (reduceMotion || !visibleRef.current || dragRef.current?.moved || selectedRef.current !== null) return;
    const dt = Math.min(delta, 32);
    const cruising = directionRef.current * CRUISING_SPEED;
    const momentum = velocityRef.current - cruising;
    const decay = Math.exp(-dt / MOMENTUM_DECAY_MS);
    // Integrate the decaying impulse, settling into a continuous orbit.
    phase.set(phase.get() + cruising * dt + momentum * MOMENTUM_DECAY_MS * (1 - decay));
    velocityRef.current = cruising + momentum * decay;
  });

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || selectedRef.current !== null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    suppressClickRef.current = false;
    dragRef.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, angle: pointerAngle(event.clientX, event.clientY, bounds), time: event.timeStamp, moved: false, velocity: 0, bounds };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.moved = true;
      suppressClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    const next = pointerAngle(event.clientX, event.clientY, drag.bounds);
    const distance = Math.atan2(Math.sin(next - drag.angle), Math.cos(next - drag.angle));
    const dt = Math.max(8, event.timeStamp - drag.time);
    phase.set(phase.get() + distance);
    drag.velocity = Math.max(-MAX_FLING_SPEED, Math.min(MAX_FLING_SPEED, drag.velocity * .35 + distance / dt * .65));
    drag.angle = next;
    drag.time = event.timeStamp;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) {
      const releasedSpeed = !cancelled && event.timeStamp - drag.time <= 100 ? drag.velocity : 0;
      if (Math.abs(releasedSpeed) > CRUISING_SPEED * .2) directionRef.current = Math.sign(releasedSpeed);
      velocityRef.current = directionRef.current * Math.max(CRUISING_SPEED, Math.min(MAX_FLING_SPEED, Math.abs(releasedSpeed)));
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  const rotate = (direction: number) => {
    if (selectedRef.current !== null) return;
    if (reduceMotion) phase.set(phase.get() + direction * STEP / 3);
    else {
      directionRef.current = direction;
      velocityRef.current = direction * Math.min(MAX_FLING_SPEED, Math.max(CRUISING_SPEED * 2, Math.abs(velocityRef.current)));
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    rotate(event.key === "ArrowLeft" ? -1 : 1);
  };

  const originFor = (index: number): PhotoOrigin | null => {
    const photo = buttonsRef.current[index]?.querySelector<HTMLElement>("[data-orbit-photo]");
    if (!photo) return null;
    const bounds = photo.getBoundingClientRect();
    const point = orbitPoint(phase.get() - index * STEP);
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, width: photo.offsetWidth * point.scale, height: photo.offsetHeight * point.scale, rotate: point.rotate };
  };

  const openProfile = (index: number) => {
    if (suppressClickRef.current || selectedRef.current !== null) return;
    velocityRef.current = directionRef.current * CRUISING_SPEED;
    selectedRef.current = index;
    setSelected(index);
  };

  const closeProfile = () => {
    const previous = selectedRef.current;
    selectedRef.current = null;
    setSelected(null);
    if (previous !== null) buttonsRef.current[previous]?.focus({ preventScroll: true });
  };

  return (
    <div className={styles.experience}>
      <div ref={stageRef} className={styles.stage} data-dragging={dragging} role="group" aria-label="Il team di Evolve: trascina i ritratti per ruotare l’orbita, selezionane uno per aprire la scheda" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)} onLostPointerCapture={event => endDrag(event, true)} onKeyDown={onKeyDown} onClickCapture={event => { if (suppressClickRef.current) { event.preventDefault(); event.stopPropagation(); suppressClickRef.current = false; } }} onDragStart={event => event.preventDefault()}>
        <svg className={styles.rails} viewBox="0 0 1200 520" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <ellipse cx="600" cy="260" rx={RX} ry={RY} transform="rotate(-8 600 260)" className={styles.mainRail} vectorEffect="non-scaling-stroke" />
          <ellipse cx="600" cy="260" rx="358" ry="151" transform="rotate(12 600 260)" className={styles.secondaryRail} vectorEffect="non-scaling-stroke" />
          <path d="M59 260h20m-10-10v20m1042-10h20m-10-10v20" className={styles.crosshairs} vectorEffect="non-scaling-stroke" />
          {[0, 1, 2].map(index => <OrbitMarker key={index} phase={phase} offset={(index + .5) * STEP} />)}
        </svg>
        {team.map((person, index) => <OrbitPortrait key={person.id} index={index} phase={phase} selected={selected === index} register={button => { buttonsRef.current[index] = button; }} onOpen={() => openProfile(index)} />)}
      </div>
      <div className={styles.controls}>
        <div className={styles.arrows}>
          <button type="button" onClick={() => rotate(-1)} aria-label="Ruota i ritratti a sinistra">←</button>
          <button type="button" onClick={() => rotate(1)} aria-label="Ruota i ritratti a destra">→</button>
        </div>
      </div>
      {selected !== null && <ProfileDialog index={selected} getOrigin={() => originFor(selected)} onClosed={closeProfile} />}
    </div>
  );
}
