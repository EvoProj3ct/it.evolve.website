"use client";

import { useEffect, useRef, useState } from "react";
import { ModelScene } from "./ModelScene";
import { LayerPrintScene } from "./LayerPrintScene";
import styles from "./ThreeDServiceExperience.module.css";

const steps = [
  {
    number: "01",
    label: "Dal disegno",
    title: "Le idee prendono forma.",
    copy: "Dalla prima linea al volume: uno spazio per raccontare il nostro processo di progettazione.",
  },
  {
    number: "02",
    label: "Alla materia",
    title: "Il volume cambia prospettiva.",
    copy: "Qui prenderanno posto materiali, tecniche e possibilità della stampa 3D.",
  },
  {
    number: "03",
    label: "Nello spazio",
    title: "Ogni forma trova il suo posto.",
    copy: "Gli elementi si costruiscono uno alla volta, fino a diventare una composizione.",
  },
  {
    number: "04",
    label: "Nuove prospettive",
    title: "Cambiare punto di vista cambia tutto.",
    copy: "Il disegno lascia spazio all'oggetto: profondità, proporzioni e dettagli si fanno visibili.",
  },
  {
    number: "05",
    label: "In movimento",
    title: "La forma si lascia esplorare.",
    copy: "Un'altra angolazione rivela quello che una vista dall'alto non può raccontare.",
  },
  {
    number: "06",
    label: "Dal modello al processo",
    title: "La geometria è pronta.",
    copy: "Definita la forma, il percorso continua: la costruzione può iniziare un livello alla volta.",
  },
] as const;

const printSteps = [
  {
    number: "07",
    label: "Il percorso",
    title: "Dal modello alla traiettoria.",
    copy: "La geometria si traduce in un percorso preciso. La testina ne segue il profilo, strato dopo strato.",
  },
  {
    number: "08",
    label: "La costruzione",
    title: "Un livello alla volta.",
    copy: "Ogni passaggio aggiunge materia al precedente. Il volume emerge lentamente dal disegno.",
  },
  {
    number: "09",
    label: "L'oggetto",
    title: "La forma diventa reale.",
    copy: "Le linee si sommano fino a comporre un oggetto, visibile da ogni lato e pronto per il passaggio successivo.",
  },
] as const;

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function ThreeDServiceExperience() {
  const designRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const lastPrintStepRef = useRef<HTMLElement>(null);
  const visualStageRef = useRef<HTMLDivElement>(null);
  const [designProgress, setDesignProgress] = useState(0);
  const [printProgress, setPrintProgress] = useState(0);
  const [handoff, setHandoff] = useState(0);
  const [printExitOffset, setPrintExitOffset] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const progressFor = (element: HTMLElement | null) => {
        if (!element) return 0;
        const rect = element.getBoundingClientRect();
        const distance = Math.max(1, rect.height - window.innerHeight);
        return clamp(-rect.top / distance);
      };
      const nextDesign = progressFor(designRef.current);
      const nextPrint = progressFor(printRef.current);
      const printTop = printRef.current?.getBoundingClientRect().top ?? window.innerHeight;
      const visualHeight = visualStageRef.current?.getBoundingClientRect().height ?? window.innerHeight;
      const mobile = window.innerWidth <= 800;
      const handoffStart = mobile ? window.innerHeight - visualHeight * .1 : window.innerHeight * .5;
      const handoffDistance = mobile ? visualHeight * .8 : window.innerHeight * .45;
      const transition = clamp(
        (handoffStart - printTop) / Math.max(1, handoffDistance)
      );
      const nextHandoff = transition * transition * (3 - 2 * transition);
      const lastStepTop = lastPrintStepRef.current?.getBoundingClientRect().top ?? window.innerHeight;
      // Carry the drawing through the entire final step at the same scroll distance as its text.
      const nextPrintExitOffset = Math.max(0, -lastStepTop);
      setDesignProgress((previous) => Math.abs(previous - nextDesign) < 0.001 ? previous : nextDesign);
      setPrintProgress((previous) => Math.abs(previous - nextPrint) < 0.001 ? previous : nextPrint);
      setHandoff((previous) => Math.abs(previous - nextHandoff) < 0.001 ? previous : nextHandoff);
      setPrintExitOffset((previous) => Math.abs(previous - nextPrintExitOffset) < .5 ? previous : nextPrintExitOffset);
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

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.experience}>
        <div ref={visualStageRef} className={styles.visualStage}>
          <aside className={`${styles.visual} ${styles.designVisual}`} style={{ opacity: 1 - handoff }} aria-label="Modello dimostrativo tridimensionale che si trasforma durante lo scorrimento">
            <ModelScene progress={designProgress} />
          </aside>
          <aside className={`${styles.visual} ${styles.printVisual}`} style={{ opacity: handoff }} aria-label="Animazione vettoriale della stampa di un modello 3D strato dopo strato">
            <LayerPrintScene progress={printProgress} exitOffset={printExitOffset} />
          </aside>
        </div>

        <div ref={designRef} className={`${styles.story} ${styles.designStory}`}>
          {steps.map((step, index) => (
            <section key={step.number} className={styles.step} aria-labelledby={`three-d-step-${index}`}>
              <div className={styles.stepInner}>
                <span className={styles.eyebrow}>{step.number} / {step.label}</span>
                {index === 0 && <p className={styles.overline}>PROGETTAZIONE E STAMPA 3D</p>}
                {index === 0 ? (
                  <h1 id={`three-d-step-${index}`} className={styles.title}>{step.title}</h1>
                ) : (
                  <h2 id={`three-d-step-${index}`} className={styles.title}>{step.title}</h2>
                )}
                <p className={styles.copy}>{step.copy}</p>
              </div>
            </section>
          ))}
        </div>
        <div ref={printRef} className={`${styles.story} ${styles.printStory}`}>
          {printSteps.map((step, index) => (
            <section key={step.number} ref={index === printSteps.length - 1 ? lastPrintStepRef : undefined} className={styles.step} aria-labelledby={`three-d-step-${step.number}`}>
              <div className={styles.stepInner}>
                <span className={styles.eyebrow}>{step.number} / {step.label}</span>
                <h2 id={`three-d-step-${step.number}`} className={styles.title}>{step.title}</h2>
                <p className={styles.copy}>{step.copy}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
