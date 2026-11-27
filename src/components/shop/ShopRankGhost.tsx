import { homepageGhostBody } from "@/components/ghost-shape";

export const shopRanks = [
  {
    level: 1, name: "Esploratore",
    description: "Accende il visore verde e prova i suoi primi prompt. Ogni domanda è una pista da seguire.",
    body: "#63a779", lens: "#bdfb58", metal: "#405854",
  },
  {
    level: 2, name: "Alchimista dei prompt",
    description: "Mescola istruzioni, esempi e vincoli. Basta cambiare una parola per ottenere qualcosa di inatteso.",
    body: "#3986a6", lens: "#67e7ff", metal: "#3c6371",
  },
  {
    level: 3, name: "Tessitore di agenti",
    description: "Mette in rete modelli e strumenti. Un agente cerca, uno controlla, un altro tira le fila.",
    body: "#785abe", lens: "#eca7ff", metal: "#6f6195",
  },
  {
    level: 4, name: "Guru dell’IA",
    description: "Metà fantasmino, metà cyborg. Con l’occhio rosso scova gli errori che sono sfuggiti a tutti gli agenti.",
    body: "#526271", lens: "#ff6269", metal: "#a9b4bb",
  },
  {
    level: 5, name: "AGI",
    description: "Il grado finale immagina un’intelligenza artificiale generale, capace di applicare ciò che impara a problemi diversi.",
    body: "#253b37", lens: "#ffe7a1", metal: "#a78342",
  },
] as const;

export const previewShopRank = shopRanks[0];

export function ShopRankGhost({ rank, className }: {
  rank: (typeof shopRanks)[number];
  className?: string;
}) {
  return <svg viewBox="-14 -15 28 27" className={className} aria-hidden="true" focusable="false" shapeRendering="crispEdges">
    {rank.level === 2 && <path d="M-10-11h1v3h-1zM-11-10h3v1h-3zM-13-6h1v1h-1z" fill="#469fba" />}
    {rank.level === 3 && <g fill="none" stroke="#7e57b9" strokeWidth=".75">
      <path d="M-11-7v-4h4v-1h11v3M-11-7h3v3" />
      <path d="M-12-12h2v2h-2zM-8-13h2v2h-2zM3-13h2v2H3z" fill="#d9aff8" />
    </g>}
    {rank.level === 5 && <g stroke="#bf9851" strokeWidth=".75">
      <path d="M-12-2v-5h3v-3h5v-3h8v3h5v3h3v3M-12 2v4h2M11 4h1v2" fill="none" />
      <path d="M-13-3h2v2h-2zM-5-14h2v2h-2zM3-14h2v2H3zM8-11h2v2H8zM11-5h2v2h-2z" fill="#ffe7a1" />
    </g>}
    <path d={homepageGhostBody} fill={rank.body} stroke="#243933" strokeWidth=".75" />
    <path d="M-4-9H4V-7H-4ZM-7-6H-5V-4H-7Z" fill="#fff" opacity=".28" />
    {rank.level >= 3 && <path d="M0-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H0V4H2V0H0Z" fill={rank.metal} />}
    {rank.level >= 3 && <path d="M2-8H5V-6H2ZM6 2H9V4H6ZM3 5H5V7H3Z" fill="#fff" opacity=".34" />}
    <path d="M-7-2H-3V3H-7ZM2-2H6V3H2Z" fill="#f3fcf7" />
    <path d="M-5 0H-3V2H-5ZM4 0H6V2H4Z" fill="#20312b" />
    <path d="M1-4H7V-5H11V-3H12V1H10V3H7V2H1Z" fill="#253c37" />
    <path d="M2-3H8V1H2Z" fill={rank.lens} />
    {rank.level !== 2 && <path d="M3-3H7V-2H3Z" fill="#fff" opacity=".72" />}
    <path d="M9-4H11V1H9Z" fill={rank.metal} />
    {rank.level === 2 && <>
      <path d="M10-4V-8H9V-10H11V-8H12V-4Z" fill={rank.metal} />
      <path d="M3-2h1v1h1v1H4v1H3V0h1v-1H3zM6 0h2v1H6z" fill="#174556" />
    </>}
    {rank.level === 3 && <path d="M-7 4h5v2h4M8 3v2H5v2" fill="none" stroke="#ddb7fa" strokeWidth=".75" />}
    {rank.level === 4 && <>
      <path d="M4-2h3v2H4z" fill="#821d2a" />
      <path d="M5-2h1v1H5zM8 4h1v1H8zM7 6h1v1H7z" fill="#ffa4a4" />
      <path d="M0-8v3m2 9h2v3m2-1h3" fill="none" stroke="#697d88" strokeWidth=".75" />
    </>}
    {rank.level === 5 && <path d="M-7 4h1v1h-1zM-4 5h1v1h-1zM-1 4h1v1h-1zM2 6h1v1H2zM7 4h1v1H7z" fill="#ffe7a1" />}
  </svg>;
}
