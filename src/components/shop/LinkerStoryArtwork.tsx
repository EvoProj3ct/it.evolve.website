import { ProductMark } from "./ProductMark";
import styles from "./Shop.module.css";

const scenes = {
  profile: { background: "#E7F2DE", screen: "#F5F9F1", accent: "#5A9E43", primary: "#D5EBC7", secondary: "#264534" },
  product: { background: "#E2EEF0", screen: "#F3F8F9", accent: "#4A808D", primary: "#B7D6DD", secondary: "#263C42" },
  memory: { background: "#F4EBE3", screen: "#FBF7F3", accent: "#AA6958", primary: "#F0CEB8", secondary: "#633E34" },
  app: {
    background: "#EAE4F5", screen: "#F7F4FB", accent: "#7954A5", primary: "#DCCCF3", secondary: "#443167",
    glyph: "M116 37h8v8h-8zM129 37h8v8h-8zM116 50h8v8h-8zM129 54h8m-4-4v8",
  },
  lights: {
    background: "#F7EDD2", screen: "#FFF9ED", accent: "#98680D", primary: "#F6D987", secondary: "#60451B",
    glyph: "M123 56v-4c-2.6-1.4-4-3.5-4-6a7.5 7.5 0 1 1 15 0c0 2.5-1.4 4.6-4 6v4zm1 3h5M126.5 38v-3m-10 6-2-2m22 2 2-2",
  },
  wifi: {
    background: "#E0F0EB", screen: "#F2FAF7", accent: "#2F7D6B", primary: "#ABE2D1", secondary: "#1F554B",
    glyph: "M114 44a19 19 0 0 1 25 0m-21 5a13 13 0 0 1 17 0m-13 5a7 7 0 0 1 9 0m-4 5h.1",
  },
  map: {
    background: "#ECECD9", screen: "#F8F8EF", accent: "#6F7934", primary: "#DCE3A8", secondary: "#414923",
    glyph: "M135 44c0 5-8.5 13-8.5 13S118 49 118 44a8.5 8.5 0 1 1 17 0zM129.5 44a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  },
  review: {
    background: "#F5E4EC", screen: "#FAF4F7", accent: "#A64D79", primary: "#F1BDD7", secondary: "#662A4A",
    glyph: "m126.5 36 3.3 6.8 7.5 1.1-5.4 5.3 1.3 7.5-6.7-3.5-6.7 3.5 1.3-7.5-5.4-5.3 7.5-1.1z",
  },
  booking: {
    background: "#E0EAF7", screen: "#F2F7FD", accent: "#4268A1", primary: "#BBD3F2", secondary: "#2D446D",
    glyph: "M116 39h21v19h-21zm0 6h21m-16-9v5m11-5v5m-10 10 3 3 6-6",
  },
  guide: {
    background: "#E9ECE1", screen: "#F8F9F3", accent: "#597054", primary: "#CAD8BB", secondary: "#354832",
    glyph: "M126.5 40c-3-2.5-6.5-3.5-11-2v17c4.5-1.5 8-.5 11 2 3-2.5 6.5-3.5 11-2V38c-4.5-1.5-8-.5-11 2zm0 0v17",
  },
} as const;

export function LinkerStoryArtwork({ scene }: { scene: keyof typeof scenes }) {
  const artwork = scenes[scene];
  const { background, screen, accent, primary, secondary } = artwork;
  return <div className={styles.linkerStoryArtwork} aria-hidden="true">
    <svg viewBox="0 0 180 122" fill="none">
      <circle cx="111" cy="60" r="51" fill={background} />
      <path d="M38 52h12m-6-6v12m122 26h10m-5-5v10" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="68" cy="27" r="2" fill={accent} />
      <g stroke={accent} strokeWidth="1.8" strokeLinecap="round">
        <path d="M77 56a10 10 0 0 1 10 8m-10-14a16 16 0 0 1 16 12m-16-18a22 22 0 0 1 22 16" />
      </g>
      <g transform="rotate(10 130 58)">
        <rect x="104" y="14" width="53" height="93" rx="9" fill={secondary} />
        <rect x="100" y="11" width="53" height="93" rx="9" fill={primary} stroke={secondary} strokeWidth="2" />
        <rect x="105" y="16" width="43" height="83" rx="6" fill={screen} />
        <path d="M121 21h11m-13 72h15" stroke={secondary} strokeWidth="1.5" strokeLinecap="round" />
        {scene === "profile" && <>
          <circle cx="126.5" cy="46" r="12" fill={background} stroke={accent} strokeWidth="1.5" />
          <circle cx="126.5" cy="43" r="3.5" fill={secondary} />
          <path d="M120 51a7 7 0 0 1 13 0" stroke={secondary} strokeWidth="1.7" strokeLinecap="round" />
          <path d="M114 66h25m-20 6h15" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          <rect x="117" y="79" width="19" height="6" rx="3" fill={primary} />
        </>}
        {scene === "product" && <>
          <rect x="111" y="31" width="31" height="32" rx="4" fill={background} />
          <path d="m117 53 12-15 7 9-12 12z" fill={primary} stroke={secondary} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m120 52 5 3 9-10m-2-9h5m-2.5-2.5v5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M112 71h23m-23 6h13" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        </>}
        {scene === "memory" && <>
          <rect x="111" y="33" width="31" height="28" rx="4" fill={background} stroke={accent} strokeWidth="1.5" />
          <circle cx="134" cy="40" r="2.5" fill={accent} />
          <path d="m112 55 9-9 7 6 5-4 8 7v5h-29z" fill={primary} stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M126.5 79c-2-1.6-6-4.6-6-7.2a3.3 3.3 0 0 1 6-1.8 3.3 3.3 0 0 1 6 1.8c0 2.6-4 5.6-6 7.2z" fill={accent} />
        </>}
        {"glyph" in artwork && <>
          <rect x="111" y="31" width="31" height="33" rx="5" fill={background} />
          <path d={artwork.glyph} stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M114 72h25m-22 6h14" stroke={secondary} strokeWidth="1.5" strokeLinecap="round" />
        </>}
      </g>
    </svg>
    <ProductMark product="e-linker" primary={primary} secondary={secondary} className={styles.linkerStoryMark} />
  </div>;
}
