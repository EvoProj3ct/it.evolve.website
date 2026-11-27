import type { CSSProperties } from "react";
import type { LinkerBundleSize } from "@evolve/ecommerce-server/keyring-offers";
import { ProductMark } from "./ProductMark";
import styles from "./LinkerBundleArtwork.module.css";

// Positions are percentages, followed by the rotation in degrees.
const arrangements: Record<1 | LinkerBundleSize, readonly (readonly [number, number, number])[]> = {
  1: [[50, 50, 0]],
  10: [[37, 47, -13], [62, 56, 13]],
  20: [[37, 38, -14], [65, 38, 12], [50, 66, 3]],
  50: [[35, 32, -14], [64, 32, 10], [34, 66, 9], [64, 66, -5]],
  100: [[32, 28, -16], [65, 28, 12], [37, 55, 9], [68, 55, -8], [50, 76, 2]],
  500: [[30, 24, -14], [63, 24, 12], [34, 49, 7], [67, 49, -6], [38, 74, -9], [69, 74, 9]],
};

export function LinkerBundleArtwork({ size, primary, secondary }: {
  size: 1 | LinkerBundleSize;
  primary?: string;
  secondary?: string;
}) {
  return <div className={styles.artwork} data-single={size === 1} aria-hidden="true">
    {arrangements[size].map(([x, y, rotation]) =>
      <span key={`${x}-${y}`} className={styles.mark}
        style={{ left: `${x}%`, top: `${y}%`, "--rotation": `${rotation}deg` } as CSSProperties}>
        <ProductMark product="e-linker" primary={primary} secondary={secondary} />
      </span>
    )}
  </div>;
}
