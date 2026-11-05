"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { createKeyring, createTurntable, disposeModel, type ProductModel } from "./productModels";
import type { ProductConfiguration, ProductId } from "./products";
import { ProductIllustration } from "./ProductIllustration";
import styles from "./Shop.module.css";

let fontPromise: Promise<Font> | null = null;
function loadFont() {
  if (!fontPromise) fontPromise = new FontLoader().loadAsync("/shop/fonts/helvetiker_bold.typeface.json").catch(error => { fontPromise = null; throw error; });
  return fontPromise;
}

type Props = {
  product: ProductId;
  configuration: ProductConfiguration;
  presentation?: boolean;
  playing?: boolean;
  reset?: number;
  onError?: (message: string) => void;
};

export default function ProductScene({ product, configuration, presentation = false, playing = true, reset = 0, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ configuration, playing, onError });
  stateRef.current = { configuration, playing, onError };
  const controllerRef = useRef<{ update: (config: ProductConfiguration) => void; reset: () => void; rotate: (delta: number) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
    catch { setUnavailable(true); return; }
    let disposed = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
    camera.position.set(product === "e-disk" ? 7 : 3, 8, 9);
    camera.lookAt(0, .1, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    scene.environmentIntensity = .65;
    disposeModel(room);
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bdc1, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-4, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    key.shadow.normalBias = .035;
    key.shadow.bias = -.0003;
    key.shadow.radius = 3;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.7);
    rim.position.set(4, 3, -5);
    scene.add(rim);
    const finish = { roughness: product === "e-disk" ? .27 : .38, metalness: .03, clearcoat: product === "e-disk" ? .5 : .18, clearcoatRoughness: .25 };
    const primary = new THREE.MeshPhysicalMaterial({ color: stateRef.current.configuration.primary, ...finish });
    const secondary = new THREE.MeshPhysicalMaterial({ color: stateRef.current.configuration.secondary, ...finish });
    const targetPrimary = primary.color.clone(), targetSecondary = secondary.color.clone();
    let model: ProductModel | null = null;
    let font: Font | null = null;
    let lastConfiguration: ProductConfiguration | null = null;
    const update = (config: ProductConfiguration, force = false) => {
      if (disposed) return;
      targetPrimary.set(config.primary);
      targetSecondary.set(config.secondary);
      const changed = !lastConfiguration || config.shape !== lastConfiguration.shape || config.text !== lastConfiguration.text || config.logo !== lastConfiguration.logo;
      if (!model || (product === "e-linker" && (changed || force))) {
        stateRef.current.onError?.("");
        const currentYaw = model?.group.rotation.y ?? -.2;
        if (model) { scene.remove(model.group); disposeModel(model.group, [primary, secondary]); }
        model = product === "e-disk" ? createTurntable(primary, secondary) : createKeyring(config, font, primary, secondary, message => stateRef.current.onError?.(message));
        model.group.rotation.y = currentYaw;
        scene.add(model.group);
      }
      lastConfiguration = config;
    };
    update(stateRef.current.configuration);
    if (product === "e-linker") void loadFont().then(loaded => {
      if (disposed) return;
      font = loaded;
      update(stateRef.current.configuration, true);
    }).catch(() => { if (!disposed) { setUnavailable(true); stateRef.current.onError?.("Il carattere 3D non è disponibile. La sagoma mostra comunque testo e colori scelti."); } });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.ShadowMaterial({ color: "#11171a", opacity: product === "e-linker" ? .09 : .16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = product === "e-disk" ? -.6 : -.37;
    floor.receiveShadow = true;
    scene.add(floor);
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.zoom = Math.min(1.22, camera.aspect / .95);
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(host);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let targetYaw = -.2;
    let drag: { id: number; x: number; y: number; yaw: number; started: boolean } | null = null;
    const endDrag = () => {
      const id = drag?.id;
      drag = null;
      delete host.dataset.dragging;
      if (id !== undefined && host.hasPointerCapture(id)) host.releasePointerCapture(id);
    };
    const pointerDown = (event: PointerEvent) => {
      if (presentation || !event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: targetYaw, started: false };
      if (event.pointerType === "mouse") host.focus({ preventScroll: true });
    };
    const pointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.started) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { endDrag(); return; }
        drag.started = true;
        host.setPointerCapture(event.pointerId);
        host.dataset.dragging = "true";
      }
      targetYaw = drag.yaw + dx * Math.PI * 2 / Math.max(360, host.clientWidth);
    };
    const pointerEnd = (event: PointerEvent) => { if (event.pointerId === drag?.id) endDrag(); };
    host.addEventListener("pointerdown", pointerDown);
    host.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerEnd);
    host.addEventListener("pointercancel", pointerEnd);
    host.addEventListener("lostpointercapture", pointerEnd);
    window.addEventListener("blur", endDrag);
    controllerRef.current = { update, reset: () => { targetYaw = -.2; }, rotate: delta => { targetYaw += delta; } };
    let frame = 0, previous = 0, elapsed = 0;
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (!visible || document.hidden || now - previous < 32) return;
      const dt = previous ? Math.min((now - previous) / 1000, .05) : .03;
      previous = now;
      const blend = motion.matches ? 1 : 1 - Math.exp(-dt * 12);
      primary.color.lerp(targetPrimary, blend);
      secondary.color.lerp(targetSecondary, blend);
      const animate = stateRef.current.playing && !motion.matches;
      if (animate) elapsed += dt;
      if (model) {
        const yaw = presentation ? product === "e-disk" ? -.2 : -.2 + Math.sin(elapsed * .25) * .12 : targetYaw;
        model.group.rotation.y += (yaw - model.group.rotation.y) * (motion.matches ? 1 : Math.min(1, dt * 12));
        if (product === "e-linker" && presentation) model.group.position.y = .32 + Math.sin(elapsed * .7) * .09;
        if (model.record && animate) model.record.rotation.y -= dt * .8;
      }
      renderer.render(scene, camera);
    };
    frame = window.requestAnimationFrame(tick);
    setReady(true);
    return () => {
      disposed = true;
      controllerRef.current = null;
      window.cancelAnimationFrame(frame);
      endDrag();
      resizeObserver.disconnect();
      visibility.disconnect();
      host.removeEventListener("pointerdown", pointerDown);
      host.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerEnd);
      host.removeEventListener("pointercancel", pointerEnd);
      host.removeEventListener("lostpointercapture", pointerEnd);
      window.removeEventListener("blur", endDrag);
      if (model) { scene.remove(model.group); disposeModel(model.group, [primary, secondary]); }
      disposeModel(scene);
      primary.dispose(); secondary.dispose(); environment.dispose(); key.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [product, presentation]);

  useEffect(() => { controllerRef.current?.update(configuration); }, [configuration]);
  useEffect(() => { controllerRef.current?.reset(); }, [reset]);
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (presentation || !["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") controllerRef.current?.reset();
    else controllerRef.current?.rotate((event.key === "ArrowRight" ? 1 : -1) * Math.PI / 12);
  };
  return <div className={styles.sceneWrap} data-ready={ready && !unavailable}>
    <div ref={hostRef} className={styles.scene} role={presentation ? "img" : "group"} tabIndex={presentation || unavailable ? undefined : 0} aria-label={presentation ? `Presentazione animata di ${product}` : `Anteprima ${product}. Trascina in orizzontale o usa le frecce della tastiera per ruotare; Home ripristina la vista.`} onKeyDown={keyboard} />
    {(!ready || unavailable) && <div className={styles.sceneFallback}><ProductIllustration product={product} configuration={configuration} /></div>}
    {unavailable && <span className={styles.webglNotice}>Vista illustrata · 3D non disponibile su questo dispositivo</span>}
  </div>;
}
