import { homepageGhostBody } from "@/components/ghost-shape";

export const shopRanks = [
  { level: 1, name: "Esploratore", description: "Il primo grado. Il fantasmino indossa il suo primo visore.", body: "#63a779", lens: "#bdfb58", metal: "#405854" },
  { level: 2, name: "Operatore", description: "Il visore si accende di azzurro e si aggancia a un auricolare.", body: "#3986a6", lens: "#67e7ff", metal: "#3c6371" },
  { level: 3, name: "Specialista", description: "Visore viola e corazza laterale. Il primo potenziamento del fantasmino.", body: "#785abe", lens: "#eca7ff", metal: "#6f6195" },
  { level: 4, name: "Cyborg", description: "Metà fantasmino, metà cyborg. L’occhio rosso è integrato nella corazza grigia.", body: "#526271", lens: "#ff6269", metal: "#a9b4bb" },
  { level: 5, name: "Élite", description: "L’ultimo grado. Corazza scura, visore ambra e finiture dorate.", body: "#36434d", lens: "#ffd47d", metal: "#c2a365" },
] as const;

export const previewShopRank = shopRanks[0];

export function ShopRankGhost({ rank, className }: {
  rank: (typeof shopRanks)[number];
  className?: string;
}) {
  return <svg viewBox="-14 -14 28 26" className={className} aria-hidden="true" focusable="false" shapeRendering="crispEdges">
    <path d={homepageGhostBody} fill={rank.body} stroke="#243933" strokeWidth=".75" />
    <path d="M-4-9H4V-7H-4ZM-7-6H-5V-4H-7Z" fill="#fff" opacity=".28" />
    {rank.level >= 3 && <path d="M0-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H0V4H2V0H0Z" fill={rank.metal} />}
    {rank.level >= 3 && <path d="M2-8H5V-6H2ZM6 2H9V4H6ZM3 5H5V7H3Z" fill="#fff" opacity=".34" />}
    <path d="M-7-2H-3V3H-7ZM2-2H6V3H2Z" fill="#f3fcf7" />
    <path d="M-5 0H-3V2H-5ZM4 0H6V2H4Z" fill="#20312b" />
    <path d="M1-4H7V-5H11V-3H12V1H10V3H7V2H1Z" fill="#253c37" />
    <path d="M2-3H8V1H2Z" fill={rank.lens} />
    <path d="M3-3H7V-2H3Z" fill="#fff" opacity=".72" />
    <path d="M9-4H11V1H9Z" fill={rank.metal} />
    {rank.level >= 2 && <path d="M10-4V-8H9V-10H11V-8H12V-4Z" fill={rank.metal} />}
    {rank.level === 4 && <path d="M4-2H6V0H4Z" fill="#750f1a" />}
    {rank.level === 5 && <path d="M-3-12H3V-10H-3ZM-6-10H-3V-9H-6ZM3-10H6V-9H3Z" fill={rank.metal} />}
  </svg>;
}
