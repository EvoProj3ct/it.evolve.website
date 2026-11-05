export type ProductId = "e-disk" | "e-linker";
export type KeyringShape = "rectangle" | "square" | "circle" | "triangle";
export type LogoAsset = { name: string; kind: "svg" | "image"; data: string };
export type ProductConfiguration = {
  primary: string;
  secondary: string;
  shape: KeyringShape;
  text: string;
  logo: LogoAsset | null;
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

export const KEYRING_SHAPES: { id: KeyringShape; name: string; symbol: string }[] = [
  { id: "rectangle", name: "Rettangolo", symbol: "▭" },
  { id: "square", name: "Quadrato", symbol: "□" },
  { id: "circle", name: "Cerchio", symbol: "○" },
  { id: "triangle", name: "Triangolo", symbol: "△" },
];

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
    category: "Il tuo portachiavi in PLA",
    tagline: "Piccolo oggetto.\nGrande carattere.",
    description: "Il tuo nome, il tuo logo, i tuoi colori. Un portachiavi stampato in 3D che parla di te, prima ancora delle chiavi.",
    punchline: "Lascia il segno.\nPortalo ovunque.",
    defaultPrimary: "#F5F1E8",
    defaultSecondary: "#114928",
    video: null as string | null,
    steps: [
      { title: "Parti dalla forma.", description: "Rettangolo, quadrato, cerchio o triangolo. Scegli la base che ti somiglia." },
      { title: "Lascia il tuo segno.", description: "Scrivi un nome o carica un logo. Guarda la scritta prendere forma in rilievo nell’anteprima 3D." },
      { title: "Trova il tuo mix.", description: "Combina il colore della base con quello della scritta. Poi condividi con noi la tua idea." },
    ],
    faq: [
      { question: "Che cosa posso personalizzare?", answer: "La forma della base, il colore del portachiavi, il colore della scritta, un testo e un logo. Il configuratore mostra una prima interpretazione della tua idea." },
      { question: "Quale formato uso per il logo?", answer: "Un SVG con tracciati pieni permette di visualizzare il logo in rilievo. PNG e JPG vengono mostrati come immagine sulla superficie: non vengono trasformati automaticamente in un modello stampabile. Per un SVG, converti prima eventuali testi in tracciati." },
      { question: "Il modello è pronto per la stampa?", answer: "L’anteprima serve a scegliere l’aspetto del portachiavi. Spessori, dimensioni, leggibilità del testo e lavorabilità del logo vengono verificati insieme prima della produzione." },
      { question: "Come richiedo il mio e-linker?", answer: "Configuralo e usa “Parliamone”: si aprirà una mail con il riepilogo delle tue scelte. Se hai caricato un logo, allegalo alla mail. Prezzo e disponibilità vengono concordati con Evolve." },
    ],
  },
} as const;

export function defaultConfiguration(product: ProductId): ProductConfiguration {
  return { primary: PRODUCTS[product].defaultPrimary, secondary: PRODUCTS[product].defaultSecondary, shape: "rectangle", text: "CIAO.", logo: null };
}

export function colorName(hex: string) {
  return SHOP_COLORS.find(color => color.hex === hex)?.name ?? hex;
}
