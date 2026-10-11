"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MenuGhost } from "../MenuGhost";
import { AgentHardwareScene } from "./AgentHardwareScene";
import styles from "./AgentServiceExperience.module.css";

const introductionSteps = [
  {
    label: "L'idea",
    title: "Un agente. Una macchina. I tuoi dati.",
    copy: "Non ogni funzione IA ha bisogno di un'infrastruttura enorme. Un agente mirato può lavorare vicino a te, su un dispositivo compatto.",
  },
  {
    label: "La scheda",
    title: "Il lavoro importante accade qui.",
    copy: "OCR, lettura e organizzazione dei documenti: scegliamo modelli e processi adatti al compito e alla potenza disponibile.",
  },
  {
    label: "Il sistema",
    title: "Lo progettiamo con te. Poi resta tuo.",
    copy: "Per compiti mirati può bastare una configurazione nell'ordine di poche centinaia di euro. Ti aiutiamo a dimensionarla: con inferenza interamente locale non ci sono costi a chiamata cloud; hardware, energia e assistenza restano da valutare.",
  },
] as const;

const componentSteps = [
  {
    label: "La scheda",
    title: "Il cuore dell'agente.",
    copy: "Una Raspberry Pi 5 ospita il processo scelto per il tuo lavoro: qui, per esempio, un agente OCR dedicato ai documenti.",
  },
  {
    label: "La connessione",
    title: "Collegato. Senza allontanare i dati.",
    copy: "Ethernet o Wi-Fi collegano l'agente ai tuoi strumenti. Nei flussi progettati per restare locali, i documenti non devono uscire dalla tua rete.",
  },
  {
    label: "La continuità",
    title: "Ogni dettaglio sostiene il lavoro.",
    copy: "Alimentazione e dissipazione si progettano insieme al carico di lavoro, per un dispositivo che possa operare con continuità.",
  },
  {
    label: "Il contenitore",
    title: "Una forma pensata per te.",
    copy: "Progettiamo il supporto intorno alla scheda e alle porte. Evolve può stamparlo in 3D e personalizzarlo con il tuo brand.",
  },
] as const;

const parts = [
  { number: "01", name: "Scheda", detail: "Raspberry Pi 5 · Agente OCR", description: "La scheda esegue l'agente in locale e gestisce i documenti nella tua rete." },
  { number: "02", name: "Rete", detail: "Ethernet / Wi-Fi", description: "La connessione integra il dispositivo con gli strumenti che usi ogni giorno." },
  { number: "03", name: "Dissipazione", detail: "Continuità operativa", description: "Il dissipatore aiuta a mantenere stabile la scheda durante il lavoro prolungato." },
  { number: "04", name: "Case su misura", detail: "Stampa 3D · il tuo brand", description: "Base e coperchio sono progettati intorno all'hardware e personalizzabili per te." },
] as const;

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

type Point = { x: number; y: number };
type Leader = { start: Point; elbowX: number; end: Point };

export function AgentServiceExperience() {
  const gridRef = useRef<HTMLDivElement>(null);
  const introductionRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const componentsVisualRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [introductionProgress, setIntroductionProgress] = useState(0);
  const [componentsProgress, setComponentsProgress] = useState(0);
  const [handoff, setHandoff] = useState(0);
  const [visualFade, setVisualFade] = useState(0);
  const [hoveredPart, setHoveredPart] = useState<number | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      // The svh-sized grid is stable when a phone's browser toolbar hides.
      const viewport = gridRef.current?.offsetHeight ?? window.innerHeight;
      const progressFor = (element: HTMLElement | null) => {
        if (!element) return 0;
        const rect = element.getBoundingClientRect();
        return clamp(-rect.top / Math.max(1, rect.height - viewport));
      };
      const intro = progressFor(introductionRef.current);
      const components = progressFor(componentsRef.current);
      const componentTop = componentsRef.current?.getBoundingClientRect().top ?? viewport;
      const ctaTop = ctaRef.current?.getBoundingClientRect().top ?? viewport;
      const transition = clamp((viewport * .65 - componentTop) / Math.max(1, viewport * .5));
      const nextHandoff = transition * transition * (3 - 2 * transition);
      const fade = clamp((viewport * 1.2 - ctaTop) / Math.max(1, viewport * .45));
      const nextVisualFade = fade * fade * (3 - 2 * fade);
      setIntroductionProgress((previous) => Math.abs(previous - intro) < .001 ? previous : intro);
      setComponentsProgress((previous) => Math.abs(previous - components) < .001 ? previous : components);
      setHandoff((previous) => Math.abs(previous - nextHandoff) < .001 ? previous : nextHandoff);
      setVisualFade((previous) => Math.abs(previous - nextVisualFade) < .001 ? previous : nextVisualFade);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const activePart = Math.min(parts.length - 1, Math.floor(componentsProgress * (parts.length - 1) + .3));
  const emphasizedPart = hoveredPart ?? activePart;
  const updateLeaders = useCallback((anchors: Point[]) => {
    const visual = componentsVisualRef.current;
    if (!visual) return;
    const visualRect = visual.getBoundingClientRect();
    const mobile = window.innerWidth <= 800;
    const next = anchors.map((anchor, index) => {
      const rect = calloutRefs.current[index]?.getBoundingClientRect();
      const startsOnRight = !mobile && (index === 0 || index === 2);
      const start = {
        x: rect ? ((startsOnRight ? rect.right + 8 : rect.left - 8) - visualRect.left) / visualRect.width : .5,
        y: rect ? (rect.top + 10 - visualRect.top) / visualRect.height : .5,
      };
      const end = { x: clamp(anchor.x), y: clamp(anchor.y) };
      return { start, elbowX: mobile ? start.x - .1 : start.x + (end.x - start.x) * .48, end };
    });
    setLeaders((previous) => previous.length === next.length && previous.every((line, index) =>
      Math.abs(line.start.x - next[index].start.x) < .001 &&
      Math.abs(line.start.y - next[index].start.y) < .001 &&
      Math.abs(line.end.x - next[index].end.x) < .001 &&
      Math.abs(line.end.y - next[index].end.y) < .001
    ) ? previous : next);
  }, []);

  return (
    <main className={styles.page}>
      <div ref={gridRef} className={styles.grid} aria-hidden="true" />
      <div className={styles.experience}>
        <div className={styles.visualStage} style={{ opacity: 1 - visualFade }}>
          <div className={`${styles.visual} ${styles.introductionVisual}`} style={{ opacity: 1 - handoff }} role="img" aria-label="Raspberry Pi 5 che ruota durante lo scorrimento">
            <AgentHardwareScene progress={introductionProgress} mode="rotate" activePart={0} />
          </div>
          <div ref={componentsVisualRef} className={`${styles.visual} ${styles.componentsVisual}`} style={{ opacity: handoff }} role="img" aria-label="Scheda Raspberry Pi e componenti concettuali che si separano durante lo scorrimento">
            <AgentHardwareScene progress={componentsProgress} mode="explode" activePart={activePart} hoverPart={hoveredPart} onAnchorsChange={updateLeaders} onHoverPartChange={setHoveredPart} />
            <div className={styles.callouts} aria-hidden="true">
              <svg className={styles.leaders} viewBox="0 0 1 1" preserveAspectRatio="none">
                {leaders.map((line, index) => (
                  <polyline
                    key={parts[index].number}
                    className={`${styles.leader} ${emphasizedPart === index ? styles.leaderActive : index < activePart ? styles.leaderSeen : ""}`}
                    points={`${line.start.x},${line.start.y} ${line.elbowX},${line.start.y} ${line.elbowX},${line.end.y} ${line.end.x},${line.end.y}`}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {parts.map((part, index) => (
                <div key={part.number} ref={(element) => { calloutRefs.current[index] = element; }} className={`${styles.callout} ${styles[`callout${index + 1}`]} ${hoveredPart === index ? styles.calloutHovered : emphasizedPart === index ? styles.calloutActive : index < activePart ? styles.calloutSeen : ""}`}>
                  <span className={styles.calloutNumber}>{part.number} / {part.name}</span>
                  <strong>{part.detail}</strong>
                  {hoveredPart === index && <p className={styles.calloutDescription}>{part.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div ref={introductionRef} className={`${styles.story} ${styles.introductionStory}`}>
          {introductionSteps.map((step, index) => (
            <section key={step.label} className={styles.step} aria-labelledby={`agent-step-${index}`}>
              <div className={styles.stepInner}>
                <span className={styles.eyebrow}>{String(index + 1).padStart(2, "0")} / {step.label}</span>
                {index === 0 && <p className={styles.overline}>PROGETTAZIONE AGENTI IA</p>}
                {index === 0 ? (
                  <h1 id={`agent-step-${index}`} className={styles.title}>{step.title}</h1>
                ) : (
                  <h2 id={`agent-step-${index}`} className={styles.title}>{step.title}</h2>
                )}
                <p className={styles.copy}>{step.copy}</p>
              </div>
            </section>
          ))}
        </div>
        <div ref={componentsRef} className={`${styles.story} ${styles.componentsStory}`}>
          {componentSteps.map((step, index) => (
            <section key={step.label} className={styles.step} aria-labelledby={`agent-component-${index}`}>
              <div className={styles.stepInner}>
                <span className={styles.eyebrow}>{String(index + introductionSteps.length + 1).padStart(2, "0")} / {step.label}</span>
                <h2 id={`agent-component-${index}`} className={styles.title}>{step.title}</h2>
                <p className={styles.copy}>{step.copy}</p>
              </div>
            </section>
          ))}
        </div>
        <section ref={ctaRef} className={styles.cta} aria-label="Contatto per un agente IA">
          <Link href="/contact" className={styles.ctaLink}>
            <span className={styles.ctaLabel}>
              <span className={styles.ctaGhost}><MenuGhost /></span>
              Parliamone
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
