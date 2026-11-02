"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ALPHA, GAMMA, DIRECTIONS, LEVELS, ROUND_MS, SPARKS, STORAGE_KEY,
  advanceGame, createGame, emptyLearner, pauseGame, restoreLearner,
  serializeLearner, snapshot, startRound, type Direction, type Game, type GameSnapshot,
} from "@/lib/q-ghost/engine";
import { drawGame } from "@/lib/q-ghost/renderer";
import styles from "./QGhostLab.module.css";

const number = new Intl.NumberFormat("it-IT");
const seconds = (ms: number) => `${Math.floor(ms / 1000)} s`;
const KEY_DIRECTION: Record<string, Direction> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3 };

function Ghost({ className }: { className?: string }) {
  return <svg className={className} viewBox="-10 -10 20 18" fill="none" aria-hidden="true"><path d="M-4-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H-3V6H-6V8H-10V-4H-8V-6H-6V-8H-4Z" fill="currentColor" /><path d="M-6-2h4v5h-4zm8 0h4v5H2Z" fill="#fcfdfb" /><path d="M-4 0h2v2h-2zm8 0h2v2H4Z" fill="#15221a" /></svg>;
}

function LearningChart({ history }: { history: GameSnapshot["history"] }) {
  const coordinates = history.map((point, index) => ({ x: 10 + index / Math.max(1, history.length - 1) * 260, y: 78 - point.approach * .68 }));
  const points = coordinates.map(point => `${point.x},${point.y}`).join(" ");
  const last = coordinates[coordinates.length - 1];
  return (
    <figure className={styles.chart}>
      <figcaption>Mosse che avvicinano alla preda</figcaption>
      {history.length ? <>
        <svg viewBox="0 0 280 88" role="img" aria-label="Percentuale di mosse che hanno avvicinato il fantasmino lungo i corridoi, in gruppi di 40 mosse">
          <path d="M10 10h260M10 44h260M10 78h260" stroke="#dfe8da" strokeWidth="1" />
          {coordinates.length > 1 && <polygon points={`10,78 ${points} ${last.x},78`} fill="#e7f1e0" />}
          <polyline points={points} fill="none" stroke="#2c7a62" strokeWidth="2" strokeLinejoin="round" />
          <circle cx={last.x} cy={last.y} r="3.5" fill="#72c94f" />
        </svg>
        <div className={styles.chartAxis}><span>Mossa {number.format(history[0].moves)}</span><span>{history[history.length - 1].approach}% nell’ultimo gruppo</span></div>
      </> : <div className={styles.emptyChart}>Il grafico parte dopo le prime 40 mosse.<span>Per ora, il lenzuolo è ancora in rodaggio.</span></div>}
      <p>Ogni punto riassume 40 mosse reali. Cambiando il tuo modo di giocare, la curva può anche scendere.</p>
    </figure>
  );
}

export function QGhostLab() {
  const reduceMotion = useReducedMotion();
  const reducedRef = useRef(Boolean(reduceMotion));
  reducedRef.current = Boolean(reduceMotion);
  const gameRef = useRef<Game | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState(() => snapshot(createGame()));
  const [ready, setReady] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState<"local" | "session">("local");
  const [modal, setModal] = useState<"lesson" | "reset" | null>(null);

  const refresh = useCallback(() => { if (gameRef.current) setView(snapshot(gameRef.current)); }, []);
  const save = useCallback((updateStatus = true) => {
    const game = gameRef.current;
    if (!game || !game.learner.moves) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeLearner(game.learner));
      if (updateStatus) setMemoryStatus("local");
    } catch { if (updateStatus) setMemoryStatus("session"); }
  }, []);

  useEffect(() => {
    const game = createGame();
    try {
      const model = restoreLearner(window.localStorage.getItem(STORAGE_KEY));
      if (model) game.learner = model;
    } catch { setMemoryStatus("session"); }
    gameRef.current = game;
    setView(snapshot(game));
    setReady(true);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    let size = { width: 0, height: 0, dpr: 1 };
    let needsPaint = true;
    let paintedGame: Game | null = null;
    let paintedStatus: Game["status"] | null = null;
    const resize = () => {
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = { width: bounds.width, height: bounds.height, dpr };
      canvas.width = Math.round(bounds.width * dpr);
      canvas.height = Math.round(bounds.height * dpr);
      needsPaint = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas) observer.observe(canvas);
    let frame = 0;
    let previous = 0;
    let lastUi = 0;
    const render = (now: number) => {
      const active = gameRef.current;
      if (active) {
        const before = active.status;
        advanceGame(active, previous ? now - previous : 0);
        if (context && size.width && size.height && (active.status === "playing" || needsPaint || active !== paintedGame || active.status !== paintedStatus)) {
          context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
          drawGame(context, active, size.width, size.height, reducedRef.current);
          paintedGame = active;
          paintedStatus = active.status;
          needsPaint = false;
        }
        if ((active.status === "playing" && now - lastUi > 150) || before !== active.status) { setView(snapshot(active)); lastUi = now; }
        if (before === "playing" && active.status !== "playing") save();
      }
      previous = now;
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);
    let savedMoves = game.learner.moves;
    const interval = window.setInterval(() => {
      const moves = gameRef.current?.learner.moves ?? 0;
      if (moves !== savedMoves) { save(); savedMoves = moves; }
    }, 5000);
    const pause = () => { if (gameRef.current) { pauseGame(gameRef.current); refresh(); } };
    const visibility = () => { if (document.hidden) pause(); };
    const pagehide = () => save(false);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", pagehide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      observer.disconnect();
      window.removeEventListener("blur", pause);
      window.removeEventListener("pagehide", pagehide);
      document.removeEventListener("visibilitychange", visibility);
      save(false);
    };
  }, [refresh, save]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!modal) { if (dialog.open) dialog.close(); return; }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => { document.body.style.overflow = overflow; };
  }, [modal]);

  const play = () => {
    if (!gameRef.current) return;
    startRound(gameRef.current);
    refresh();
    canvasRef.current?.focus({ preventScroll: true });
  };
  const togglePause = () => {
    const game = gameRef.current;
    if (!game) return;
    if (game.status === "playing") pauseGame(game);
    else if (game.status === "paused") startRound(game);
    refresh();
    canvasRef.current?.focus({ preventScroll: true });
  };
  const move = (direction: Direction) => {
    if (!gameRef.current) return;
    gameRef.current.requestedDirection = direction;
    canvasRef.current?.focus({ preventScroll: true });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = KEY_DIRECTION[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (direction !== undefined) { event.preventDefault(); move(direction); }
    else if (event.code === "Space") { event.preventDefault(); if (!event.repeat) togglePause(); }
  };
  const openModal = (kind: "lesson" | "reset") => {
    if (gameRef.current) pauseGame(gameRef.current);
    refresh();
    setModal(kind);
  };
  const reset = () => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { setMemoryStatus("session"); }
    gameRef.current = createGame(emptyLearner());
    refresh();
    setModal(null);
  };
  const remaining = Math.max(0, Math.ceil((ROUND_MS - view.elapsedMs) / 1000));
  const ended = view.status === "caught" || view.status === "escaped";
  const active = view.status === "playing" || view.status === "paused";

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div><nav className={styles.breadcrumb} aria-label="Percorso"><Link href="/">Evolve</Link><span aria-hidden="true">/</span><span>Laboratorio esperimenti</span></nav><h1>Il fantasmino<br />si fa <span>furbo.</span></h1><p className={styles.intro}>Tu giochi a Pac-Man. Lui impara a prenderti.<br />Un piccolo esperimento di Q-learning, una partita alla volta.</p></div>
          <button type="button" className={styles.explainButton} onClick={() => openModal("lesson")}>Come funziona <span aria-hidden="true">↗</span></button>
        </header>

        <div className={styles.lab}>
          <section className={styles.playground} aria-label="Gioca contro il fantasmino">
            <div className={styles.gameBar}>
              <div className={styles.roundStats}><span>Tempo <strong>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</strong></span><span>Scintille <strong>{view.collected}<small>/{SPARKS}</small></strong></span></div>
              <button type="button" onClick={togglePause} disabled={!active} className={styles.pauseButton}>{view.status === "paused" ? "Riprendi" : "Pausa"}<span aria-hidden="true">{view.status === "paused" ? "▷" : "Ⅱ"}</span></button>
            </div>
            <div className={styles.board}>
              <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} onKeyDown={onKeyDown} role="img" aria-label="Labirinto di 27 per 19 celle. Tu sei il Pac-Man bianco, il fantasmino è verde." aria-describedby="q-ghost-controls">Il gioco richiede il supporto canvas del browser. Usa le frecce, WASD o i pulsanti direzionali sotto il labirinto.</canvas>
              {view.status !== "playing" && <div className={styles.boardOverlay}>
                <div className={styles.startCard}>
                  <Ghost className={styles.startGhost} />
                  <h2>{view.status === "ready" ? "Scappa. Lui prende appunti." : view.status === "paused" ? "Un attimo di respiro." : view.status === "caught" ? "Ti ha beccato." : "Questa volta hai vinto tu."}</h2>
                  <p>{view.status === "ready" ? "Resisti 60 secondi o raccogli tutte le 12 scintille. Ogni mossa allena il fantasmino." : view.status === "paused" ? "Il labirinto è in pausa. Riprendi quando vuoi." : `Hai raccolto ${view.collected} scintille in ${seconds(view.elapsedMs)}. Il fantasmino conserva quello che ha imparato.`}</p>
                  <button type="button" className={styles.primaryButton} onClick={play} disabled={!ready}>{!ready ? "Un momento…" : view.status === "paused" ? "Riprendi" : ended ? "Rivincita" : "Giochiamo"}<span aria-hidden="true">→</span></button>
                  {ended && <span className={styles.roundNote}>Nuova partita, stessa memoria.</span>}
                </div>
              </div>}
            </div>
            <div className={styles.boardFooter}>
              <div><div className={styles.legend}><span><i className={styles.playerDot} />Tu</span><span><Ghost />Lui</span></div><p id="q-ghost-controls">Frecce o WASD per muoverti · Spazio per la pausa.<br />La direzione resta attiva fino al prossimo muro.</p></div>
              <div className={styles.dpad} role="group" aria-label="Controlli direzionali">{DIRECTIONS.map((direction, index) => <button key={direction.label} type="button" className={styles[`direction${index}`]} onPointerDown={event => { event.preventDefault(); move(index as Direction); }} onClick={() => move(index as Direction)} aria-label={`Vai ${direction.label.toLowerCase()}`}>{direction.arrow}</button>)}</div>
            </div>
          </section>

          <aside className={styles.dashboard} aria-label="Apprendimento e statistiche del fantasmino">
            <section className={styles.rankCard}>
              <div className={styles.rankTop}><Ghost /><span>Livello {view.level.number} di {LEVELS.length}</span></div>
              <h2>{view.level.name}</h2><p>{view.level.description}</p>
              <div className={styles.levelProgress} role="progressbar" aria-label="Esperienza verso il prossimo livello" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.level.progress * 100)}><span style={{ width: `${view.level.progress * 100}%` }} /></div>
              <span className={styles.nextLevel}>{view.level.nextAt ? `${number.format(Math.max(0, view.level.nextAt - view.moves))} mosse al prossimo titolo` : "Tutti i titoli sbloccati. Può ancora imparare."}</span>
            </section>

            <section className={styles.statsCard}>
              <h2>Il suo quaderno.</h2>
              <dl className={styles.stats}><div><dt>Mosse di allenamento</dt><dd>{number.format(view.moves)}</dd></div><div><dt>Situazioni in memoria</dt><dd>{number.format(view.states)}</dd></div><div><dt>Ti ha preso</dt><dd>{number.format(view.captures)}</dd></div><div><dt>Partite vinte da te</dt><dd>{number.format(view.escapes)}</dd></div></dl>
              <div className={styles.record}><span>La tua resistenza migliore</span><strong>{seconds(view.bestMs)}</strong></div>
              <div className={styles.exploration}><div><span>Voglia di sperimentare</span><strong>{Math.round(view.epsilon * 100)}%</strong></div><div className={styles.explorationTrack}><span style={{ width: `${view.epsilon * 100}%` }} /></div><p>All’inizio prova tutto. Con l’esperienza si affida di più alla memoria.</p></div>
            </section>
          </aside>
        </div>

        <div className={styles.observatory}>
          <LearningChart history={view.history} />
          <section className={styles.thoughts} aria-labelledby="ghost-thought-title">
            <h2 id="ghost-thought-title">Nella sua testa, adesso.</h2>
            <div className={styles.decision}><span className={styles.decisionDot} /><span>{view.lastExploration === null ? "Ancora nessuna idea. Ottimo inizio." : view.lastExploration ? "Sta provando una mossa a caso." : "Sta scegliendo dalla sua memoria."}</span></div>
            <p className={styles.reward}><strong>{view.lastReward > 0 ? "+" : ""}{view.lastReward.toLocaleString("it-IT", { maximumFractionDigits: 2 })}</strong><span>{view.lastReason}</span></p>
            <details className={styles.qDetails}><summary>I voti delle quattro mosse</summary><div className={styles.qValues}>{DIRECTIONS.map((direction, index) => <div key={direction.label} data-chosen={view.lastAction === index}><span>{direction.arrow} {direction.label}</span><strong>{!view.lastLegal.includes(index as Direction) ? "muro" : view.lastValues[index].toFixed(1)}</strong></div>)}</div><p>Sono i valori Q dell’ultima situazione: un voto alle mosse, aggiornato dall’esperienza.</p></details>
          </section>
        </div>

        <footer className={styles.labFooter}><p>{memoryStatus === "local" ? "Il suo quaderno resta in questo browser, anche quando torni. Il gioco e l’apprendimento avvengono qui." : "In questo browser i progressi restano disponibili per la sessione corrente."}</p><button type="button" onClick={() => openModal("reset")} disabled={!ready || !view.moves}>Azzera la memoria <span aria-hidden="true">↺</span></button></footer>
      </div>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="q-ghost-dialog-title" onCancel={event => { event.preventDefault(); setModal(null); }} onClose={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null); }}>
        {modal && <div className={styles.dialogInner}>
          <button type="button" className={styles.dialogClose} onClick={() => setModal(null)} aria-label="Chiudi spiegazione">×</button>
          <Ghost className={styles.dialogGhost} />
          <h2 id="q-ghost-dialog-title">{modal === "reset" ? "Di nuovo un principiante?" : "Impara facendo. Come noi."}</h2>
          {modal === "reset" ? <><p>Il fantasmino tornerà al primo livello. Cancellerai da questo browser la sua memoria e le statistiche di questo esperimento.</p><div className={styles.dialogActions}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Ci ho ripensato</button><button type="button" className={styles.primaryButton} onClick={reset}>Riparti da zero</button></div></> : <>
            <p>Tu sei il Pac-Man bianco. Lui è il fantasmino verde: all’inizio sceglie a caso, poi dà un voto alle mosse che prova.</p>
            <ol className={styles.lessonSteps}><li><span>01</span><div><h3>Prova una strada.</h3><p>Guarda dove sei e quali uscite ha vicino. Non conosce già la strada giusta.</p></div></li><li><span>02</span><div><h3>Riceve un piccolo voto.</h3><p>Avvicinarsi lungo i corridoi vale +1, allontanarsi −0,8. Prenderti vale +25. Se vinci tu, −3. Tornare subito indietro costa un pochino in più.</p></div></li><li><span>03</span><div><h3>Aggiorna il suo quaderno.</h3><p>Ritrovando una situazione simile, preferirà le mosse con il voto migliore. Quel voto considera anche cosa potrebbe succedere dopo: questo è il Q-learning.</p></div></li></ol>
            <p>Ogni tanto continua a provare a caso: potrebbe scoprire una scelta migliore. La velocità resta uguale; a cambiare sono le decisioni.</p>
            <p>Tu però ti muovi e cambi strategia. Per questo la curva non sale sempre. I livelli buffi raccontano quanta esperienza ha accumulato, non certificano che sia imbattibile.</p>
            <details className={styles.lessonDetails}><summary>I titoli poco accademici</summary><ol>{LEVELS.map((level, index) => <li key={level.name}><span>Livello {index + 1} · {number.format(level.at)} mosse</span><strong>{level.name}</strong></li>)}</ol></details>
            <details className={styles.lessonDetails}><summary>La formula, se sei curioso</summary><code>Q ← Q + α × (premio + γ × miglior voto futuro − Q)</code><p>Qui α = {ALPHA} e γ = {GAMMA}. La memoria raggruppa situazioni simili: è una semplificazione didattica.</p><a href="https://www.gatsby.ucl.ac.uk/~dayan/papers/cjch.pdf" target="_blank" rel="noopener noreferrer">Q-learning, Watkins e Dayan (1992) ↗</a></details>
            <button type="button" className={styles.primaryButton} onClick={() => setModal(null)}>Torno al labirinto <span aria-hidden="true">→</span></button>
          </>}
        </div>}
      </dialog>
    </main>
  );
}
