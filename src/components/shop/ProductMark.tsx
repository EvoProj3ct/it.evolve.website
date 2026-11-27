import { useId } from "react";
import type { ConfiguratorKind } from "@evolve/ecommerce-server/catalog";
import { PRODUCTS } from "./products";

export function ProductMark({ product, primary, secondary, className }: {
  product: ConfiguratorKind;
  primary?: string;
  secondary?: string;
  className?: string;
}) {
  const id = `product-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (product === "e-linker") {
    const body = primary ?? PRODUCTS[product].defaultPrimary;
    const ink = secondary ?? PRODUCTS[product].defaultSecondary;
    const recolored = primary !== undefined || secondary !== undefined;
    const edge = recolored ? body : "#829BA3";
    const outline = recolored ? ink : "#101914";
    const accent = recolored ? ink : "#72C94F";
    const metal = recolored ? "#58645F" : "#263C42";
    return <svg className={className} viewBox="12 30 474 352" fill="none" aria-hidden="true">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="25" y="100" width="325" height="250">
          <path fill="white" d="M25 100h325v250H25z" />
          <circle cx="300" cy="145" r="14" fill="black" />
        </mask>
      </defs>
      <g transform="rotate(-9 260 210)">
        <circle cx="447" cy="109" r="36.5" stroke="#D4DEDF" strokeWidth="7" />
        <g stroke={metal} strokeWidth="5">
          <circle cx="447" cy="109" r="40" />
          <circle cx="447" cy="109" r="33" />
        </g>
        <g stroke={metal} strokeWidth="4">
          <ellipse cx="405" cy="120" rx="12" ry="6" transform="rotate(-18 405 120)" />
          <ellipse cx="386" cy="126" rx="12" ry="9" transform="rotate(-18 386 126)" />
          <ellipse cx="367" cy="132" rx="12" ry="6" transform="rotate(-18 367 132)" />
          <ellipse cx="348" cy="138" rx="12" ry="9" transform="rotate(-18 348 138)" />
          <ellipse cx="329" cy="144" rx="12" ry="6" transform="rotate(-18 329 144)" />
          <ellipse cx="310" cy="150" rx="15" ry="9" transform="rotate(-18 310 150)" />
        </g>
        <g mask={`url(#${id})`} stroke={outline} strokeWidth="5">
          <rect x="36" y="126" width="300" height="210" rx="32" fill={edge} />
          <rect x="36" y="110" width="300" height="210" rx="32" fill={body} />
        </g>
        <path d="M300 145c-4 2-6 6-3 10 4 6 15 5 24-1" stroke={metal} strokeWidth="4" strokeLinecap="round" />
        <path d="M70 152v-7a7 7 0 0 1 7-7h20" stroke={recolored ? ink : "#A5BAB3"} strokeWidth="4" strokeLinecap="round" />
        <text x="185" y="235" textAnchor="middle" fill={ink} fontFamily="Arial, sans-serif" fontSize="46" fontWeight="700" letterSpacing="-2">e-linker<tspan fill={accent}>.</tspan></text>
        <path d="M76 279h26m8 0h12" stroke={accent} strokeWidth="6" strokeLinecap="round" />
        <circle cx="297" cy="281" r="5" fill={recolored ? ink : "#829BA3"} />
      </g>
    </svg>;
  }

  if (product === "e-led") {
    const light = secondary ?? PRODUCTS[product].defaultSecondary;
    return <svg className={className} viewBox="0 0 556 404" fill="none" aria-hidden="true">
      <defs>
        <filter id={id} x="-35%" y="-45%" width="170%" height="190%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <g transform="rotate(-8 278 202)">
        <rect x="24" y="95" width="508" height="230" rx="30" fill="#16221C" stroke="#101914" strokeWidth="5" />
        <rect x="24" y="80" width="508" height="230" rx="30" fill={primary ?? "#0A1210"} stroke="#344A3B" strokeWidth="5" />
        <g textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="155" letterSpacing="-8">
          <text x="278" y="240" fill={light} filter={`url(#${id})`}>e-led</text>
          <text x="278" y="240" fill={secondary ?? "#B8FFAD"} stroke={light} strokeWidth="2">e-led</text>
        </g>
        <path d="M60 278h28m9 0h9" stroke={secondary ?? "#45EAFF"} strokeWidth="5" strokeLinecap="round" />
        <circle cx="493" cy="277" r="5" fill={light} />
      </g>
    </svg>;
  }

  const body = primary ?? PRODUCTS["e-disk"].defaultPrimary;
  const top = secondary ?? PRODUCTS["e-disk"].defaultSecondary;
  if (product === "e-disk-disc") {
    return <svg className={className} viewBox="0 0 280 280" fill="none" aria-hidden="true">
      <g transform="translate(-86 -34)">
        <RecordMark surface={primary} label="#F8F2DA" ink={primary ?? "#101914"} />
      </g>
    </svg>;
  }

  return <svg className={className} viewBox="-8 -12 556 404" fill="none" aria-hidden="true">
    <g transform="rotate(-9 270 190)">
      <rect x="20" y="48" width="500" height="300" rx="24" fill={body} stroke="#101914" strokeWidth="5" />
      <rect x="20" y="32" width="500" height="290" rx="24" fill={top} stroke="#101914" strokeWidth="5" />
      <RecordMark label={secondary ?? "#C1FF00"} ink={primary ?? "#101914"} />
      <path d="M444 83v93l-65 69" stroke="#DDE9DD" strokeWidth="14" strokeLinecap="round" />
      <rect x="365" y="231" width="32" height="40" rx="4" fill={body} transform="rotate(40 381 251)" />
      <circle cx="458" cy="284" r="15" fill={body} stroke="#101914" strokeWidth="3" />
    </g>
  </svg>;
}

function RecordMark({ surface = "#18251B", label, ink }: { surface?: string; label: string; ink: string }) {
  return <>
    <circle cx="226" cy="174" r="122" fill={surface} stroke="#6B7E69" strokeWidth="3" />
    {[80, 94, 108].map(radius => <circle key={radius} cx="226" cy="174" r={radius} stroke="#4D604E" strokeWidth="2" />)}
    <circle cx="226" cy="174" r="37" fill={label} />
    <text x="226" y="180" textAnchor="middle" fill={ink} stroke="#101914" strokeWidth=".75" strokeOpacity=".55" paintOrder="stroke" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">e-disk</text>
  </>;
}
