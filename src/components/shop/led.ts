import { defaultConfiguration, type ProductConfiguration, type LogoAsset } from "./products";

export type LedEffect = "flow" | "steady" | "breathe" | "pulse";
export type LedConfiguration = ProductConfiguration & {
  effect: LedEffect;
  brightness: number;
  speed: number;
  width: number;
  mode: "text" | "logo" | "both";
};

export const LED_EFFECTS: { id: LedEffect; name: string; description: string }[] = [
  { id: "flow", name: "Color flow", description: "Un flusso continuo di colori" },
  { id: "steady", name: "Fissa", description: "Il tuo colore, sempre acceso" },
  { id: "breathe", name: "Respiro", description: "Una luce che sale e si distende" },
  { id: "pulse", name: "Pulse", description: "Un battito luminoso, morbido" },
];

export const LED_MOODS = [
  { name: "Evolve glow", color: "#72FF63", effect: "flow" as LedEffect, word: "EVOLVE", note: "Verde, con il futuro dentro." },
  { name: "Blue hour", color: "#45EAFF", effect: "breathe" as LedEffect, word: "STUDIO", note: "Fredda. Precisa. Magnetica." },
  { name: "After dark", color: "#FF52C6", effect: "pulse" as LedEffect, word: "OPEN", note: "Un’insegna che si fa notare." },
];

export function defaultLedConfiguration(): LedConfiguration {
  return { ...defaultConfiguration("e-led"), effect: "flow", brightness: 75, speed: 1, width: 100, mode: "text" };
}

export async function readLedLogo(file: File): Promise<LogoAsset> {
  if (!file.name.toLowerCase().endsWith(".svg")) throw new Error("Per la traccia luminosa usa un logo SVG con il testo convertito in tracciati.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Scegli un SVG di massimo 2 MB.");
  const data = await file.text();
  const document = new DOMParser().parseFromString(data, "image/svg+xml");
  if (document.querySelector("parsererror") || document.documentElement.localName !== "svg" || !document.querySelector("path,rect,circle,ellipse,polygon,polyline")) throw new Error("Il logo deve contenere forme vettoriali. Converti le scritte in tracciati prima di esportarlo.");
  if (document.querySelector("text")) throw new Error("Nel logo ci sono ancora scritte modificabili. Convertile in tracciati prima di esportare l’SVG.");
  if (data.length > 160000 || document.querySelectorAll("*").length > 250) throw new Error("Il logo è molto dettagliato. Esporta una versione SVG semplificata.");
  const commands = [...document.querySelectorAll("path")].reduce((sum, path) => sum + (path.getAttribute("d")?.match(/[MmLlHhVvCcSsQqTtAaZz]/g)?.length ?? 0), 0);
  if (commands > 1500) throw new Error("Ci sono troppi tracciati per l’anteprima. Usa una versione semplificata del logo.");
  if (document.querySelector("script,foreignObject,image,iframe") || /(?:on\w+\s*=|@import|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:)|url\s*\(\s*["']?\s*(?:https?:|\/\/|data:))/i.test(data)) throw new Error("Usa un SVG autonomo, senza script, immagini o risorse esterne.");
  return { name: file.name, kind: "svg", data };
}
