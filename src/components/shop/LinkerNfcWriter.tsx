"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy, Nfc, QrCode, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ProductMark } from "./ProductMark";
import controls from "./Storefront.module.css";
import styles from "./LinkerNfcWriter.module.css";

type NfcReader = new () => {
  write(message: { records: { recordType: "url"; data: string }[] }, options: { overwrite: boolean; signal: AbortSignal }): Promise<void>;
};
type Feedback = { kind: "waiting" | "success" | "error" | "invalid" | "notice"; message: string };

function getReader() {
  if (!window.isSecureContext || window.top !== window) return;
  const Reader = (window as Window & { NDEFReader?: NfcReader }).NDEFReader;
  return typeof Reader === "function" ? Reader : undefined;
}

function parseLink(value: string) {
  const input = value.trim();
  if (!input || /[\s\\\u0000-\u001f\u007f]/u.test(input)) return null;
  const address = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  if (!/^https?:\/\//i.test(address)) return null;
  try {
    const url = new URL(address);
    return url.username || url.password ? null : url.href;
  } catch {
    return null;
  }
}

function writeError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Consenti l’accesso all’NFC nel browser e riprova.";
  if (name === "NotSupportedError" || name === "NotReadableError")
    return "Verifica che l’NFC sia attivo e che il tag di e-linker sia riscrivibile.";
  return "Scrittura non riuscita. Tieni fermo il portachiavi vicino al telefono e riprova. Se il link è lungo, prova con uno più breve.";
}

function pageUrl() {
  return window.location.origin + window.location.pathname;
}

export function LinkerNfcWriter() {
  const [link, setLink] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pageCopy, setPageCopy] = useState<{ url: string; copied: boolean } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const activeWrite = useRef<AbortController | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const waiting = feedback?.kind === "waiting";

  useEffect(() => {
    setAvailable(!!getReader());
    return () => {
      const pending = activeWrite.current;
      activeWrite.current = null;
      pending?.abort();
    };
  }, []);

  async function copyPage() {
    const url = pageUrl();
    try {
      await navigator.clipboard.writeText(url);
      setPageCopy({ url, copied: true });
    } catch {
      setPageCopy({ url, copied: false });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeWrite.current || available === null) return;
    const url = parseLink(link);
    if (!url) {
      setFeedback({ kind: "invalid", message: "Inserisci un indirizzo web valido, per esempio https://esempio.it." });
      field.current?.focus();
      return;
    }
    const Reader = getReader();
    if (!Reader) {
      try {
        await navigator.clipboard.writeText(url);
        setFeedback({ kind: "success", message: "Link copiato." });
      } catch {
        field.current?.focus();
        field.current?.select();
        setFeedback({ kind: "notice", message: "Copia il link selezionato dal menu del browser." });
      }
      return;
    }

    const controller = new AbortController();
    activeWrite.current = controller;
    setFeedback({ kind: "waiting", message: "Avvicina e-linker al retro del telefono e tienilo fermo fino alla conferma." });
    try {
      await new Reader().write({ records: [{ recordType: "url", data: url }] }, { overwrite: true, signal: controller.signal });
      if (activeWrite.current === controller)
        setFeedback({ kind: "success", message: "Link scritto su e-linker." });
    } catch (error) {
      if (activeWrite.current === controller)
        setFeedback(controller.signal.aborted ? { kind: "notice", message: "Scrittura annullata." } : { kind: "error", message: writeError(error) });
    } finally {
      if (activeWrite.current === controller) activeWrite.current = null;
    }
  }

  return <main id="shop-content" className={styles.page}>
    <div className={styles.content}>
      <Link href="/shop/e-linker/documentazione" className={styles.back}><ArrowLeft size={16} aria-hidden="true" /> Torna alla guida</Link>
      <div className={styles.heading}>
        <h1>Configura e-linker<span>.</span></h1>
        <ProductMark product="e-linker" className={styles.mark} />
      </div>

      {available === false && <section className={styles.handoff} aria-labelledby="linker-nfc-handoff">
        <Smartphone size={23} aria-hidden="true" />
        <div>
          <h2 id="linker-nfc-handoff">Apri dal telefono</h2>
          <p>Per scrivere dal browser, apri questa pagina in Chrome su un telefono Android con NFC attivo.</p>
          <div className={styles.actions}>
            <button type="button" className={controls.secondary} onClick={copyPage}>Copia il link della pagina <Copy size={14} aria-hidden="true" /></button>
            <button type="button" className={controls.secondary} aria-expanded={qrUrl !== null} aria-controls="linker-nfc-qr"
              onClick={() => setQrUrl(current => current ? null : pageUrl())}>Accedi con QR <QrCode size={16} aria-hidden="true" /></button>
          </div>
          <div role="status" className={styles.copyFeedback}>
            {pageCopy && (pageCopy.copied ? "Indirizzo della pagina copiato." : <>Copia questo indirizzo <span>{pageCopy.url}</span></>)}
          </div>
          <div id="linker-nfc-qr" hidden={!qrUrl}>
            {qrUrl && <figure className={styles.qr}>
              <QRCodeSVG value={qrUrl} size={208} marginSize={4} fgColor="#101914" title="QR per aprire Configura e-linker" />
              <figcaption>Inquadra il codice con la fotocamera del telefono.</figcaption>
            </figure>}
          </div>
        </div>
      </section>}

      <form className={styles.form} onSubmit={submit} noValidate>
        <label htmlFor="linker-nfc-url">Link da scrivere</label>
        <input ref={field} id="linker-nfc-url" className={styles.field} type="text" inputMode="url"
          autoCapitalize="none" autoComplete="url" spellCheck={false} placeholder="https://esempio.it" required
          value={link} readOnly={waiting} aria-invalid={feedback?.kind === "invalid" || undefined}
          aria-describedby={feedback?.kind === "invalid" ? "linker-nfc-feedback" : undefined}
          onChange={event => { setLink(event.target.value); setFeedback(null); }} />
        <div className={styles.actions}>
          <button type="submit" className={controls.primary} disabled={available === null || waiting}>
            {available === false ? <>Copia il link <Copy size={16} aria-hidden="true" /></> :
              <>{waiting ? "Scrittura in corso…" : "Scrivi su e-linker"} <Nfc size={18} aria-hidden="true" /></>}
          </button>
          {waiting && <button type="button" className={controls.secondary} onClick={() => activeWrite.current?.abort()}>Annulla</button>}
        </div>
        {available !== null && <p className={styles.hint}>{available
          ? "La scrittura sostituisce il link già presente sul tag."
          : "Puoi usare il link copiato in un’app di scrittura NFC sul tuo telefono."}</p>}
        <div id="linker-nfc-feedback" className={styles.feedback} role="status">
          {feedback && <p data-kind={feedback.kind}>
            {feedback.kind === "success" && <Check size={18} aria-hidden="true" />}
            {feedback.message}
          </p>}
        </div>
      </form>
    </div>
  </main>;
}
