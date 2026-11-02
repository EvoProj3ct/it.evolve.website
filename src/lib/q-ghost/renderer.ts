import { COLS, ROWS, TURN_MS, type Game } from "./engine";

let ghostPath: Path2D | null = null;
const BODY = "M-4-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H-3V6H-6V8H-10V-4H-8V-6H-6V-8H-4Z";

function position(from: number, to: number, t: number) {
  return { x: from % COLS + .5 + (to % COLS - from % COLS) * t, y: Math.floor(from / COLS) + .5 + (Math.floor(to / COLS) - Math.floor(from / COLS)) * t };
}

export function drawGame(context: CanvasRenderingContext2D, game: Game, width: number, height: number, reducedMotion: boolean) {
  const cell = Math.min((width - 18) / COLS, (height - 18) / ROWS);
  if (cell <= 0) return;
  const left = (width - COLS * cell) / 2;
  const top = (height - ROWS * cell) / 2;
  const gradient = context.createRadialGradient(width * .6, height * .35, 0, width * .5, height * .5, width * .8);
  gradient.addColorStop(0, "#102219");
  gradient.addColorStop(1, "#07100a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(left, top);
  context.strokeStyle = "rgba(114, 201, 79, .46)";
  context.lineWidth = Math.max(.85, cell * .045);
  context.lineCap = "square";
  context.beginPath();
  game.maze.walls.forEach(([x1, y1, x2, y2]) => { context.moveTo(x1 * cell, y1 * cell); context.lineTo(x2 * cell, y2 * cell); });
  context.stroke();
  context.fillStyle = "#cde8d1";
  context.shadowColor = "#a7de74";
  context.shadowBlur = 7;
  game.sparks.forEach(spark => {
    const x = (spark % COLS + .5) * cell;
    const y = (Math.floor(spark / COLS) + .5) * cell;
    const radius = Math.max(1.8, cell * .105);
    context.beginPath();
    context.moveTo(x, y - radius * 1.5);
    context.lineTo(x + radius, y);
    context.lineTo(x, y + radius * 1.5);
    context.lineTo(x - radius, y);
    context.closePath();
    context.fill();
  });
  context.shadowBlur = 0;

  const t = reducedMotion ? 1 : Math.min(1, game.accumulatorMs / TURN_MS);
  const player = position(game.playerFrom, game.player, t);
  const ghost = position(game.ghostFrom, game.ghost, t);
  const rotation = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][game.playerDirection];
  const mouth = reducedMotion || game.status !== "playing" ? .18 : .13 + Math.abs(Math.sin((game.elapsedMs + game.accumulatorMs) / 85)) * .25;
  context.save();
  context.translate(player.x * cell, player.y * cell);
  context.rotate(rotation);
  context.fillStyle = "#fcfdfb";
  context.beginPath();
  context.moveTo(0, 0);
  context.arc(0, 0, cell * .32, mouth, Math.PI * 2 - mouth);
  context.closePath();
  context.fill();
  context.restore();

  if (!ghostPath) ghostPath = new Path2D(BODY);
  context.save();
  context.translate(ghost.x * cell, ghost.y * cell);
  context.scale(cell * .037, cell * .037);
  context.fillStyle = game.status === "caught" ? "#ff8880" : "#72c94f";
  context.shadowColor = "#72c94f";
  context.shadowBlur = 9;
  context.fill(ghostPath);
  context.shadowBlur = 0;
  context.fillStyle = "#fcfdfb";
  context.fillRect(-6, -2, 4, 5);
  context.fillRect(2, -2, 4, 5);
  const gazeX = Math.sign(player.x - ghost.x) * .8;
  const gazeY = Math.sign(player.y - ghost.y) * .6;
  context.fillStyle = "#15221a";
  context.fillRect(-5 + gazeX, -.5 + gazeY, 2, 2);
  context.fillRect(3 + gazeX, -.5 + gazeY, 2, 2);
  context.restore();
  context.restore();
}
