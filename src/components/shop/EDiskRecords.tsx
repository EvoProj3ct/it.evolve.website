"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, Disc3, Pause, Play, Sparkles, Volume2 } from "lucide-react";
import { FaSpotify, FaYoutube } from "react-icons/fa";
import { defaultConfiguration } from "./products";
import { ProductIllustration } from "./ProductIllustration";
import { RecordDemoAudio } from "./RecordDemoAudio";
import styles from "./EDiskRecords.module.css";

const ProductScene = dynamic(() => import("./ProductScene"), { ssr: false });
const DEMO_RECORDS = [
  { title: "Sunset Club", mood: "Un po’ di sole, anche di sera.", color: "#ffab8a", caption: "GROOVE" },
  { title: "Green Room", mood: "Il tuo momento per rallentare.", color: "#b4df7b", caption: "CHILL" },
  { title: "Neon Drive", mood: "Volume su. Pensieri giù.", color: "#c8a6f5", caption: "SYNTH" },
];

function RecordGraphic({ color, title, className }: { color: string; title: string; className?: string }) {
  const words = title.trim().split(/\s+/);
  const half = Math.ceil(words.length / 2);
  return <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
    <circle cx="100" cy="100" r="96" fill={color} stroke="#101914" strokeWidth="2" />
    {[46, 54, 62, 70, 78, 86].map(radius => <circle key={radius} cx="100" cy="100" r={radius} fill="none" stroke="#101914" strokeOpacity=".2" strokeWidth=".8" />)}
    <circle cx="100" cy="100" r="35" fill="#f8f2da" stroke="#101914" strokeWidth="1" />
    <text x="100" y="88" fill="#101914" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={title.length > 25 ? 6 : 8} fontWeight="700"><tspan x="100">{words.slice(0, half).join(" ")}</tspan><tspan x="100" dy="11">{words.slice(half).join(" ")}</tspan></text>
    <circle cx="100" cy="106" r="3" fill="#101914" /><text x="100" y="120" fill="#42513c" textAnchor="middle" fontSize="4.5" fontFamily="Arial, sans-serif" letterSpacing="1">EVOLVE</text>
  </svg>;
}

export function EDiskDiscStudio() {
  const [source, setSource] = useState<"ai" | "spotify" | "youtube">("ai");
  const [title, setTitle] = useState("La nostra canzone");
  const [dedication, setDedication] = useState("Per le cose che restano.");
  const [color, setColor] = useState("#cabee6");
  const choices = [
    { id: "ai" as const, name: "Una canzone solo tua.", description: "Una storia, una dedica, le parole giuste. Crea una canzone su misura con il nostro tool IA.", icon: <Sparkles size={27} />, status: "Tool in preparazione" },
    { id: "spotify" as const, name: "Quella che sai a memoria.", description: "Il brano che ti accompagna da sempre. Sceglilo su Spotify e immaginalo sul tuo disco.", icon: <FaSpotify size={27} />, status: "Collegamento in preparazione" },
    { id: "youtube" as const, name: "Quel pezzo, proprio quello.", description: "Una canzone, una versione dal vivo, un ricordo. Parti da un brano su YouTube.", icon: <FaYoutube size={30} />, status: "Disponibile nell’app" },
  ];
  return <section id="incidi" className={styles.studio} aria-labelledby="disc-studio-title">
    <div className={styles.heading}><h2 id="disc-studio-title">Tu scegli la musica.<br />Noi le diamo forma<span>.</span></h2><p>Li chiamiamo dischi “incisi”. In realtà li stampiamo e li personalizziamo per te. Tu scegli cosa ascoltare: a trasformarlo in un oggetto ci pensiamo noi.</p></div>
    <div className={styles.sources}>{choices.map(choice => <article key={choice.id} data-source={choice.id} className={styles.sourceCard} data-selected={source === choice.id}>
      <div className={styles.sourceTop}>{choice.icon}<span>{choice.status}</span></div><h3>{choice.name}</h3><p>{choice.description}</p><button type="button" aria-pressed={source === choice.id} onClick={() => setSource(choice.id)}>{source === choice.id ? <>La tua scelta <Check size={15} /></> : <>Parti da qui <ArrowUpRight size={17} /></>}</button>
    </article>)}</div>
    <div className={styles.personalize}>
      <div className={styles.discPreview}><span className={styles.previewStar} aria-hidden="true">✳</span><RecordGraphic color={color} title={title || "La tua musica"} /><p>{dedication || "La tua dedica, sul tuo disco."}</p><span className={styles.previewTag}>Un disco. La tua storia.</span></div>
      <form className={styles.discForm} onSubmit={event => event.preventDefault()}>
        <h3>Dagli un nome<span>.</span></h3><p>Un titolo, una dedica, un colore. Ci sono tanti modi per dire: questa è la mia canzone.</p>
        <label htmlFor="custom-disc-title">Il titolo del tuo disco<input id="custom-disc-title" value={title} maxLength={38} onChange={event => setTitle(event.target.value)} placeholder="La nostra canzone" /></label>
        <label htmlFor="custom-disc-dedication">Una dedica<input id="custom-disc-dedication" value={dedication} maxLength={80} onChange={event => setDedication(event.target.value)} placeholder="Per chi, per cosa, per sempre…" /></label>
        <fieldset><legend>Il suo colore</legend><div className={styles.discColors}>{["#cabee6", "#ffab8a", "#b4df7b", "#f7bad5", "#83d7e4"].map((hex, index) => <button key={hex} type="button" style={{ "--disc-color": hex } as CSSProperties} aria-pressed={color === hex} aria-label={["Lilla", "Pesca", "Verde", "Rosa", "Azzurro"][index]} onClick={() => setColor(hex)}><span /></button>)}</div></fieldset>
        {source === "ai" ? <div className={styles.sourceInput}><Sparkles size={19} /><div><strong>La tua musica, creata con l’IA.</strong><p>Il nostro tool è in preparazione. Presto potrai partire da una storia e trasformarla in una canzone.</p><Link href="/lavori-in-corso">Crea la tua musica <ArrowUpRight size={14} /></Link></div></div> : <div className={styles.sourceInput}><div><label htmlFor="custom-disc-url">Il link del brano {source === "spotify" ? "Spotify" : "YouTube"}<input id="custom-disc-url" key={source} type="url" placeholder={source === "spotify" ? "https://open.spotify.com/track/…" : "https://www.youtube.com/watch?v=…"} /></label><p>{source === "spotify" ? "Il collegamento automatico a Spotify è in preparazione." : "Il brano resta su YouTube e viene richiamato dall’app e-disk."}</p></div></div>}
        <button type="button" className={styles.addDisc} disabled title="Ordini e carrello saranno collegati in seguito">Aggiungi il disco <ArrowUpRight size={19} /></button>
      </form>
    </div>
    <p className={styles.studioFoot}>Hai già e-disk? Puoi acquistare altri dischi da Evolve ogni volta che vuoi, senza ricomprare il giradischi.</p>
  </section>;
}

export function EDiskRecordDemo() {
  const configuration = useMemo(() => defaultConfiguration("e-disk"), []);
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [ended, setEnded] = useState(false);
  const [lift, setLift] = useState(0);
  const [error, setError] = useState("");
  const audio = useRef<RecordDemoAudio | null>(null);
  const sequence = useRef(0);
  const timers = useRef<number[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const appearance = useMemo(() => active === null ? undefined : { title: DEMO_RECORDS[active].title, color: DEMO_RECORDS[active].color }, [active]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) return;
      sequence.current++;
      timers.current.forEach(timer => window.clearTimeout(timer));
      audio.current?.stop(); setPlaying(false); setPlacing(false); setEnded(true); setLift(0);
    }, { threshold: .02 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => { sequence.current++; timers.current.forEach(timer => window.clearTimeout(timer)); audio.current?.stop(); observer.disconnect(); };
  }, []);
  const choose = async (index: number) => {
    if (active === index && placing) return;
    setError("");
    if (active === index && !ended) {
      const token = sequence.current;
      try { if (playing) await audio.current?.pause(); else await audio.current?.resume(); if (token === sequence.current) setPlaying(!playing); }
      catch { if (token === sequence.current) { setError("Non riesco a riprodurre l’audio. Seleziona di nuovo un disco."); setEnded(true); } }
      return;
    }
    const token = ++sequence.current;
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current = [];
    setActive(index); setPlacing(true); setPlaying(false); setEnded(false); setLift(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1.4);
    audio.current ??= new RecordDemoAudio();
    try {
      await audio.current.play(index, () => { if (sequence.current === token) { setPlaying(false); setEnded(true); } });
      if (token !== sequence.current) return;
      timers.current.push(window.setTimeout(() => { if (sequence.current === token) setLift(0); }, 150));
      timers.current.push(window.setTimeout(() => { if (sequence.current === token) { setPlacing(false); setPlaying(true); } }, 620));
    } catch {
      if (token !== sequence.current) return;
      setLift(0); setPlacing(false); setPlaying(false); setEnded(true); setError("L’audio non è disponibile in questo browser. Puoi comunque cambiare i dischi nell’anteprima.");
    }
  };
  return <section ref={sectionRef} id="ascolta" className={styles.demo} aria-labelledby="record-demo-title">
    <div className={styles.demoCopy}><h2 id="record-demo-title">Scegli un disco.<br />Cambia atmosfera<span>.</span></h2><p>Tre dischi appesi, tre modi diversi di stare bene. Scegline uno: si posa sul giradischi e la musica parte. Un altro clic, un’altra atmosfera.</p><span className={styles.demoSticker} aria-hidden="true">Pick<br />& play!</span><p className={styles.demoHint}><Volume2 size={16} /> Demo sonora con loop originali.</p></div>
    <div className={styles.demoStage}>
      <div className={styles.recordRack}>{DEMO_RECORDS.map((record, index) => <button key={record.title} type="button" className={styles.hangingRecord} data-selected={active === index} aria-pressed={active === index && playing} aria-label={`${active === index && playing ? "Metti in pausa" : "Ascolta"} ${record.title}`} onClick={() => void choose(index)}><span className={styles.hangingDisc}><RecordGraphic color={record.color} title={record.title} /></span><span>{record.title}</span><small>{record.caption}</small></button>)}</div>
      <div className={styles.demoScene}><ProductScene product="e-disk" configuration={configuration} presentation playing={playing} recordAppearance={appearance} recordPresent={active !== null} recordLift={lift} /></div>
      <div className={styles.demoTransport} aria-live="polite"><div><span>{active === null ? "SCEGLI IL TUO LATO A" : placing ? "IL DISCO PRENDE POSTO" : playing ? "ORA IN ASCOLTO" : "IL TUO DISCO"}</span><strong>{active === null ? "La prossima canzone la scegli tu." : DEMO_RECORDS[active].title}</strong><p>{active === null ? "Tocca uno dei dischi qui sopra." : DEMO_RECORDS[active].mood}</p></div><button type="button" disabled={active === null || placing} aria-label={playing ? "Pausa della demo" : "Riproduci la demo"} onClick={() => { if (active !== null) void choose(active); }}>{playing ? <Pause size={19} /> : <Play size={19} />}</button></div>
      {error && <p className={styles.audioError} role="status">{error}</p>}
    </div>
  </section>;
}

export function EDiskBundle({ onChoose }: { onChoose: () => void }) {
  return <section id="bundle" className={styles.bundle} aria-labelledby="bundle-title">
    <div className={styles.bundleGrid}><div className={styles.bundleArt}><ProductIllustration product="e-disk" configuration={defaultConfiguration("e-disk")} /><div className={styles.bundleRecords}>{DEMO_RECORDS.map(record => <RecordGraphic key={record.title} color={record.color} title={record.title} />)}</div><span className={styles.bundleStamp}>1 e-disk<br />3 dischi<br />∞ storie</span></div><div className={styles.bundleCopy}><h2 id="bundle-title">Il tuo primo<br />lato A<span>.</span></h2><h3>e-disk + 3 dischi</h3><p>Il giradischi nei tuoi colori e tre dischi da personalizzare. Scegli i brani, noi li stampiamo. Tu devi solo decidere da quale iniziare.</p><ul><li><Check size={15} /> Un e-disk nella tua combinazione di colori</li><li><Check size={15} /> Tre dischi personalizzabili</li><li><Check size={15} /> Tre canzoni, tre ricordi, tre occasioni</li></ul><button type="button" className={styles.buyBundle} onClick={onChoose}>Compra il bundle <ArrowUpRight size={21} /></button><a className={styles.onlyDiscs} href="#incidi">Ho già e-disk. Voglio solo i dischi. <ArrowUpRight size={14} /></a></div></div>
    <div className={styles.moreDiscs}><Disc3 size={39} strokeWidth={1.1} /><div><h3>La collezione continua.</h3><p>Un regalo, un nuovo pezzo, una canzone che ancora non esiste. Puoi aggiungere nuovi dischi da Evolve ogni volta che vuoi. Il tuo e-disk resta, la musica cambia.</p></div><a href="#incidi">Crea un altro disco <ArrowUpRight size={19} /></a></div>
  </section>;
}
