import type { ProductConfiguration, ProductId } from "./products";
import styles from "./Shop.module.css";

export function ProductIllustration({ product, configuration }: { product: ProductId; configuration: ProductConfiguration }) {
  return (
    <svg className={styles.productIllustration} viewBox="0 0 640 460" fill="none" aria-hidden="true">
      {product === "e-disk" ? <g transform="translate(50 65) rotate(-9 270 170)">
        <rect x="20" y="48" width="500" height="300" rx="24" fill={configuration.primary} stroke="#101914" strokeWidth="5" />
        <rect x="20" y="32" width="500" height="290" rx="24" fill={configuration.secondary} stroke="#101914" strokeWidth="5" />
        <circle cx="226" cy="174" r="122" fill="#18251B" stroke="#6B7E69" strokeWidth="3" />
        {[80, 94, 108].map(r => <circle key={r} cx="226" cy="174" r={r} stroke="#4D604E" strokeWidth="2" />)}
        <circle cx="226" cy="174" r="37" fill="#C1FF00" /><text x="226" y="180" textAnchor="middle" fill="#101914" fontSize="17" fontWeight="700">e-disk</text>
        <path d="M444 83v93l-65 69" stroke="#DDE9DD" strokeWidth="14" strokeLinecap="round" /><rect x="365" y="231" width="32" height="40" rx="4" fill={configuration.primary} transform="rotate(40 381 251)" />
        <circle cx="458" cy="284" r="15" fill={configuration.primary} stroke="#101914" strokeWidth="3" />
      </g> : <g transform="translate(90 65) rotate(-12 230 170)">
        <circle cx="230" cy="44" r="43" stroke="#B6C3BD" strokeWidth="10" />
        {configuration.shape === "circle" ? <circle cx="230" cy="226" r="155" fill={configuration.primary} stroke="#101914" strokeWidth="4" /> : configuration.shape === "triangle" ? <path d="m230 70 190 300H40Z" fill={configuration.primary} stroke="#101914" strokeWidth="4" strokeLinejoin="round" /> : <rect x={configuration.shape === "square" ? 80 : 35} y="88" width={configuration.shape === "square" ? 300 : 390} height="280" rx="24" fill={configuration.primary} stroke="#101914" strokeWidth="4" />}
        <circle cx="230" cy="111" r="10" fill="#101914" />
        {configuration.logo && <image href={configuration.logo.kind === "svg" ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(configuration.logo.data)}` : configuration.logo.data} x="160" y="180" width="140" height="80" preserveAspectRatio="xMidYMid meet" />}
        <text x="230" y={configuration.logo ? "310" : "255"} fill={configuration.secondary} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={configuration.text.length > 9 ? 26 : configuration.logo ? 34 : 48} fontWeight="900">{configuration.text.slice(0, 20)}</text>
      </g>}
    </svg>
  );
}
