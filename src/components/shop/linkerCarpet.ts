import { SHOP_COLORS } from "./products";

const markUrl = "/shop/brand/e-linker.svg";
const spriteRatio = 352 / 474;
const colors = SHOP_COLORS.map(({ hex }) => hex);

function mixColor(color: string, target: string, weight: number) {
  return `#${[1, 3, 5].map(index => {
    const first = parseInt(color.slice(index, index + 2), 16);
    const second = parseInt(target.slice(index, index + 2), 16);
    return Math.round(first + (second - first) * weight).toString(16).padStart(2, "0");
  }).join("")}`;
}

async function loadMarks(signal: AbortSignal) {
  const response = await fetch(markUrl, { signal });
  if (!response.ok) throw new Error("e-linker mark unavailable");
  const original = await response.text();

  return Promise.all(colors.map(async color => {
    const face = mixColor(color, "#fcfdfb", .08);
    const edge = mixColor(face, "#1a2d25", .24);
    const rgb = parseInt(face.slice(1), 16);
    const light = (rgb >> 16) * .299 + ((rgb >> 8) & 255) * .587 + (rgb & 255) * .114;
    const ink = light < 145 ? "#fcfdfb" : "#20362e";
    const accent = mixColor(ink, face, .3);
    const source = original
      .replace("<svg ", '<svg width="474" height="352" ')
      .replace('fill="#E9F0ED"', `fill="${face}"`)
      .replaceAll('fill="#829BA3"', `fill="${edge}"`)
      .replace('fill="#263C42"', `fill="${ink}"`)
      .replaceAll("#72C94F", accent)
      .replace("#A5BAB3", accent);

    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    await image.decode();

    const sprite = document.createElement("canvas");
    sprite.width = 280;
    sprite.height = Math.round(sprite.width * spriteRatio);
    const paint = sprite.getContext("2d");
    if (!paint) throw new Error("2D drawing unavailable");
    paint.shadowColor = "#24312726";
    paint.shadowBlur = 8;
    paint.shadowOffsetY = 4;
    paint.drawImage(image, 8, 5, sprite.width - 16, (sprite.width - 16) * spriteRatio);
    return sprite;
  }));
}

type Piece = {
  x: number;
  y: number;
  width: number;
  angle: number;
  color: number;
  layer: number;
  opacity: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  spin: number;
};

function arrange(width: number, height: number, size: number, layer: number) {
  const pieces: Piece[] = [];
  const stepX = size * [.64, .74, .93][layer];
  const stepY = size * [.48, .53, .67][layer];
  let seed = 37 + layer * 101;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let row = -1; row <= Math.ceil(height / stepY) + 1; row++) {
    for (let x = -stepX; x <= width + stepX; x += stepX) {
      const centerX = x + (Math.abs(row) % 2 ? stepX * .43 : 0) + stepX * (random() - .5) * .84;
      const centerY = row * stepY + stepY * (random() - .5) * .9;
      const topFringe = Math.sin(centerX / (size * 1.9) + layer) * size * .25;
      const bottomFringe = Math.cos(centerX / (size * 1.6) + layer) * size * .24;
      const distanceFromEdge = Math.min(centerY - topFringe, height - centerY - bottomFringe);
      const opacity = Math.max(0, Math.min(1, (distanceFromEdge - size * .31) / (size * .45)));
      if (opacity < .04) continue;
      pieces.push({
        x: centerX,
        y: centerY,
        width: size * (.82 + random() * .39),
        angle: (random() - .5) * (random() < .25 ? 6.12 : 3.8),
        color: Math.floor(random() * colors.length),
        layer, opacity, dx: 0, dy: 0, vx: 0, vy: 0, spin: 0,
      });
    }
  }
  return pieces;
}

export async function drawLinkerCarpet(surface: HTMLButtonElement, canvas: HTMLCanvasElement, signal: AbortSignal) {
  const marks = await loadMarks(signal);
  if (signal.aborted) return;
  const backdrop = document.createElement("canvas");
  const backdropContext = backdrop.getContext("2d");
  const canvasContext = canvas.getContext("2d");
  if (!backdropContext || !canvasContext) throw new Error("2D drawing unavailable");
  const base = backdropContext;
  const paint = canvasContext;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0, height = 0, size = 0;
  let pieces: Piece[] = [];
  let visible = true;
  let frame = 0;
  let lastFrame = 0;
  let gesture: { id: number; x: number; y: number; started: boolean } | undefined;

  function mark(context: CanvasRenderingContext2D, piece: Piece) {
    context.save();
    context.globalAlpha *= piece.opacity;
    context.translate(piece.x + piece.dx, piece.y + piece.dy);
    context.rotate(piece.angle + piece.spin);
    const height = piece.width * spriteRatio;
    context.drawImage(marks[piece.color], -piece.width / 2, -height / 2, piece.width, height);
    context.restore();
  }

  function queueFrame() {
    if (!frame && visible && !document.hidden && !signal.aborted) frame = requestAnimationFrame(draw);
  }

  function draw(time: number) {
    frame = 0;
    if (signal.aborted || !visible || document.hidden || !width || !height) { lastFrame = 0; return; }
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .025) : 1 / 60;
    const damping = Math.exp(-8.8 * dt);
    const spinDamping = Math.exp(-3.5 * dt);
    const animate = !motion.matches;
    let moving = false;
    paint.clearRect(0, 0, width, height);
    paint.globalAlpha = 1;
    paint.drawImage(backdrop, 0, 0, width, height);
    for (const piece of pieces) {
      if (animate) {
        piece.vx = (piece.vx - piece.dx * 17 * dt) * damping;
        piece.vy = (piece.vy - piece.dy * 17 * dt) * damping;
        piece.dx += piece.vx * dt;
        piece.dy += piece.vy * dt;
        piece.spin *= spinDamping;
        moving ||= Math.abs(piece.dx) + Math.abs(piece.dy) + Math.abs(piece.vx) + Math.abs(piece.vy) > 1 || Math.abs(piece.spin) > .006;
      }
      paint.globalAlpha = piece.layer === 1 ? .9 : 1;
      mark(paint, piece);
    }
    lastFrame = moving ? time : 0;
    if (moving) queueFrame();
  }

  function resize() {
    if (signal.aborted) return;
    const bounds = surface.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65);
    canvas.width = backdrop.width = Math.round(width * pixelRatio);
    canvas.height = backdrop.height = Math.round(height * pixelRatio);
    paint.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    base.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    size = Math.max(78, Math.min(124, width * .102));
    base.globalAlpha = .66;
    for (const piece of arrange(width, height, size, 0)) mark(base, piece);
    pieces = [...arrange(width, height, size, 1), ...arrange(width, height, size, 2)];
    queueFrame();
  }

  function stir(x: number, y: number, dx = 0, dy = 0) {
    const radius = size * 1.8;
    for (const piece of pieces) {
      const awayX = piece.x + piece.dx - x;
      const awayY = piece.y + piece.dy - y;
      const distance = Math.hypot(awayX, awayY);
      if (distance >= radius) continue;
      const falloff = 1 - distance / radius;
      const strength = falloff * (piece.layer === 2 ? 1 : .53);
      const spread = radius * 3.35 / Math.max(12, distance);
      const pushX = (awayX * spread + dx * 9) * strength;
      const pushY = (awayY * spread + dy * 9) * strength;
      piece.spin = Math.max(-.65, Math.min(.65, piece.spin + (awayX > 0 ? .39 : -.39) * strength));
      if (motion.matches) {
        piece.dx = pushX * .07;
        piece.dy = pushY * .07;
      } else {
        piece.vx = Math.max(-810, Math.min(810, piece.vx + pushX));
        piece.vy = Math.max(-810, Math.min(810, piece.vy + pushY));
      }
    }
    queueFrame();
  }

  function hand(event: PointerEvent) {
    const bounds = surface.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    surface.style.setProperty("--hand-x", `${x}px`);
    surface.style.setProperty("--hand-y", `${y}px`);
    surface.dataset.hand = "true";
    return { x, y };
  }

  surface.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    const { x, y } = hand(event);
    gesture = { id: event.pointerId, x, y, started: event.pointerType !== "touch" };
    surface.setPointerCapture(event.pointerId);
    surface.dataset.grabbing = "true";
    if (gesture.started) stir(x, y);
  }, { signal });

  surface.addEventListener("pointermove", event => {
    if (!event.isPrimary || (event.pointerType === "touch" && gesture?.id !== event.pointerId)) return;
    const { x, y } = hand(event);
    if (gesture?.id !== event.pointerId) return;
    const dx = x - gesture.x, dy = y - gesture.y;
    if (Math.hypot(dx, dy) < 3 || (!gesture.started && Math.abs(dx) < 6)) return;
    gesture.x = x;
    gesture.y = y;
    gesture.started = true;
    stir(x, y, dx, dy);
  }, { signal });

  function release(event: PointerEvent) {
    if (gesture?.id !== event.pointerId) return;
    if (event.type === "pointerup" && !gesture.started) stir(gesture.x, gesture.y);
    gesture = undefined;
    delete surface.dataset.grabbing;
    if (event.pointerType !== "mouse" || !surface.matches(":hover")) delete surface.dataset.hand;
  }

  surface.addEventListener("pointerup", release, { signal });
  surface.addEventListener("pointercancel", release, { signal });
  surface.addEventListener("lostpointercapture", release, { signal });
  surface.addEventListener("pointerleave", () => { if (!gesture) delete surface.dataset.hand; }, { signal });
  surface.addEventListener("click", event => { if (event.detail === 0) stir(width / 2, height / 2); }, { signal });
  document.addEventListener("visibilitychange", queueFrame, { signal });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) queueFrame();
  });
  observer.observe(surface);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(surface);
  resize();

  return () => {
    observer.disconnect();
    resizeObserver.disconnect();
    cancelAnimationFrame(frame);
  };
}
