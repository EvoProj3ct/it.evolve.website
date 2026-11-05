"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, BookOpen, Check, Disc3, Download, MoveHorizontal, Nfc, Pause, Play, Plus, RotateCcw, Smartphone, Upload, X } from "lucide-react";
import { ProductIllustration } from "./ProductIllustration";
import { ProductColorPicker } from "./ProductColorPicker";
import { CartoonNotes } from "./CartoonNotes";
import { colorName, defaultConfiguration, KEYRING_SHAPES, PRODUCTS, SHOP_COLORS, type ProductConfiguration, type ProductId } from "./products";
import styles from "./Shop.module.css";

const ProductScene = dynamic(() => import("./ProductScene"), { ssr: false, loading: () => <span className={styles.sceneLoading}>L’oggetto prende forma…</span> });
const swatchStyle = (color: string) => ({ "--swatch": color } as CSSProperties);
const PRESETS = [
  { name: "Evolve", primary: "#72C94F", secondary: "#114928" },
  { name: "Pop", primary: "#8651FF", secondary: "#C1FF00" },
  { name: "Sunset", primary: "#FF7638", secondary: "#F7BAD5" },
];

function configurationSummary(product: ProductId, configuration: ProductConfiguration) {
  const lines = [PRODUCTS[product].name, `${product === "e-disk" ? "Scocca" : "Base"}: ${colorName(configuration.primary)} (${configuration.primary})`, `${product === "e-disk" ? "Piano" : "Scritta e logo SVG"}: ${colorName(configuration.secondary)} (${configuration.secondary})`];
  if (product === "e-linker") lines.push(`Forma: ${KEYRING_SHAPES.find(shape => shape.id === configuration.shape)?.name}`, `Testo: ${configuration.text || "Nessun testo"}`, `Logo: ${configuration.logo?.name ?? "Nessun logo"}`);
  return lines.join("\n");
}

export function ShopProductExperience({ product }: { product: ProductId }) {
  const info = PRODUCTS[product];
  const isDisk = product === "e-disk";
  const otherProduct: ProductId = isDisk ? "e-linker" : "e-disk";
  const [configuration, setConfiguration] = useState<ProductConfiguration>(() => defaultConfiguration(product));
  const previewConfiguration = useDeferredValue(configuration);
  const heroConfiguration = useMemo(() => defaultConfiguration(product), [product]);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [recordPlaying, setRecordPlaying] = useState(true);
  const [viewReset, setViewReset] = useState(0);
  const [sceneError, setSceneError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadSequence = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const sequence = ++uploadSequence.current;
    setUploadError(""); setSceneError("");
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
      if (sequence === uploadSequence.current) setConfiguration(current => ({ ...current, logo: { name: file.name, kind: svg ? "svg" : "image", data } }));
    } catch (error) {
      if (sequence === uploadSequence.current) setUploadError(error instanceof Error ? error.message : "Non riesco a leggere questo logo.");
    } finally {
      if (sequence === uploadSequence.current) setUploading(false);
    }
  };

  const shuffleColors = () => {
    const first = Math.floor(Math.random() * SHOP_COLORS.length);
    const second = (first + 1 + Math.floor(Math.random() * (SHOP_COLORS.length - 1))) % SHOP_COLORS.length;
    setConfiguration(current => ({ ...current, primary: SHOP_COLORS[first].hex, secondary: SHOP_COLORS[second].hex }));
  };
  const download = () => {
    const blob = new Blob([JSON.stringify({ version: 1, product, ...configuration, note: "Configurazione dimostrativa da confermare con Evolve prima della produzione." }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `evolve-${product}-configurazione.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const mailBody = `Ciao Evolve!\nVorrei saperne di più su questa configurazione:\n\n${configurationSummary(product, configuration)}\n\n${configuration.logo ? "Allego alla mail il logo originale.\n\n" : ""}Mi indicate prezzo, disponibilità e prossimi passi?`;
  const mailHref = `mailto:infoevolvecompany@gmail.com?subject=${encodeURIComponent(`Il mio ${product}`)}&body=${encodeURIComponent(mailBody)}`;

  return (
    <main id="shop-content" className={styles.productPage} data-product={product}>
      <section className={styles.hero} aria-labelledby="product-title">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 id="product-title" className={styles.productTitle}>{info.name}</h1>
            <p className={styles.heroTagline}>{info.tagline}</p>
            <p className={styles.heroDescription}>{info.description}</p>
            <a href="#configura" className={styles.heroCta}>{isDisk ? "Scegli i tuoi colori" : "Personalizza e-linker"} <ArrowUpRight size={21} /></a>
            <span className={styles.heroCategory}>{isDisk ? <Nfc size={17} /> : <Plus size={17} />} {info.category}</span>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.visualOrbit} aria-hidden="true" />
            <span className={styles.visualCross} aria-hidden="true">✳</span>
            <span className={styles.sticker} aria-hidden="true">{isDisk ? <>La tua<br />musica!</> : <>✳ <span>Disegnato da te</span></>}</span>
            {info.video ? <video ref={videoRef} src={info.video} className={styles.heroVideo} autoPlay muted loop playsInline aria-label={`Presentazione ${product}`} /> : <ProductScene product={product} configuration={heroConfiguration} presentation playing={heroPlaying} />}
            {isDisk && !info.video && <CartoonNotes playing={heroPlaying} />}
            <div className={styles.filmBar}>
              <span><i /> {info.video ? "Il film" : "Studio di prodotto · 3D"}</span>
              <button type="button" onClick={() => setHeroPlaying(value => !value)} aria-label={heroPlaying ? "Metti in pausa la presentazione" : "Riprendi la presentazione"}>{heroPlaying ? <Pause size={15} /> : <Play size={15} />} {heroPlaying ? "Pausa" : "Play"}</button>
            </div>
          </div>
        </div>
        <a href="#scopri" className={styles.scrollCue}>Bello da vedere. Ancora meglio da usare. <ArrowDown size={15} /></a>
      </section>

      {isDisk && <div className={styles.tickerBridge} aria-hidden="true"><div className={styles.ticker}><div>{[0, 1, 2, 3].map(index => <span key={index}>OGGETTI FISICI, IDEE DIGITALI<b>✳</b> THINK TO EVOLVE <b>✳</b> METTI UN DISCO<b>✳</b></span>)}</div></div></div>}

      <section id="scopri" className={styles.story} aria-labelledby="story-title">
        <div className={styles.storyHeading}><h2 id="story-title">{info.punchline}<span>.</span></h2><p>{isDisk ? "Ci piace la musica digitale. Ci mancava il piacere di scegliere un disco. e-disk mette insieme le due cose: un oggetto da toccare, una collezione da costruire e i tuoi brani preferiti, a un gesto di distanza." : "Un nome che ti rappresenta. Un logo che riconosci al volo. Un colore che si fa notare. e-linker parte dalle forme più semplici e le trasforma in qualcosa che è soltanto tuo."}</p></div>
        <div className={styles.steps}>{info.steps.map((step, index) => <article key={step.title} className={styles.step}><span className={styles.stepNumber}>0{index + 1}</span><div className={styles.stepGraphic} aria-hidden="true">{isDisk ? index === 0 ? <Disc3 /> : index === 1 ? <Nfc /> : <span className={styles.equalizer}>{[0, 1, 2, 3, 4, 5, 6].map(n => <i key={n} />)}</span> : <span className={styles.shapeGraphic}>{index === 0 ? "△ ○" : index === 1 ? "Aa" : "✳"}</span>}</div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
      </section>

      <section id="configura" className={styles.configurator} aria-labelledby="config-title">
        <div className={styles.configHeading}><h2 id="config-title">Unico.<br />Come te<span>.</span></h2><p>{isDisk ? "Due colori. Trenta possibilità per ognuno. Trova la combinazione che vorresti sul tuo tavolo." : "Parti da una forma, aggiungi la tua scritta e trova il tuo abbinamento. Il prossimo portachiavi lo disegni tu."}</p></div>
        <div className={styles.configGrid}>
          <div className={styles.viewer}>
            <div className={styles.viewerTop}><span><i /> {product}</span><span>360°</span></div>
            <div className={styles.configScene}><ProductScene product={product} configuration={previewConfiguration} playing={isDisk && recordPlaying} reset={viewReset} onError={setSceneError} /></div>
            <div className={styles.viewerTools}><span><MoveHorizontal size={16} />{isDisk ? "Trascina per ruotare" : "Ruota liberamente in 3D"}</span><div>{isDisk && <button type="button" onClick={() => setRecordPlaying(current => !current)} aria-label={recordPlaying ? "Metti in pausa la rotazione dell’anteprima" : "Riprendi la rotazione dell’anteprima"}>{recordPlaying ? <Pause size={16} /> : <Play size={16} />}</button>}<button type="button" onClick={() => setViewReset(value => value + 1)} aria-label="Ripristina la vista 3D"><RotateCcw size={16} /></button></div></div>
            <div className={styles.viewerCaption}><span>Anteprima dimostrativa</span><span>Designed by Evolve ↗</span></div>
          </div>

          <div className={styles.configPanel}>
            {!isDisk && <>
              <fieldset className={styles.controlGroup}><legend>Scegli la forma</legend><div className={styles.shapeOptions}>{KEYRING_SHAPES.map(shape => <button type="button" key={shape.id} aria-pressed={configuration.shape === shape.id} onClick={() => setConfiguration(current => ({ ...current, shape: shape.id }))}><span aria-hidden="true">{shape.symbol}</span>{shape.name}</button>)}</div></fieldset>
              <div className={styles.controlGroup}><label className={styles.fieldLabel} htmlFor="keyring-text">Lascia il tuo segno</label><div className={styles.textInput}><input id="keyring-text" type="text" value={configuration.text} maxLength={18} placeholder="Il tuo nome, un’idea…" onChange={event => setConfiguration(current => ({ ...current, text: event.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 .!?&+@#'_-]/g, "") }))} aria-describedby="text-help" /><span>{configuration.text.length}/18</span></div><p id="text-help" className={styles.help}>La scritta prende forma in rilievo. Puoi anche lasciare solo il logo.</p>
                <input ref={inputRef} className={styles.fileInput} tabIndex={-1} type="file" accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg" onChange={uploadLogo} aria-label="Carica il logo per il portachiavi" />
                <button type="button" className={styles.uploadButton} onClick={() => inputRef.current?.click()} disabled={uploading}><Upload size={17} />{uploading ? "Leggo il logo…" : configuration.logo ? "Cambia logo" : "Aggiungi il tuo logo"}<Plus size={16} /></button>
                <p className={styles.help}>SVG in rilievo · PNG/JPG sulla superficie · max 2 MB</p>
                {configuration.logo && <div className={styles.uploadedLogo}><Check size={16} /><span>{configuration.logo.name}</span><button type="button" onClick={() => { uploadSequence.current++; setUploading(false); setConfiguration(current => ({ ...current, logo: null })); setSceneError(""); setUploadError(""); }} aria-label="Rimuovi il logo"><X size={15} /></button></div>}
                {uploadError && <p className={styles.error} role="alert">{uploadError}</p>}
              </div>
            </>}
            <fieldset className={styles.controlGroup}><legend>Trova i tuoi colori</legend>
              <ProductColorPicker product={product} value={configuration} onChange={(channel, hex) => setConfiguration(current => ({ ...current, [channel]: hex }))} onSwap={() => setConfiguration(current => ({ ...current, primary: current.secondary, secondary: current.primary }))} onShuffle={shuffleColors} />
              <div className={styles.presets}><span>Abbinamenti</span><div>{PRESETS.map(preset => <button type="button" key={preset.name} aria-pressed={configuration.primary === preset.primary && configuration.secondary === preset.secondary} onClick={() => setConfiguration(current => ({ ...current, primary: preset.primary, secondary: preset.secondary }))}><i style={swatchStyle(preset.primary)} /><i style={swatchStyle(preset.secondary)} />{preset.name}</button>)}</div></div>
            </fieldset>
            {sceneError && <p className={styles.error} role="status">{sceneError}</p>}
            <div className={styles.configurationSummary} aria-live="polite" aria-atomic="true"><span>IL TUO {product.toUpperCase()}</span><p>{colorName(configuration.primary)} <b>+</b> {colorName(configuration.secondary)}{!isDisk && <> · {KEYRING_SHAPES.find(shape => shape.id === configuration.shape)?.name}{configuration.text && <> · “{configuration.text}”</>}</>}</p></div>
            <a href={mailHref} className={styles.requestButton}>Parliamone <ArrowUpRight size={21} /></a>
            <button type="button" onClick={download} className={styles.downloadButton}><Download size={15} /> Salva la tua configurazione</button>
            <p className={styles.requestNote}>Apri una mail con le tue scelte. Prezzo, materiali e disponibilità li definiamo insieme.{configuration.logo && " Ricorda di allegare il logo originale alla mail."}</p>
          </div>
        </div>
      </section>

      <section className={styles.colorStudies} aria-labelledby="studies-title"><h2 id="studies-title">Il colore è tuo<span>.</span></h2><div className={styles.studyGrid}>{PRESETS.map((preset, index) => <figure key={preset.name}><div className={styles.studyArtwork} data-study={index}><ProductIllustration product={product} configuration={{ ...defaultConfiguration(product), primary: preset.primary, secondary: preset.secondary, shape: index === 1 ? "circle" : index === 2 ? "triangle" : "rectangle", text: index === 0 ? "EVOLVE" : index === 1 ? "CIAO." : "WOW!" }} /></div><figcaption><span>{preset.name}</span><button type="button" onClick={() => { setConfiguration(current => ({ ...current, primary: preset.primary, secondary: preset.secondary })); document.getElementById("configura")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>Prova il mix <ArrowUpRight size={15} /></button></figcaption></figure>)}</div><p className={styles.studyNote}>Studi illustrati di colore. Modelli, finiture e tonalità sono indicativi.</p></section>

      <section className={styles.resources} aria-labelledby="resources-title"><div className={styles.resourceCopy}><h2 id="resources-title">L’oggetto è solo<br />l’inizio<span>.</span></h2><p>{isDisk ? "Dietro ogni disco c’è la tua collezione. Apri l’app, organizza i brani e scopri come dare vita al tuo e-disk." : "Hai in mente qualcosa di preciso? Parti dalla guida: forme, testi e loghi spiegati senza giri di parole."}</p></div><div className={styles.resourceLinks}>{isDisk && <Link href="/shop/e-disk/app"><Smartphone size={26} /><div><span>La tua collezione, online</span><h3>App e-disk</h3><p>Dischi, brani e giradischi. Tutto in un posto.</p></div><ArrowUpRight size={25} /></Link>}<Link href={`/shop/${product}/documentazione`}><BookOpen size={26} /><div><span>Da dove si comincia?</span><h3>Dentro {product}</h3><p>{isDisk ? "Primi passi, NFC e collegamenti." : "Forme, file del logo e personalizzazione."}</p></div><ArrowUpRight size={25} /></Link></div></section>

      <section className={styles.faq} aria-labelledby="faq-title"><div><h2 id="faq-title">Bella domanda<span>.</span></h2></div><div>{info.faq.map(item => <details key={item.question}><summary>{item.question}<Plus size={20} /></summary><p>{item.answer}</p></details>)}</div></section>

      <Link href={`/shop/${otherProduct}`} className={styles.otherProduct}><div><span>La famiglia Evolve continua</span><h2>Piacere,<br />{otherProduct}<span>.</span></h2><p>{PRODUCTS[otherProduct].category} <ArrowUpRight size={20} /></p></div><ProductIllustration product={otherProduct} configuration={defaultConfiguration(otherProduct)} /></Link>
    </main>
  );
}
