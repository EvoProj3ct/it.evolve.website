"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, ChevronDown, Shuffle, X } from "lucide-react";
import { colorName, productColors, type ProductId } from "./products";
import styles from "./ProductColorPicker.module.css";

type Channel = "primary" | "secondary";
type Props = {
  product: ProductId;
  value: { primary: string; secondary: string };
  onChange: (channel: Channel, hex: string) => void;
  onSwap: () => void;
  onShuffle: () => void;
};
const colorStyle = (hex: string) => ({ "--chip-color": hex } as CSSProperties);

export function ProductColorPicker({ product, value, onChange, onSwap, onShuffle }: Props) {
  const colors = productColors(product);
  const [active, setActive] = useState<Channel | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggers = useRef<Partial<Record<Channel, HTMLButtonElement | null>>>({});
  const initialValue = useRef(value);
  initialValue.current = value;
  const panelId = useId();
  const labels = product === "e-disk" ? { primary: "Scocca", secondary: "Piano" } : product === "e-led" ? { primary: "Scocca", secondary: "Luce" } : { primary: "Base", secondary: "Rilievo" };

  const close = (restoreFocus = false) => {
    if (restoreFocus && active) triggers.current[active]?.focus({ preventScroll: true });
    setActive(null);
    setHovered(null);
  };

  useLayoutEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    const trigger = triggers.current[active];
    if (!panel || !trigger) return;
    const place = () => {
      const anchor = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const panelWidth = panel.offsetWidth, panelHeight = panel.offsetHeight;
      const left = Math.max(leftEdge + 12, Math.min(anchor.right - panelWidth, leftEdge + width - panelWidth - 12));
      const below = anchor.bottom + 9;
      const top = below + panelHeight <= topEdge + height - 12 ? below : Math.max(topEdge + 12, anchor.top - panelHeight - 9);
      setPosition({ left, top, ready: true });
    };
    place();
    const focusFrame = window.requestAnimationFrame(() => panel.querySelector<HTMLButtonElement>(`[data-color="${initialValue.current[active]}"]`)?.focus({ preventScroll: true }));
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const outside = (event: Event) => {
      const node = event.target;
      if (node instanceof Node && !panelRef.current?.contains(node) && !rootRef.current?.contains(node)) { setActive(null); setHovered(null); }
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      triggers.current[active]?.focus({ preventScroll: true });
      setActive(null); setHovered(null);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [active]);

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!active) return;
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 };
    if (!(event.key in step) && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? colors.length - 1 : (index + step[event.key] + colors.length) % colors.length;
    const color = colors[next];
    onChange(active, color.hex);
    setHovered(color.hex);
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-color="${color.hex}"]`)?.focus({ preventScroll: true });
  };

  return <div className={styles.picker} ref={rootRef} data-product={product}>
    <div className={styles.channels}>
      {(["primary", "secondary"] as const).map((channel, index) => <button key={channel} ref={element => { triggers.current[channel] = element; }} type="button" className={styles.channel} aria-expanded={active === channel} aria-controls={active === channel ? panelId : undefined} aria-haspopup="dialog" onClick={() => {
        setPosition(current => ({ ...current, ready: false })); setHovered(null); setActive(current => current === channel ? null : channel);
      }}><span className={styles.channelIndex}>0{index + 1}</span><span className={styles.channelLabel}>{labels[channel]}</span><span className={styles.colorName}>{colorName(value[channel])}</span><i className={styles.colorChip} style={colorStyle(value[channel])} /><ChevronDown size={13} /></button>)}
    </div>
    <div className={styles.actions}><span>{product === "e-disk" ? "Dettagli in nero satinato" : product === "e-led" ? "Materia e luce, indipendenti" : "Due colori, una firma"}</span><div><button type="button" onClick={() => { close(); onSwap(); }} aria-label="Scambia i due colori" title="Scambia i colori"><ArrowLeftRight size={15} /></button><button type="button" onClick={() => { close(); onShuffle(); }} aria-label="Scegli un abbinamento casuale" title="Sorprendimi"><Shuffle size={15} /></button></div></div>
    {active && createPortal(<div id={panelId} ref={panelRef} className={styles.popover} data-product={product} role="dialog" aria-label={`Scegli il colore: ${labels[active].toLowerCase()}`} style={{ left: position.left, top: position.top, visibility: position.ready ? "visible" : "hidden" }}>
      <div className={styles.popoverHeader}><span>{labels[active]}<small>{colors.length} tonalità</small></span><button type="button" onClick={() => close(true)} aria-label="Chiudi la palette"><X size={15} /></button></div>
      <div className={styles.palette} role="radiogroup" aria-label={`Colore ${labels[active].toLowerCase()}`} onPointerLeave={() => setHovered(null)}>{colors.map((color, index) => <button key={color.hex} type="button" className={styles.swatch} role="radio" aria-checked={value[active] === color.hex} tabIndex={value[active] === color.hex ? 0 : -1} data-color={color.hex} aria-label={color.name} title={color.name} style={colorStyle(color.hex)} onPointerEnter={() => setHovered(color.hex)} onFocus={() => setHovered(color.hex)} onKeyDown={event => navigate(event, index)} onClick={() => { onChange(active, color.hex); close(true); }}><i /></button>)}</div>
      <div className={styles.popoverCaption}><span>{colorName(hovered ?? value[active])}</span><span>{hovered ?? value[active]}</span></div>
    </div>, document.body)}
  </div>;
}
