"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { ArrowUpRight, BookOpen, Check, Download, Move, Pause, Play, Plus, Power, RotateCcw, ShoppingCart, Upload, X } from "lucide-react";
import { ProductColorPicker } from "./ProductColorPicker";
import { RelatedProducts } from "./RelatedProducts";
import { colorName, PRODUCTS } from "./products";
import { defaultLedConfiguration, LED_EFFECTS, LED_MOODS, readLedLogo, type LedConfiguration } from "./led";
import styles from "./ELed.module.css";

const LedScene = dynamic(() => import("./LedScene"), { ssr: false, loading: () => <div className={styles.sceneFallback}><span>EVOLVE</span><small>Accendiamo la tua idea…</small></div> });
const lightStyle = (color: string) => ({ "--light": color } as CSSProperties);

export function ELedExperience() {
  const [configuration, setConfiguration] = useState<LedConfiguration>(defaultLedConfiguration);
  const preview = useDeferredValue(configuration);
  const [hero] = useState<LedConfiguration>(defaultLedConfiguration);
  const [heroPower, setHeroPower] = useState(true);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [power, setPower] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [reset, setReset] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  const selectMood = (index: number) => {
    const mood = LED_MOODS[index];
    setConfiguration(current => ({ ...current, primary: "#101614", secondary: mood.color, effect: mood.effect }));
    setPower(true); setPlaying(true);
  };
  const applyMood = (index: number) => {
    selectMood(index);
    document.getElementById("configura")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const token = ++sequence.current; setUploading(true); setError("");
    try {
      const logo = await readLedLogo(file);
      if (token === sequence.current) setConfiguration(current => ({ ...current, logo, mode: current.text.trim() ? "both" : "logo" }));
    } catch (error) { if (token === sequence.current) setError(error instanceof Error ? error.message : "Non riesco a leggere il logo."); }
    finally { if (token === sequence.current) setUploading(false); }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify({ version: 1, product: "e-led", ...configuration, note: "Progetto dimostrativo. Misure, potenza, effetti, materiali e installazione da confermare con Evolve." }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "evolve-e-led-progetto.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <main id="shop-content" className={styles.page} data-product="e-led">
    <section className={styles.hero} aria-labelledby="led-title">
      <div className={styles.heroCopy}>
        <h1 id="led-title">e-led<span>.</span></h1>
        <p className={styles.tagline}>Fatti vedere.<br />Sotto un’altra luce.</p>
        <p className={styles.heroDescription}>{PRODUCTS["e-led"].description}</p>
        <div className={styles.heroActions}><a href="#configura" className={styles.cta}>Accendi la tua idea <ArrowUpRight size={19} /></a><a href="#scopri" className={styles.textLink}>Scopri e-led <ArrowUpRight size={16} /></a></div>
      </div>
      <div className={styles.heroStage} data-power={heroPower}>
        <div className={styles.stageTop}><span><i /> La tua identità, accesa</span><span>Color flow</span></div>
        <LedScene configuration={hero} playing={heroPlaying} power={heroPower} />
        <div className={styles.stageBottom}><span>Scocca stampata. Carattere luminoso.</span><div><button type="button" onClick={() => setHeroPlaying(value => !value)} aria-label={heroPlaying ? "Pausa degli effetti luminosi" : "Riprendi gli effetti luminosi"}>{heroPlaying ? <Pause size={15} /> : <Play size={15} />}</button><button type="button" aria-pressed={heroPower} onClick={() => setHeroPower(value => !value)} aria-label={heroPower ? "Spegni e-led" : "Accendi e-led"}><Power size={17} /></button></div></div>
      </div>
      <div className={styles.heroFoot}><span>Il tuo nome. Il tuo logo. La tua luce.</span><span>Think to Evolve <i /></span></div>
    </section>

    <section id="scopri" className={styles.story} aria-labelledby="led-story-title">
      <div className={styles.sectionHeading}><h2 id="led-story-title">Dai presenza<br />alla tua identità<span>.</span></h2><p>Quando il tuo nome si accende, lo spazio cambia. e-led unisce una struttura stampata su misura a una luce che puoi rendere sobria, vibrante o in continuo movimento.</p></div>
      <div className={styles.useCases}>
        <article><div className={styles.room} style={lightStyle("#72FF63")}><span>OPEN</span><i /><b /></div><h3>Il tuo prossimo cliente<br />può cominciare da qui.</h3><p>Un nome in vetrina, dietro il bancone o nel tuo studio. Fai riconoscere la tua attività, ancora prima di presentarti.</p></article>
        <article><div className={styles.room} style={lightStyle("#45EAFF")}><span className={styles.roomLogo}>e<span>.</span></span><i /><b /></div><h3>Il tuo logo,<br />in una nuova dimensione.</h3><p>Il segno del tuo brand prende spessore e luce. Per uno spazio di lavoro, uno stand o un angolo che parla di te.</p></article>
        <article><div className={styles.room} style={lightStyle("#AE6BFF")}><span>GOOD<br />VIBES</span><i /><b /></div><h3>Arreda anche<br />quando dice poco.</h3><p>Una parola, una frase, un’atmosfera. Trasforma una parete in un punto di luce con un carattere tutto suo.</p></article>
      </div>
    </section>

    <section className={styles.moods} aria-labelledby="led-moods-title">
      <div className={styles.sectionHeading}><h2 id="led-moods-title">Stesso segno.<br />Un’altra energia<span>.</span></h2><p>La luce fissa il tono. Oppure lo cambia, lentamente. Parti da un’atmosfera e trova quella che ti somiglia.</p></div>
      <div className={styles.moodGrid}>{LED_MOODS.map((mood, index) => <button key={mood.name} type="button" onClick={() => applyMood(index)} className={styles.mood} style={lightStyle(mood.color)}>
        <span className={styles.moodArt} data-effect={mood.effect}>{mood.word}</span><span className={styles.moodCaption}><span><strong>{mood.name}</strong><small>{mood.note}</small></span><ArrowUpRight size={19} /></span>
      </button>)}</div>
    </section>

    <section id="configura" className={styles.configurator} aria-labelledby="led-config-title">
      <div className={styles.sectionHeading}><h2 id="led-config-title">Fai spazio<br />alla tua luce<span>.</span></h2><p>Scrivi il tuo nome, scegli la scocca e guarda la traccia LED prendere vita. Puoi aggiungere anche il tuo logo.</p></div>
      <div className={styles.configGrid}>
        <div className={styles.viewer}>
          <div className={styles.viewerLabel}><span><i /> e-led</span><span>Anteprima 3D</span></div>
          <div className={styles.configStage}><LedScene configuration={preview} interactive playing={playing} power={power} reset={reset} onError={setError} /></div>
          <div className={styles.viewerControls}><span><Move size={15} /> Trascina per esplorare</span><div><button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? "Pausa degli effetti" : "Riprendi gli effetti"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button><button type="button" aria-pressed={power} onClick={() => setPower(value => !value)} aria-label={power ? "Spegni l’anteprima" : "Accendi l’anteprima"}><Power size={17} /></button><button type="button" onClick={() => setReset(value => value + 1)} aria-label="Ripristina la vista 3D"><RotateCcw size={16} /></button></div></div>
          <div className={styles.dimension}><i /><span>{configuration.width} cm · larghezza indicativa</span><i /></div>
          <p className={styles.viewerNote}>Studio di prodotto. Resa luminosa, proporzioni e finiture indicative.</p>
        </div>
        <form className={styles.panel} onSubmit={event => event.preventDefault()}>
          <fieldset className={styles.fieldset}><legend>Il tuo segno</legend><div className={styles.segmented}>{([{ id: "text", name: "Scritta" }, { id: "logo", name: "Logo" }, { id: "both", name: "Insieme" }] as const).map(mode => <button type="button" key={mode.id} disabled={mode.id !== "text" && !configuration.logo} aria-pressed={configuration.mode === mode.id} onClick={() => setConfiguration(current => ({ ...current, mode: mode.id }))}>{mode.name}</button>)}</div>
            {configuration.mode !== "logo" && <label className={styles.inputLabel} htmlFor="led-text">Cosa vuoi illuminare?<span className={styles.textField}><input id="led-text" value={configuration.text} maxLength={24} placeholder="Il tuo nome, il tuo brand…" onChange={event => setConfiguration(current => ({ ...current, text: event.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 .!?&+@#'_-]/g, "") }))} /><span>{configuration.text.length}/24</span></span></label>}
            <input ref={input} type="file" className={styles.fileInput} accept=".svg,image/svg+xml" tabIndex={-1} onChange={upload} aria-label="Carica il logo SVG per e-led" />
            <button type="button" className={styles.upload} disabled={uploading} onClick={() => input.current?.click()}><Upload size={16} />{uploading ? "Preparo i tracciati…" : configuration.logo ? "Cambia il tuo logo" : "Aggiungi il tuo logo"}<Plus size={15} /></button>
            <p className={styles.help}>SVG con tracciati pieni · max 2 MB</p>
            {configuration.logo && <div className={styles.logoFile}><Check size={15} /><span>{configuration.logo.name}</span><button type="button" aria-label="Rimuovi il logo" onClick={() => { sequence.current++; setUploading(false); setError(""); setConfiguration(current => ({ ...current, logo: null, mode: "text" })); }}><X size={15} /></button></div>}
          </fieldset>
          <fieldset className={styles.fieldset}><legend>Materia e luce</legend><ProductColorPicker product="e-led" value={configuration} onChange={(channel, hex) => setConfiguration(current => ({ ...current, [channel]: hex }))} onSwap={() => setConfiguration(current => ({ ...current, primary: current.secondary, secondary: current.primary }))} onShuffle={() => selectMood(Math.floor(Math.random() * LED_MOODS.length))} /></fieldset>
          <fieldset className={styles.fieldset}><legend>Come vuoi accenderla?</legend><div className={styles.effects}>{LED_EFFECTS.map(effect => <button key={effect.id} type="button" aria-pressed={configuration.effect === effect.id} onClick={() => setConfiguration(current => ({ ...current, effect: effect.id }))}><span>{effect.name}</span><small>{effect.description}</small>{configuration.effect === effect.id && <Check size={13} />}</button>)}</div>
            <label className={styles.rangeLabel} htmlFor="led-brightness"><span>Intensità nell’anteprima <b>{configuration.brightness}%</b></span><input id="led-brightness" type="range" min={20} max={100} step={5} value={configuration.brightness} onChange={event => setConfiguration(current => ({ ...current, brightness: Number(event.target.value) }))} /></label>
            {configuration.effect !== "steady" && <label className={styles.rangeLabel} htmlFor="led-speed"><span>Velocità dell’effetto <b>{configuration.speed < .8 ? "Lenta" : configuration.speed > 1.2 ? "Vivace" : "Naturale"}</b></span><input id="led-speed" type="range" min={.5} max={1.5} step={.1} value={configuration.speed} onChange={event => setConfiguration(current => ({ ...current, speed: Number(event.target.value) }))} /></label>}
          </fieldset>
          <fieldset className={styles.fieldset}><legend>Immaginala nel tuo spazio</legend><div className={styles.sizes}>{[60, 100, 140, 180].map(width => <button key={width} type="button" aria-pressed={configuration.width === width} onClick={() => setConfiguration(current => ({ ...current, width }))}>{width}<small>cm</small></button>)}</div><p className={styles.help}>La misura definitiva si progetta insieme, in base a scritta, logo e installazione.</p></fieldset>
          {error && <p className={styles.error} role="status">{error}</p>}
          <div className={styles.summary} aria-live="polite"><span>Il tuo e-led</span><strong>{configuration.mode === "logo" ? "Il tuo logo" : configuration.text || "La tua luce"}</strong><p>{colorName(configuration.primary)} · {LED_EFFECTS.find(effect => effect.id === configuration.effect)?.name} · {configuration.width} cm indicativi</p></div>
          <button type="button" className={styles.cart} disabled title="Carrello e acquisto saranno collegati in seguito">Aggiungi al carrello <ShoppingCart size={18} /></button>
          <button type="button" className={styles.save} onClick={download}><Download size={15} /> Salva il tuo progetto</button>
          <p className={styles.help}>Testo, logo e luce raccontano l’idea. Dimensioni, potenza, materiali e fissaggio vengono definiti con Evolve.</p>
        </form>
      </div>
    </section>

    <section className={styles.guideTeaser}><div><h2>Una bella idea.<br />Preparata bene<span>.</span></h2><p>Dal file del logo alla parete su cui la immagini. Scopri come preparare il tuo progetto.</p></div><Link href="/shop/e-led/documentazione"><BookOpen size={25} /><span>Dentro e-led<small>Testi, tracciati, luce e installazione</small></span><ArrowUpRight size={22} /></Link></section>
    <section className={styles.faq} aria-labelledby="led-faq-title"><h2 id="led-faq-title">Facciamo<br />chiarezza<span>.</span></h2><div>{PRODUCTS["e-led"].faq.map(item => <details key={item.question}><summary>{item.question}<Plus size={18} /></summary><p>{item.answer}</p></details>)}</div></section>
    <RelatedProducts current="e-led" dark />
  </main>;
}
