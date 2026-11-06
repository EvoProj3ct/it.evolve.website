import { defaultConfiguration, type ProductConfiguration, type ProductId } from "./products";

// Dati isolati per le bozze di profilo e carrello. Nessuna lettura o scrittura sul backend.
export type PreviewProduct = {
  id: string;
  product: ProductId;
  name: string;
  description: string;
  finish: string;
  configuration: ProductConfiguration;
  details: { label: string; value: string }[];
  unitPriceCents: number;
};
export type PreviewCartLine = PreviewProduct & { quantity: number };
export type PreviewOrder = {
  id: string;
  date: string;
  status: "In lavorazione" | "Consegnato";
  step: number;
  items: PreviewCartLine[];
};

export const PREVIEW_PROFILE = {
  name: "Andrea Rossi",
  firstName: "Andrea",
  initials: "AR",
  email: "andrea@example.com",
  address: "Via delle Idee, 12",
  city: "00100 Roma (RM)",
  country: "Italia",
};

export const PREVIEW_PRODUCTS: Record<ProductId, PreviewProduct> = {
  "e-disk": {
    id: "preview-disk-sunset",
    product: "e-disk",
    name: "e-disk",
    description: "Il bundle · giradischi + 3 dischi",
    finish: "Rosa confetto + Arancio",
    configuration: { ...defaultConfiguration("e-disk"), primary: "#FF7638", secondary: "#F7BAD5" },
    details: [
      { label: "Abbinamento", value: "Sunset" },
      { label: "I tuoi dischi", value: "La nostra canzone, Road trip, Buongiorno" },
    ],
    unitPriceCents: 14900,
  },
  "e-linker": {
    id: "preview-linker-graphite",
    product: "e-linker",
    name: "e-linker",
    description: "Il tuo portachiavi NFC personalizzato",
    finish: "Grafite + Ghiaccio",
    configuration: { ...defaultConfiguration("e-linker"), primary: "#49504E", secondary: "#E9F0ED", text: "studio." },
    details: [
      { label: "Forma", value: "Rettangolo" },
      { label: "Scritta", value: "studio." },
      { label: "Collegamento NFC", value: "Il sito della tua attività" },
    ],
    unitPriceCents: 1800,
  },
  "e-led": {
    id: "preview-led-open",
    product: "e-led",
    name: "e-led",
    description: "La tua insegna, in una luce nuova",
    finish: "Nero notte + Verde Evolve",
    configuration: { ...defaultConfiguration("e-led"), primary: "#101614", secondary: "#72FF63", text: "OPEN" },
    details: [
      { label: "Scritta", value: "OPEN" },
      { label: "Larghezza di riferimento", value: "60 cm" },
      { label: "Effetto", value: "Color flow" },
    ],
    unitPriceCents: 18900,
  },
};

export function createPreviewCart(): PreviewCartLine[] {
  return [
    { ...PREVIEW_PRODUCTS["e-disk"], quantity: 1 },
    { ...PREVIEW_PRODUCTS["e-linker"], quantity: 2 },
    { ...PREVIEW_PRODUCTS["e-led"], quantity: 1 },
  ];
}

export const PREVIEW_SAVED: PreviewProduct[] = [
  {
    ...PREVIEW_PRODUCTS["e-disk"],
    id: "preview-saved-disk",
    description: "Il tuo prossimo rituale",
    finish: "Menta + Foresta",
    configuration: { ...defaultConfiguration("e-disk"), primary: "#A9E8C5", secondary: "#114928" },
  },
  {
    ...PREVIEW_PRODUCTS["e-linker"],
    id: "preview-saved-linker",
    description: "Una firma da portare con te",
    finish: "Ghiaccio + Ardesia",
    configuration: { ...defaultConfiguration("e-linker"), primary: "#E9F0ED", secondary: "#263C42", text: "e-linker." },
  },
  {
    ...PREVIEW_PRODUCTS["e-led"],
    id: "preview-saved-led",
    description: "Luce alla tua prossima idea",
    finish: "Nero notte + Ultravioletto",
    configuration: { ...defaultConfiguration("e-led"), primary: "#101614", secondary: "#AE6BFF", text: "hello" },
  },
];

export const PREVIEW_ORDERS: PreviewOrder[] = [
  { id: "EV-26041", date: "2 novembre 2026", status: "In lavorazione", step: 1, items: createPreviewCart().slice(0, 2) },
  { id: "EV-26018", date: "15 ottobre 2026", status: "Consegnato", step: 3, items: [{ ...PREVIEW_PRODUCTS["e-led"], quantity: 1 }] },
];

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const previewPrice = (cents: number) => euro.format(cents / 100);
export const previewTotal = (items: PreviewCartLine[]) => items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
