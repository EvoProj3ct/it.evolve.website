"use client";

import { useState } from "react";
import { QuoteModelViewer } from "./QuoteModelViewer";
import styles from "./QuoteConfigurator.module.css";

export type QuoteModelOption = { label: string; url: string };

const materials = ["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon"] as const;
const dimensionFields = [
  { key: "width", label: "Larghezza" },
  { key: "height", label: "Altezza" },
  { key: "depth", label: "Profondità" },
] as const;

type Dimensions = Record<(typeof dimensionFields)[number]["key"], string>;

export function QuoteConfigurator({ models }: { models: QuoteModelOption[] }) {
  const [selectedUrl, setSelectedUrl] = useState(models[0]?.url ?? "");
  const [material, setMaterial] = useState<(typeof materials)[number]>("PLA");
  const [dimensions, setDimensions] = useState<Dimensions>({ width: "200", height: "120", depth: "80" });
  const selectedIndex = models.findIndex((model) => model.url === selectedUrl);
  const selectedModel = models[selectedIndex] ?? models[0];

  return (
    <div className={styles.layout}>
      <section className={styles.preview} aria-label="Anteprima del modello 3D selezionato">
        <div className={styles.previewGlow} aria-hidden="true" />
        <div className={styles.previewHeader}>
          <span>EVOLVE / 3D</span>
          <span>ANTEPRIMA MODELLO</span>
        </div>
        {selectedModel ? (
          <QuoteModelViewer url={selectedModel.url} label={selectedModel.label} />
        ) : (
          <p className={styles.empty}>Nessun modello 3D disponibile.</p>
        )}
        <div className={styles.previewFooter}>
          <strong>{selectedModel?.label ?? "Modello non selezionato"}</strong>
          <span>TRASCINA PER RUOTARE</span>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="quote-title">
        <div className={styles.intro}>
          <span className={styles.eyebrow}>PREVENTIVATORE / 3D</span>
          <h1 id="quote-title">
            <span className={styles.desktopTitle}>Dai forma<br />al tuo progetto.</span>
            <span className={styles.mobileTitle}>Preventivatore 3D</span>
          </h1>
          <p>Scegli il modello, il materiale e le dimensioni. L&apos;anteprima si aggiorna mentre componi la tua configurazione.</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <div className={styles.groupHeading}>
              <span>01 / MODELLO</span>
              <span>{models.length ? `${String(Math.max(0, selectedIndex) + 1).padStart(2, "0")} / ${String(models.length).padStart(2, "0")}` : "00 / 00"}</span>
            </div>
            <label className={styles.selectLabel} htmlFor="quote-model">Tipologia 3D</label>
            <div className={styles.selectWrap}>
              <select id="quote-model" value={selectedUrl} onChange={(event) => setSelectedUrl(event.target.value)} disabled={!models.length}>
                {models.map((model) => <option key={model.url} value={model.url}>{model.label}</option>)}
              </select>
              <span className={styles.selectChevron} aria-hidden="true" />
            </div>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.groupHeading}><span>02 / MATERIALE</span></div>
            <div className={styles.materials} role="group" aria-label="Materiale di stampa">
              {materials.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.material} ${material === option ? styles.materialSelected : ""}`}
                  aria-pressed={material === option}
                  onClick={() => setMaterial(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.groupHeading}><span>03 / DIMENSIONI</span><span>MM</span></div>
            <div className={styles.dimensions}>
              {dimensionFields.map(({ key, label }) => (
                <label key={key} className={styles.dimension}>
                  <span>{label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="2000"
                    step="1"
                    value={dimensions[key]}
                    onChange={(event) => setDimensions((current) => ({ ...current, [key]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
