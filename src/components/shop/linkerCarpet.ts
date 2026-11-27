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
  lift: number;
  fall: number;
};

type ScoopedPiece = { piece: Piece; offsetX: number; offsetY: number; angle: number };
type Scoop = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  lastMove: number;
  collectedAtX: number;
  collectedAtY: number;
  pieces: ScoopedPiece[];
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const maxHandful = 12;

function makePiece(x: number, y: number, size: number, random = Math.random): Piece {
  return {
    x, y,
    width: size * (.82 + random() * .38),
    angle: (random() - .5) * (random() < .28 ? Math.PI * 2 : 3.8),
    color: Math.floor(random() * colors.length),
    vx: 0, vy: 0, turn: 0, lift: 0, fall: 0,
  };
}

function arrange(width: number, height: number, size: number, layer: number) {
  const pieces: Piece[] = [];
  const spacingX = size * (layer === 0 ? .58 : .67);
  const spacingY = size * (layer === 0 ? .43 : .49);
  let seed = 37 + layer * 101;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let row = 0; row * spacingY < height; row++) {
    for (let column = -1; column * spacingX < width + spacingX; column++) {
      const x = (column + (row % 2 ? .45 : 0) + layer * .3 + (random() - .5) * .83) * spacingX;
      const y = (row + layer * .42 + (random() - .5) * .94) * spacingY;
      const top = size * (.57 + .21 * Math.sin(x / (size * 2.3) + layer));
      const bottom = height - size * (.62 + .22 * Math.cos(x / (size * 1.8) + layer));
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
  let handful: Scoop | undefined;
  let gesture: { id: number; x: number; y: number } | undefined;

  function mark(piece: Piece) {
    const angleCos = Math.cos(piece.angle);
    const angleSin = Math.sin(piece.angle);
    const scale = pixels * (1 + piece.lift * .006);
    paint.setTransform(
      angleCos * scale, angleSin * scale, -angleSin * scale, angleCos * scale,
      piece.x * pixels, (piece.y - piece.lift) * pixels,
    );
    const imageHeight = piece.width * spriteRatio;
    paint.drawImage(marks[piece.color], -piece.width / 2, -imageHeight / 2, piece.width, imageHeight);
  }

  function queueFrame() {
    if (!frame && visible && !document.hidden && !signal.aborted) frame = requestAnimationFrame(draw);
  }

  function landInside(piece: Piece) {
    const edge = piece.width * .52;
    piece.x = clamp(piece.x, -edge * .28, width + edge * .28);
    piece.y = clamp(piece.y, edge, height - edge);
  }

  function followScoop(scoop: Scoop, step: number) {
    scoop.x += (scoop.targetX - scoop.x) * step;
    scoop.y += (scoop.targetY - scoop.y) * step;
    let settling = Math.abs(scoop.targetX - scoop.x) + Math.abs(scoop.targetY - scoop.y) > .25;
    for (const { piece, offsetX, offsetY, angle } of scoop.pieces) {
      const lift = motion.matches ? 0 : clamp(size * .22, 12, 21);
      piece.lift += (lift - piece.lift) * step;
      const squeeze = motion.matches ? .65 : 1 - .38 * (piece.lift / lift);
      piece.x = scoop.x + offsetX * squeeze;
      piece.y = scoop.y + offsetY * squeeze;
      piece.angle = angle + clamp(scoop.targetX - scoop.x, -45, 45) * .004;
      settling ||= Math.abs(lift - piece.lift) > .18;
    }
    return settling;
  }

  function draw(time: number) {
    frame = 0;
    if (signal.aborted || !visible || document.hidden || !width || !height) { lastFrame = 0; return; }
    const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .033) : 1 / 60;
    const damping = Math.exp(-8 * dt);
    for (const piece of moving) {
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += piece.turn * dt;
      if (piece.lift > 0) {
        piece.fall += 720 * dt;
        piece.lift = Math.max(0, piece.lift - piece.fall * dt);
        if (piece.lift === 0) nudgeNeighbors(piece.x, piece.y, 48, size * .57, piece);
      }
      piece.vx *= damping;
      piece.vy *= damping;
      piece.turn *= damping;
      landInside(piece);
      if (!piece.lift && Math.abs(piece.vx) + Math.abs(piece.vy) < 3 && Math.abs(piece.turn) < .045) {
        moving.delete(piece);
        piece.vx = piece.vy = piece.turn = piece.fall = 0;
      }
    }
    const following = handful && followScoop(handful, motion.matches ? 1 : 1 - Math.exp(-26 * dt));

    paint.setTransform(1, 0, 0, 1, 0, 0);
    paint.clearRect(0, 0, canvas.width, canvas.height);
    for (const piece of pieces) mark(piece);
    if (handful) for (const { piece } of handful.pieces) mark(piece);
    const active = Boolean(following || moving.size);
    lastFrame = active ? time : 0;
    if (active) queueFrame();
  }

  function resize() {
    if (signal.aborted) return;
    const bounds = surface.getBoundingClientRect();
    const newWidth = bounds.width, newHeight = bounds.height;
    if (!newWidth || !newHeight || (width === newWidth && height === newHeight)) return;
    if (handful) drop();
    width = newWidth;
    height = newHeight;
    pixels = Math.min(window.devicePixelRatio || 1, 1.65);
    canvas.width = Math.round(width * pixels);
    canvas.height = Math.round(height * pixels);
    size = clamp(width * .06, 54, 92);
    pieces = [...arrange(width, height, size, 0), ...arrange(width, height, size, 1)];
    capacity = pieces.length + Math.max(36, Math.ceil(pieces.length * .25));
    moving.clear();
    queueFrame();
  }

  function impulse(piece: Piece, vx: number, vy: number, turn: number) {
    if (motion.matches) {
      piece.x += vx * .065;
      piece.y += vy * .065;
      piece.angle += turn * .1;
      landInside(piece);
      return;
    }
    piece.vx = clamp(piece.vx + vx, -720, 720);
    piece.vy = clamp(piece.vy + vy, -720, 720);
    piece.turn = clamp(piece.turn + turn, -6, 6);
    moving.add(piece);
  }

  function nudgeNeighbors(x: number, y: number, strength: number, radius = size * 1.12, source?: Piece) {
    for (const piece of pieces) {
      if (piece === source || piece.lift > 0) continue;
      const dx = piece.x - x, dy = piece.y - y;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;
      const push = (1 - distance / radius) * strength;
      const direction = Math.max(distance, 10);
      impulse(piece, dx / direction * push, dy / direction * push, dx / direction * push * .008);
    }
  }

  // Keep a bounded reserve by reusing covered pieces when a handful opens a gap.
  function reuseBuriedPiece(x: number, y: number) {
    const overlap = size * .34;
    for (let index = 0; index < pieces.length / 2; index += 2) {
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

  function uncover(removed: Piece[]) {
    for (const piece of removed) {
      const near = pieces.filter(other => Math.hypot(other.x - piece.x, other.y - piece.y) < size * .45);
      if (near.length >= 3) continue;
      const count = pieces.length + (handful?.pieces.length ?? 0);
      const reused = count >= capacity ? reuseBuriedPiece(piece.x, piece.y) : undefined;
      if (count >= capacity && !reused) continue;
      const newPiece = makePiece(piece.x + (Math.random() - .5) * size * .44, piece.y + (Math.random() - .5) * size * .44, size);
      const revealed = reused ? Object.assign(reused, newPiece) : newPiece;
      landInside(revealed);
      pieces.unshift(revealed);
    }
  }

  function collect(scoop: Scoop, x: number, y: number, count: number, radius: number) {
    const collected: Piece[] = [];
    for (let index = pieces.length - 1; index >= 0 && collected.length < count; index--) {
      const piece = pieces[index];
      if (Math.hypot(piece.x - x, piece.y - y) > radius) continue;
      pieces.splice(index, 1);
      moving.delete(piece);
      piece.vx = piece.vy = piece.turn = piece.fall = 0;
      collected.push(piece);
    }
    for (const piece of collected.reverse()) {
      scoop.pieces.push({ piece, offsetX: piece.x - x, offsetY: piece.y - y, angle: piece.angle });
    }
    uncover(collected);
  }

  function scoopAt(x: number, y: number) {
    handful = { x, y, targetX: x, targetY: y, vx: 0, vy: 0, lastMove: 0, collectedAtX: x, collectedAtY: y, pieces: [] };
    collect(handful, x, y, 6, size * .73);
    nudgeNeighbors(x, y, 90);
    surface.dataset.grabbing = "true";
    queueFrame();
  }

  function moveScoop(x: number, y: number) {
    if (!handful) return;
    const time = performance.now();
    const elapsed = handful.lastMove ? clamp(time - handful.lastMove, 10, 100) : 30;
    handful.vx = (x - handful.targetX) * 1000 / elapsed;
    handful.vy = (y - handful.targetY) * 1000 / elapsed;
    handful.targetX = x;
    handful.targetY = y;
    handful.lastMove = time;
    if (Math.hypot(x - handful.collectedAtX, y - handful.collectedAtY) > size * .52) {
      collect(handful, x, y, Math.min(3, maxHandful - handful.pieces.length), size * .59);
      nudgeNeighbors(x, y, 40);
      handful.collectedAtX = x;
      handful.collectedAtY = y;
    }
    queueFrame();
  }

  function drop(toss = false) {
    const scoop = handful;
    if (!scoop) return;
    handful = undefined;
    delete surface.dataset.grabbing;
    const carry = toss && performance.now() - scoop.lastMove < 90 ? .18 : 0;
    if (motion.matches) nudgeNeighbors(scoop.targetX, scoop.targetY, 145);
    for (const { piece, offsetX, offsetY } of scoop.pieces) {
      piece.x = scoop.targetX + offsetX * .62;
      piece.y = scoop.targetY + offsetY * .62;
      piece.lift = motion.matches ? 0 : Math.max(piece.lift, size * .12);
      piece.fall = 0;
      landInside(piece);
      pieces.push(piece);
      const offset = Math.hypot(offsetX, offsetY) || 1;
      impulse(
        piece,
        scoop.vx * carry + offsetX / offset * 120 + (Math.random() - .5) * 90,
        scoop.vy * carry + offsetY / offset * 120 + (Math.random() - .5) * 90,
        (Math.random() - .5) * 4,
      );
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
    gesture = { id: event.pointerId, x, y };
    surface.setPointerCapture(event.pointerId);
    if (event.pointerType !== "touch") scoopAt(x, y);
  }, { signal });

  surface.addEventListener("pointermove", event => {
    if (!event.isPrimary || (event.pointerType === "touch" && gesture?.id !== event.pointerId)) return;
    const { x, y } = hand(event);
    if (gesture?.id !== event.pointerId) return;
    if (!handful) {
      if (Math.abs(x - gesture.x) < 6) return;
      scoopAt(gesture.x, gesture.y);
    }
    moveScoop(x, y);
  }, { signal });

  function release(event: PointerEvent) {
    if (gesture?.id !== event.pointerId) return;
    if (event.type === "pointerup" && !handful) scoopAt(gesture.x, gesture.y);
    drop(event.type === "pointerup");
    gesture = undefined;
    if (event.pointerType !== "mouse" || !surface.matches(":hover")) delete surface.dataset.hand;
  }

  surface.addEventListener("pointerup", release, { signal });
  surface.addEventListener("pointercancel", release, { signal });
  surface.addEventListener("lostpointercapture", release, { signal });
  surface.addEventListener("pointerleave", () => { if (!gesture) delete surface.dataset.hand; }, { signal });
  surface.addEventListener("click", event => {
    if (event.detail !== 0 || gesture) return;
    scoopAt(width / 2, height / 2);
    drop();
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
