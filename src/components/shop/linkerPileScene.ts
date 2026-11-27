import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { disposeModel, keyringOutline } from "./productModels";
import { SHOP_COLORS } from "./products";

const keyringCount = SHOP_COLORS.length * 2;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const { clamp, damp } = THREE.MathUtils;

function makeKeyrings() {
  const { shape, holeX, holeY } = keyringOutline("rectangle");
  const plate = new THREE.InstancedMesh(
    new THREE.ExtrudeGeometry(shape, { depth: .18, bevelSize: .035, bevelThickness: .025, bevelSegments: 2, curveSegments: 10 }),
    [new THREE.MeshStandardMaterial({ roughness: .63 }), new THREE.MeshStandardMaterial({ color: "#8b9b92", roughness: .8 })],
    keyringCount,
  );

  const artwork = document.createElement("canvas");
  artwork.width = 384;
  artwork.height = 268;
  const ink = artwork.getContext("2d");
  if (ink) {
    ink.fillStyle = "white";
    ink.font = "bold 74px Arial, sans-serif";
    ink.textAlign = "center";
    ink.fillText("e-linker.", 192, 158);
    ink.strokeStyle = "white";
    ink.lineWidth = 5;
    ink.lineCap = "round";
    ink.beginPath();
    ink.moveTo(43, 66);
    ink.quadraticCurveTo(41, 48, 62, 48);
    ink.moveTo(46, 221);
    ink.lineTo(74, 221);
    ink.moveTo(84, 221);
    ink.lineTo(96, 221);
    ink.stroke();
    ink.beginPath();
    ink.arc(333, 222, 4, 0, Math.PI * 2);
    ink.fill();
  }
  const label = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(3.8, 2.65).translate(0, 0, .208),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(artwork), alphaTest: .33 }),
    keyringCount,
  );

  const links = Array.from({ length: 6 }, (_, index) => new THREE.TorusGeometry(.17, .032, 5, 12)
    .scale(1, .63, 1).rotateX(index % 2 ? .95 : .25).rotateZ(.35)
    .translate(holeX + .04 + index * .225, holeY + .05 + index * .082, .212));
  links.push(
    new THREE.TorusGeometry(.39, .042, 6, 23).translate(holeX + 1.62, holeY + .57, .211),
    new THREE.TorusGeometry(.317, .026, 6, 23).translate(holeX + 1.62, holeY + .57, .225),
  );
  const chain = new THREE.InstancedMesh(
    mergeGeometries(links),
    new THREE.MeshStandardMaterial({ color: "#526762", roughness: .31, metalness: .27 }),
    keyringCount,
  );
  links.forEach(geometry => geometry.dispose());

  const meshes = [plate, label, chain];
  for (const mesh of meshes) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
  }
  plate.castShadow = plate.receiveShadow = true;
  chain.castShadow = true;
  const color = new THREE.Color();
  for (let index = 0; index < keyringCount; index++) {
    color.set(SHOP_COLORS[index % SHOP_COLORS.length].hex);
    plate.setColorAt(index, color);
    const luminance = color.r * .2126 + color.g * .7152 + color.b * .0722;
    label.setColorAt(index, color.set(luminance > .38 ? "#162925" : "#f7fbf7"));
  }
  return { plate, meshes };
}

export function createLinkerPile(host: HTMLDivElement, onContextLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 5, -5, .1, 55);
  camera.position.set(0, -5.8, 21);
  camera.lookAt(0, 0, .22);
  const viewDirection = camera.getWorldDirection(new THREE.Vector3());
  scene.add(new THREE.HemisphereLight(0xfafff9, 0xb7c5bc, 1.4));
  const sun = new THREE.DirectionalLight(0xfffaf2, 2.2);
  sun.position.set(-6, 8, 14);
  sun.target.position.z = .4;
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 512);
  sun.shadow.normalBias = .028;
  scene.add(sun, sun.target);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: "#21392a", opacity: .22 }));
  floor.receiveShadow = true;
  scene.add(floor);
  const { plate, meshes } = makeKeyrings();
  scene.add(...meshes);

  const pieces = Array.from({ length: keyringCount }, (_, index) => {
    const radius = Math.sqrt((index + .6) / keyringCount);
    const angle = index * goldenAngle;
    const height = .08 + (index % 8) * .15 + .58 * (1 - radius);
    return {
      layoutX: Math.cos(angle) * radius + Math.sin(index * 7.17) * .07,
      layoutY: Math.sin(angle) * radius + Math.cos(index * 8.43) * .09,
      angle: Math.sin(index * 25.13 + (index % 7)) * 2.8,
      tilt: Math.sin(index * 1.7) * .17, scale: .54 + (index * 13 % 17) * .016,
      height, z: height, x: 0, y: 0, vx: 0, vy: 0, turn: 0, rotation: 0,
    };
  });
  const pose = new THREE.Object3D();
  const raycaster = new THREE.Raycaster();
  const surface = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const pointer = new THREE.Vector2();
  const point = new THREE.Vector3();
  const lastPoint = new THREE.Vector3();
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  const { signal } = listeners;
  let limitX = 0;
  let limitY = 0;
  let frame: number | null = null;
  let lastFrame = 0;
  let disposed = false;
  let inView = true;
  let tracking = false;
  let activePointer: number | null = null;
  let grabbed: (typeof pieces)[number] | undefined;
  let grabX = 0, grabY = 0;
  let dragX = 0, dragY = 0, lastDrag = 0;

  function requestDraw() {
    if (!disposed && frame === null && inView && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function draw(time: number) {
    frame = null;
    if (!inView || document.hidden) { lastFrame = 0; return; }
    const elapsed = lastFrame ? Math.min(.034, (time - lastFrame) / 1000) : 1 / 60;
    const friction = Math.pow(.025, elapsed);
    let moving = false;
    pieces.forEach((piece, index) => {
      const held = piece === grabbed;
      const height = held ? 2.55 : piece.height;
      if (motion.matches) {
        piece.vx = piece.vy = piece.turn = 0;
        piece.z = height;
      } else {
        piece.x += piece.vx * elapsed;
        piece.y += piece.vy * elapsed;
        piece.rotation += piece.turn * elapsed;
        piece.vx *= friction;
        piece.vy *= friction;
        piece.turn *= friction;
        piece.z = damp(piece.z, height, 16, elapsed);
      }
      if (Math.abs(piece.x) > limitX) { piece.x = clamp(piece.x, -limitX, limitX); piece.vx *= -.19; }
      if (Math.abs(piece.y) > limitY) { piece.y = clamp(piece.y, -limitY, limitY); piece.vy *= -.19; }
      const liftOffset = (piece.z - piece.height) * viewDirection.y / viewDirection.z;
      pose.position.set(piece.x, piece.y + liftOffset, piece.z);
      pose.rotation.set(piece.tilt, -piece.tilt * .68, piece.rotation);
      pose.scale.setScalar(piece.scale);
      pose.updateMatrix();
      for (const mesh of meshes) mesh.setMatrixAt(index, pose.matrix);
      moving ||= Math.abs(piece.vx) + Math.abs(piece.vy) + Math.abs(piece.turn) > .04 || Math.abs(piece.z - height) > .004;
    });
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    lastFrame = moving ? time : 0;
    if (moving) requestDraw();
  }

  function reset() {
    grabbed = undefined;
    for (const piece of pieces) {
      piece.x = piece.layoutX * Math.min(13, limitX * .87);
      piece.y = piece.layoutY * limitY * .88;
      piece.z = piece.height;
      piece.rotation = piece.angle;
      piece.vx = piece.vy = piece.turn = 0;
    }
    requestDraw();
  }

  function resize() {
    if (disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height;
    const halfHeight = 5.15 + Math.max(0, 1.35 - aspect) * 1.75;
    const halfWidth = halfHeight * aspect;
    const previousX = limitX, previousY = limitY;
    limitX = Math.max(.7, halfWidth - 2.1);
    limitY = halfHeight - 1.55;
    Object.assign(camera, { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight });
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    Object.assign(sun.shadow.camera, { left: -halfWidth - 3, right: halfWidth + 3, top: 9, bottom: -9 });
    sun.shadow.camera.updateProjectionMatrix();
    plate.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(halfWidth, halfHeight) + 4);
    renderer.setSize(width, height, false);
    if (!previousX || !previousY) reset();
    else {
      for (const piece of pieces) {
        piece.x *= limitX / previousX;
        piece.y *= limitY / previousY;
      }
      requestDraw();
    }
  }

  function kick(piece: (typeof pieces)[number], x: number, y: number, turn: number) {
    if (motion.matches) {
      piece.x += x * .11;
      piece.y += y * .11;
      piece.rotation += turn * .12;
    } else {
      piece.vx = clamp(piece.vx + x, -22, 22);
      piece.vy = clamp(piece.vy + y, -22, 22);
      piece.turn = clamp(piece.turn + turn, -6, 6);
    }
  }

  function locate(event: PointerEvent) {
    const bounds = host.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    host.style.setProperty("--hand-x", `${x}px`);
    host.style.setProperty("--hand-y", `${y}px`);
    host.dataset.hand = "true";
    pointer.set(x / bounds.width * 2 - 1, 1 - y / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(surface, point);
  }

  host.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || activePointer !== null || !locate(event)) return;
    activePointer = event.pointerId;
    host.setPointerCapture(event.pointerId);
    host.dataset.grabbing = "true";
    lastPoint.copy(point);
    tracking = true;
    dragX = dragY = lastDrag = 0;
    const hit = raycaster.intersectObject(plate, false)[0]?.instanceId;
    if (hit !== undefined) {
      grabbed = pieces[hit];
      grabX = grabbed.x - point.x;
      grabY = grabbed.y - point.y;
      grabbed.vx = grabbed.vy = grabbed.turn = 0;
    }
    requestDraw();
  }, { signal });

  host.addEventListener("pointermove", event => {
    if (!event.isPrimary || (event.pointerType === "touch" && event.pointerId !== activePointer) || !locate(event)) return;
    const dx = tracking ? clamp(point.x - lastPoint.x, -.85, .85) : 0;
    const dy = tracking ? clamp(point.y - lastPoint.y, -.85, .85) : 0;
    lastPoint.copy(point);
    tracking = true;
    if (!dx && !dy) return;
    if (grabbed) {
      grabbed.x = point.x + grabX;
      grabbed.y = point.y + grabY;
      grabbed.rotation += dx * .13;
      dragX = dx;
      dragY = dy;
      lastDrag = performance.now();
    }
    const radius = activePointer === null ? 1.42 : 1.96;
    for (const piece of pieces) {
      if (piece === grabbed) continue;
      const x = piece.x - point.x, y = piece.y - point.y;
      const distance = Math.hypot(x, y);
      if (distance >= radius) continue;
      const strength = (1 - distance / radius) * 19;
      kick(piece, dx * strength + x * strength * .15, dy * strength + y * strength * .15, (dx * y - dy * x) * strength * .34);
    }
    requestDraw();
  }, { signal });

  function release(event: PointerEvent) {
    if (event.pointerId !== activePointer) return;
    if (grabbed && event.type === "pointerup" && !motion.matches && performance.now() - lastDrag < 85) {
      kick(grabbed, dragX * 22, dragY * 22, dragX * 3);
    }
    grabbed = undefined;
    activePointer = null;
    tracking = false;
    delete host.dataset.grabbing;
    if (event.pointerType !== "mouse" || !host.matches(":hover")) delete host.dataset.hand;
    requestDraw();
  }

  host.addEventListener("pointerup", release, { signal });
  host.addEventListener("pointercancel", release, { signal });
  host.addEventListener("lostpointercapture", release, { signal });
  host.addEventListener("pointerleave", () => {
    if (activePointer !== null) return;
    tracking = false;
    delete host.dataset.hand;
  }, { signal });
  renderer.domElement.addEventListener("webglcontextlost", onContextLost, { signal });
  document.addEventListener("visibilitychange", requestDraw, { signal });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) requestDraw();
  });
  visibilityObserver.observe(host);
  resize();

  return {
    reset,
    stir() {
      for (const piece of pieces) {
        const angle = Math.random() * Math.PI * 2;
        kick(piece, Math.cos(angle) * 11, Math.sin(angle) * 9, (Math.random() - .5) * 9);
      }
      requestDraw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.abort();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      delete host.dataset.hand;
      delete host.dataset.grabbing;
      disposeModel(scene);
      for (const mesh of meshes) mesh.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
