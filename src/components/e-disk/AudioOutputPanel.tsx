"use client";

import { ArrowUpRight, Check, LoaderCircle, Pause, Play, RefreshCw, Speaker } from "lucide-react";
import type { EDiskState } from "@/lib/e-disk/controller";
import styles from "./EDisk.module.css";

type Props = {
  state: EDiskState;
  onChoose: () => void;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onTest: () => void;
};

export default function AudioOutputPanel({ state, onChoose, onSelect, onRefresh, onTest }: Props) {
  const audio = state.audioOutput;
  const testing = state.source === "test" && state.status === "playing";
  const directSelection = audio.routingAvailable && (audio.pickerAvailable || audio.devices.length > 0 || Boolean(audio.deviceId));
  const devices = audio.deviceId && !audio.devices.some(device => device.id === audio.deviceId) ? [{ id: audio.deviceId, label: audio.label }, ...audio.devices] : audio.devices;
  return (
    <>
      <section className={`${styles.connectionCard} ${styles.audioConnections}`} aria-labelledby="system-output-title">
        <div className={styles.connectionCardHeading}><span className={styles.connectionCardIcon}><Speaker size={21} /></span><div><h3 id="system-output-title">Cassa e cuffie</h3><p>YouTube · uscita del dispositivo</p></div><span className={styles.connectionBadge}>Sistema</span></div>
        <p className={styles.connectionCardDetail}>Per YouTube, abbina la cassa al telefono o computer e sceglila come uscita multimediale.</p>
      {directSelection && <section className={styles.demoOutput} aria-labelledby="demo-output-title">
        <div className={styles.demoOutputHeading}><div><span className={styles.outputEyebrow}>SOLO PER IL TEST</span><h3 id="demo-output-title">{audio.label}</h3></div><button className={styles.iconButton} disabled={audio.selecting} onClick={onRefresh} aria-label="Aggiorna uscite audio disponibili"><RefreshCw size={16} /></button></div>
        {devices.length > 0 && <label className={styles.outputSelect}><span className={styles.srOnly}>Uscita audio della demo Test</span><select value={audio.deviceId} disabled={audio.selecting} onChange={event => onSelect(event.target.value)}><option value="">Uscita di sistema</option>{devices.map(device => <option key={device.id} value={device.id}>{device.label}</option>)}</select></label>}
        {audio.pickerAvailable && <button className={styles.secondaryButton} disabled={audio.selecting} onClick={onChoose}>{audio.selecting ? <LoaderCircle className={styles.spinner} size={16} /> : <Speaker size={16} />}{audio.selecting ? "Scelta in corso…" : "Scegli uscita per il Test"}<ArrowUpRight size={15} /></button>}
        <p className={styles.outputNote}>La scelta diretta vale per la demo. Per cambiare anche l’audio di YouTube, scegli l’uscita nelle impostazioni del dispositivo.</p>
      </section>}
      {!directSelection && <div className={styles.systemOnlyOutput}><Speaker size={16} aria-hidden="true" /><p>{audio.routingAvailable ? "Il browser non ha reso disponibili altre uscite. Puoi scegliere la cassa dalle impostazioni del dispositivo." : "Il browser non offre un selettore per collegare la cassa dalla pagina. La musica segue l’uscita scelta sul dispositivo."}</p></div>}
      {audio.message && <p className={styles.outputMessage} data-error={audio.error} role={audio.error ? "alert" : "status"}>{!audio.error && !audio.selecting && <Check size={14} aria-hidden="true" />}{audio.message}</p>}
      </section>
      {state.source === "test" && state.status === "error" && <p className={styles.formError} role="alert">{state.notice.text}</p>}
      <button className={styles.primaryButton} disabled={state.writePending || audio.selecting || (state.source === "test" && state.status === "loading")} onClick={onTest}>{testing ? "Metti in pausa" : state.source === "test" && state.status === "loading" ? "Avvio…" : "Ascolta un Test"}{testing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
    </>
  );
}
