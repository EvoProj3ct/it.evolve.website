"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { createLedModel, type LedModel } from "./ledModel";
import { disposeModel } from "./productModels";
import type { LedConfiguration } from "./led";
import styles from "./ELed.module.css";

let fontPromise: Promise<Font> | null = null;
const loadFont = () => fontPromise ??= new FontLoader().loadAsync("/shop/fonts/helvetica-regular.typeface.json").catch(error => { fontPromise = null; throw error; });

export default function LedScene({ configuration, interactive = false, playing = true, power = true, reset = 0, onError }: { configuration: LedConfiguration; interactive?: boolean; playing?: boolean; power?: boolean; reset?: number; onError?: (message: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const state = useRef({ configuration, playing, power, onError });
  state.current = { configuration, playing, power, onError };
  const controller = useRef<{ update: () => void; reset: () => void; rotate: (x: number, y: number) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch { setUnavailable(true); return; }
    let disposed = false, frame = 0, previous = 0, elapsed = 0, visible = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor("#080c0d", 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.setAttribute("aria-hidden", "true"); host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 45);
    const home = new THREE.Vector3(.65, .35, 10.5);
    camera.position.copy(home); camera.lookAt(0, 0, 0);
    const controls = interactive ? new OrbitControls(camera, renderer.domElement) : null;
    if (controls) { controls.enableDamping = true; controls.dampingFactor = .08; controls.enablePan = false; controls.enableZoom = false; controls.rotateSpeed = .65; controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI - .15; controls.saveState(); }
    scene.add(new THREE.HemisphereLight("#dbeee7", "#10141c", 1.2));
    const key = new THREE.DirectionalLight("#f2fff7", 3); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight("#8b8fff", 2.2); rim.position.set(4, -1, -3); scene.add(rim);
    const spill = new THREE.PointLight(configuration.secondary, 8, 10, 2); spill.position.set(0, -.5, 1.2); scene.add(spill);
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .8, .45, 1);
    const output = new OutputPass();
    composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);
    let model: LedModel | null = null, font: Font | null = null;
    let last: LedConfiguration | null = null;
    const update = () => {
      if (!font || disposed) return;
      const config = state.current.configuration;
      if (last && last.text === config.text && last.logo === config.logo && last.mode === config.mode) return;
      try {
        const replacement = createLedModel(config, font);
        if (model) { replacement.group.quaternion.copy(model.group.quaternion); scene.remove(model.group); disposeModel(model.group); }
        model = replacement; model.animate(elapsed, config, state.current.power, true); scene.add(model.group);
        last = config; setReady(true); setUnavailable(false); state.current.onError?.("");
      } catch (error) {
        state.current.onError?.(error instanceof Error ? error.message : "Non riesco a creare questa anteprima. Prova un testo più breve o un logo più semplice.");
      }
    };
    void loadFont().then(loaded => { if (!disposed) { font = loaded; update(); } }).catch(() => { if (!disposed) { setUnavailable(true); state.current.onError?.("Il 3D non è disponibile. Puoi comunque preparare il tuo progetto."); } });
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height); composer.setSize(width, height);
      camera.aspect = width / height; camera.zoom = Math.min(1.2, camera.aspect / 1.3); camera.updateProjectionMatrix();
    };
    resize(); const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); intersection.observe(host);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    controller.current = {
      update,
      reset: () => { const zoom = camera.zoom; controls?.reset(); camera.position.copy(home); camera.zoom = zoom; camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); controls?.update(); },
      rotate: (x, y) => {
        const spherical = new THREE.Spherical().setFromVector3(camera.position);
        spherical.theta += x; spherical.phi = THREE.MathUtils.clamp(spherical.phi + y, .15, Math.PI - .15);
        camera.position.setFromSpherical(spherical); camera.lookAt(0, 0, 0); controls?.update();
      },
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!model || !visible || document.hidden || now - previous < 32) return;
      const dt = previous ? Math.min((now - previous) / 1000, .05) : .03; previous = now;
      if (state.current.playing && !motion.matches) elapsed += dt * state.current.configuration.speed;
      controls?.update();
      if (model) {
        spill.color.copy(model.animate(elapsed, state.current.configuration, state.current.power, motion.matches));
        spill.intensity = state.current.power ? 9 : 0;
        if (!interactive) { model.group.rotation.y = -.08 + Math.sin(elapsed * .3) * .1; model.group.rotation.x = Math.sin(elapsed * .23) * .045; }
      }
      composer.render(dt);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true; controller.current = null; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); controls?.dispose();
      disposeModel(scene); bloom.dispose(); output.dispose(); composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [interactive]);

  useEffect(() => { controller.current?.update(); }, [configuration]);
  useEffect(() => { if (reset) controller.current?.reset(); }, [reset]);
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || event.ctrlKey || event.metaKey || event.altKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") controller.current?.reset();
    else controller.current?.rotate(event.key === "ArrowLeft" ? -.15 : event.key === "ArrowRight" ? .15 : 0, event.key === "ArrowUp" ? -.15 : event.key === "ArrowDown" ? .15 : 0);
  };
  return <div className={styles.sceneWrap} data-ready={ready && !unavailable} data-power={power}>
    <div ref={hostRef} className={styles.scene} tabIndex={interactive && !unavailable ? 0 : undefined} role={interactive ? "group" : "img"} aria-label={interactive ? "Anteprima e-led. Trascina o usa le frecce per ruotare; Home ripristina la vista." : "Insegna e-led animata con colori luminosi in continuo cambiamento"} onKeyDown={keyboard} />
    {(!ready || unavailable) && <div className={styles.sceneFallback} style={{ color: configuration.secondary }}><span>{configuration.mode === "logo" ? "IL TUO LOGO" : configuration.text || "LA TUA LUCE"}</span><small>{unavailable ? "Anteprima illustrativa · 3D non disponibile" : "Accendiamo la tua idea…"}</small></div>}
  </div>;
}
