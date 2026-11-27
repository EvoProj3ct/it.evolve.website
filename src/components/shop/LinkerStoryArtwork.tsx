import { ProductMark } from "./ProductMark";
import styles from "./Shop.module.css";

const scenes = {
  profile: { background: "#E7F2DE", screen: "#F5F9F1", accent: "#5A9E43", primary: "#D5EBC7", secondary: "#264534" },
  product: { background: "#E2EEF0", screen: "#F3F8F9", accent: "#4A808D", primary: "#B7D6DD", secondary: "#263C42" },
  memory: { background: "#F4EBE3", screen: "#FBF7F3", accent: "#AA6958", primary: "#F0CEB8", secondary: "#633E34" },
} as const;

export function LinkerStoryArtwork({ scene }: { scene: keyof typeof scenes }) {
  const { background, screen, accent, primary, secondary } = scenes[scene];
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
      </g>
    </svg>
    <ProductMark product="e-linker" primary={primary} secondary={secondary} className={styles.linkerStoryMark} />
  </div>;
}
