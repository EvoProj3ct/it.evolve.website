import type { CSSProperties } from "react";
import styles from "./Shop.module.css";

const NOTES = [
  { drift: -78, rise: -182, turn: -17, delay: -.4, duration: 7.2, size: .95, origin: 42, color: "#c1ff00", kind: "single" },
  { drift: 28, rise: -205, turn: 14, delay: -1.1, duration: 7.6, size: 1, origin: 44, color: "#ff71c2", kind: "double" },
  { drift: 105, rise: -165, turn: 9, delay: -1.8, duration: 8.1, size: .9, origin: 46, color: "#fcf7df", kind: "bubble" },
  { drift: -112, rise: -190, turn: -10, delay: -2.5, duration: 7.4, size: .85, origin: 40, color: "#c9b1f0", kind: "quarter" },
  { drift: 65, rise: -215, turn: 20, delay: -3.2, duration: 8.3, size: .8, origin: 48, color: "#f7bad5", kind: "eighth" },
  { drift: -32, rise: -220, turn: 8, delay: -3.9, duration: 7.8, size: 1.05, origin: 43, color: "#fcf7df", kind: "double" },
  { drift: 118, rise: -188, turn: -8, delay: -4.6, duration: 7.1, size: .7, origin: 45, color: "#c1ff00", kind: "spark" },
  { drift: -102, rise: -170, turn: -22, delay: -5.3, duration: 8.2, size: .9, origin: 41, color: "#ff71c2", kind: "eighth" },
  { drift: 38, rise: -225, turn: 18, delay: -6, duration: 7.5, size: .8, origin: 46, color: "#c9b1f0", kind: "quarter" },
  { drift: -48, rise: -195, turn: -12, delay: -6.7, duration: 8, size: .85, origin: 43, color: "#c1ff00", kind: "single" },
] as const;

function SingleNote({ color, flag = true, doubleFlag = false }: { color: string; flag?: boolean; doubleFlag?: boolean }) {
  return <g fill={color} stroke="#101914" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M24 9h5v28h-5V9Z" />
    {flag && <path d="M29 9c2 5 15 6 12 18-1-7-7-8-12-9Z" />}
    {doubleFlag && <path d="M29 18c2 5 13 6 10 15-1-5-5-7-10-8Z" />}
    <ellipse cx="19" cy="40" rx="9" ry="6" transform="rotate(-23 19 40)" />
  </g>;
}

export function CartoonNotes({ playing }: { playing: boolean }) {
  return <div className={styles.cartoonNotes} data-playing={playing} aria-hidden="true">
    {NOTES.map((note, index) => <svg key={index} className={styles.cartoonNote} viewBox="0 0 54 58" style={{ "--note-drift": `${note.drift}px`, "--note-rise": `${note.rise}px`, "--note-turn": `${note.turn}deg`, "--note-delay": `${note.delay}s`, "--note-duration": `${note.duration}s`, "--note-size": note.size, "--note-origin": `${note.origin}%` } as CSSProperties}>
      {note.kind === "bubble" ? <>
        <path d="M7 8C18-1 45 2 48 16c6 18-10 28-24 25l-10 9 1-12C1 33-2 18 7 8Z" fill={note.color} stroke="#101914" strokeWidth="1.8" strokeLinejoin="round" />
        <g transform="translate(11 2) scale(.65)"><SingleNote color="#72c94f" /></g>
      </> : note.kind === "double" ? <g fill={note.color} stroke="#101914" strokeWidth="1.8" strokeLinejoin="round">
        <path d="m20 14 21-5v29h-5V18l-11 3v22h-5Z" />
        <ellipse cx="15" cy="44" rx="8" ry="5.5" transform="rotate(-22 15 44)" />
        <ellipse cx="31" cy="39" rx="8" ry="5.5" transform="rotate(-22 31 39)" />
      </g> : note.kind === "spark" ? <path d="m27 10 5 14 13 5-13 5-5 14-5-14-13-5 13-5Z" fill={note.color} stroke="#101914" strokeWidth="1.5" strokeLinejoin="round" /> : <SingleNote color={note.color} flag={note.kind !== "quarter"} doubleFlag={note.kind === "eighth"} />}
    </svg>)}
  </div>;
}
