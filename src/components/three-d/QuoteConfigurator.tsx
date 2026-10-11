"use client";

import { useRef, useState, type FormEvent } from "react";
import { QuoteModelViewer } from "./QuoteModelViewer";
import styles from "./QuoteConfigurator.module.css";

export type QuoteModelOption = { label: string; url: string };

const materials = ["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon"] as const;
const maxDwgSize = 10 * 1024 * 1024;
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
  const [dwgFile, setDwgFile] = useState<File | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedIndex = models.findIndex((model) => model.url === selectedUrl);
  const selectedModel = models[selectedIndex] ?? models[0];

  const clearRequestFeedback = () => {
    setRequestState("idle");
    setMessage("");
  };

  const openRequest = () => {
    const validDimensions = Object.values(dimensions).every((value) => /^\d{1,4}$/.test(value) && Number(value) >= 1 && Number(value) <= 2000);
    if (!validDimensions) {
      setMessage("Inserisci dimensioni tra 1 e 2000 mm.");
      return;
    }
    clearRequestFeedback();
    dialogRef.current?.showModal();
  };

  const chooseDwg = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".dwg") || file.size === 0 || file.size > maxDwgSize) {
      setMessage("Seleziona un file DWG di massimo 10 MB.");
      setDwgFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setDwgFile(file);
    setMessage("");
    setRequestState("idle");
  };

  const sendRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestState === "sending") return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("model", selectedModel?.label ?? "");
    form.set("material", material);
    for (const { key } of dimensionFields) form.set(key, dimensions[key]);
    if (dwgFile) form.set("dwg", dwgFile, dwgFile.name);

    setRequestState("sending");
    setMessage("");
    try {
      const response = await fetch("/api/3d-quote-requests", { method: "POST", body: form });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Invio non riuscito. Riprova.");
      setRequestState("success");
      setMessage("Richiesta inviata. Ti risponderemo via email.");
      setDwgFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      formElement.reset();
      dialogRef.current?.close();
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Invio non riuscito. Riprova.");
    }
  };

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
        <h1 id="quote-title" className={styles.visuallyHidden}>Preventivatore 3D</h1>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <div className={styles.groupHeading}>
              <span>01 / MODELLO</span>
              <span>{models.length ? `${String(Math.max(0, selectedIndex) + 1).padStart(2, "0")} / ${String(models.length).padStart(2, "0")}` : "00 / 00"}</span>
            </div>
            <label className={styles.selectLabel} htmlFor="quote-model">Tipologia 3D</label>
            <div className={styles.selectWrap}>
              <select id="quote-model" value={selectedUrl} onChange={(event) => { setSelectedUrl(event.target.value); clearRequestFeedback(); }} disabled={!models.length}>
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
                  onClick={() => { setMaterial(option); clearRequestFeedback(); }}
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
                    onChange={(event) => { setDimensions((current) => ({ ...current, [key]: event.target.value })); clearRequestFeedback(); }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.requestButton} onClick={openRequest}>
              Manda richiesta di preventivo
            </button>
            <button type="button" className={styles.uploadButton} onClick={() => fileInputRef.current?.click()}>
              Carica DWG
            </button>
            <input ref={fileInputRef} className={styles.visuallyHidden} type="file" accept=".dwg" aria-label="Seleziona un file DWG" tabIndex={-1} onChange={(event) => chooseDwg(event.target.files?.[0])} />
          </div>
          {(dwgFile || message) && requestState !== "sending" && (
            <p className={styles.actionFeedback} role="status">{message || `DWG: ${dwgFile?.name}`}</p>
          )}
        </div>
      </section>

      <dialog ref={dialogRef} className={styles.requestDialog} aria-labelledby="request-dialog-title">
        <form onSubmit={sendRequest}>
          <div className={styles.dialogHeading}>
            <h2 id="request-dialog-title">Richiedi un preventivo</h2>
            <button type="button" className={styles.dialogClose} aria-label="Chiudi" onClick={() => dialogRef.current?.close()}>×</button>
          </div>
          <label className={styles.dialogField}>Nome<input name="name" autoComplete="name" required maxLength={100} /></label>
          <label className={styles.dialogField}>Email<input name="email" type="email" autoComplete="email" required maxLength={160} /></label>
          <input className={styles.visuallyHidden} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {dwgFile && <p className={styles.dialogFile}>DWG allegato: {dwgFile.name}</p>}
          <label className={styles.dialogConsent}>
            <input type="checkbox" name="privacyAccepted" required />
            <span>Ho letto l&apos;<a href="/privacy" target="_blank" rel="noopener noreferrer">informativa privacy</a> e acconsento all&apos;uso dei dati per questa richiesta.</span>
          </label>
          {requestState === "error" && <p className={styles.dialogError} role="alert">{message}</p>}
          <button type="submit" className={styles.dialogSubmit} disabled={requestState === "sending"}>
            {requestState === "sending" ? "Invio in corso…" : "Invia richiesta"}
          </button>
        </form>
      </dialog>
    </div>
  );
}
