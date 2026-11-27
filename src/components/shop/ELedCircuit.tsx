"use client";

import { useState, type CSSProperties } from "react";
import { Power } from "lucide-react";
import styles from "./ELedCircuit.module.css";

const boardWidth = 1000;
const boardHeight = 277;
const tileStepX = 37;
const tileStepY = 31;
const e = ["00000", "00000", "01110", "10001", "11111", "10000", "01111"];

const branches = [
  { id: "first-e", label: "Prima e", x: 27, rows: e, color: "#8eff77", hue: 0 },
  { id: "dash", label: "Trattino", x: 255, rows: ["000", "000", "000", "000", "111"], color: "#dbff83", hue: -43 },
  { id: "l", label: "L", x: 411, rows: ["010", "010", "010", "010", "010", "010", "011"], color: "#79ffeb", hue: 72 },
  { id: "second-e", label: "Seconda e", x: 569, rows: e, color: "#e0b1ff", hue: 156 },
  { id: "d", label: "D", x: 795, rows: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"], color: "#ffd391", hue: -74 },
] as const;

function jointX(branch: (typeof branches)[number]) {
  return branch.x + 21 + (branch.rows[0].length - 1) * tileStepX / 2;
}

export function ELedCircuit() {
  const [powered, setPowered] = useState(false);
  const [closed, setClosed] = useState<boolean[]>(() => branches.map(() => true));

  return (
    <section className={styles.circuit} aria-label="Circuito interattivo e-led" data-powered={powered}>
      <div className={styles.board}>
        <svg className={styles.word} viewBox={`0 0 ${boardWidth} ${boardHeight}`} aria-hidden="true" focusable="false">
          {branches.map((branch, index) => {
            const live = powered && closed[index];
            const anchor = jointX(branch);
            const wireTop = (branch.rows.length - 1) * tileStepY + 51;
            const tint = { "--branch-color": branch.color, "--branch-hue": `${branch.hue}deg` } as CSSProperties;

            return <g key={branch.id} data-live={live} style={tint}>
              <path className={styles.outputWire} d={`M${anchor} ${wireTop}V${boardHeight}`} />
              <g className={styles.signs}>
                {branch.rows.flatMap((row, y) => Array.from(row, (cell, x) => cell === "1" && (
                  <image key={`${x}-${y}`} href="/shop/brand/e-led.svg" x={branch.x + x * tileStepX}
                    y={26 + y * tileStepY} width={42} height={30.5} />
                )))}
              </g>
            </g>;
          })}
        </svg>

        <div className={styles.joints} role="group" aria-label="Interruttori delle singole parti">
          <svg className={styles.bus} viewBox={`0 0 ${boardWidth} 76`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d={`M${jointX(branches[0])} 62H${jointX(branches[branches.length - 1])}M500 62V76`} />
            {branches.map(branch => <path key={branch.id} d={`M${jointX(branch)} 19V62`} />)}
            {branches.map(branch => <circle key={branch.id} cx={jointX(branch)} cy="62" r="3.5" />)}
          </svg>
          {branches.map((branch, index) => (
            <button type="button" key={branch.id} role="switch" aria-checked={closed[index]}
              aria-label={`Giunto ${branch.label}`} className={styles.joint} data-live={powered && closed[index]}
              style={{ left: `${jointX(branch) / boardWidth * 100}%`, "--branch-color": branch.color } as CSSProperties}
              onClick={() => setClosed(current => current.map((value, position) => position === index ? !value : value))}>
              <svg viewBox="0 0 26 26" width="23" height="23" aria-hidden="true" focusable="false">
                <circle cx="13" cy="5" r="2.5" />
                <circle cx="13" cy="21" r="2.5" />
                <path d={closed[index] ? "M13 18.5V7.5" : "M14.5 19l6-10"} />
              </svg>
            </button>
          ))}
        </div>

        <button type="button" className={styles.power} onClick={() => setPowered(value => !value)}>
          <Power size={18} aria-hidden="true" />
          {powered ? "Spegni il circuito" : "Accendi il circuito"}
        </button>
      </div>
    </section>
  );
}
