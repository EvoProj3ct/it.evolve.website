import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  keyringReliefNames, keyringReliefs, keyringSymbolKinds, keyringSymbolLimit, keyringSymbolModeNames,
  keyringSymbolModes, keyringSymbolNames, keyringTextSizeNames, keyringTextSizes, type KeyringFace,
  type KeyringRelief, type KeyringSymbolChoice, type KeyringSymbolKind, type KeyringSymbolMode, type KeyringTextSize,
} from "@evolve/ecommerce-server/keyring-design";
import { keyringSymbolArtwork } from "./keyringSymbols";
import styles from "./Shop.module.css";

function SymbolIcon({ kind }: { kind: KeyringSymbolKind }) {
  const { outline, details } = keyringSymbolArtwork[kind];
  return <svg viewBox="0 0 100 100" aria-hidden="true" width="25" height="25">
    <path d={outline} stroke="currentColor" strokeWidth="6" strokeLinejoin="round" fill="none" />
    {details && <path d={details} fill="currentColor" fillRule="evenodd" />}
  </svg>;
}

export function KeyringSymbolPanel({ face, symbols, onChange }: {
  face: KeyringFace;
  symbols: readonly KeyringSymbolChoice[];
  onChange: (next: readonly KeyringSymbolChoice[]) => void;
}) {
  const [selection, setSelection] = useState<number>();
  const onFace = symbols.flatMap((symbol, index) => symbol.face === face ? [{ symbol, index }] : []);
  const active = onFace.find(entry => entry.index === selection) ?? onFace.at(-1);
  const full = symbols.length >= keyringSymbolLimit;

  function add(kind: KeyringSymbolKind) {
    if (full) return;
    setSelection(symbols.length);
    onChange([...symbols, { kind, face, mode: "outline", size: "medium", relief: "flat" }]);
  }

  function update(patch: Partial<KeyringSymbolChoice>) {
    if (!active) return;
    onChange(symbols.map((symbol, index) => index === active.index ? { ...symbol, ...patch } : symbol));
  }

  function changeMode(mode: KeyringSymbolMode) {
    update(mode === "cut" ? { mode, size: "small", relief: "flat" } : { mode });
  }

  return <>
    <div className={styles.keyringSymbolPalette} role="group" aria-label="Aggiungi un simbolo">
      {keyringSymbolKinds.map(kind => <button type="button" key={kind} disabled={full} onClick={() => add(kind)}
        aria-label={`Aggiungi ${keyringSymbolNames[kind]}`} title={keyringSymbolNames[kind]}>
        <SymbolIcon kind={kind} />
      </button>)}
    </div>
    {full && <p className={styles.keyringSymbolHint}>Massimo {keyringSymbolLimit} simboli tra fronte e retro.</p>}
    {active && <>
      {onFace.length > 1 && <div className={styles.keyringSymbolList} role="group" aria-label="Simboli inseriti su questa faccia">
        {onFace.map(({ symbol, index }) => <button type="button" key={index} aria-pressed={active.index === index}
          aria-label={`Seleziona simbolo ${index + 1}, ${keyringSymbolNames[symbol.kind]}`}
          onClick={() => setSelection(index)}><SymbolIcon kind={symbol.kind} /><span>{index + 1}</span></button>)}
      </div>}
      <div className={styles.keyringSymbolSelection}>
        <strong>{keyringSymbolNames[active.symbol.kind]}</strong>
        <button type="button" aria-label={`Rimuovi ${keyringSymbolNames[active.symbol.kind]}`} onClick={() => {
          onChange(symbols.filter((_, index) => index !== active.index));
          setSelection(undefined);
        }}><Trash2 size={15} aria-hidden="true" /></button>
      </div>
      <div className={styles.keyringLetterOptions}>
        <label>Modalità<select value={active.symbol.mode} onChange={event => changeMode(event.target.value as KeyringSymbolMode)}>
          {keyringSymbolModes.map(mode => <option key={mode} value={mode}>{keyringSymbolModeNames[mode]}</option>)}
        </select></label>
        <label>Grandezza<select value={active.symbol.size} disabled={active.symbol.mode === "cut"}
          onChange={event => update({ size: event.target.value as KeyringTextSize })}>
          {keyringTextSizes.map(size => <option key={size} value={size}>{keyringTextSizeNames[size]}</option>)}
        </select></label>
        {active.symbol.mode === "cut" ? <p className={styles.keyringSymbolHint}>Ritaglio piccolo vicino al bordo, visibile da entrambe le facce.</p>
          : <label>Rilievo<select value={active.symbol.relief} onChange={event => update({ relief: event.target.value as KeyringRelief })}>
            {keyringReliefs.map(relief => <option key={relief} value={relief}>{keyringReliefNames[relief]}</option>)}
          </select></label>}
      </div>
    </>}
  </>;
}
