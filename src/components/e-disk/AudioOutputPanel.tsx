"use client";

import { ArrowRight, ArrowUpRight, Bluetooth, Check, LoaderCircle, Pause, Play, RefreshCw, Speaker, Smartphone } from "lucide-react";
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
      <span className={styles.dialogEyebrow}>IL TUO SUONO</span>
      <h2 id="edisk-dialog-title">Dove vuoi<br />ascoltare?</h2>
      <div className={styles.audioRoute} aria-label="Il giradischi controlla il brano; questo dispositivo riproduce l’audio sull’uscita di sistema">
        <div data-connected={state.connected}><span><Bluetooth size={21} /></span><strong>Giradischi</strong><small>{state.connected ? "Collegato" : "Da collegare"}</small></div>
        <ArrowRight className={styles.routeArrow} size={15} aria-hidden="true" />
        <div><span><Smartphone size={21} /></span><strong>Tu sei qui</strong><small>Player</small></div>
        <ArrowRight className={styles.routeArrow} size={15} aria-hidden="true" />
        <div><span><Speaker size={21} /></span><strong>Uscita audio</strong><small>Di sistema</small></div>
      </div>
      <section className={styles.systemOutput} aria-labelledby="system-output-title">
        <div className={styles.outputHeading}><Speaker size={19} aria-hidden="true" /><div><h3 id="system-output-title">Musica e YouTube</h3><span>Seguono l’uscita del dispositivo</span></div></div>
        <p>Collega la cassa nelle impostazioni Bluetooth del telefono o computer, poi selezionala come uscita multimediale.</p>
        <p className={styles.outputNote}>Il collegamento al giradischi può restare attivo: i due collegamenti hanno funzioni diverse.</p>
      </section>
      {directSelection && <section className={styles.demoOutput} aria-labelledby="demo-output-title">
        <div className={styles.demoOutputHeading}><div><span className={styles.outputEyebrow}>SOLO PER IL TEST</span><h3 id="demo-output-title">{audio.label}</h3></div><button className={styles.iconButton} disabled={audio.selecting} onClick={onRefresh} aria-label="Aggiorna uscite audio disponibili"><RefreshCw size={16} /></button></div>
        {devices.length > 0 && <label className={styles.outputSelect}><span className={styles.srOnly}>Uscita audio della demo Test</span><select value={audio.deviceId} disabled={audio.selecting} onChange={event => onSelect(event.target.value)}><option value="">Uscita di sistema</option>{devices.map(device => <option key={device.id} value={device.id}>{device.label}</option>)}</select></label>}
        {audio.pickerAvailable && <button className={styles.secondaryButton} disabled={audio.selecting} onClick={onChoose}>{audio.selecting ? <LoaderCircle className={styles.spinner} size={16} /> : <Speaker size={16} />}{audio.selecting ? "Scelta in corso…" : "Scegli uscita per il Test"}<ArrowUpRight size={15} /></button>}
        <p className={styles.outputNote}>La scelta diretta vale per la demo. Per cambiare anche l’audio di YouTube, scegli l’uscita nelle impostazioni del dispositivo.</p>
      </section>}
      {!directSelection && <p className={styles.outputCompatibility}>In questo browser l’uscita audio si sceglie dalle impostazioni del dispositivo. La pagina la segue automaticamente.</p>}
      {audio.message && <p className={styles.outputMessage} data-error={audio.error} role={audio.error ? "alert" : "status"}>{!audio.error && !audio.selecting && <Check size={14} aria-hidden="true" />}{audio.message}</p>}
      {state.source === "test" && state.status === "error" && <p className={styles.formError} role="alert">{state.notice.text}</p>}
      <button className={styles.primaryButton} disabled={state.writePending || audio.selecting || (state.source === "test" && state.status === "loading")} onClick={onTest}>{testing ? "Metti in pausa" : state.source === "test" && state.status === "loading" ? "Avvio…" : "Ascolta un Test"}{testing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
    </>
  );
}
