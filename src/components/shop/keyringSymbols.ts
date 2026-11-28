import {
  keyringSymbolFitsSurface, keyringSymbolRadius, keyringSymbolsOverlap, keyringSymbolWidths,
  type KeyringFace, type KeyringPosition, type KeyringSymbol, type KeyringSymbolChoice, type KeyringSymbolKind,
} from "@evolve/ecommerce-server/keyring-design";
import { keyringLetteringLayout, keyringLogoLayout } from "./keyringGeometry";
import type { ProductConfiguration } from "./products";

export const keyringSymbolStroke = .036;

// The outer contour is also the stencil. Inner details use closed paths so they can be engraved.
export const keyringSymbolArtwork: Record<KeyringSymbolKind, { outline: string; details?: string }> = {
  star: { outline: "M50 10 L61 37 90 39 68 58 74 87 50 72 26 87 32 58 10 39 39 37Z" },
  smile: {
    outline: "M90 50 A40 40 0 1 1 10 50 A40 40 0 1 1 90 50Z",
    details: "M41 39 A5 5 0 1 1 31 39 A5 5 0 1 1 41 39Z M69 39 A5 5 0 1 1 59 39 A5 5 0 1 1 69 39Z M28 56 Q50 78 72 56 Q70 73 50 74 Q30 73 28 56Z",
  },
  thumb: {
    outline: "M12 46 H28 L46 31 L51 14 Q64 10 65 24 L60 42 H77 Q90 42 88 56 L82 75 Q80 85 69 85 H12Z",
    details: "M29 50 H35 V78 H29Z",
  },
  arcade: {
    outline: "M12 49 L24 24 Q29 15 40 14 L61 13 Q70 12 77 21 L87 36 L56 51 L88 63 L78 80 Q74 86 64 88 H35 Q24 88 19 76Z",
    details: "M48 26 L57 34 49 43 40 35Z",
  },
  ghost: {
    outline: "M13 85 V49 H20 V33 H29 V24 H39 V16 H61 V24 H72 V33 H80 V49 H87 V85 H66 V72 H55 V85 H45 V72 H34 V85Z",
    details: "M31 44 H44 V58 H31Z M58 44 H71 V58 H58Z",
  },
  heart: { outline: "M50 25 C36 4 11 14 11 37 C11 58 34 71 50 85 C66 71 89 58 89 37 C89 14 64 4 50 25Z" },
  instagram: {
    outline: "M30 14 H70 Q86 14 86 30 V70 Q86 86 70 86 H30 Q14 86 14 70 V30 Q14 14 30 14Z",
    details: "M68 50 A18 18 0 1 1 32 50 A18 18 0 1 1 68 50Z M59 50 A9 9 0 1 0 41 50 A9 9 0 1 0 59 50Z M77 31 A5 5 0 1 1 67 31 A5 5 0 1 1 77 31Z",
  },
  nfc: {
    outline: "M31 14 H69 Q86 14 86 31 V69 Q86 86 69 86 H31 Q14 86 14 69 V31 Q14 14 31 14Z",
    details: "M29 46 A5 5 0 1 1 29 56 A5 5 0 1 1 29 46Z M41 40 Q51 50 41 60 L36 56 Q43 50 36 44Z M53 32 Q70 50 53 68 L48 64 Q61 50 48 36Z M65 24 Q90 50 65 76 L60 72 Q80 50 60 28Z",
  },
  linkedin: {
    outline: "M22 13 H78 Q87 13 87 22 V78 Q87 87 78 87 H22 Q13 87 13 78 V22 Q13 13 22 13Z",
    details: "M40 32 A6 6 0 1 1 28 32 A6 6 0 1 1 40 32Z M29 44 H39 V73 H29Z M47 44 H57 V48 Q60 43 66 43 Q76 43 76 55 V73 H66 V57 Q66 52 62 52 Q57 52 57 57 V73 H47Z",
  },
  user: {
    outline: "M69 32 Q69 45 61 52 Q84 58 87 79 Q87 87 79 87 H21 Q13 87 13 79 Q16 58 39 52 Q31 45 31 32 A19 19 0 1 1 69 32Z",
    details: "M26 76 Q34 62 50 62 Q66 62 74 76 Q60 68 50 68 Q40 68 26 76Z",
  },
  link: {
    outline: "M15 56 L36 35 Q45 26 56 29 L66 19 Q77 9 87 20 Q98 31 88 42 L65 65 Q56 74 44 71 L34 81 Q24 90 14 80 Q4 70 15 56Z",
    details: "M24 60 L42 42 Q49 36 57 41 L50 48 Q47 46 44 49 L29 65 Q25 69 29 73 L23 79 Q14 71 24 60Z M76 40 L58 58 Q51 64 43 59 L50 52 Q53 54 56 51 L71 35 Q75 31 71 27 L77 21 Q86 29 76 40Z",
  },
};

const candidatePositions = Array.from({ length: 35 }, (_, index) => (index - 17) * 10)
  .flatMap(x => Array.from({ length: 33 }, (_, index) => ({ x, y: (index - 16) * 10 })))
  .sort((a, b) => Math.hypot(a.x - 110, a.y + 65) - Math.hypot(b.x - 110, b.y + 65));
const surfaceCandidates = new Map<string, readonly KeyringPosition[]>();

function candidates(configuration: ProductConfiguration, symbol: KeyringSymbolChoice) {
  const key = [configuration.shape, configuration.keyring.hole, symbol.size, symbol.mode === "cut", symbol.face].join(":");
  const cached = surfaceCandidates.get(key);
  if (cached) return cached;
  const points = candidatePositions
    .map(point => symbol.face === "back" ? { x: -point.x, y: point.y } : point)
    .filter(point => keyringSymbolFitsSurface(configuration.shape, configuration.keyring.hole, { ...symbol, ...point }));
  surfaceCandidates.set(key, points);
  return points;
}

function surfaceMarks(configuration: ProductConfiguration, face: KeyringFace) {
  const back = face === "back";
  const logo = !back && !!configuration.logo;
  const inscription = (back ? configuration.keyring.back.text : configuration.text).trim();
  const marks = [];
  if (inscription) {
    const { x, y, width, height, rotation } = keyringLetteringLayout(configuration.shape, configuration.keyring[face], inscription, logo);
    marks.push({ x: back ? -x : x, y, width: rotation ? height : width, height: rotation ? width : height });
  }
  if (logo) marks.push({ x: 0, ...keyringLogoLayout(configuration.shape, !!inscription) });
  return marks;
}

export function layoutKeyringSymbols(configuration: ProductConfiguration, choices = configuration.keyring.symbols ?? []) {
  if (!choices.length) return [];
  const marks = { front: surfaceMarks(configuration, "front"), back: surfaceMarks(configuration, "back") };
  const placed: KeyringSymbol[] = [];
  const results: (KeyringSymbol | null)[] = choices.map(() => null);
  const indices = choices.map((_, index) => index)
    .sort((a, b) => Number(choices[b].mode === "cut") - Number(choices[a].mode === "cut"));
  for (const index of indices) {
    const choice = choices[index];
    const radius = keyringSymbolRadius(choice.size) + .07;
    const occupied = choice.mode === "cut" ? [...marks.front, ...marks.back] : marks[choice.face];
    const point = candidates(configuration, choice).find(({ x, y }) =>
      occupied.every(mark => Math.hypot(Math.max(0, Math.abs(x / 100 - mark.x) - mark.width / 2),
        Math.max(0, Math.abs(y / 100 - mark.y) - mark.height / 2)) >= radius)
      && placed.every(other => !keyringSymbolsOverlap({ ...choice, x, y }, other)));
    if (point) {
      const symbol = { ...choice, ...point };
      results[index] = symbol;
      placed.push(symbol);
    }
  }
  return results;
}

export function symbolView(symbol: KeyringSymbol, face: KeyringFace, originX: number, originY: number, factor: number) {
  const scale = keyringSymbolWidths[symbol.size] * factor / 100;
  const x = originX + (face === "back" ? -symbol.x : symbol.x) * factor / 100;
  const y = originY - symbol.y * factor / 100;
  const mirror = symbol.face === face ? 1 : -1;
  return { transform: `translate(${x} ${y}) scale(${scale * mirror} ${scale}) translate(-50 -50)`,
    strokeWidth: keyringSymbolStroke * factor / scale };
}

export function symbolCoversPoint(symbol: KeyringSymbol, x: number, y: number) {
  return Math.hypot(symbol.x / 100 - x, symbol.y / 100 - y) < keyringSymbolRadius(symbol.size);
}
