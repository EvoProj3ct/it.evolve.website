"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { ArrowUpRight, BookOpen, Check, CircleDot, Download, Eraser, MoveHorizontal, Pause, Play, Plus, RotateCcw, Shapes, Smartphone, Sparkles, Type, Upload, Volume2, VolumeX, X } from "lucide-react";
import {
  cleanKeyringLettering, defaultKeyringLettering, keyringDesignLabels, keyringFontNames, keyringFonts,
  keyringHoleName, keyringHoleOptions, keyringRaisedFontName, keyringReliefNames, keyringReliefs, keyringSizesForRelief,
  keyringTextLimit, keyringTextOrientationNames, keyringTextOrientations, keyringTextSizeNames,
  type KeyringFace, type KeyringFont, type KeyringLettering, type KeyringRelief, type KeyringTextOrientation, type KeyringTextSize,
} from "@evolve/ecommerce-server/keyring-design";
import { isLinkerOfferKind, linkerBundleSize, linkerBundleSizes, linkerOfferKind, type LinkerOfferKind } from "@evolve/ecommerce-server/keyring-offers";
import { ProductMark } from "./ProductMark";
import { LinkerBundleArtwork } from "./LinkerBundleArtwork";
import { LinkerPile } from "./LinkerPile";
import { LinkerStoryCarousel } from "./LinkerStoryCarousel";
import { KeyringSymbolPanel } from "./KeyringSymbolPanel";
import { layoutKeyringSymbols } from "./keyringSymbols";
import { ProductColorPicker } from "./ProductColorPicker";
import { CartoonNotes } from "./CartoonNotes";
import { BundleDiscFields, EDiskBundle, EDiskDiscStudio, EDiskGiftIdeas, EDiskRecordDemo, type BundleDisc, type DiscSource } from "./EDiskRecords";
import { RecordDemoAudio } from "./RecordDemoAudio";
import { ConfiguredPurchase } from "./ConfiguredPurchase";
import { RelatedProducts } from "./RelatedProducts";
import type { KeyringEditor } from "./ProductScene";
import { colorName, defaultConfiguration, KEYRING_SHAPES, PRODUCTS, productColors, type LogoAsset, type ProductConfiguration, type ProductId } from "./products";
import styles from "./Shop.module.css";

const ProductScene = dynamic(() => import("./ProductScene"), { ssr: false, loading: () => <span className={styles.sceneLoading}>L’oggetto prende forma…</span> });
const swatchStyle = (color: string) => ({ "--swatch": color } as CSSProperties);
const PRESETS = [
  { name: "Evolve", primary: "#72C94F", secondary: "#114928" },
  { name: "Pop", primary: "#8651FF", secondary: "#C1FF00" },
  { name: "Sunset", primary: "#FF7638", secondary: "#F7BAD5" },
];
const DISK_PRESETS = [
  ...PRESETS,
  { name: "Lagoon", primary: "#3154F4", secondary: "#77C8FF" },
  { name: "Cherry", primary: "#660000", secondary: "#FF6666" },
  { name: "Afterhours", primary: "#171B19", secondary: "#CABEE6" },
];
const LINKER_PRESETS = [
  { name: "Studio", primary: "#E9F0ED", secondary: "#263C42" },
  { name: "Graphite", primary: "#171B19", secondary: "#E9F0ED" },
  { name: "Forest", primary: "#114928", secondary: "#E9F0ED" },
  { name: "Slate", primary: "#829BA3", secondary: "#263C42" },
  { name: "Blueprint", primary: "#202D5A", secondary: "#E9F0ED" },
  { name: "Sand", primary: "#D7C4A0", secondary: "#795442" },
];

export function ShopProductExperience({ product }: { product: Exclude<ProductId, "e-led"> }) {
  const info = PRODUCTS[product];
  const isDisk = product === "e-disk";
  const [configuration, setConfiguration] = useState<ProductConfiguration>(() => defaultConfiguration(product));
  const [logoAttachment, setLogoAttachment] = useState<LogoAsset | null>(null);
  const [face, setFace] = useState<KeyringFace>("front");
  const [canvasTool, setCanvasTool] = useState<KeyringEditor["tool"] | "shape" | "symbol">("rotate");
  const shapeTool = useRef<HTMLButtonElement>(null);
  const textTool = useRef<HTMLButtonElement>(null);
  const symbolTool = useRef<HTMLButtonElement>(null);
  const [viewerTheme, setViewerTheme] = useState<"light" | "dark">("dark");
  const [diskOffer, setDiskOffer] = useState<"device" | "bundle">("device");
  const [linkerOffer, setLinkerOffer] = useState<LinkerOfferKind | null>(null);
  const [bundleDiscs, setBundleDiscs] = useState<BundleDisc[]>(() =>
    ["#cabee6", "#ffab8a", "#b4df7b"].map((color, index) => ({ title: `Disco ${index + 1}`, color, dedication: "", trackUrl: "" })));
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (isDisk) {
      if (query.get("offerta") === "bundle") setDiskOffer("bundle");
    } else {
      const kind = query.get("tipo");
      setLinkerOffer(isLinkerOfferKind(kind) ? kind : "e-linker");
    }
  }, [isDisk]);
  const linkerCount = linkerBundleSize(linkerOffer) ?? 1;
  const canAttachLogo = !isDisk && linkerCount >= 20;
  const orderLogo = canAttachLogo ? logoAttachment : null;
  const [discSource, setDiscSource] = useState<DiscSource>("ai");
  const presets = isDisk ? DISK_PRESETS : LINKER_PRESETS;
  const previewConfiguration = useDeferredValue(configuration);
  const symbolLayout = useMemo(() => layoutKeyringSymbols(configuration), [configuration]);
  const placedSymbols = symbolLayout.filter(symbol => symbol !== null);
  const unplacedSymbols = symbolLayout.length !== placedSymbols.length;
  const activeLettering = configuration.keyring[face];
  const activeRelief = activeLettering.relief ?? defaultKeyringLettering.relief;
  const availableSizes = keyringSizesForRelief(activeRelief);
  const activeText = face === "front" ? configuration.text : configuration.keyring.back.text;
  const toolPanel = canvasTool === "shape" || canvasTool === "text" || canvasTool === "symbol" ? canvasTool : null;
  const faceLabel = face === "front" ? "sul fronte" : "sul retro";
  const panelTitle = toolPanel === "shape" ? "Scegli la forma" : `${toolPanel === "symbol" ? "Simboli" : "Scritta"} ${faceLabel}`;
  const textLimit = (side: KeyringFace) => {
    const lettering = configuration.keyring[side];
    return keyringTextLimit(configuration.shape, lettering.orientation, lettering.size, lettering.relief);
  };
  const invalidFaces = (["front", "back"] as const).filter(side =>
    (side === "front" ? configuration.text : configuration.keyring.back.text).trim().length > textLimit(side));
  const changeLettering = (side: KeyringFace, patch: Partial<KeyringLettering>) => setConfiguration(current => ({
    ...current, keyring: { ...current.keyring, [side]: { ...current.keyring[side], ...patch } },
  }));
  const changeRelief = (relief: KeyringRelief) => {
    const sizes = keyringSizesForRelief(relief);
    changeLettering(face, {
      relief,
      size: sizes.includes(activeLettering.size) ? activeLettering.size : sizes[sizes.length - 1],
      ...(relief === "raised" && { font: defaultKeyringLettering.font }),
    });
  };
  const changeText = (value: string) => {
    const text = cleanKeyringLettering(value);
    setConfiguration(current => face === "front" ? { ...current, text }
      : { ...current, keyring: { ...current.keyring, back: { ...current.keyring.back, text } } });
  };
  const changeHole = (hole: string) => setConfiguration(current =>
    current.keyring.hole === hole || !keyringHoleName(current.shape, hole) ? current
      : { ...current, keyring: { ...current.keyring, hole } });
  const changeShape = (shape: ProductConfiguration["shape"]) => setConfiguration(current => ({
    ...current,
    shape,
    keyring: {
      ...current.keyring,
      hole: keyringHoleName(shape, current.keyring.hole) ? current.keyring.hole : keyringHoleOptions(shape)[0].id,
    },
  }));
  const canvasEditor: KeyringEditor = { face, tool: canvasTool === "shape" || canvasTool === "symbol" ? "rotate" : canvasTool, onHole: changeHole, onText: changeLettering };
  function closeToolPanel() {
    const button = toolPanel === "shape" ? shapeTool : toolPanel === "symbol" ? symbolTool : textTool;
    button.current?.focus();
    setCanvasTool("rotate");
  }
  const heroConfiguration = useMemo(() => defaultConfiguration(product), [product]);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [heroSoundOn, setHeroSoundOn] = useState(false);
  const [heroSoundPending, setHeroSoundPending] = useState(false);
  const [heroSoundError, setHeroSoundError] = useState("");
  const [recordPlaying, setRecordPlaying] = useState(true);
  const [viewReset, setViewReset] = useState(0);
  const [sceneError, setSceneError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadSequence = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroAudio = useRef<RecordDemoAudio | null>(null);
  const heroAudioSequence = useRef(0);

  useEffect(() => () => { uploadSequence.current++; }, []);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (motion.matches) { setHeroPlaying(false); setRecordPlaying(false); } };
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (heroPlaying) void video.play().catch(() => setHeroPlaying(false));
    else video.pause();
  }, [heroPlaying]);
  useEffect(() => {
    if (!isDisk) return;
    const stop = () => {
      heroAudioSequence.current++;
      heroAudio.current?.stop(); setHeroSoundOn(false); setHeroSoundPending(false);
    };
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }, { threshold: .02 });
    if (heroRef.current) observer.observe(heroRef.current);
    const onVisibilityChange = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { heroAudioSequence.current++; heroAudio.current?.stop(); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [isDisk]);
  useEffect(() => {
    if (!heroSoundOn) return;
    const token = heroAudioSequence.current;
    const playback = heroPlaying ? heroAudio.current?.resume() : heroAudio.current?.pause();
    void playback?.catch(() => {
      if (token !== heroAudioSequence.current) return;
      heroAudio.current?.stop(); setHeroSoundOn(false); setHeroSoundError("Non riesco a riprodurre l’audio. Tocca l’altoparlante per riprovare.");
    });
  }, [heroPlaying, heroSoundOn]);

  const toggleHeroSound = async () => {
    const token = ++heroAudioSequence.current;
    setHeroSoundError("");
    if (heroSoundOn || heroSoundPending) {
      heroAudio.current?.stop(); setHeroSoundOn(false); setHeroSoundPending(false); return;
    }
    setHeroSoundPending(true); setHeroPlaying(true);
    heroAudio.current ??= new RecordDemoAudio();
    try {
      const started = await heroAudio.current.play("rock", () => {
        if (token !== heroAudioSequence.current) return;
        heroAudioSequence.current++; setHeroSoundOn(false); setHeroSoundPending(false);
      });
      if (started && token === heroAudioSequence.current) { setHeroSoundOn(true); setHeroSoundPending(false); }
    } catch {
      if (token !== heroAudioSequence.current) return;
      heroAudio.current?.stop(); setHeroSoundPending(false); setHeroSoundError("L’audio non è disponibile in questo browser.");
    }
  };

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canAttachLogo) return;
    const sequence = ++uploadSequence.current;
    setUploadError("");
    if (file.size > 2 * 1024 * 1024) { setUploadError("Scegli un file di massimo 2 MB."); return; }
    const svg = file.name.toLowerCase().endsWith(".svg") && (file.type === "image/svg+xml" || !file.type);
    if (!svg && !["image/png", "image/jpeg"].includes(file.type)) { setUploadError("Usa un logo SVG, PNG o JPG."); return; }
    setUploading(true);
    try {
      let data: string;
      if (svg) {
        data = await file.text();
        const document = new DOMParser().parseFromString(data, "image/svg+xml");
        if (document.querySelector("parsererror") || document.documentElement.localName !== "svg" || !document.querySelector("path,rect,circle,ellipse,polygon,polyline")) throw new Error("Usa un SVG con forme e tracciati. Converti il testo in tracciati prima di esportarlo.");
        if (document.querySelectorAll("*").length > 1000 || data.length > 350000) throw new Error("Il logo è molto complesso. Esporta un SVG semplificato oppure un PNG.");
        if (document.querySelector("script,foreignObject,image") || /(?:href\s*=\s*["']\s*(?:https?:|\/\/)|url\s*\(\s*["']?\s*(?:https?:|\/\/))/i.test(data)) throw new Error("Esporta un SVG autonomo, senza immagini o risorse esterne.");
      } else {
        data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Non riesco a leggere il file."));
          reader.readAsDataURL(file);
        });
        await new Promise<void>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => image.width > 4096 || image.height > 4096 ? reject(new Error("Usa un’immagine con dimensioni fino a 4096 × 4096 pixel.")) : resolve();
          image.onerror = () => reject(new Error("L’immagine non è leggibile. Prova un altro PNG o JPG."));
          image.src = data;
        });
      }
      if (sequence === uploadSequence.current) setLogoAttachment({ name: file.name, kind: svg ? "svg" : "image", data });
    } catch (error) {
      if (sequence === uploadSequence.current) setUploadError(error instanceof Error ? error.message : "Non riesco a leggere questo logo.");
    } finally {
      if (sequence === uploadSequence.current) setUploading(false);
    }
  };

  const shuffleColors = () => {
    const colors = productColors(product);
    const first = Math.floor(Math.random() * colors.length);
    const second = (first + 1 + Math.floor(Math.random() * (colors.length - 1))) % colors.length;
    setConfiguration(current => ({ ...current, primary: colors[first].hex, secondary: colors[second].hex }));
  };
  const download = () => {
    const offer = isDisk
      ? { offer: diskOffer, includedRecords: diskOffer === "bundle" ? 3 : 0, ...(diskOffer === "bundle" && { discs: bundleDiscs }) }
      : { offer: linkerOffer ?? "e-linker", includedKeyrings: linkerCount };
    const { keyring, ...baseConfiguration } = configuration;
    const savedKeyring = { ...keyring, symbols: placedSymbols.length ? placedSymbols : undefined };
    const blob = new Blob([JSON.stringify({ version: isDisk ? 1 : placedSymbols.length ? 3 : 2, product, ...offer, ...baseConfiguration,
      ...(!isDisk && { keyring: savedKeyring, logo: orderLogo }), note: "Copia delle scelte del configuratore." }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `evolve-${product}-configurazione.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const colorStudies = (
    <section className={styles.colorStudies} aria-labelledby="studies-title">
      <h2 id="studies-title">Nei colori che preferisci<span>.</span></h2>
      <div className={styles.studyGrid}>{presets.map((preset, index) => (
        <a key={preset.name} href="#configura" className={styles.studyLink} aria-label={`Personalizza ${product}: abbinamento ${preset.name}`} onClick={event => {
          event.preventDefault();
          setConfiguration(current => ({ ...current, primary: preset.primary, secondary: preset.secondary }));
          document.getElementById("configura")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }}>
          <figure>
            <div className={styles.studyArtwork} data-study={index}><ProductMark product={product} primary={preset.primary} secondary={preset.secondary} /></div>
            <figcaption><span className={styles.studyDetails}><span>{preset.name}</span>{!isDisk && <small><i style={swatchStyle(preset.primary)} /><i style={swatchStyle(preset.secondary)} />{colorName(preset.primary)} · {colorName(preset.secondary)}</small>}</span><span className={styles.studyAction}>{isDisk ? "Prova il mix" : "Scegli l’abbinamento"} <ArrowUpRight size={15} /></span></figcaption>
          </figure>
        </a>
      ))}</div>
      <p className={styles.studyNote}>Studi illustrati di colore. Modelli, finiture e tonalità sono indicativi.</p>
    </section>
  );

  const ProductEnd = isDisk ? Fragment : LinkerPile;
  return (
    <main id="shop-content" className={styles.productPage} data-product={product}>
      <section ref={heroRef} className={styles.hero} aria-labelledby="product-title">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 id="product-title" className={styles.productTitle}>{info.name}</h1>
            <p className={styles.heroTagline}>{info.tagline}</p>
            <p className={styles.heroDescription}>{info.description}</p>
            <div className={styles.heroActions}>
              <a href="#configura" className={styles.heroCta}>{isDisk ? "Scegli i tuoi colori" : "Personalizza"} <ArrowUpRight size={21} /></a>
              {isDisk && <a href="#incidi" className={`${styles.heroCta} ${styles.heroDiscsCta}`}>Incidi i tuoi dischi <ArrowUpRight size={21} /></a>}
              {!isDisk && <a href="#offerta-e-linker" className={`${styles.heroCta} ${styles.heroBundleCta}`}>Scopri i bundle <ArrowUpRight size={21} /></a>}
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.visualOrbit} aria-hidden="true" />
            {isDisk && <button type="button" className={styles.heroSound} data-playing={heroSoundOn && heroPlaying} aria-pressed={heroSoundOn} aria-busy={heroSoundPending} aria-label={heroSoundOn || heroSoundPending ? "Disattiva la musica" : "Ascolta la musica"} title={heroSoundOn || heroSoundPending ? "Disattiva la musica" : "Ascolta la musica"} onClick={() => void toggleHeroSound()}>{heroSoundOn || heroSoundPending ? <Volume2 size={30} strokeWidth={1.6} /> : <VolumeX size={30} strokeWidth={1.6} />}<span className={styles.soundWaves} aria-hidden="true"><i /><i /><i /></span></button>}
            {isDisk && <span className={styles.sticker} aria-hidden="true">La tua<br />musica!</span>}
            {info.video ? <video ref={videoRef} src={info.video} className={styles.heroVideo} autoPlay muted loop playsInline aria-label={`Presentazione ${product}`} /> : <ProductScene product={product} configuration={heroConfiguration} presentation playing={heroPlaying} />}
            {isDisk && !info.video && <CartoonNotes playing={heroPlaying} />}
            {isDisk && <div className={styles.filmBar}>
              <span><i /> {isDisk && heroSoundOn ? "Sound on · Rock’n’roll!" : info.video ? "Il film" : "Studio di prodotto · 3D"}</span>
              <button type="button" onClick={() => setHeroPlaying(value => !value)} aria-label={heroPlaying ? "Metti in pausa la presentazione" : "Riprendi la presentazione"}>{heroPlaying ? <Pause size={15} /> : <Play size={15} />} {heroPlaying ? "Pausa" : "Play"}</button>
            </div>}
            {heroSoundError && <p className={styles.heroSoundError} role="status">{heroSoundError}</p>}
          </div>
        </div>
      </section>

      {isDisk && <div className={styles.tickerBridge} aria-hidden="true"><div className={styles.ticker}><div>{[0, 1, 2, 3].map(index => <span key={index}>OGGETTI FISICI, IDEE DIGITALI<b>✳</b> THINK TO EVOLVE <b>✳</b> METTI UN DISCO<b>✳</b></span>)}</div></div></div>}

      {isDisk && <EDiskGiftIdeas onChoose={setDiscSource} />}

      {!isDisk && <section id="scopri" className={styles.story} aria-labelledby="story-title">
        <h2 id="story-title">{info.punchline}<span>.</span></h2>
        <LinkerStoryCarousel />
      </section>}

      {colorStudies}
      {isDisk && <><EDiskDiscStudio source={discSource} onSourceChange={setDiscSource} /><EDiskRecordDemo /><EDiskBundle onChoose={() => { setDiskOffer("bundle"); document.getElementById("offerta-edisk")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }} /></>}

      <section id="configura" className={styles.configurator} aria-labelledby="config-title">
        <div className={styles.configHeading}>
          <h2 id="config-title">{isDisk ? <>Unico.<br />Come te</> : "Sbizzarrisciti"}<span>.</span></h2>
          {isDisk && <p>Due colori. Trenta possibilità per ognuno. Trova la combinazione che vorresti sul tuo tavolo.</p>}
        </div>
        <div className={styles.configGrid}>
          <div className={styles.viewer} data-theme={isDisk ? undefined : viewerTheme}>
            <div className={styles.viewerTop}>
              <span><i /> {product}</span>
              <div className={styles.viewerTopActions}>
                <span>360°</span>
                {!isDisk && <div className={styles.viewerTheme} role="group" aria-label="Sfondo dell’anteprima">
                  <button type="button" aria-pressed={viewerTheme === "light"} onClick={() => setViewerTheme("light")}>Chiaro</button>
                  <button type="button" aria-pressed={viewerTheme === "dark"} onClick={() => setViewerTheme("dark")}>Scuro</button>
                </div>}
              </div>
            </div>
            <div className={styles.configScene}>
              <div className={styles.configViewport}>
                <ProductScene product={product} configuration={previewConfiguration} playing={isDisk && recordPlaying}
                  reset={viewReset} onError={setSceneError} keyringEditor={isDisk ? undefined : canvasEditor} />
              </div>
              {!isDisk && <div className={styles.keyringCanvasTools}>
                <div role="group" aria-label="Faccia del portachiavi">
                  <button type="button" aria-pressed={face === "front"} onClick={() => setFace("front")}>Fronte</button>
                  <button type="button" aria-pressed={face === "back"} onClick={() => setFace("back")}>Retro</button>
                </div>
                <div role="group" aria-label="Strumenti dell’anteprima">
                  <button type="button" aria-pressed={canvasTool === "rotate"} onClick={() => setCanvasTool("rotate")}><RotateCcw size={15} />Ruota</button>
                  <button type="button" ref={shapeTool} aria-expanded={toolPanel === "shape"}
                    aria-controls={toolPanel === "shape" ? "keyring-tool-panel" : undefined}
                    onClick={() => setCanvasTool(toolPanel === "shape" ? "rotate" : "shape")}><Shapes size={15} aria-hidden="true" />Forma</button>
                  <button type="button" aria-pressed={canvasTool === "hole"} onClick={() => setCanvasTool("hole")}><CircleDot size={15} />Foro</button>
                  <button type="button" ref={textTool} aria-expanded={toolPanel === "text"}
                    aria-controls={toolPanel === "text" ? "keyring-tool-panel" : undefined}
                    onClick={() => setCanvasTool(toolPanel === "text" ? "rotate" : "text")}><Type size={15} />Scritta</button>
                  <button type="button" ref={symbolTool} aria-expanded={toolPanel === "symbol"}
                    aria-controls={toolPanel === "symbol" ? "keyring-tool-panel" : undefined}
                    onClick={() => setCanvasTool(toolPanel === "symbol" ? "rotate" : "symbol")}><Sparkles size={15} aria-hidden="true" />Simboli</button>
                  <button type="button" disabled={!activeText} aria-label={face === "front" ? "Cancella la scritta sul fronte" : "Cancella la scritta sul retro"} onClick={() => changeText("")}><Eraser size={15} />Gomma</button>
                </div>
                {canvasTool === "hole" && <select aria-label="Posizione del foro" value={configuration.keyring.hole} onChange={event => changeHole(event.target.value)}>
                  {keyringHoleOptions(configuration.shape).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>}
              </div>}
              {!isDisk && toolPanel && <section id="keyring-tool-panel" className={styles.keyringToolPanel} aria-labelledby="keyring-tool-title">
                <div className={styles.keyringToolHeading}>
                  <h3 id="keyring-tool-title">{panelTitle}</h3>
                  <button type="button" aria-label="Chiudi il pannello" onClick={closeToolPanel}><X size={16} aria-hidden="true" /></button>
                </div>
                {toolPanel === "shape" ? <div className={styles.shapeOptions}>
                  {KEYRING_SHAPES.map(shape => (
                    <button type="button" key={shape.id} aria-pressed={configuration.shape === shape.id} onClick={() => changeShape(shape.id)}>
                      <span aria-hidden="true">{shape.symbol}</span>{shape.name}
                    </button>
                  ))}
                </div> : toolPanel === "symbol" ? <KeyringSymbolPanel face={face} symbols={configuration.keyring.symbols ?? []}
                  onChange={symbols => setConfiguration(current => ({ ...current, keyring: { ...current.keyring, symbols } }))} /> : <>
                  <div className={styles.textInput}>
                    <input type="text" value={activeText} maxLength={textLimit(face)} aria-labelledby="keyring-tool-title"
                      placeholder="Il tuo nome, un’idea…" onChange={event => changeText(event.target.value)}
                      aria-invalid={invalidFaces.includes(face) || undefined} aria-describedby={invalidFaces.includes(face) ? "keyring-text-limit" : undefined} />
                    <span>{activeText.length}/{textLimit(face)}</span>
                  </div>
                  <div className={styles.keyringLetterOptions}>
                    <label>Rilievo<select value={activeRelief} onChange={event => changeRelief(event.target.value as KeyringRelief)}>
                      {keyringReliefs.map(value => <option key={value} value={value}>{keyringReliefNames[value]}</option>)}
                    </select></label>
                    <label>Carattere<select value={activeLettering.font ?? defaultKeyringLettering.font} disabled={activeRelief === "raised"}
                      onChange={event => changeLettering(face, { font: event.target.value as KeyringFont })}>
                      {activeRelief === "raised" ? <option value="helvetica">{keyringRaisedFontName}</option> : keyringFonts.map(value =>
                        <option key={value} value={value}>{keyringFontNames[value]}</option>)}
                    </select></label>
                    <label>Orientamento<select value={activeLettering.orientation} onChange={event => changeLettering(face, { orientation: event.target.value as KeyringTextOrientation })}>
                      {keyringTextOrientations.map(value => <option key={value} value={value}>{keyringTextOrientationNames[value]}</option>)}
                    </select></label>
                    <label>Grandezza<select value={activeLettering.size} disabled={availableSizes.length === 1}
                      onChange={event => changeLettering(face, { size: event.target.value as KeyringTextSize })}>
                      {availableSizes.map(value => <option key={value} value={value}>{keyringTextSizeNames[value]}</option>)}
                    </select></label>
                  </div>
                </>}
              </section>}
            </div>
            {!isDisk && invalidFaces.length > 0 && <p id="keyring-text-limit" className={styles.keyringTextLimit} role="status">{invalidFaces.map(side =>
              `${side === "front" ? "Fronte" : "Retro"} · massimo ${textLimit(side)} caratteri`).join(" · ")}</p>}
            {unplacedSymbols && <p className={styles.keyringTextLimit} role="status">
              Spazio insufficiente per i simboli {symbolLayout.flatMap((symbol, index) => symbol ? [] : [index + 1]).join(", ")}.
              Cambia modalità, riduci i simboli o sposta la scritta.
            </p>}
            <div className={styles.viewerTools}><span><MoveHorizontal size={16} />{isDisk ? "Trascina per ruotare" : canvasTool === "hole" ? "Trascina il foro" : canvasTool === "text" ? (activeText.trim() ? "Trascina la scritta" : "Inserisci una scritta per spostarla") : "Ruota liberamente in 3D"}</span><div>{isDisk && <button type="button" onClick={() => setRecordPlaying(current => !current)} aria-label={recordPlaying ? "Metti in pausa la rotazione dell’anteprima" : "Riprendi la rotazione dell’anteprima"}>{recordPlaying ? <Pause size={16} /> : <Play size={16} />}</button>}<button type="button" onClick={() => setViewReset(value => value + 1)} aria-label="Ripristina la vista 3D"><RotateCcw size={16} /></button></div></div>
            <div className={styles.viewerCaption}>{isDisk && <span>Anteprima dimostrativa</span>}<span>Designed by Evolve ↗</span></div>
          </div>

          <div className={styles.configPanel}>
            <fieldset className={styles.controlGroup}><legend>Trova i tuoi colori</legend>
              <ProductColorPicker product={product} value={configuration} onChange={(channel, hex) => setConfiguration(current => ({ ...current, [channel]: hex }))} onSwap={() => setConfiguration(current => ({ ...current, primary: current.secondary, secondary: current.primary }))} onShuffle={shuffleColors} />
              <div className={styles.presets}><span>Abbinamenti</span><div>{presets.map(preset => <button type="button" key={preset.name} aria-pressed={configuration.primary === preset.primary && configuration.secondary === preset.secondary} onClick={() => setConfiguration(current => ({ ...current, primary: preset.primary, secondary: preset.secondary }))}><i style={swatchStyle(preset.primary)} /><i style={swatchStyle(preset.secondary)} />{preset.name}</button>)}</div></div>
            </fieldset>
            {!isDisk && <>
              <fieldset id="offerta-e-linker" className={styles.linkerOffers}>
                <legend>Quanti portachiavi vuoi?</legend>
                <div className={styles.linkerOfferGrid}>
                  {([1, ...linkerBundleSizes] as const).map(size => {
                    const kind = linkerOfferKind(size);
                    const selected = linkerCount === size;
                    return <button key={kind} type="button" aria-pressed={selected} onClick={() => setLinkerOffer(kind)}>
                      <LinkerBundleArtwork size={size} primary={configuration.primary} secondary={configuration.secondary} />
                      <span>{size === 1 ? "1 portachiavi" : `${size} portachiavi`}</span>
                      {selected && <Check size={14} aria-hidden="true" />}
                    </button>;
                  })}
                </div>
                {linkerCount > 1 && <p className={styles.help}>Forma, colori e scritte si applicano a tutto il bundle.</p>}
              </fieldset>
              <div className={styles.controlGroup}>
                {canAttachLogo ? <>
                  <input ref={inputRef} className={styles.fileInput} tabIndex={-1} type="file" accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg" onChange={uploadLogo} aria-label="Carica il logo per il portachiavi" />
                  <button type="button" className={styles.uploadButton} onClick={() => inputRef.current?.click()} disabled={uploading}>
                    <Upload size={17} />{uploading ? "Leggo il logo…" : orderLogo ? "Cambia logo" : "Aggiungi il tuo logo"}<Plus size={16} />
                  </button>
                  <p className={styles.help}>SVG, PNG o JPG · max 2 MB. Il nostro team riceverà il logo con l’ordine.</p>
                  {orderLogo && <div className={styles.uploadedLogo}><Check size={16} /><span>{orderLogo.name}</span>
                    <button type="button" onClick={() => { uploadSequence.current++; setUploading(false); setLogoAttachment(null); setUploadError(""); }}
                      aria-label="Rimuovi il logo"><X size={15} /></button></div>}
                  {uploadError && <p className={styles.error} role="alert">{uploadError}</p>}
                </> : <p className={styles.logoBundleNotice}>Prendi il <strong>bundle da 20 in su</strong> per caricare il tuo logo e avere un design su misura.</p>}
              </div>
            </>}
            {sceneError && <p className={styles.error} role="status">{sceneError}</p>}
            <div className={styles.configurationSummary} aria-live="polite" aria-atomic="true"><span>IL TUO {product.toUpperCase()}</span><p>{colorName(configuration.primary)} <b>+</b> {colorName(configuration.secondary)}{!isDisk && <> · {keyringDesignLabels(configuration.shape, configuration.text.trim(), { ...configuration.keyring, symbols: placedSymbols }).join(" · ")}</>}</p></div>
            {isDisk && <fieldset id="offerta-edisk" className={styles.offerPicker}><legend>Da dove vuoi iniziare?</legend><div><button type="button" aria-pressed={diskOffer === "device"} onClick={() => setDiskOffer("device")}><span>Solo e-disk</span><small>Il giradischi nei tuoi colori</small>{diskOffer === "device" && <Check size={14} />}</button><button type="button" aria-pressed={diskOffer === "bundle"} onClick={() => setDiskOffer("bundle")}><span>Il bundle</span><small>e-disk + 3 dischi personalizzabili</small>{diskOffer === "bundle" && <Check size={14} />}</button></div></fieldset>}
            {isDisk && diskOffer === "bundle" && <BundleDiscFields discs={bundleDiscs} onChange={setBundleDiscs} />}
            {isDisk ? <ConfiguredPurchase key={diskOffer} kind={diskOffer === "bundle" ? "e-disk-bundle" : "e-disk"} buttonClass={styles.requestButton}
              disabled={diskOffer === "bundle" && bundleDiscs.some(disc => !disc.title.trim())}
              prepare={() => ({
                color: configuration.primary,
                details: diskOffer === "bundle" ? {
                  kind: "e-disk-bundle",
                  secondaryColor: configuration.secondary,
                  discs: bundleDiscs.map(disc => ({
                    color: disc.color,
                    title: disc.title.trim(),
                    dedication: disc.dedication.trim() || undefined,
                    trackUrl: disc.trackUrl.trim() || undefined,
                  })),
                } : { kind: "e-disk", secondaryColor: configuration.secondary },
              })} /> :
              linkerOffer && <ConfiguredPurchase key={linkerOffer} kind={linkerOffer} buttonClass={styles.requestButton} disabled={(canAttachLogo && uploading) || invalidFaces.length > 0 || unplacedSymbols}
                prepare={() => ({
                  color: configuration.primary,
                  inscription: configuration.text.trim() || undefined,
                  logoAsset: orderLogo,
                  details: { kind: linkerOffer, secondaryColor: configuration.secondary, shape: configuration.shape,
                    hole: configuration.keyring.hole,
                    ...(placedSymbols.length > 0 && { symbols: placedSymbols }),
                    front: configuration.text.trim() ? configuration.keyring.front : undefined,
                    back: configuration.keyring.back.text.trim()
                      ? { ...configuration.keyring.back, text: configuration.keyring.back.text.trim() } : undefined },
                })} />}
            <button type="button" onClick={download} className={styles.downloadButton}
              disabled={!isDisk && (invalidFaces.length > 0 || unplacedSymbols || (canAttachLogo && uploading))}><Download size={15} /> Salva la tua configurazione</button>
            {!isDisk && <Link href="/contact" prefetch={false} className={styles.downloadButton}>Vuoi qualcosa che non trovi qui? Parliamone. <ArrowUpRight size={15} /></Link>}
          </div>
        </div>
      </section>

      {!isDisk && <section className={styles.linkerBespoke} aria-labelledby="linker-bespoke-title">
        <div className={styles.linkerBespokeCopy}>
          <h2 id="linker-bespoke-title">Disegnato su misura per te<span>.</span></h2>
          <p>Dal <strong>bundle da 20 portachiavi</strong>, un designer specializzato Evolve rielabora il logo che hai caricato per valorizzarlo nella stampa 3D. Il disegno può dare forma a tutto il portachiavi.</p>
          <p>Dopo l’ordine riceverai una proposta in <strong>I tuoi Design</strong>, la sezione del profilo in arrivo. Da lì potrai approvarla o chiedere correzioni.</p>
          <p>Le prime <strong>due revisioni sono incluse</strong>. Potrai chiederne altre senza limiti, con un piccolo supplemento per ciascuna.</p>
        </div>
        <Image className={styles.linkerBespokeImage} src="/shop/e-linker-design-su-misura.webp"
          alt="Due e-linker su misura, a forma di pneumatico e di racchetta da tennis, accanto ai rispettivi bozzetti"
          width={1536} height={1024} sizes="(max-width: 860px) 90vw, (max-width: 1600px) 42vw, 700px" />
      </section>}

      <section className={styles.resources} aria-labelledby="resources-title">
        <div className={styles.resourceCopy}>
          <h2 id="resources-title">{isDisk ? <>L’oggetto è solo<br />l’inizio</> : "Condividiti"}<span>.</span></h2>
          {isDisk && <p>Dietro ogni disco c’è la tua collezione. Apri l’app, organizza i brani e scopri come dare vita al tuo e-disk.</p>}
        </div>
        <div className={styles.resourceLinks}>
          {isDisk && <Link href="/shop/e-disk/app"><Smartphone size={26} /><div><span>La tua collezione, online</span><h3>App e-disk</h3><p>Dischi, brani e giradischi. Tutto in un posto.</p></div><ArrowUpRight size={25} /></Link>}
          <Link href={`/shop/${product}/documentazione`}>
            <BookOpen size={26} />
            <div><span>Da dove si comincia?</span><h3>Dentro {product}</h3>
              <p>{isDisk ? "Primi passi, NFC e collegamenti." : "Come configurare e-linker in pochi secondi"}</p>
            </div>
            <ArrowUpRight size={25} />
          </Link>
        </div>
      </section>

      <ProductEnd>
        <section className={styles.faq} aria-labelledby={isDisk ? "faq-title" : undefined}
          aria-label={isDisk ? undefined : "Domande frequenti su e-linker"}>
          {isDisk && <div><h2 id="faq-title">Bella domanda<span>.</span></h2></div>}
          <div>
            {info.faq.map(item => <details key={item.question}>
              <summary>{item.question}<Plus size={20} aria-hidden="true" /></summary>
              <div className={styles.faqAnswer}>
                <p>
                  {item.answer}
                  {"link" in item && <> <Link href={item.link.href}>{item.link.label}</Link></>}
                </p>
              </div>
            </details>)}
          </div>
        </section>

        <RelatedProducts current={product} />
      </ProductEnd>
    </main>
  );
}
