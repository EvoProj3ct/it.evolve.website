import type { CSSProperties } from "react";
import styles from "./Shop.module.css";

const NOTES = [
  { drift: -78, rise: -155, turn: -17, delay: -.6, color: "#c1ff00", kind: "single" },
  { drift: 28, rise: -190, turn: 14, delay: -2, color: "#ff71c2", kind: "double" },
  { drift: 105, rise: -145, turn: 9, delay: -3.3, color: "#fcf7df", kind: "bubble" },
  { drift: -122, rise: -195, turn: -10, delay: -4.5, color: "#c9b1f0", kind: "double" },
] as const;

function SingleNote({ color }: { color: string }) {
  return <g fill={color} stroke="#101914" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M24 9h5v28h-5V9Zm5 0c2 5 15 6 12 18-1-7-7-8-12-9Z" />
    <ellipse cx="19" cy="40" rx="9" ry="6" transform="rotate(-23 19 40)" />
  </g>;
}

export function CartoonNotes({ playing }: { playing: boolean }) {
  return <div className={styles.cartoonNotes} data-playing={playing} aria-hidden="true">
    {NOTES.map((note, index) => <svg key={index} className={styles.cartoonNote} viewBox="0 0 54 58" style={{ "--note-drift": `${note.drift}px`, "--note-rise": `${note.rise}px`, "--note-turn": `${note.turn}deg`, "--note-delay": `${note.delay}s` } as CSSProperties}>
      {note.kind === "bubble" ? <>
        <path d="M7 8C18-1 45 2 48 16c6 18-10 28-24 25l-10 9 1-12C1 33-2 18 7 8Z" fill={note.color} stroke="#101914" strokeWidth="1.8" strokeLinejoin="round" />
        <g transform="translate(11 2) scale(.65)"><SingleNote color="#72c94f" /></g>
      </> : note.kind === "double" ? <g fill={note.color} stroke="#101914" strokeWidth="1.8" strokeLinejoin="round">
        <path d="m20 14 21-5v29h-5V18l-11 3v22h-5Z" />
        <ellipse cx="15" cy="44" rx="8" ry="5.5" transform="rotate(-22 15 44)" />
        <ellipse cx="31" cy="39" rx="8" ry="5.5" transform="rotate(-22 31 39)" />
      </g> : <SingleNote color={note.color} />}
    </svg>)}
  </div>;
}
