import type { ProductId } from "@/lib/ecommerce/product-visibility";
import { defaultKeyringLettering, keyringHoleOptions, keyringShapeNames, keyringShapes, type KeyringLettering, type KeyringShape } from "@evolve/ecommerce-server/keyring-design";
import { shopPaymentFaq } from "./shopPaymentFaq";

export type { ProductId } from "@/lib/ecommerce/product-visibility";
export type { KeyringShape } from "@evolve/ecommerce-server/keyring-design";
export type LogoAsset = { name: string; kind: "svg" | "image"; data: string };
export type ProductConfiguration = {
  primary: string;
  secondary: string;
  shape: KeyringShape;
  text: string;
  logo: LogoAsset | null;
  keyring: { hole: string; front: KeyringLettering; back: KeyringLettering & { text: string } };
};

// Palette dimostrativa: non rappresenta ancora la disponibilità dei filamenti.
export const SHOP_COLORS = [
  { name: "Verde Evolve", hex: "#72C94F" },
  { name: "Acid lime", hex: "#C1FF00" },
  { name: "Foresta", hex: "#114928" },
  { name: "Salvia", hex: "#578B60" },
  { name: "Menta", hex: "#A9E8C5" },
  { name: "Petrolio", hex: "#2C7A62" },
  { name: "Bianco latte", hex: "#F5F1E8" },
  { name: "Nero", hex: "#171B19" },
  { name: "Grafite", hex: "#49504E" },
  { name: "Grigio perla", hex: "#BAC3BF" },
  { name: "Giallo sole", hex: "#FFDE38" },
  { name: "Vaniglia", hex: "#F2F2A6" },
  { name: "Arancio", hex: "#FF7638" },
  { name: "Terracotta", hex: "#BC634A" },
  { name: "Corallo", hex: "#FF6666" },
  { name: "Rosso", hex: "#E82D3C" },
  { name: "Bordeaux", hex: "#660000" },
  { name: "Rosa pop", hex: "#FF4FB7" },
  { name: "Rosa confetto", hex: "#F7BAD5" },
  { name: "Pesca", hex: "#FFC0A1" },
  { name: "Viola elettrico", hex: "#8651FF" },
  { name: "Viola Evolve", hex: "#8567C1" },
  { name: "Lilla", hex: "#CABEE6" },
  { name: "Blu elettrico", hex: "#3154F4" },
  { name: "Blu notte", hex: "#202D5A" },
  { name: "Azzurro", hex: "#77C8FF" },
  { name: "Turchese", hex: "#27D9CC" },
  { name: "Sabbia", hex: "#D7C4A0" },
  { name: "Cacao", hex: "#795442" },
  { name: "Biscotto", hex: "#BE9368" },
] as const;

// Selezione dedicata a e-linker: neutri e colori da prodotto, senza accenti fluo.
export const LINKER_COLORS = [
  { name: "Ghiaccio", hex: "#E9F0ED" },
  { name: "Bianco latte", hex: "#F5F1E8" },
  { name: "Grigio perla", hex: "#BAC3BF" },
  { name: "Titanio", hex: "#829BA3" },
  { name: "Grafite", hex: "#49504E" },
  { name: "Ardesia", hex: "#263C42" },
  { name: "Nero", hex: "#171B19" },
  { name: "Blu notte", hex: "#202D5A" },
  { name: "Petrolio", hex: "#2C7A62" },
  { name: "Foresta", hex: "#114928" },
  { name: "Salvia", hex: "#578B60" },
  { name: "Verde Evolve", hex: "#72C94F" },
  { name: "Sabbia", hex: "#D7C4A0" },
  { name: "Cacao", hex: "#795442" },
  { name: "Terracotta", hex: "#BC634A" },
  { name: "Viola Evolve", hex: "#8567C1" },
] as const;

export const LED_COLORS = [
  { name: "Nero notte", hex: "#101614" },
  { name: "Grafite", hex: "#49504E" },
  { name: "Bianco ghiaccio", hex: "#E9F0ED" },
  { name: "Verde Evolve", hex: "#72FF63" },
  { name: "Cyan", hex: "#45EAFF" },
  { name: "Blu laser", hex: "#5475FF" },
  { name: "Ultravioletto", hex: "#AE6BFF" },
  { name: "Magenta", hex: "#FF52C6" },
  { name: "Rosso neon", hex: "#FF535E" },
  { name: "Ambra", hex: "#FFB857" },
  { name: "Bianco caldo", hex: "#FFF0CD" },
  { name: "Bianco luce", hex: "#F3FCFF" },
] as const;

export function productColors(product: ProductId) {
  return product === "e-linker" ? LINKER_COLORS : product === "e-led" ? LED_COLORS : SHOP_COLORS;
}

type SelectableKeyringShape = Exclude<KeyringShape, "cube">;
const shapeSymbols: Record<SelectableKeyringShape, string> = {
  rectangle: "▭", square: "□", circle: "○", triangle: "△", ellipse: "⬭", heart: "♡", star: "☆", hexagon: "⬡",
};
export const KEYRING_SHAPES = keyringShapes
  .filter((id): id is SelectableKeyringShape => id !== "cube")
  .map(id => ({ id, name: keyringShapeNames[id], symbol: shapeSymbols[id] }));

export const PRODUCTS = {
  "e-disk": {
    name: "e-disk",
    number: "01",
    category: "Il giradischi per la tua musica",
    tagline: "Meno scroll.\nPiù rock’n’roll!",
    description: "Il piacere di scegliere un disco, con tutta la libertà del digitale.",
    punchline: "Gira il disco.\nCambia la giornata.",
    defaultPrimary: "#FF7638",
    defaultSecondary: "#F7BAD5",
    video: null as string | null,
    steps: [
      { title: "Scegli la tua musica.", description: "Un brano che ami, una dedica, una canzone creata per te. Ogni disco parte da una storia." },
      { title: "Noi le diamo forma.", description: "Stampiamo e personalizziamo i tuoi dischi: oggetti da tenere, regalare e aggiungere alla tua collezione." },
      { title: "Appoggia. Ascolta.", description: "Un disco sul giradischi, la sua canzone nell’app. Cambia disco ogni volta che vuoi cambiare atmosfera." },
    ],
    faq: [
      { question: "Come vengono realizzati i dischi?", answer: "Stampiamo e personalizziamo noi i dischi, con il loro aspetto e l’associazione al contenuto scelto. “Incidere” significa dare una forma fisica alla tua musica: i brani vengono riprodotti dall’app, non letti da solchi incisi." },
      { question: "Posso creare una canzone solo mia?", answer: "Il progetto prevede canzoni su misura create con il nostro tool IA: puoi partire da una storia, una dedica o un’occasione speciale. Il tool è attualmente in preparazione." },
      { question: "Posso scegliere un brano da Spotify o YouTube?", answer: "Sono i due percorsi previsti per i brani esistenti. YouTube è già supportato dall’app e-disk; il collegamento automatico a Spotify è in preparazione. L’ascolto segue le disponibilità e le condizioni del servizio scelto." },
      { question: "Cosa comprende il bundle?", answer: "Un e-disk nella tua combinazione di colori e tre dischi personalizzabili. È il punto di partenza della collezione: puoi scegliere anche il solo giradischi." },
      { question: "E se volessi altri dischi?", answer: "Puoi acquistare altri dischi da Evolve quando vuoi, senza ricomprare il giradischi. Una nuova canzone, un altro regalo, un ricordo da aggiungere: la collezione continua." },
      { question: "È un giradischi per vinili tradizionali?", answer: "e-disk è un oggetto interattivo che legge dischi NFC. Non legge i solchi dei vinili: ogni disco richiama un brano associato nell’app." },
      { question: "Da dove esce la musica?", answer: "La musica viene riprodotta dal telefono o dal computer, tramite il player dell’app. Puoi usare la sua uscita audio, comprese cuffie o una cassa associata al dispositivo. e-disk gestisce lettura NFC e movimento del disco." },
      { question: "Serve installare un’app?", answer: "L’app e-disk si apre nel browser. Il collegamento al giradischi richiede un browser con supporto Web Bluetooth e un contesto HTTPS o localhost. La compatibilità varia in base a sistema operativo e browser." },
      { question: "Posso scegliere i colori?", answer: "Sì: questa anteprima ti permette di combinare due colori tra 30 tonalità. Colori effettivi, materiali, prezzo e disponibilità vengono confermati con Evolve prima dell’ordine." },
    ],
  },
  "e-linker": {
    name: "e-linker",
    number: "02",
    category: "Il tuo portachiavi NFC personalizzato",
    tagline: "Il tuo logo fuori,\nil tuo mondo dentro.",
    description: "Un portachiavi NFC in bioplastica 100% riciclabile stampato in 3D. Avvicinalo allo smartphone per attivare la magia.",
    punchline: "Connetti ciò\nche conta",
    defaultPrimary: "#E9F0ED",
    defaultSecondary: "#263C42",
    video: null as string | null,
    steps: [
      { scene: "profile", title: "Fatti conoscere.", description: "Il tuo sito, i social, il menu della tua attività. Il prossimo contatto comincia con un gesto." },
      { scene: "product", title: "Dai spazio a un prodotto.", description: "Una scheda, un video, una novità. Un accesso diretto a ciò che vuoi far scoprire." },
      { scene: "memory", title: "Regala un ricordo.", description: "Un album, una dedica, un video per un amico. Un momento da portare sempre con sé." },
      { scene: "app", title: "Apri la tua app.", description: "Un link configurato porta a una schermata della tua app. Chi non l’ha installata può proseguire sul sito." },
      { scene: "chatbot", title: "Collega il tuo chatbot.", description: "Abbina e-linker al link pubblico del tuo chatbot. Chi avvicina il telefono può aprire la chat e iniziare a scrivere." },
      { scene: "lights", title: "Accendi le luci.", description: "Abbina il tag a un’automazione in Comandi Rapidi su iPhone per accendere una lampada compatibile o attivare una scena di Casa." },
      { scene: "wifi", title: "Condividi il Wi‑Fi.", description: "Apri una pagina con il nome e la password della rete ospiti, pronti da copiare." },
      { scene: "map", title: "Fatti trovare.", description: "Apri la mappa con le indicazioni per il tuo negozio, lo stand in fiera o il punto di ritiro." },
      { scene: "review", title: "Raccogli recensioni.", description: "Porta i clienti direttamente al modulo per recensire la tua attività, per esempio su Google." },
      { scene: "booking", title: "Apri le prenotazioni.", description: "Collega il portachiavi alla pagina per fissare un appuntamento, prenotare un tavolo o iscriversi a un evento." },
      { scene: "guide", title: "Tieni la guida a portata.", description: "Apri le istruzioni di un prodotto, un video di montaggio o la pagina di assistenza." },
    ],
    faq: [
      { question: "Che cosa contiene e-linker?", answer: "Un tag NFC all’interno del portachiavi stampato in 3D. Avvicinandolo a uno smartphone compatibile puoi aprire il collegamento scelto: la tua attività, un prodotto oppure un contenuto personale." },
      { question: "Come posso usarlo per la mia attività?", answer: "Puoi collegarlo al sito, ai social, al menu, al catalogo o alla pagina di un prodotto. All’esterno ci sono il tuo logo e i tuoi colori; all’interno, un accesso diretto a ciò che vuoi far scoprire." },
      { question: "Posso regalarlo con un ricordo personale?", answer: "Sì: il collegamento può portare a un album, a un video o a una dedica online. I contenuti rimangono nella pagina collegata; il tag custodisce il collegamento, non i file. Per i ricordi privati scegli una destinazione con le impostazioni di accesso adatte." },
      {
        question: "Che cosa posso personalizzare?",
        answer: "Scegli forma, colori, foro e scritte. Dal bundle da 20 puoi anche allegare il logo. Al link puoi pensarci dopo. Con uno smartphone compatibile puoi impostarlo e cambiarlo tutte le volte che vuoi dal nostro sito.",
        link: { href: "/shop/e-linker/configura", label: "Configura e-linker" },
      },
      { question: "Quale formato uso per il logo?", answer: "Dal bundle da 20 puoi allegare un file SVG, PNG o JPG fino a 2 MB. Se usi un SVG, converti prima eventuali testi in tracciati. Il nostro team userà il logo per preparare il design." },
      { question: "Il modello è pronto per la stampa?", answer: "L’anteprima serve a scegliere l’aspetto del portachiavi. Spessori, dimensioni, leggibilità del testo e lavorabilità del logo vengono verificati insieme prima della produzione." },
      {
        question: "Come richiedo il mio e-linker?",
        answer: "Puoi acquistare le offerte disponibili direttamente dal configuratore. Se non trovi la forma che cerchi, contattaci. Le personalizzazioni oltre le possibilità del configuratore sono disponibili per ordini da 20 pezzi in su.",
        link: { href: "/contact", label: "Vai ai contatti" },
      },
      ...shopPaymentFaq,
    ],
  },
  "e-led": {
    name: "e-led",
    number: "03",
    category: "La tua identità, accesa",
    tagline: "Fatti vedere.\nSotto un’altra luce.",
    description: "Il tuo nome diventa luce. Una grande scritta stampata in 3D, con una luce LED intensa e a colori, per dare carattere al tuo spazio e visibilità alla tua attività.",
    punchline: "Un segno che\nlascia il segno.",
    defaultPrimary: "#101614",
    defaultSecondary: "#72FF63",
    video: null as string | null,
    steps: [],
    faq: [
      { question: "Posso usare il nome o il logo della mia attività?", answer: "Sì. Puoi partire da una scritta, dal tuo logo vettoriale oppure combinarli. Il configuratore mostra il progetto illuminato; prima della realizzazione definiamo insieme proporzioni, tracciati e dettagli stampabili." },
      { question: "La luce può cambiare colore?", answer: "Il concept prevede LED a colori ed effetti luminosi. Nell’anteprima puoi esplorare luce fissa, respiro, pulsazione e un flusso continuo di colori. Effetti e comandi del prodotto definitivo saranno confermati con il progetto." },
      { question: "Quanto può essere grande?", answer: "Le misure nel configuratore servono a immaginare il progetto nel tuo spazio. Dimensioni effettive, eventuali moduli, alimentazione e installazione vengono definiti con Evolve prima della produzione." },
      { question: "Posso usarla in vetrina o all’esterno?", answer: "Raccontaci dove vuoi installarla. Per vetrine, pareti e ambienti esterni valutiamo leggibilità, fissaggio, alimentazione e protezione necessaria. L’anteprima non dichiara un grado di protezione o un impiego esterno già certificato." },
      { question: "Il prezzo viene calcolato qui?", answer: "Qui esplori il progetto e salvi la tua idea. Gli articoli acquistabili e i loro prezzi sono nello shop. Per una realizzazione personalizzata, potenza, materiali e disponibilità vengono definiti con Evolve." },
    ],
  },
} as const;

export function defaultConfiguration(product: ProductId): ProductConfiguration {
  const font = product === "e-linker" ? "rounded" : defaultKeyringLettering.font;
  return {
    primary: PRODUCTS[product].defaultPrimary, secondary: PRODUCTS[product].defaultSecondary,
    shape: "rectangle", text: product === "e-linker" ? "e-linker." : product === "e-led" ? "EVOLVE" : "CIAO.", logo: null,
    keyring: {
      hole: keyringHoleOptions("rectangle")[0].id,
      front: { ...defaultKeyringLettering, font },
      back: { ...defaultKeyringLettering, font, text: "" },
    },
  };
}

export function colorName(hex: string) {
  return [...SHOP_COLORS, ...LINKER_COLORS, ...LED_COLORS].find(color => color.hex === hex)?.name ?? hex;
}
