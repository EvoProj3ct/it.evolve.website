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
  vx: number;
  vy: number;
  turn: number;
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function makePiece(x: number, y: number, size: number, random = Math.random): Piece {
  return {
    x, y,
    width: size * (.82 + random() * .38),
    angle: (random() - .5) * (random() < .28 ? Math.PI * 2 : 3.8),
    color: Math.floor(random() * colors.length),
    vx: 0, vy: 0, turn: 0,
  };
}

function arrange(width: number, height: number, size: number, upper: boolean) {
  const pieces: Piece[] = [];
  const spacingX = size * (upper ? .61 : .43);
  const spacingY = size * (upper ? .47 : .35);
  const jitter = upper ? .85 : .66;
  let seed = upper ? 138 : 37;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let row = 0; row * spacingY < height; row++) {
    for (let column = -1; column * spacingX < width + spacingX; column++) {
      const offset = (row % 2 ? .45 : 0) + (upper ? .3 : 0);
      const x = (column + offset + (random() - .5) * jitter) * spacingX;
      const y = (row + (upper ? .42 : 0) + (random() - .5) * jitter) * spacingY;
      const top = size * (.56 + .13 * Math.sin(x / (size * 2.3)));
      const bottom = height - size * (.58 + .13 * Math.cos(x / (size * 1.8)));
      if (y >= top && y <= bottom) pieces.push(makePiece(x, y, size, random));
    }
  }
  return pieces;
}

export async function drawLinkerCarpet(surface: HTMLButtonElement, canvas: HTMLCanvasElement, signal: AbortSignal) {
  const marks = await loadMarks(signal);
  if (signal.aborted) return;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D drawing unavailable");
  const paint = context;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const moving = new Set<Piece>();
  let width = 0, height = 0, size = 0, pixels = 1;
  let pieces: Piece[] = [];
  let capacity = 0;
  let visible = true;
  let frame = 0;
  let lastFrame = 0;
  let gesture: { id: number; x: number; y: number; moved: boolean } | undefined;

  function mark(piece: Piece) {
    const angleCos = Math.cos(piece.angle) * pixels;
    const angleSin = Math.sin(piece.angle) * pixels;
    paint.setTransform(angleCos, angleSin, -angleSin, angleCos, piece.x * pixels, piece.y * pixels);
    const imageHeight = piece.width * spriteRatio;
    // Center the tag itself so the chain and ring extend beyond its pivot.
    paint.drawImage(marks[piece.color], -piece.width * .38, -imageHeight * .53, piece.width, imageHeight);
  }

  function queueFrame() {
    if (!frame && visible && !document.hidden && !signal.aborted) frame = requestAnimationFrame(draw);
  }

  function keepInside(piece: Piece) {
    const xMargin = piece.width * .24;
    const yMargin = piece.width * .48;
    piece.x = clamp(piece.x, -xMargin, width + xMargin);
    piece.y = clamp(piece.y, yMargin, height - yMargin);
  }

  function draw(time: number) {
    frame = 0;
    if (signal.aborted || !visible || document.hidden || !width || !height) { lastFrame = 0; return; }
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .033) : 1 / 60;
    const friction = Math.exp(-12 * dt);
    for (const piece of moving) {
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += piece.turn * dt;
      piece.vx *= friction;
      piece.vy *= friction;
      piece.turn *= friction;
      keepInside(piece);
      if (Math.abs(piece.vx) + Math.abs(piece.vy) < 3 && Math.abs(piece.turn) < .04) {
        moving.delete(piece);
        piece.vx = piece.vy = piece.turn = 0;
      }
    }

    paint.setTransform(1, 0, 0, 1, 0, 0);
    paint.clearRect(0, 0, canvas.width, canvas.height);
    for (const piece of pieces) mark(piece);
    lastFrame = moving.size ? time : 0;
    if (moving.size) queueFrame();
  }

  function resize() {
    if (signal.aborted) return;
    const bounds = surface.getBoundingClientRect();
    const newWidth = bounds.width, newHeight = bounds.height;
    if (!newWidth || !newHeight || (width === newWidth && height === newHeight)) return;
    width = newWidth;
    height = newHeight;
    pixels = Math.min(window.devicePixelRatio || 1, 1.65);
    canvas.width = Math.round(width * pixels);
    canvas.height = Math.round(height * pixels);
    size = clamp(width * .06, 54, 92);
    pieces = [...arrange(width, height, size, false), ...arrange(width, height, size, true)];
    capacity = pieces.length + Math.max(36, Math.ceil(pieces.length * .2));
    moving.clear();
    const initialLimit = pieces.length + Math.ceil(pieces.length * .07);
    const spacing = size * .32;
    for (let y = size * .72; y < height - size * .72 && pieces.length < initialLimit; y += spacing) {
      for (let x = 0; x <= width && pieces.length < initialLimit; x += spacing) fillGap(x, y);
    }
    queueFrame();
  }

  // Reuse an obscured tag once the reserve is full.
  function reuseBuriedPiece(x: number, y: number) {
    const overlap = size * .34;
    for (let index = 0; index < pieces.length / 2; index += 3) {
      const buried = pieces[index];
      if (moving.has(buried) || Math.hypot(buried.x - x, buried.y - y) < size * 2) continue;
      let covers = 0;
      for (let above = index + 1; above < pieces.length; above++) {
        const other = pieces[above];
        if (Math.hypot(buried.x - other.x, buried.y - other.y) < overlap) covers++;
        if (covers >= 3) return pieces.splice(index, 1)[0];
      }
    }
  }

  function fillGap(x: number, y: number) {
    if (x < 0 || x > width || y < size * .55 || y > height - size * .55) return;
    const covered = pieces.some(piece => {
      const dx = x - piece.x, dy = y - piece.y;
      if (Math.abs(dx) > piece.width * .38 || Math.abs(dy) > piece.width * .38) return false;
      const angle = piece.angle - Math.PI / 20;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      return Math.abs(dx * cos + dy * sin) < piece.width * .28 && Math.abs(dy * cos - dx * sin) < piece.width * .195;
    });
    if (covered) return;
    const full = pieces.length >= capacity;
    const buried = full ? reuseBuriedPiece(x, y) : undefined;
    if (full && !buried) return;
    const piece = makePiece(x + (Math.random() - .5) * size * .13, y + (Math.random() - .5) * size * .13, size);
    pieces.unshift(buried ? Object.assign(buried, piece) : piece);
  }

  function sweep(fromX: number, fromY: number, toX: number, toY: number) {
    const dx = toX - fromX, dy = toY - fromY;
    const distance = Math.hypot(dx, dy);
    if (distance < 2) return;
    const forwardX = dx / distance, forwardY = dy / distance;
    const sideX = -forwardY, sideY = forwardX;
    const steps = Math.min(14, Math.ceil(distance / (size * .27)));
    const travel = Math.min(distance / steps, size * .36);
    const radius = size * .92;
    const coasts = !motion.matches;

    for (let step = 1; step <= steps; step++) {
      const x = fromX + dx * step / steps;
      const y = fromY + dy * step / steps;
      for (const piece of pieces) {
        const offsetX = piece.x - x, offsetY = piece.y - y;
        const along = offsetX * forwardX + offsetY * forwardY;
        const across = offsetX * sideX + offsetY * sideY;
        const reach = Math.hypot(along * 1.24, across);
        if (reach >= radius || along < -radius * .32) continue;

        // The leading edge sweeps each tag sideways at its current position.
        const spread = across < 0 ? -1 : 1;
        const weight = (1 - reach / radius) * travel;
        const pushX = (forwardX * .72 + sideX * spread * .85) * weight;
        const pushY = (forwardY * .72 + sideY * spread * .85) * weight;
        piece.x += pushX;
        piece.y += pushY;
        piece.angle += spread * weight * .008;
        keepInside(piece);
        if (coasts) {
          piece.vx = clamp(piece.vx * .55 + pushX * 9, -250, 250);
          piece.vy = clamp(piece.vy * .55 + pushY * 9, -250, 250);
          piece.turn = clamp(piece.turn * .55 + spread * weight * .032, -2, 2);
          moving.add(piece);
        }
      }
      const behindX = x - forwardX * size * .43;
      const behindY = y - forwardY * size * .43;
      fillGap(behindX, behindY);
      fillGap(behindX + sideX * size * .29, behindY + sideY * size * .29);
      fillGap(behindX - sideX * size * .29, behindY - sideY * size * .29);
    }
    queueFrame();
  }

  function tap(x: number, y: number) {
    sweep(x - size * .31, y, x + size * .26, y - size * .11);
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
    gesture = { id: event.pointerId, x, y, moved: false };
    surface.setPointerCapture(event.pointerId);
    surface.dataset.pushing = "true";
  }, { signal });

  surface.addEventListener("pointermove", event => {
    if (!event.isPrimary || (event.pointerType === "touch" && gesture?.id !== event.pointerId)) return;
    const { x, y } = hand(event);
    if (gesture?.id !== event.pointerId) return;
    const dx = x - gesture.x, dy = y - gesture.y;
    if (Math.hypot(dx, dy) < 3 || (!gesture.moved && event.pointerType === "touch" && Math.abs(dx) < 6)) return;
    sweep(gesture.x, gesture.y, x, y);
    gesture.x = x;
    gesture.y = y;
    gesture.moved = true;
  }, { signal });

  function release(event: PointerEvent) {
    if (gesture?.id !== event.pointerId) return;
    if (event.type === "pointerup" && !gesture.moved) tap(gesture.x, gesture.y);
    gesture = undefined;
    delete surface.dataset.pushing;
    if (event.pointerType !== "mouse" || !surface.matches(":hover")) delete surface.dataset.hand;
  }

  surface.addEventListener("pointerup", release, { signal });
  surface.addEventListener("pointercancel", release, { signal });
  surface.addEventListener("lostpointercapture", release, { signal });
  surface.addEventListener("pointerleave", () => { if (!gesture) delete surface.dataset.hand; }, { signal });
  surface.addEventListener("click", event => {
    if (event.detail === 0 && !gesture) tap(width / 2, height / 2);
  }, { signal });
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
