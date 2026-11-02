"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bluetooth, Check, Download, Ellipsis, LoaderCircle, Nfc, Pause, Pencil, Play, Plus, RefreshCw, SkipBack, SkipForward, Square, Trash2, Upload, Volume2, X } from "lucide-react";
import { cleanCatalog, generateCode, validCode, youtubeId, type DiskTrack } from "@/lib/e-disk/catalog";
import { EDiskController, INITIAL_EDISK, type EDiskState } from "@/lib/e-disk/controller";
import styles from "./EDisk.module.css";

const TurntableScene = dynamic(() => import("./TurntableScene"), { ssr: false });
type Modal = { kind: "add" } | { kind: "edit" | "write" | "remove"; track: DiskTrack } | { kind: "import"; tracks: DiskTrack[] } | { kind: "connection" };
const COVER_COLORS = ["#83c967", "#b0a0d1", "#df9b83", "#a3cbbd", "#ddca8c"];
const RECORD_COLORS = ["#b4ef78", "#8cebd9", "#9fd5ff", "#c6a7f5", "#ffa6d4", "#ffbf92", "#e9ee84", "#a7efbd"];
function recordColor(code: string) {
  // Distribuzione casuale alla vista, stabile per codice anche dopo un'importazione.
  let hash = 2166136261;
  for (const character of code) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return RECORD_COLORS[(hash >>> 0) % RECORD_COLORS.length];
}
const motorLabel: Record<EDiskState["motor"], string> = { unknown: "In attesa", idle: "Fermo", accel: "In accelerazione", max: "A regime", decel: "In rallentamento" };
const time = (value: number) => `${Math.floor(Math.max(0, value) / 60)}:${String(Math.floor(Math.max(0, value) % 60)).padStart(2, "0")}`;

const NOTE_HEAD = "M2 21h2v-2h5v2h2v4H9v2H4v-2H2Z";
const PAIRED_HEADS = "M0 22h2v-2h5v2h2v4H7v2H2v-2H0ZM14 18h2v-2h5v2h2v4h-2v2h-5v-2h-2Z";
const PAIRED_STEMS = "M7 6h3v18H7ZM21 3h3v17h-3Z";
const NOTE_BEAM = "M7 6h4V5h4V4h4V3h5v4h-5v1h-4v1h-4v1H7Z";
const NOTES = [
  { kind: "single", path: `${NOTE_HEAD}M9 3h3v3h3v2h3v2h2v5h-3v-3h-3V9h-2v14H9Z` },
  { kind: "pair", path: `${PAIRED_HEADS}${PAIRED_STEMS}${NOTE_BEAM}` },
  { kind: "single", path: `${NOTE_HEAD}M9 3h3v20H9Z` },
  { kind: "pair", path: `${PAIRED_HEADS}${PAIRED_STEMS}${NOTE_BEAM}M7 12h4v-1h4v-1h4V9h5v3h-5v1h-4v1h-4v1H7Z` },
  { kind: "pair", path: `${PAIRED_HEADS}${PAIRED_STEMS}${NOTE_BEAM}` },
  { kind: "single", path: `${NOTE_HEAD}M9 3h3v3h3v2h3v2h2v5h-3v-3h-3V9h-2v14H9Z` },
  { kind: "single", path: `${NOTE_HEAD}M9 3h3v20H9Z` },
  { kind: "pair", path: `${PAIRED_HEADS}${PAIRED_STEMS}${NOTE_BEAM}` },
];

function Ghosts({ playing }: { playing: boolean }) {
  return (
    <div className={styles.ghosts} data-playing={playing} aria-hidden="true">
      <div className={styles.notes}>
        {NOTES.map((note, index) => <svg key={index} data-note={note.kind} style={{ "--i": index, "--drift": `${(index % 3 - 1) * 23}px`, "--rise": `${88 + index % 3 * 19}px`, "--tilt": `${(index % 2 ? 1 : -1) * 12}deg` } as CSSProperties} viewBox="0 0 26 30" shapeRendering="crispEdges"><path d={note.path} fill="currentColor" /></svg>)}
      </div>
      {["#72c94f", "#8567c1", "#ff7771"].map((color, index) => (
        <svg key={color} className={styles.ghost} style={{ "--i": index } as CSSProperties} viewBox="-15 -18 30 30">
          <g shapeRendering="crispEdges">
            <path d="M-4-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H-3V6H-6V8H-10V-4H-8V-6H-6V-8H-4Z" fill={color} />
            <path d="M-6-2h4v5h-4ZM2-2h4v5H2Z" fill="#fcfdfb" />
            <path d="M-4 0h2v2h-2ZM4 0h2v2H4Z" fill="#15221a" />
            <path d="M-10-8v-4h4v-2H6v2h4v4H8v-2H5v-2H-5v2H-8v2Z" fill="#9bb292" />
            <path d="M-13-6h5v9h-5ZM8-6h5v9H8Z" fill="#253a2e" />
            <path d="M-12-4h2v5h-2ZM10-4h2v5h-2Z" fill="#afc7ac" />
          </g>
        </svg>
      ))}
    </div>
  );
}

function Vinyl({ color, small = false }: { color: string; small?: boolean }) {
  return <span className={`${styles.vinyl} ${small ? styles.vinylSmall : ""}`} style={{ "--record-color": color } as CSSProperties} aria-hidden="true"><span /><i /></span>;
}

export default function EDiskExperience() {
  const [state, setState] = useState<EDiskState>(INITIAL_EDISK);
  const controller = useRef<EDiskController | null>(null);
  const playerHost = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [form, setForm] = useState({ title: "", url: "", code: "" });
  const [formError, setFormError] = useState("");
  const [writeBusy, setWriteBusy] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState("");
  const reducedMotion = Boolean(useReducedMotion());
  const playing = state.status === "playing";
  const isTest = state.source === "test";
  const title = isTest ? "Green room" : state.active?.title || "Scegli il tuo prossimo disco.";

  useEffect(() => {
    if (!playerHost.current) return;
    const instance = new EDiskController(playerHost.current, setState);
    controller.current = instance;
    const leave = () => instance.stop();
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); instance.dispose(); controller.current = null; };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (modal) {
      if (!element.open) element.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = previous; };
    }
    if (element.open) element.close();
  }, [modal]);

  const open = (value: Modal) => {
    setFormError("");
    if (value.kind === "add") {
      let code = "";
      try { code = generateCode(state.tracks); } catch { /* Il codice resta inseribile a mano. */ }
      setForm({ title: "", url: "", code });
    } else if (value.kind === "edit") setForm({ title: value.track.title, url: `https://www.youtube.com/watch?v=${value.track.youtubeId}`, code: value.track.code });
    setModal(value);
  };
  const close = () => { setModal(null); setFormError(""); };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!controller.current || (modal?.kind !== "add" && modal?.kind !== "edit")) return;
    const id = youtubeId(form.url);
    if (!id) { setFormError("Inserisci un link o un ID YouTube valido."); return; }
    if (!validCode(form.code)) { setFormError("Il codice deve contenere da 4 a 8 cifre."); return; }
    try { controller.current.upsert({ title: form.title, youtubeId: id, code: form.code }, modal.kind === "edit" ? modal.track.code : undefined); close(); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Non riesco a salvare il disco."); }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 512 * 1024) throw new Error("Il file è troppo grande. Il limite è 512 KB.");
      const value: unknown = JSON.parse(await file.text());
      if (!Array.isArray(value) || value.length > 200) throw new Error("Scegli un catalogo JSON con un massimo di 200 dischi.");
      const tracks = cleanCatalog(value);
      if (!tracks.length || tracks.length !== value.length) throw new Error("Il file contiene codici duplicati o dischi non validi. Servono code, title e youtubeId.");
      open({ kind: "import", tracks });
    } catch (error) { controller.current?.notify(error instanceof Error ? error.message : "Non riesco a leggere il catalogo.", true); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  };

  const exportCatalog = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.tracks, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "evolve-catalogo.json"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const writeTag = async (track: DiskTrack) => {
    setWriteBusy(true);
    try { await controller.current?.write(track.code); close(); }
    finally { setWriteBusy(false); }
  };
  const simulate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const track = state.tracks.find(item => item.code === simulatedCode.trim());
    if (!track) { setFormError("Nessun disco associato a questo codice."); return; }
    void controller.current?.select(track); close();
  };
  const closeMenu = (event: MouseEvent) => { event.currentTarget.closest("details")?.removeAttribute("open"); };

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div><Link href="/utils" className={styles.breadcrumb}>Risorse <span aria-hidden="true">/</span></Link><h1>e-disk<span>.</span></h1><p>Il vinile incontra il digitale.</p></div>
          <div className={styles.headerActions}>
            <button className={`${styles.connect} ${state.connected ? styles.connected : ""}`} disabled={state.connecting} onClick={() => void (state.connected ? controller.current?.disconnect() : controller.current?.connect())}>
              {state.connecting ? <LoaderCircle className={styles.spinner} size={17} /> : state.connected ? <Check size={17} /> : <Bluetooth size={17} />}
              {state.connecting ? "Connessione…" : state.connected ? "Disconnetti" : "Connetti giradischi"}
            </button>
            <button className={styles.testButton} aria-pressed={isTest && playing} onClick={() => { if (isTest && playing) controller.current?.pause(); else void controller.current?.test(); }}>
              {isTest && playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />} Test
            </button>
          </div>
        </header>

        <section className={styles.listeningRoom} aria-label="Giradischi e riproduzione">
          <div className={styles.stage} data-playing={playing}>
            <div className={styles.stageOrbits} aria-hidden="true"><i /><i /><i /></div>
            <div className={styles.stageTopline}><span><i data-active={playing} />{playing ? "Ora in ascolto" : "Prenditi il tuo tempo"}</span><span className={styles.stageMark}>e / d</span></div>
            <TurntableScene playing={playing} reducedMotion={reducedMotion} />
            <Ghosts playing={playing} />
            <div className={styles.stageBottom}><span>{isTest ? "DEMO / 90 BPM" : playing ? "LATO A / PLAY" : "LATO A"}</span><span className={styles.soundBars} data-playing={playing} aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} style={{ "--i": index, "--height": `${8 + (index * 7 % 19)}px` } as CSSProperties} />)}</span></div>
          </div>

          <aside className={styles.player} aria-label="Player audio">
            <div className={styles.playerMedia} data-youtube={state.source === "youtube"}>
              <div ref={playerHost} className={styles.youtube} hidden={state.source !== "youtube"} />
              {state.source !== "youtube" && <div className={styles.playerArtwork} data-playing={playing}><span className={styles.artworkWord}>e-disk</span><Vinyl color="#81c962" /><span className={styles.artworkBottom}>{isTest ? "GREEN ROOM" : "YOUR SOUND, YOUR SPACE."}</span></div>}
            </div>
            <div className={styles.trackHeading}><div><p className={styles.sourceLabel}>{isTest ? "Demo originale · sintetizzata" : state.source === "youtube" ? "YouTube" : "La tua sessione"}</p><h2>{title}</h2></div>{state.active && <a href={`https://www.youtube.com/watch?v=${state.active.youtubeId}`} target="_blank" rel="noreferrer" className={styles.iconButton} aria-label="Apri il brano su YouTube"><ArrowUpRight size={20} /></a>}</div>
            <div className={styles.progress}>
              <input type="range" aria-label="Posizione nel brano" min="0" max={state.duration || 1} step="1" value={Math.min(state.currentTime, state.duration || 1)} disabled={state.source !== "youtube" || !state.duration || state.status === "loading"} onChange={event => controller.current?.seek(Number(event.target.value))} style={{ "--progress": `${state.duration ? Math.min(100, state.currentTime / state.duration * 100) : 0}%` } as CSSProperties} />
              <div><span>{time(state.currentTime)}</span><span>{state.duration ? time(state.duration) : "—:—"}</span></div>
            </div>
            <div className={styles.transport}>
              <button className={styles.iconButton} disabled={!state.tracks.length} aria-label="Disco precedente" onClick={() => controller.current?.next(-1)}><SkipBack size={21} fill="currentColor" /></button>
              <button className={styles.playButton} disabled={state.source === "none" || state.status === "loading"} aria-label={playing ? "Pausa" : "Riproduci"} onClick={() => void controller.current?.playPause()}>{state.status === "loading" ? <LoaderCircle className={styles.spinner} size={23} /> : playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button>
              <button className={styles.iconButton} disabled={!state.tracks.length} aria-label="Disco successivo" onClick={() => controller.current?.next(1)}><SkipForward size={21} fill="currentColor" /></button>
              <button className={styles.stopButton} disabled={state.source === "none"} aria-label="Ferma riproduzione" onClick={() => controller.current?.stop()}><Square size={15} fill="currentColor" /></button>
            </div>
            <label className={styles.volume}><Volume2 size={17} /><span className={styles.srOnly}>Volume</span><input type="range" min="0" max="100" value={state.volume} onChange={event => controller.current?.volume(Number(event.target.value))} /><span>{state.volume}</span></label>
            <button className={styles.deviceStatus} onClick={() => open({ kind: "connection" })}><span className={styles.statusDot} data-connected={state.connected} /><span>{state.connected ? state.deviceName : "Ascolto dal browser"}</span><Ellipsis size={19} /></button>
          </aside>
        </section>

        <div className={styles.noticeArea}>
          <p className={styles.notice} data-error={state.notice.error} role="status" aria-live="polite">{state.notice.text || (!state.persistent ? "La collezione resta in questa sessione: esportala per conservarla." : "")}</p>
          {state.writePending && <button className={styles.textButton} onClick={() => void controller.current?.cancelWrite()}>Annulla scrittura <X size={14} /></button>}
        </div>

        <section className={styles.collection} aria-labelledby="collection-title">
          <div className={styles.collectionHeading}>
            <h2 id="collection-title">La tua collezione<span>{state.tracks.length ? String(state.tracks.length).padStart(2, "0") : ""}</span></h2>
            <div className={styles.collectionActions}><button className={styles.addButton} onClick={() => open({ kind: "add" })}><Plus size={17} /> Aggiungi disco</button><details className={styles.dropdown}><summary className={styles.iconButton} aria-label="Menu collezione"><Ellipsis size={22} /></summary><div className={styles.dropdownPanel}><button onClick={event => { closeMenu(event); fileInput.current?.click(); }}><Upload size={16} />Importa collezione</button><button disabled={!state.tracks.length} onClick={event => { closeMenu(event); exportCatalog(); }}><Download size={16} />Esporta collezione</button><button onClick={event => { closeMenu(event); open({ kind: "connection" }); }}><Bluetooth size={16} />Giradischi e NFC</button></div></details></div>
          </div>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={event => void importFile(event.target.files?.[0])} />
          {state.tracks.length ? <div className={styles.records}>
            {state.tracks.map((track, index) => <article key={track.code} className={styles.recordCard} data-active={state.active?.code === track.code}>
              <button className={styles.recordCover} style={{ "--cover-color": COVER_COLORS[index % COVER_COLORS.length] } as CSSProperties} onClick={() => void controller.current?.select(track)} aria-label={`Riproduci ${track.title}`}><span className={styles.coverTitle}>{track.title}</span><Vinyl color={recordColor(track.code)} small /><span className={styles.coverCode}>{track.code}</span><span className={styles.coverPlay}><Play size={18} fill="currentColor" /></span></button>
              <div className={styles.recordInfo}><div><h3>{track.title}</h3><span>{state.active?.code === track.code && playing ? "In riproduzione" : `Disco ${track.code}`}</span></div><details className={styles.dropdown}><summary className={styles.iconButton} aria-label={`Opzioni per ${track.title}`}><Ellipsis size={20} /></summary><div className={styles.dropdownPanel}><button onClick={event => { closeMenu(event); open({ kind: "write", track }); }}><Nfc size={16} />Scrivi NFC</button><button onClick={event => { closeMenu(event); open({ kind: "edit", track }); }}><Pencil size={16} />Modifica</button><button className={styles.deleteAction} onClick={event => { closeMenu(event); open({ kind: "remove", track }); }}><Trash2 size={16} />Rimuovi</button></div></details></div>
            </article>)}
          </div> : <div className={styles.emptyCollection}><div className={styles.emptyRecord} aria-hidden="true"><Vinyl color="#b4cbaa" small /><Nfc size={22} /></div><div><h3>Ogni disco ha una storia.<br />Inizia dalla tua.</h3><p>Un nome, un link YouTube. Il resto è musica.</p></div><button className={styles.roundArrow} onClick={() => open({ kind: "add" })} aria-label="Aggiungi il primo disco"><ArrowUpRight size={26} /></button></div>}
          <p className={styles.collectionFoot}>La collezione resta in questo browser. YouTube si carica quando scegli un brano. <Link href="/cookie-policy">Privacy e memoria locale <ArrowUpRight size={12} /></Link></p>
        </section>
      </div>

      <dialog ref={dialog} className={styles.dialog} onCancel={close} onClose={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) close(); }} aria-labelledby="edisk-dialog-title">
        {modal && <div className={styles.dialogContent}>
          <button className={`${styles.iconButton} ${styles.dialogClose}`} onClick={close} aria-label="Chiudi"><X size={22} /></button>
          {(modal.kind === "add" || modal.kind === "edit") && <>
            <span className={styles.dialogEyebrow}>LA TUA COLLEZIONE</span><h2 id="edisk-dialog-title">{modal.kind === "add" ? "Un nuovo disco." : "Il tuo disco."}</h2>
            <form onSubmit={save} className={styles.form}>
              <label>Nome<input autoFocus required maxLength={90} value={form.title} placeholder="Come lo chiamiamo?" onChange={event => setForm({ ...form, title: event.target.value })} /></label>
              <label>Link YouTube<input required value={form.url} placeholder="https://youtube.com/watch?v=…" onChange={event => setForm({ ...form, url: event.target.value })} autoComplete="off" /></label>
              <label>Codice del disco<span className={styles.codeField}><input required inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} value={form.code} onChange={event => setForm({ ...form, code: event.target.value.replace(/\D/g, "") })} /><button type="button" className={styles.iconButton} aria-label="Genera un altro codice" onClick={() => { try { setForm({ ...form, code: generateCode(state.tracks) }); } catch (error) { setFormError(error instanceof Error ? error.message : "Inserisci il codice a mano."); } }}><RefreshCw size={17} /></button></span></label>
              <p className={styles.fieldHint}>Lo stesso codice verrà scritto sul tag NFC. Puoi ascoltare anche senza tag.</p>
              {formError && <p className={styles.formError} role="alert">{formError}</p>}
              <button className={styles.primaryButton} type="submit">Salva disco <ArrowUpRight size={18} /></button>
            </form>
          </>}
          {modal.kind === "write" && <><Nfc className={styles.modalSymbol} size={33} /><h2 id="edisk-dialog-title">Dal link<br />al vinile.</h2><p>Scrivi il codice <strong>{modal.track.code}</strong> per “{modal.track.title}” su un tag NFC. Il codice già presente sul tag verrà sostituito.</p>{state.connected ? <button className={styles.primaryButton} disabled={writeBusy || state.writePending} onClick={() => void writeTag(modal.track)}>{writeBusy ? "Invio…" : state.writePending ? "Scrittura già in attesa" : "Scrivi e avvicina il tag"}<Nfc size={18} /></button> : <><p className={styles.fieldHint}>Prima connetti il giradischi, poi avvia la scrittura.</p><button className={styles.primaryButton} disabled={state.connecting} onClick={() => void controller.current?.connect()}>{state.connecting ? "Connessione…" : "Connetti giradischi"}<Bluetooth size={18} /></button></>}</>}
          {modal.kind === "remove" && <><h2 id="edisk-dialog-title">Togliamo<br />questo disco?</h2><p>“{modal.track.title}” verrà rimosso dalla collezione di questo browser. Il tag NFC resta invariato.</p><div className={styles.modalActions}><button className={styles.secondaryButton} onClick={close}>Tienilo</button><button className={styles.primaryButton} onClick={() => { controller.current?.remove(modal.track.code); close(); }}>Rimuovi <Trash2 size={17} /></button></div></>}
          {modal.kind === "import" && <><h2 id="edisk-dialog-title">Un’altra<br />collezione.</h2><p>Stai per importare <strong>{modal.tracks.length} dischi</strong>. La collezione attuale verrà sostituita. Puoi esportarla prima dal menu.</p><div className={styles.modalActions}><button className={styles.secondaryButton} onClick={close}>Annulla</button><button className={styles.primaryButton} onClick={() => { controller.current?.import(modal.tracks); close(); }}>Importa <Upload size={17} /></button></div></>}
          {modal.kind === "connection" && <><span className={styles.dialogEyebrow}>DIETRO LA MUSICA</span><h2 id="edisk-dialog-title">Tutto connesso.</h2><dl className={styles.connectionData}><div><dt>Giradischi</dt><dd>{state.connected ? state.deviceName : "Non connesso"}</dd></div><div><dt>Motore</dt><dd>{state.connected ? motorLabel[state.motor] : "—"}</dd></div><div><dt>NFC</dt><dd>{state.writePending ? "Avvicina il tag" : state.connected ? "Lettore pronto" : "—"}</dd></div></dl><button className={styles.primaryButton} disabled={state.connecting} onClick={() => void (state.connected ? controller.current?.disconnect() : controller.current?.connect())}>{state.connecting ? "Connessione…" : state.connected ? "Disconnetti" : "Connetti giradischi"}<Bluetooth size={18} /></button>{state.writePending && <button className={styles.textButton} onClick={() => void controller.current?.cancelWrite()}>Annulla scrittura NFC <X size={14} /></button>}<p className={styles.fieldHint}>Bluetooth: Chrome o Edge compatibile, su HTTPS o localhost. Il Test funziona anche senza giradischi.</p><details className={styles.connectionDetails}><summary>Prova un codice NFC</summary><form onSubmit={simulate} className={styles.simulateForm}><label className={styles.srOnly} htmlFor="edisk-simulate">Codice da provare</label><input id="edisk-simulate" inputMode="numeric" pattern="[0-9]{4,8}" required maxLength={8} value={simulatedCode} placeholder="Codice del disco" onChange={event => setSimulatedCode(event.target.value.replace(/\D/g, ""))} /><button className={styles.iconButton} aria-label="Riproduci il disco associato al codice"><Play size={18} /></button></form>{formError && <p className={styles.formError} role="alert">{formError}</p>}</details><details className={styles.connectionDetails}><summary>Registro del collegamento</summary><pre className={styles.logs}>{state.logs.join("\n") || "In attesa del primo evento."}</pre></details></>}
        </div>}
      </dialog>
    </main>
  );
}
