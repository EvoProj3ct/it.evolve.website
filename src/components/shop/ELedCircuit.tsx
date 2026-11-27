"use client";

import { useState, type CSSProperties } from "react";
import { Power } from "lucide-react";
import styles from "./ELedCircuit.module.css";

const boardWidth = 1544;
const boardHeight = 360;
const tileWidth = 86;
const tileHeight = 62;
const tileStepX = 79;
const tileStepY = 48;
const rowY = (row: number) => 38 + row * tileStepY;
const e = ["0000", "0110", "1001", "1111", "1000", "0110"];

const branches = [
  {
    id: "first-e", label: "Prima e", x: 62, rows: e, color: "#9bff80", hue: 0,
    joint: { x: 141, y: 324, input: [141, boardHeight], output: [141, rowY(5)] },
  },
  {
    id: "dash", label: "Trattino", x: 437, rows: ["00", "00", "00", "11"], color: "#ffe381", hue: -62,
    joint: { x: 368, y: rowY(3), input: [299, rowY(3)], output: [437, rowY(3)] },
  },
  {
    id: "l", label: "L", x: 653, rows: ["10", "10", "10", "10", "10", "11"], color: "#7ff5ff", hue: 79,
    joint: { x: 584, y: rowY(3), input: [516, rowY(3)], output: [653, rowY(3)] },
  },
  {
    id: "second-e", label: "Seconda e", x: 868, rows: e, color: "#e2aeff", hue: 158,
    joint: { x: 800, y: 251, input: [732, rowY(5)], output: [868, rowY(4)] },
  },
  {
    id: "d", label: "D", x: 1243, rows: ["0001", "0001", "0111", "1001", "1001", "0111"], color: "#ff9baf", hue: -118,
    joint: { x: 1174, y: 254, input: [1026, rowY(5)], output: [1243, rowY(4)] },
  },
] as const;

const modules = branches.map(branch => {
  const tiles: { x: number; y: number }[] = [];
  const shortWires: string[] = [];

  branch.rows.forEach((row, rowIndex) => {
    Array.from(row).forEach((cell, column) => {
      if (cell !== "1") return;
      const x = branch.x + column * tileStepX;
      const y = rowY(rowIndex);
      tiles.push({ x, y });
      if (row[column + 1] === "1") shortWires.push(`M${x} ${y}h${tileStepX}`);

      const next = branch.rows[rowIndex + 1];
      if (next?.[column] === "1") shortWires.push(`M${x} ${y}v${tileStepY}`);
      else for (const direction of [-1, 1]) {
        if (next?.[column + direction] === "1") {
          shortWires.push(`M${x} ${y}l${direction * tileStepX} ${tileStepY}`);
        }
      }
    });
  });

  return { ...branch, tiles, wire: shortWires.join(" ") };
});

function cable(from: readonly [number, number], to: readonly [number, number]) {
  const [x, y] = from;
  const [targetX, targetY] = to;
  const middle = (x + targetX) / 2;
  return `M${x} ${y}C${middle} ${y} ${middle} ${targetY} ${targetX} ${targetY}`;
}

const closeAllJoints = (): boolean[] => branches.map(() => true);

export function ELedCircuit() {
  const [circuit, setCircuit] = useState(() => ({ powered: false, closed: closeAllJoints() }));
  const live = circuit.closed.map((_, index) => circuit.powered && circuit.closed.slice(0, index + 1).every(Boolean));

  return (
    <section className={styles.circuit} aria-label="Circuito interattivo e-led" data-powered={circuit.powered}>
      <div className={styles.board}>
        <div className={styles.word}>
          <svg className={styles.diagram} viewBox={`0 0 ${boardWidth} ${boardHeight}`} aria-hidden="true" focusable="false">
            {modules.map(({ joint, id, color }, index) => {
              const center = [joint.x, joint.y] as const;
              return <g key={id} style={{ "--ink": color } as CSSProperties}>
                <path className={styles.cable} d={cable(joint.input, center)} data-live={index === 0 ? circuit.powered : live[index - 1]} />
                <path className={styles.cable} d={cable(center, joint.output)} data-live={live[index]} />
                <path className={styles.mobileLead} d={`M${joint.x} ${joint.y}V${boardHeight}`} data-live={live[index]} />
              </g>;
            })}
            {modules.map((module, index) => (
              <g key={module.id} data-live={live[index]} style={{ "--ink": module.color, "--hue": `${module.hue}deg` } as CSSProperties}>
                <path className={styles.cable} d={module.wire} data-live={live[index]} />
                <g className={styles.signs}>
                  {module.tiles.map(({ x, y }) => (
                    <image key={`${x}-${y}`} href="/shop/brand/e-led.svg" x={x - tileWidth / 2} y={y - tileHeight / 2}
                      width={tileWidth} height={tileHeight} />
                  ))}
                </g>
              </g>
            ))}
          </svg>

          <div className={styles.switches} role="group" aria-label="Interruttori dei giunti">
            {modules.map(({ joint, id, label, color }, index) => (
              <button type="button" key={id} className={styles.joint} role="switch"
                aria-label={`Giunto verso ${label}`} aria-checked={circuit.closed[index]}
                data-live={live[index]}
                style={{
                  left: `${joint.x / boardWidth * 100}%`, "--y": `${joint.y / boardHeight * 100}%`, "--ink": color,
                } as CSSProperties}
                onClick={() => setCircuit(current => ({
                  ...current,
                  closed: current.closed.map((closed, position) => position === index ? !closed : closed),
                }))}>
                <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true" focusable="false">
                  <g transform={index === 0 ? "rotate(-90 16 16)" : undefined}>
                    <circle cx="7" cy="16" r="2.6" />
                    <circle cx="25" cy="16" r="2.6" />
                    <path d={circuit.closed[index] ? "M10 16h12" : "M9 14l12-7"} />
                  </g>
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.feed} style={{ "--battery-x": `${branches[0].joint.x / boardWidth * 100}%` } as CSSProperties}>
          <button type="button" className={styles.battery}
            aria-label={circuit.powered ? "Spegni tutto" : "Accendi tutti gli interruttori"}
            onClick={() => setCircuit(current => current.powered ? { ...current, powered: false } : { powered: true, closed: closeAllJoints() })}>
            <Power size={21} aria-hidden="true" />
            <span>{circuit.powered ? "On" : "Off"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
