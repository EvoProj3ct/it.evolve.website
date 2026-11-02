export const CATALOG_KEY = "evolve-edisk-catalog-v1";
export type DiskTrack = { code: string; title: string; youtubeId: string };
export const validCode = (value: string) => /^\d{4,8}$/.test(value);

export function youtubeId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/")[1] || "";
    else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
      const bits = url.pathname.split("/").filter(Boolean);
      id = bits[0] === "watch" ? url.searchParams.get("v") || "" : ["shorts", "embed", "live", "v"].includes(bits[0]) ? bits[1] || "" : "";
    }
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function cleanCatalog(value: unknown): DiskTrack[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, DiskTrack>();
  for (const row of value.slice(0, 1000)) {
    if (!row || typeof row !== "object") continue;
    const code = String(row.code ?? "");
    if (!validCode(code) || typeof row.title !== "string" || typeof row.youtubeId !== "string" || !/^[\w-]{11}$/.test(row.youtubeId)) continue;
    unique.set(code, { code, title: row.title.trim().slice(0, 90) || "Il mio disco", youtubeId: row.youtubeId });
    if (unique.size >= 200) break;
  }
  return [...unique.values()];
}

export function generateCode(tracks: DiskTrack[]) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const code = String(100000 + bytes[0] % 900000);
    if (!tracks.some(track => track.code === code)) return code;
  }
  throw new Error("Non riesco a generare un codice libero. Inseriscilo manualmente.");
}
