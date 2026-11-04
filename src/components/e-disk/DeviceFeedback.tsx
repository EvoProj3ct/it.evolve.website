"use client";

import { AlertCircle, ArrowUpRight, Bluetooth, Check, LoaderCircle, Nfc, X } from "lucide-react";
import type { EDiskState } from "@/lib/e-disk/controller";
import styles from "./EDisk.module.css";

type Actions = { onCancel: () => void; onDismiss: () => void; onAssociate: (code: string) => void };
const CONNECTION_STEPS = ["choosing", "connecting", "services", "notifications"];
export const CONNECTION_COPY: Record<EDiskState["connectionStep"], { title: string; detail: string }> = {
  idle: { title: "Giradischi disconnesso", detail: "Puoi continuare ad ascoltare dal browser." },
  choosing: { title: "Scegli il giradischi", detail: "Seleziona EVOLVE-E-DISK nella finestra Bluetooth del browser." },
  connecting: { title: "Ci stiamo collegando", detail: "Connessione Bluetooth al giradischi in corso…" },
  services: { title: "Prepariamo il collegamento", detail: "Attivazione dei comandi del giradischi…" },
  notifications: { title: "Un ultimo istante", detail: "Attivazione degli aggiornamenti NFC e del giradischi…" },
  ready: { title: "Giradischi connesso", detail: "Bluetooth attivo" },
  disconnecting: { title: "Disconnessione in corso", detail: "Arresto della riproduzione e chiusura del collegamento…" },
  error: { title: "Collegamento non riuscito", detail: "Riprova a connettere il giradischi." },
};

export function NfcProcess({ state, onCancel, onDismiss, onAssociate }: { state: EDiskState } & Actions) {
  const { nfc, writePending } = state;
  if (nfc.phase === "idle") return null;
  const busy = nfc.phase === "sending" || nfc.phase === "cancelling";
  const error = nfc.phase === "error";
  const success = nfc.phase === "written" || nfc.phase === "recognized";
  const titles = {
    idle: "", recognized: "Disco riconosciuto", unmapped: "Un disco da associare", sending: "Prepariamo il tuo disco",
    waiting: "Avvicina il tag", cancelling: "Annullamento in corso", written: "Scritto. E verificato.", cancelled: "Scrittura annullata", error: "NFC: serve un altro tentativo",
  };
  const Icon = busy ? LoaderCircle : error ? AlertCircle : success ? Check : Nfc;
  return (
    <div className={styles.nfcProcess} data-phase={nfc.phase} data-tone={error ? "error" : success ? "success" : "neutral"}>
      <span className={styles.processIcon} aria-hidden="true"><Icon size={22} className={busy ? styles.spinner : undefined} /></span>
      <div className={styles.processContent}>
        <div role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} aria-atomic="true">
          <h3>{titles[nfc.phase]}</h3>
          {nfc.code && <span className={styles.processRecord}>{nfc.title ? `${nfc.title} · ` : ""}Disco {nfc.code}</span>}
          <p>{nfc.phase === "waiting" && state.motor === "decel" ? "Il piatto si sta fermando. Tieni il tag sul lettore: la scrittura inizierà appena sarà fermo." : nfc.phase === "recognized" && state.status === "cued" ? "Il tag è stato letto. Premi Play nel player per avviare il brano." : nfc.message}</p>
        </div>
        {nfc.phase === "waiting" && nfc.secondsLeft !== null && <div className={styles.writeCountdown} aria-live="off"><progress value={nfc.secondsLeft} max={30} aria-label="Tempo disponibile per avvicinare il tag" /><span aria-hidden="true">{nfc.secondsLeft ? `${nfc.secondsLeft} s` : "Attendo conferma…"}</span></div>}
      </div>
      <div className={styles.processActions}>
        {writePending ? <button className={styles.processAction} disabled={nfc.phase === "cancelling"} onClick={onCancel}>Annulla <X size={13} /></button>
          : nfc.phase === "unmapped" ? <button className={styles.processAction} onClick={() => onAssociate(nfc.code)}>Associa brano <ArrowUpRight size={15} /></button>
            : <button className={styles.processDismiss} onClick={onDismiss} aria-label="Chiudi aggiornamento NFC"><X size={16} /></button>}
      </div>
    </div>
  );
}

export function DeviceFeedback({ state, onCancel, onDismiss, onAssociate, onConnect }: { state: EDiskState; onConnect: () => void } & Actions) {
  if (!state.connected && !state.connecting && state.connectionStep !== "error" && state.nfc.phase === "idle") return null;
  const copy = CONNECTION_COPY[state.connectionStep];
  const step = CONNECTION_STEPS.indexOf(state.connectionStep);
  const moving = state.motor === "accel" || state.motor === "max" || state.motor === "decel";
  return (
    <section className={styles.deviceFeedback} aria-label="Collegamento e operazioni NFC">
      <div className={styles.connectionFeedback} data-connected={state.connected} data-error={state.connectionStep === "error"}>
        <span className={styles.connectionIcon} aria-hidden="true">{state.connecting ? <LoaderCircle className={styles.spinner} size={20} /> : state.connectionStep === "error" ? <AlertCircle size={20} /> : <Bluetooth size={20} />}</span>
        <div className={styles.connectionCopy} role="status" aria-live="polite" aria-atomic="true"><h2>{copy.title}</h2><p>{state.connectionStep === "error" ? state.notice.text || copy.detail : state.connected && !state.connecting ? state.deviceName : copy.detail}</p></div>
        {state.connecting && step >= 0 ? <span className={styles.connectionProgress} aria-hidden="true">{CONNECTION_STEPS.map((name, index) => <i key={name} data-complete={index < step} data-current={index === step} />)}</span>
          : state.connectionStep === "error" ? <button className={styles.processAction} onClick={onConnect}>Riprova <ArrowUpRight size={15} /></button>
            : state.connected && state.nfc.phase === "idle" ? <span className={styles.readerReady}><Nfc size={17} />{moving ? "Lettura NFC a disco fermo" : "Avvicina un disco al lettore"}</span> : null}
      </div>
      <NfcProcess state={state} onCancel={onCancel} onDismiss={onDismiss} onAssociate={onAssociate} />
    </section>
  );
}
