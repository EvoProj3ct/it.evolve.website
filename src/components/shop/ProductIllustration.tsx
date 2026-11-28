import { useId } from "react";
import type { KeyringFace } from "@evolve/ecommerce-server/keyring-design";
import type { ProductConfiguration, ProductId } from "./products";
import { keyringHoleRadius, keyringHoles, keyringLetterSpacing, keyringLetteringLayout, keyringLogoLayout, keyringOutline, keyringTypeface } from "./keyringGeometry";
import { keyringSymbolArtwork, layoutKeyringSymbols, symbolCoversPoint, symbolView } from "./keyringSymbols";
import styles from "./Shop.module.css";

export function ProductIllustration({ product, configuration, showChain = true, face = "front", highlightHole = false }: {
  product: Exclude<ProductId, "e-led">; configuration: ProductConfiguration; showChain?: boolean;
  face?: KeyringFace; highlightHole?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const back = face === "back";
  const factor = 74;
  const outline = keyringOutline(configuration.shape)
    .map(({ x, y }, index) => `${index ? "L" : "M"}${(230 + x * factor).toFixed(2)} ${(242 - y * factor).toFixed(2)}`).join("") + "Z";
  const holes = keyringHoles(configuration.shape);
  const hole = holes.find(point => point.id === configuration.keyring.hole) ?? holes[0];
  const holeX = 230 + hole.x * factor * (back ? -1 : 1), holeY = 242 - hole.y * factor;
  const chainAngle = Math.atan2(hole.dx * (back ? -1 : 1), hole.dy) * 180 / Math.PI;
  const reach = hole.reach * factor;
  const logo = back ? null : configuration.logo;
  const inscription = (back ? configuration.keyring.back.text : configuration.text).trim();
  const style = configuration.keyring[face];
  const layout = keyringLetteringLayout(configuration.shape, style, inscription, !!logo);
  const logoLayout = keyringLogoLayout(configuration.shape, !!inscription);
  const letters = [...inscription];
  const stackStep = 1.06;
  const fontSize = Math.min(layout.width * factor / (style.orientation === "vertical" ? 1 : Math.max(1, letters.length * .64)),
    layout.height * factor / (style.orientation === "vertical" ? Math.max(1, letters.length * stackStep) : .84));
  const textX = 230 + layout.x * factor, textY = 242 - layout.y * factor;
  const symbols = product === "e-linker" ? layoutKeyringSymbols(configuration).filter(symbol => symbol !== null) : [];
  const showDot = !back && configuration.shape === "rectangle" &&
    !symbols.some(symbol => (symbol.mode === "cut" || symbol.face === "front") && symbolCoversPoint(symbol, 1.45, -.95));
  return (
    <svg className={styles.productIllustration} viewBox="0 0 640 460" fill="none" aria-hidden="true">
      {product === "e-linker" && <defs>
        <linearGradient id={`${id}-surface`} x1="50%" y1="0" x2="50%" y2="100%"><stop stopColor="#ffffff" stopOpacity=".32" /><stop offset=".5" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor="#101914" stopOpacity=".06" /></linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7b8583" /><stop offset=".35" stopColor="#f2f5f3" /><stop offset=".7" stopColor="#a1aba6" /><stop offset="1" stopColor="#687571" /></linearGradient>
        <filter id={`${id}-shadow`} x="-40%" y="-30%" width="180%" height="190%"><feDropShadow dx="0" dy="24" stdDeviation="18" floodColor="#30432a" floodOpacity=".12" /></filter>
        <mask id={`${id}-hole`} maskUnits="userSpaceOnUse" x="0" y="0" width="500" height="460">
          <rect width="500" height="460" fill="white" />
          <circle cx={holeX} cy={holeY} r={keyringHoleRadius * factor} fill="black" />
          {symbols.map((symbol, index) => symbol.mode === "cut" && <path key={index}
            d={keyringSymbolArtwork[symbol.kind].outline} fill="black" transform={symbolView(symbol, face, 230, 242, factor).transform} />)}
        </mask>
      </defs>}
      {product === "e-disk" ? <g transform="translate(50 65) rotate(-9 270 170)">
        <rect x="20" y="48" width="500" height="300" rx="24" fill={configuration.primary} stroke="#101914" strokeWidth="5" />
        <rect x="20" y="32" width="500" height="290" rx="24" fill={configuration.secondary} stroke="#101914" strokeWidth="5" />
        <circle cx="226" cy="174" r="122" fill="#18251B" stroke="#6B7E69" strokeWidth="3" />
        {[80, 94, 108].map(r => <circle key={r} cx="226" cy="174" r={r} stroke="#4D604E" strokeWidth="2" />)}
        <circle cx="226" cy="174" r="37" fill="#C1FF00" /><text x="226" y="180" textAnchor="middle" fill="#101914" fontSize="17" fontWeight="700">e-disk</text>
        <path d="M444 83v93l-65 69" stroke="#DDE9DD" strokeWidth="14" strokeLinecap="round" /><rect x="365" y="231" width="32" height="40" rx="4" fill={configuration.primary} transform="rotate(40 381 251)" />
        <circle cx="458" cy="284" r="15" fill={configuration.primary} stroke="#101914" strokeWidth="3" />
      </g> : <g transform={`translate(104 22) scale(.94) rotate(-12 230 242)`} filter={`url(#${id}-shadow)`}>
        {showChain && <g transform={`translate(${holeX} ${holeY}) rotate(${chainAngle})`} stroke={`url(#${id}-metal)`}>
          <circle cy={-reach - 92} r="22" strokeWidth="3" /><circle cy={-reach - 92} r="19" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map(index => <ellipse key={index} cy={-reach - 8 - index * 14} rx={index % 2 ? 4 : 7} ry="9" strokeWidth="2.5" />)}
        </g>}
        <g mask={`url(#${id}-hole)`}>
          <g transform={back ? "translate(460 0) scale(-1 1)" : undefined}>
            <g transform={configuration.shape === "cube" ? "translate(16 22)" : "translate(0 5)"}>
              <path d={outline} fill={configuration.primary} />
              <path d={outline} fill="#101914" opacity=".12" />
            </g>
            <path d={outline} fill={configuration.primary} />
            <path d={outline} fill={`url(#${id}-surface)`} stroke="#ffffff50" strokeWidth="1.2" />
          </g>
        </g>
        {showChain && <ellipse cx="0" cy={-reach / 2} rx="5" ry={reach / 2 + 7} transform={`translate(${holeX} ${holeY}) rotate(${chainAngle})`} stroke={`url(#${id}-metal)`} strokeWidth="3" />}
        {highlightHole && <circle cx={holeX} cy={holeY} r={keyringHoleRadius * factor + 3} stroke="#63d642" strokeWidth="4" />}
        {logo && <image href={logo.kind === "svg" ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logo.data)}` : logo.data}
          x={230 - logoLayout.width * factor / 2} y={242 - (logoLayout.y + logoLayout.height / 2) * factor}
          width={logoLayout.width * factor} height={logoLayout.height * factor} preserveAspectRatio="xMidYMid meet" />}
        <text x={textX} y={textY} fill={configuration.secondary} textAnchor="middle" dominantBaseline="central"
          transform={layout.rotation ? `rotate(${-layout.rotation * 180 / Math.PI} ${textX} ${textY})` : undefined}
          className={styles.keyringIllustrationText} data-typeface={keyringTypeface(style)} data-relief={style.relief}
          fontSize={fontSize} letterSpacing={style.orientation === "horizontal" ? keyringLetterSpacing * fontSize : undefined}>
          {style.orientation === "vertical" ? letters.map((letter, index) =>
            <tspan key={index} x={textX} y={textY + (index - (letters.length - 1) / 2) * fontSize * stackStep}>{letter}</tspan>) : inscription}
        </text>
        {symbols.map((symbol, index) => {
          if (symbol.mode === "cut" || symbol.face !== face) return null;
          const { outline, details } = keyringSymbolArtwork[symbol.kind];
          const { transform, strokeWidth } = symbolView(symbol, face, 230, 242, factor);
          return <g key={index} transform={transform} className={styles.keyringIllustrationText} data-relief={symbol.relief}>
            {symbol.mode === "outline" ? <>
              <path d={outline} stroke={configuration.secondary} strokeWidth={strokeWidth} strokeLinejoin="round" />
              {details && <path d={details} fill={configuration.secondary} fillRule="evenodd" />}
            </> : <path d={`${outline} ${details ?? ""}`} fill={configuration.secondary} fillRule="evenodd" />}
          </g>;
        })}
        {showDot && <circle cx="337" cy="312" r="3" fill="#829BA3" />}
      </g>}
    </svg>
  );
}
