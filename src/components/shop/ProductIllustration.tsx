import { useId } from "react";
import type { KeyringShape, ProductConfiguration, ProductId } from "./products";
import styles from "./Shop.module.css";

function KeyringOutline({ shape, fill, opacity = 1, stroke = "none" }: { shape: KeyringShape; fill: string; opacity?: number; stroke?: string }) {
  if (shape === "circle") return <circle cx="230" cy="226" r="155" fill={fill} opacity={opacity} stroke={stroke} strokeWidth="1.2" />;
  if (shape === "triangle") return <path d="m230 70 190 300H40Z" fill={fill} opacity={opacity} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />;
  return <rect x={shape === "square" ? 80 : 35} y="88" width={shape === "square" ? 300 : 390} height="280" rx="24" fill={fill} opacity={opacity} stroke={stroke} strokeWidth="1.2" />;
}

export function ProductIllustration({ product, configuration }: { product: ProductId; configuration: ProductConfiguration }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg className={styles.productIllustration} viewBox="0 0 640 460" fill="none" aria-hidden="true">
      {product === "e-linker" && <defs>
        <linearGradient id={`${id}-surface`} x1="50%" y1="0" x2="50%" y2="100%"><stop stopColor="#ffffff" stopOpacity=".32" /><stop offset=".5" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor="#101914" stopOpacity=".06" /></linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7b8583" /><stop offset=".35" stopColor="#f2f5f3" /><stop offset=".7" stopColor="#a1aba6" /><stop offset="1" stopColor="#687571" /></linearGradient>
        <filter id={`${id}-shadow`} x="-40%" y="-30%" width="180%" height="190%"><feDropShadow dx="0" dy="24" stdDeviation="18" floodColor="#30432a" floodOpacity=".12" /></filter>
        <mask id={`${id}-hole`} maskUnits="userSpaceOnUse" x="0" y="0" width="500" height="430"><rect width="500" height="430" fill="white" /><circle cx="230" cy="111" r="10" fill="black" /></mask>
      </defs>}
      {product === "e-disk" ? <g transform="translate(50 65) rotate(-9 270 170)">
        <rect x="20" y="48" width="500" height="300" rx="24" fill={configuration.primary} stroke="#101914" strokeWidth="5" />
        <rect x="20" y="32" width="500" height="290" rx="24" fill={configuration.secondary} stroke="#101914" strokeWidth="5" />
        <circle cx="226" cy="174" r="122" fill="#18251B" stroke="#6B7E69" strokeWidth="3" />
        {[80, 94, 108].map(r => <circle key={r} cx="226" cy="174" r={r} stroke="#4D604E" strokeWidth="2" />)}
        <circle cx="226" cy="174" r="37" fill="#C1FF00" /><text x="226" y="180" textAnchor="middle" fill="#101914" fontSize="17" fontWeight="700">e-disk</text>
        <path d="M444 83v93l-65 69" stroke="#DDE9DD" strokeWidth="14" strokeLinecap="round" /><rect x="365" y="231" width="32" height="40" rx="4" fill={configuration.primary} transform="rotate(40 381 251)" />
        <circle cx="458" cy="284" r="15" fill={configuration.primary} stroke="#101914" strokeWidth="3" />
      </g> : <g transform="translate(90 40) rotate(-14 230 220) skewY(-4)" filter={`url(#${id}-shadow)`}>
        <circle cx="230" cy="40" r="28" stroke={`url(#${id}-metal)`} strokeWidth="5" />
        <circle cx="230" cy="40" r="25" stroke={`url(#${id}-metal)`} strokeWidth="2" />
        <ellipse cx="230" cy="75" rx="4" ry="10" stroke={`url(#${id}-metal)`} strokeWidth="3" />
        <ellipse cx="230" cy="92" rx="7" ry="10" stroke={`url(#${id}-metal)`} strokeWidth="3" />
        <ellipse cx="230" cy="109" rx="3.5" ry="10" stroke={`url(#${id}-metal)`} strokeWidth="3" />
        <g mask={`url(#${id}-hole)`}>
          <g transform="translate(0 7)"><KeyringOutline shape={configuration.shape} fill={configuration.primary} /><KeyringOutline shape={configuration.shape} fill="#101914" opacity={.15} /></g>
          <KeyringOutline shape={configuration.shape} fill={configuration.primary} />
          <KeyringOutline shape={configuration.shape} fill={`url(#${id}-surface)`} stroke="#ffffff50" />
        </g>
        {configuration.logo && <image href={configuration.logo.kind === "svg" ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(configuration.logo.data)}` : configuration.logo.data} x="160" y="180" width="140" height="80" preserveAspectRatio="xMidYMid meet" />}
        <text x="230" y={configuration.logo ? "310" : "255"} fill={configuration.secondary} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={configuration.text.length > 9 ? 26 : configuration.logo ? 34 : 48} fontWeight="700" letterSpacing="-1">{configuration.text.slice(0, 20)}</text>
      </g>}
    </svg>
  );
}
