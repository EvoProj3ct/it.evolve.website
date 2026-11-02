export const COLS = 27;
export const ROWS = 19;
export const TURN_MS = 180;
export const ROUND_MS = 60_000;
export const SPARKS = 12;
export const STORAGE_KEY = "evolve.q-ghost.v1";
export const ALPHA = .18;
export const GAMMA = .92;

export type Direction = 0 | 1 | 2 | 3;
export type Status = "ready" | "playing" | "paused" | "caught" | "escaped";
export type QRow = [number, number, number, number];
export const DIRECTIONS = [
  { dx: 0, dy: -1, label: "Su", arrow: "↑" },
  { dx: 1, dy: 0, label: "Destra", arrow: "→" },
  { dx: 0, dy: 1, label: "Giù", arrow: "↓" },
  { dx: -1, dy: 0, label: "Sinistra", arrow: "←" },
] as const;

export const LEVELS = [
  { at: 0, name: "Fermacarte col lenzuolo", description: "Non ha capito bene dove siano le uscite. O le entrate." },
  { at: 200, name: "Perso, ma con intenzione", description: "Comincia ad avere un piano. Non sempre un buon piano." },
  { at: 700, name: "Segugio in ciabatte", description: "I bivii iniziano ad avere un senso. Tu un po’ meno tranquillo." },
  { at: 1800, name: "Ispettore Fantasmino", description: "Ha preso appunti. Probabilmente su di te." },
  { at: 4000, name: "Incubo con il diploma", description: "Tanta pratica e un’autostima francamente esagerata." },
  { at: 8000, name: "Coinquilino del terrore", description: "Ormai conosce i corridoi. Gli manca solo una copia delle chiavi." },
] as const;

type Maze = { neighbors: number[][]; walls: [number, number, number, number][] };
export type HistoryPoint = { moves: number; approach: number };
export type Learner = {
  q: Record<string, QRow>;
  states: number;
  moves: number;
  captures: number;
  escapes: number;
  bestMs: number;
  recent: boolean[];
  history: HistoryPoint[];
};

export type Game = {
  maze: Maze;
  learner: Learner;
  status: Status;
  player: number;
  playerFrom: number;
  ghost: number;
  ghostFrom: number;
  playerDirection: Direction;
  requestedDirection: Direction;
  ghostDirection: Direction;
  sparks: Set<number>;
  collected: number;
  elapsedMs: number;
  accumulatorMs: number;
  lastReward: number;
  lastExploration: boolean | null;
  lastReason: string;
  lastAction: Direction | null;
  lastValues: QRow;
  lastLegal: Direction[];
  finishReason: "time" | "sparks" | null;
};

function randomGenerator(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function adjacent(cell: number) {
  const x = cell % COLS;
  const y = Math.floor(cell / COLS);
  return DIRECTIONS.map(({ dx, dy }) => x + dx >= 0 && x + dx < COLS && y + dy >= 0 && y + dy < ROWS ? (y + dy) * COLS + x + dx : -1).filter(next => next >= 0);
}

function createMaze(): Maze {
  const random = randomGenerator(42027);
  const neighbors = Array.from({ length: COLS * ROWS }, () => [] as number[]);
  const visited = new Set([0]);
  const stack = [0];
  const connect = (a: number, b: number) => {
    if (neighbors[a].includes(b)) return;
    neighbors[a].push(b);
    neighbors[b].push(a);
  };
  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = adjacent(current).filter(next => !visited.has(next));
    if (!options.length) { stack.pop(); continue; }
    const next = options[Math.floor(random() * options.length)];
    connect(current, next);
    visited.add(next);
    stack.push(next);
  }
  neighbors.forEach((_, cell) => adjacent(cell).forEach(next => {
    if (next > cell && random() < .12) connect(cell, next);
  }));
  const walls: Maze["walls"] = [[0, 0, COLS, 0], [COLS, 0, COLS, ROWS], [COLS, ROWS, 0, ROWS], [0, ROWS, 0, 0]];
  neighbors.forEach((options, cell) => {
    const x = cell % COLS;
    const y = Math.floor(cell / COLS);
    if (x < COLS - 1 && !options.includes(cell + 1)) walls.push([x + 1, y, x + 1, y + 1]);
    if (y < ROWS - 1 && !options.includes(cell + COLS)) walls.push([x, y + 1, x + 1, y + 1]);
  });
  return { neighbors, walls };
}

const MAZE = createMaze();
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

// Only the environment uses corridor distances to award feedback and space spawns.
// The agent's action selector below uses its Q table, not a shortest-path route.
function distancesFrom(maze: Maze, target: number) {
  const distances = new Int16Array(COLS * ROWS).fill(-1);
  const queue = [target];
  distances[target] = 0;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const next of maze.neighbors[current]) {
      if (distances[next] !== -1) continue;
      distances[next] = distances[current] + 1;
      queue.push(next);
    }
  }
  return distances;
}

function directionBetween(a: number, b: number): Direction {
  if (b === a - COLS) return 0;
  if (b === a + 1) return 1;
  if (b === a + COLS) return 2;
  return 3;
}

function optionsAt(maze: Maze, cell: number) {
  return maze.neighbors[cell].map(next => ({ next, action: directionBetween(cell, next) }));
}

// A small, shared state space lets the ghost reuse experience at similar junctions.
// This deliberately abstracts the full moving-player state; it is a teaching toy.
function stateKey(game: Game) {
  const dx = game.player % COLS - game.ghost % COLS;
  const dy = Math.floor(game.player / COLS) - Math.floor(game.ghost / COLS);
  const relative = (Math.sign(dy) + 1) * 3 + Math.sign(dx) + 1;
  const separation = Math.max(Math.abs(dx), Math.abs(dy));
  const bucket = separation < 4 ? 0 : separation < 10 ? 1 : 2;
  const exits = optionsAt(game.maze, game.ghost).reduce((mask, option) => mask | (1 << option.action), 0);
  return String(((exits * 9 + relative) * 3 + bucket) * 4 + game.ghostDirection);
}

function rowAt(model: Learner, key: string): QRow {
  if (!model.q[key]) { model.q[key] = [0, 0, 0, 0]; model.states++; }
  return model.q[key];
}

export function explorationRate(moves: number) { return Math.max(.08, Math.exp(-moves / 700)); }

export function levelFor(moves: number) {
  let index = 0;
  LEVELS.forEach((level, candidate) => { if (moves >= level.at) index = candidate; });
  const level = LEVELS[index];
  const next = LEVELS[index + 1];
  return { ...level, number: index + 1, nextAt: next?.at ?? null, progress: next ? Math.min(1, (moves - level.at) / (next.at - level.at)) : 1 };
}

export function emptyLearner(): Learner {
  return { q: Object.create(null) as Record<string, QRow>, states: 0, moves: 0, captures: 0, escapes: 0, bestMs: 0, recent: [], history: [] };
}

export function createGame(learner = emptyLearner()): Game {
  const game: Game = {
    maze: MAZE, learner, status: "ready", player: 0, playerFrom: 0, ghost: 0, ghostFrom: 0,
    playerDirection: 1, requestedDirection: 1, ghostDirection: 3,
    sparks: new Set(), collected: 0, elapsedMs: 0, accumulatorMs: 0,
    lastReward: 0, lastExploration: null, lastReason: "Aspetto la prima mossa.", lastAction: null,
    lastValues: [0, 0, 0, 0], lastLegal: [], finishReason: null,
  };
  prepareRound(game);
  return game;
}

export function prepareRound(game: Game) {
  const cells = Array.from({ length: COLS * ROWS }, (_, cell) => cell);
  game.player = pick(cells.filter(cell => game.maze.neighbors[cell].length >= 2));
  const distances = distancesFrom(game.maze, game.player);
  game.ghost = pick(cells.filter(cell => distances[cell] >= 16 && distances[cell] <= 24));
  game.playerFrom = game.player;
  game.ghostFrom = game.ghost;
  game.playerDirection = directionBetween(game.player, game.maze.neighbors[game.player][0]);
  game.requestedDirection = game.playerDirection;
  game.ghostDirection = directionBetween(game.ghost, game.maze.neighbors[game.ghost][0]);
  const available = cells.filter(cell => cell !== game.player && cell !== game.ghost && distances[cell] > 3);
  const sparks = new Set<number>();
  while (sparks.size < SPARKS && available.length) {
    const index = Math.floor(Math.random() * available.length);
    sparks.add(available.splice(index, 1)[0]);
  }
  game.sparks = sparks;
  game.collected = 0;
  game.elapsedMs = 0;
  game.accumulatorMs = 0;
  game.status = "ready";
  game.lastExploration = null;
  game.lastReward = 0;
  game.lastReason = "Aspetto la prima mossa.";
  game.lastAction = null;
  game.lastValues = [0, 0, 0, 0];
  game.lastLegal = [];
  game.finishReason = null;
}

export function startRound(game: Game) {
  if (game.status === "caught" || game.status === "escaped") prepareRound(game);
  game.status = "playing";
}

export function pauseGame(game: Game) { if (game.status === "playing") game.status = "paused"; }

function stepTurn(game: Game) {
  const model = game.learner;
  const key = stateKey(game);
  const row = rowAt(model, key);
  const options = optionsAt(game.maze, game.ghost);
  const hasExperience = options.some(option => Math.abs(row[option.action]) > .00001);
  const exploring = !hasExperience || Math.random() < explorationRate(model.moves);
  const best = Math.max(...options.map(option => row[option.action]));
  const chosen = pick(exploring ? options : options.filter(option => Math.abs(row[option.action] - best) < .00001));

  game.playerFrom = game.player;
  game.ghostFrom = game.ghost;
  const playerOptions = optionsAt(game.maze, game.player);
  const playerMove = playerOptions.find(option => option.action === game.requestedDirection)
    ?? playerOptions.find(option => option.action === game.playerDirection);
  if (playerMove) { game.player = playerMove.next; game.playerDirection = playerMove.action; }
  if (game.sparks.delete(game.player)) game.collected++;

  const distances = distancesFrom(game.maze, game.player);
  const improved = distances[chosen.next] < distances[game.ghost];
  game.ghost = chosen.next;
  const reversed = chosen.action === (game.ghostDirection + 2) % 4;
  game.ghostDirection = chosen.action;
  game.elapsedMs += TURN_MS;

  const caught = game.ghost === game.player || (game.ghost === game.playerFrom && game.player === game.ghostFrom);
  const escaped = !caught && (game.elapsedMs >= ROUND_MS || !game.sparks.size);
  const terminal = caught || escaped;
  const reward = caught ? 25 : escaped ? -3 : (improved ? 1 : -.8) - (reversed ? .12 : 0);
  let nextBest = 0;
  if (!terminal) {
    const nextRow = rowAt(model, stateKey(game));
    nextBest = Math.max(...optionsAt(game.maze, game.ghost).map(option => nextRow[option.action]));
  }
  // Terminal transitions have no bootstrap value.
  row[chosen.action] += ALPHA * (reward + GAMMA * nextBest - row[chosen.action]);
  model.moves++;
  model.recent.push(improved || caught);
  if (model.recent.length > 240) model.recent.shift();
  if (model.moves % 40 === 0) {
    const sample = model.recent.slice(-40);
    model.history.push({ moves: model.moves, approach: Math.round(sample.filter(Boolean).length / sample.length * 100) });
    if (model.history.length > 48) model.history.shift();
  }
  game.lastExploration = exploring;
  game.lastReward = reward;
  game.lastAction = chosen.action;
  game.lastValues = [...row];
  game.lastLegal = options.map(option => option.action);
  game.lastReason = caught ? "Ti ho preso!" : escaped ? "Questa volta mi sei sfuggito." : improved ? "Mi sono avvicinato nei corridoi." : "Mi sono allontanato. Prendo nota.";
  if (terminal) {
    game.status = caught ? "caught" : "escaped";
    game.finishReason = caught ? null : game.sparks.size ? "time" : "sparks";
    if (caught) model.captures++; else model.escapes++;
    model.bestMs = Math.max(model.bestMs, Math.min(ROUND_MS, game.elapsedMs));
  }
}

export function advanceGame(game: Game, delta: number) {
  if (game.status !== "playing") return false;
  game.accumulatorMs += Math.min(200, Math.max(0, delta));
  let changed = false;
  while (game.accumulatorMs >= TURN_MS && game.status === "playing") {
    game.accumulatorMs -= TURN_MS;
    stepTurn(game);
    changed = true;
  }
  if (game.status !== "playing") game.accumulatorMs = TURN_MS;
  return changed;
}

const boundedCount = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1_000_000_000, Math.floor(value))) : 0;

export function restoreLearner(serialized: string | null): Learner | null {
  if (!serialized || serialized.length > 1_500_000) return null;
  try {
    const value = JSON.parse(serialized);
    if (!value || value.version !== 1 || !value.model || typeof value.model.q !== "object" || !value.model.q || Array.isArray(value.model.q)) return null;
    const source = value.model;
    const model = emptyLearner();
    for (const [key, row] of Object.entries(source.q).slice(0, 1800)) {
      if (!/^\d{1,4}$/.test(key) || Number(key) > 1727 || !Array.isArray(row) || row.length !== 4 || !row.every(item => typeof item === "number" && Number.isFinite(item) && Math.abs(item) < 1000)) continue;
      model.q[key] = row as QRow;
      model.states++;
    }
    model.moves = boundedCount(source.moves);
    model.captures = boundedCount(source.captures);
    model.escapes = boundedCount(source.escapes);
    model.bestMs = Math.min(ROUND_MS, boundedCount(source.bestMs));
    model.recent = Array.isArray(source.recent) ? source.recent.filter((item: unknown) => typeof item === "boolean").slice(-240) : [];
    model.history = Array.isArray(source.history) ? source.history.filter((item: HistoryPoint) => item && Number.isFinite(item.moves) && item.moves >= 0 && item.moves <= model.moves && Number.isFinite(item.approach) && item.approach >= 0 && item.approach <= 100).slice(-48).map((item: HistoryPoint) => ({ moves: Math.floor(item.moves), approach: item.approach })) : [];
    return model;
  } catch { return null; }
}

export function serializeLearner(model: Learner) { return JSON.stringify({ version: 1, model }); }

export function snapshot(game: Game) {
  const model = game.learner;
  return {
    status: game.status, moves: model.moves, states: model.states, captures: model.captures, escapes: model.escapes,
    bestMs: model.bestMs, collected: game.collected, elapsedMs: Math.min(ROUND_MS, game.elapsedMs),
    epsilon: explorationRate(model.moves), level: levelFor(model.moves), history: [...model.history],
    approach: model.recent.length ? Math.round(model.recent.filter(Boolean).length / model.recent.length * 100) : null,
    lastReward: game.lastReward, lastExploration: game.lastExploration, lastReason: game.lastReason,
    lastAction: game.lastAction, lastValues: [...game.lastValues] as QRow, lastLegal: [...game.lastLegal], finishReason: game.finishReason,
  };
}

export type GameSnapshot = ReturnType<typeof snapshot>;
