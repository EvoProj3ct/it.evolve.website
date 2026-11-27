"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { KeyringFace, KeyringPosition } from "@evolve/ecommerce-server/keyring-design";
import { createKeyring, createTurntable, disposeModel, type ProductModel, type RecordAppearance } from "./productModels";
import type { ProductConfiguration, ProductId } from "./products";
import { ProductIllustration } from "./ProductIllustration";
import { KeyringChainPhysics } from "./KeyringChainPhysics";
import { keyringHoleRadius, keyringHoles, keyringLetteringLayout } from "./keyringGeometry";
import styles from "./Shop.module.css";

let fontPromise: Promise<Font> | null = null;
function loadFont() {
  if (!fontPromise) fontPromise = new FontLoader().loadAsync("/shop/fonts/helvetica-regular.typeface.json").catch(error => { fontPromise = null; throw error; });
  return fontPromise;
}

type Props = {
  product: Exclude<ProductId, "e-led">;
  configuration: ProductConfiguration;
  presentation?: boolean;
  playing?: boolean;
  reset?: number;
  onError?: (message: string) => void;
  recordAppearance?: RecordAppearance;
  recordPresent?: boolean;
  recordLift?: number;
  keyringEditor?: KeyringEditor;
};

export type KeyringEditor = {
  face: KeyringFace;
  tool: "rotate" | "hole" | "text";
  onHole: (id: string) => void;
  onText: (face: KeyringFace, position: KeyringPosition) => void;
};

export default function ProductScene({ product, configuration, presentation = false, playing = true, reset = 0, onError, recordAppearance, recordPresent = true, recordLift = 0, keyringEditor }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ configuration, playing, onError, recordAppearance, recordPresent, recordLift, keyringEditor });
  stateRef.current = { configuration, playing, onError, recordAppearance, recordPresent, recordLift, keyringEditor };
  const controllerRef = useRef<{ update: (config: ProductConfiguration) => void; reset: () => void; rotate: (yaw: number, pitch?: number, roll?: number) => void; record: (appearance?: RecordAppearance) => void; showFace: (face: KeyringFace) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const editorFace = keyringEditor?.face;
  const editorTool = keyringEditor?.tool;

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
    if (product === "e-disk") camera.position.set(7, 8, 9);
    else camera.position.set(0, 10, 4.5);
    camera.lookAt(0, .1, 0);
    const freeRotation = product === "e-linker" && !presentation;
    const initialOrientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -.2);
    const targetOrientation = initialOrientation.clone();
    const cameraOrientation = camera.quaternion.clone();
    const viewUp = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraOrientation);
    const inverseCameraOrientation = cameraOrientation.clone().invert();
    const rotationStep = new THREE.Quaternion();
    const localDelta = new THREE.Quaternion();
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
    const finish = { roughness: product === "e-disk" ? .27 : .43, metalness: .03, clearcoat: product === "e-disk" ? .5 : .12, clearcoatRoughness: .25 };
    const primary = new THREE.MeshPhysicalMaterial({ color: stateRef.current.configuration.primary, ...finish });
    const secondary = new THREE.MeshPhysicalMaterial({ color: stateRef.current.configuration.secondary, ...finish });
    const targetPrimary = primary.color.clone(), targetSecondary = secondary.color.clone();
    let model: ProductModel | null = null;
    let chainPhysics: KeyringChainPhysics | null = null;
    let font: Font | null = null;
    let lastConfiguration: ProductConfiguration | null = null;
    const editMarker = new THREE.Mesh(new THREE.RingGeometry(keyringHoleRadius, .235, 40),
      new THREE.MeshBasicMaterial({ color: "#63d642", side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    editMarker.renderOrder = 10;
    editMarker.visible = false;
    scene.add(editMarker);
    const update = (config: ProductConfiguration, force = false) => {
      if (disposed) return;
      targetPrimary.set(config.primary);
      targetSecondary.set(config.secondary);
      const changed = !lastConfiguration || config.shape !== lastConfiguration.shape || config.text !== lastConfiguration.text
        || config.logo !== lastConfiguration.logo || config.keyring !== lastConfiguration.keyring;
      if (!model || (product === "e-linker" && (changed || force))) {
        stateRef.current.onError?.("");
        const currentOrientation = model?.group.quaternion.clone() ?? initialOrientation.clone();
        const chainState = lastConfiguration?.shape === config.shape && lastConfiguration.keyring.hole === config.keyring.hole
          ? chainPhysics?.snapshot() : undefined;
        if (model) { scene.remove(model.group); disposeModel(model.group, [primary, secondary]); }
        model = product === "e-disk" ? createTurntable(primary, secondary) : createKeyring(config, font, primary, secondary, message => stateRef.current.onError?.(message), !presentation);
        model.group.quaternion.copy(currentOrientation);
        if (freeRotation) model.group.position.copy(viewUp).multiplyScalar(.35);
        if (stateRef.current.recordAppearance) model.setRecordAppearance?.(stateRef.current.recordAppearance);
        scene.add(model.group);
        chainPhysics = model.chain ? new KeyringChainPhysics(model.chain, cameraOrientation) : null;
        if (chainState) chainPhysics?.restore(chainState);
      }
      lastConfiguration = config;
    };
    update(stateRef.current.configuration);
    if (product === "e-linker") void loadFont().then(loaded => {
      if (disposed) return;
      font = loaded;
      update(stateRef.current.configuration, true);
    }).catch(() => { if (!disposed) { setUnavailable(true); stateRef.current.onError?.("Il carattere 3D non è disponibile. La sagoma mostra comunque testo e colori scelti."); } });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.ShadowMaterial({ color: "#11171a", opacity: product === "e-linker" ? .055 : .16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = product === "e-disk" ? -.6 : -.37;
    floor.receiveShadow = true;
    floor.visible = !freeRotation;
    scene.add(floor);
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.zoom = Math.min(freeRotation ? .98 : product === "e-linker" ? 1.05 : 1.22, camera.aspect / (freeRotation ? .9 : .95));
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
    let manualUntil = 0;
    let drag: { id: number; x: number; y: number; yaw: number; started: boolean; vector: THREE.Vector3; orientation: THREE.Quaternion } | null = null;
    let editDrag: { id: number; face: KeyringFace; tool: "hole" | "text"; hole?: string; position?: KeyringPosition } | null = null;
    const editRay = new THREE.Raycaster();
    const localRay = new THREE.Ray();
    const facePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
    const facePoint = new THREE.Vector3();
    const bodyScale = new THREE.Vector3();
    const bodyInverse = new THREE.Matrix4();
    const flipFace = new THREE.Quaternion();
    const showFace = (face: KeyringFace) => {
      if (!model?.keyring) return;
      targetOrientation.copy(initialOrientation);
      if (face === "back") {
        const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(model.keyring.body.quaternion);
        targetOrientation.multiply(flipFace.setFromAxisAngle(axis, Math.PI));
      }
    };
    function applyEdit(event: PointerEvent) {
      const keyring = model?.keyring;
      if (!editDrag || !keyring || !lastConfiguration) return;
      const config = lastConfiguration;
      const bounds = host!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const back = editDrag.face === "back";
      keyring.body.updateWorldMatrix(true, false);
      editRay.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) * 2 / bounds.width - 1,
        1 - (event.clientY - bounds.top) * 2 / bounds.height), camera);
      localRay.copy(editRay.ray).applyMatrix4(bodyInverse.copy(keyring.body.matrixWorld).invert());
      facePlane.constant = back ? .022 : -keyring.depth - .022;
      if (!localRay.intersectPlane(facePlane, facePoint)) return;
      if (editDrag.tool === "hole") {
        const candidates = keyringHoles(config.shape);
        const distance = ({ x, y }: KeyringPosition) => (x - facePoint.x) ** 2 + (y - facePoint.y) ** 2;
        editDrag.hole = candidates.reduce((closest, point) => distance(point) < distance(closest) ? point : closest).id;
        return;
      }
      const lettering = keyring.letters[editDrag.face];
      if (!lettering) return;
      const inscription = back ? config.keyring.back.text : config.text;
      const style = config.keyring[editDrag.face];
      const layout = keyringLetteringLayout(config.shape, style, inscription.trim(), !back && !!config.logo);
      const percent = (value: number, travel: number, previous: number) => travel > 1e-6
        ? Math.round(THREE.MathUtils.clamp(value / travel, -1, 1) * 100) : previous;
      const x = percent((back ? -1 : 1) * facePoint.x, layout.travelX, style.x);
      const y = percent(facePoint.y - layout.centerY, layout.travelY, style.y);
      editDrag.position = { x, y };
      lettering.position.x = (back ? -1 : 1) * x * layout.travelX / 100;
      lettering.position.y = layout.centerY + y * layout.travelY / 100;
    }
    const trackballPoint = (x: number, y: number) => {
      const bounds = host.getBoundingClientRect();
      const radius = Math.max(1, Math.min(bounds.width, bounds.height) / 2);
      const point = new THREE.Vector3((x - bounds.left - bounds.width / 2) / radius, (bounds.top + bounds.height / 2 - y) / radius, 0);
      const distance = point.x * point.x + point.y * point.y;
      point.z = distance <= .5 ? Math.sqrt(1 - distance) : .5 / Math.sqrt(distance);
      return point.normalize();
    };
    const endDrag = () => {
      const id = drag?.id ?? editDrag?.id;
      if (editDrag && model?.keyring && lastConfiguration) {
        const face = editDrag.face;
        const lettering = model.keyring.letters[face];
        if (lettering) {
          const back = face === "back";
          const config = lastConfiguration;
          const layout = keyringLetteringLayout(config.shape, config.keyring[face], (back ? config.keyring.back.text : config.text).trim(), !back && !!config.logo);
          lettering.position.x = back ? -layout.x : layout.x;
          lettering.position.y = layout.y;
        }
      }
      editDrag = null;
      drag = null;
      manualUntil = performance.now() + 3000;
      delete host.dataset.dragging;
      if (id !== undefined && host.hasPointerCapture(id)) host.releasePointerCapture(id);
    };
    const pointerDown = (event: PointerEvent) => {
      if (presentation || !event.isPrimary || event.button !== 0 || drag || editDrag) return;
      const editor = stateRef.current.keyringEditor;
      if (freeRotation && editor && editor.tool !== "rotate") {
        if (!model?.keyring || (editor.tool === "text" && !model.keyring.letters[editor.face])) return;
        editDrag = { id: event.pointerId, face: editor.face, tool: editor.tool };
        host.setPointerCapture(event.pointerId);
        host.dataset.dragging = "true";
        applyEdit(event);
        return;
      }
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: targetYaw, started: false, vector: trackballPoint(event.clientX, event.clientY), orientation: targetOrientation.clone() };
      if (event.pointerType === "mouse") host.focus({ preventScroll: true });
    };
    const pointerMove = (event: PointerEvent) => {
      if (editDrag?.id === event.pointerId) { applyEdit(event); return; }
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.started) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
        if (!freeRotation && Math.abs(dy) > Math.abs(dx)) { endDrag(); return; }
        drag.started = true;
        host.setPointerCapture(event.pointerId);
        host.dataset.dragging = "true";
      }
      if (freeRotation) {
        localDelta.setFromUnitVectors(drag.vector, trackballPoint(event.clientX, event.clientY));
        rotationStep.copy(cameraOrientation).multiply(localDelta).multiply(inverseCameraOrientation);
        targetOrientation.copy(rotationStep).multiply(drag.orientation).normalize();
      } else targetYaw = drag.yaw + dx * Math.PI * 2 / Math.max(360, host.clientWidth);
    };
    const pointerEnd = (event: PointerEvent) => {
      if (editDrag?.id === event.pointerId) {
        const edit = editDrag;
        const editor = stateRef.current.keyringEditor;
        if (event.type === "pointerup") {
          applyEdit(event);
          if (edit.hole) editor?.onHole(edit.hole);
          if (edit.position) editor?.onText(edit.face, edit.position);
        }
        endDrag();
      } else if (event.pointerId === drag?.id) endDrag();
    };
    host.addEventListener("pointerdown", pointerDown);
    host.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerEnd);
    host.addEventListener("pointercancel", pointerEnd);
    host.addEventListener("lostpointercapture", pointerEnd);
    window.addEventListener("blur", endDrag);
    controllerRef.current = {
      update,
      record: appearance => { model?.setRecordAppearance?.(appearance); if (model?.record) model.record.position.y = .61 + stateRef.current.recordLift; },
      reset: () => { endDrag(); targetYaw = -.2; showFace(stateRef.current.keyringEditor?.face ?? "front"); chainPhysics?.reset(); },
      showFace: face => { endDrag(); showFace(face); },
      rotate: (yaw, pitch = 0, roll = 0) => {
        manualUntil = performance.now() + 3000;
        if (!freeRotation) { targetYaw += yaw; return; }
        for (const [axis, angle] of [[new THREE.Vector3(0, 1, 0), yaw], [new THREE.Vector3(1, 0, 0), pitch], [new THREE.Vector3(0, 0, 1), roll]] as const) {
          if (!angle) continue;
          rotationStep.setFromAxisAngle(axis.applyQuaternion(cameraOrientation), angle);
          targetOrientation.premultiply(rotationStep).normalize();
        }
      },
    };
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
        const rotationBlend = motion.matches ? 1 : 1 - Math.exp(-dt * 14);
        if (freeRotation) model.group.quaternion.slerp(targetOrientation, rotationBlend);
        else {
          if (!presentation && product === "e-disk" && animate && !drag && now > manualUntil) targetYaw += dt * .16;
          const yaw = presentation ? product === "e-disk" ? -.2 : -.2 + Math.sin(elapsed * .25) * .12 : targetYaw;
          model.group.rotation.y += (yaw - model.group.rotation.y) * rotationBlend;
        }
        if (product === "e-linker" && presentation) model.group.position.y = .32 + Math.sin(elapsed * .7) * .09;
        if (model.record) {
          model.record.visible = stateRef.current.recordPresent;
          model.record.position.y += (.61 + stateRef.current.recordLift - model.record.position.y) * rotationBlend;
          if (animate) model.record.rotation.y -= dt * .8;
        }
        chainPhysics?.step(dt, motion.matches);
        const editor = stateRef.current.keyringEditor;
        const keyring = model.keyring;
        editMarker.visible = editor?.tool === "hole" && !!keyring && !!lastConfiguration;
        if (editMarker.visible && editor && keyring && lastConfiguration) {
          const holes = keyringHoles(lastConfiguration.shape);
          const hole = holes.find(point => point.id === (editDrag?.hole ?? lastConfiguration!.keyring.hole)) ?? holes[0];
          keyring.body.localToWorld(editMarker.position.set(hole.x, hole.y, editor.face === "back" ? -.033 : keyring.depth + .033));
          keyring.body.getWorldQuaternion(editMarker.quaternion);
          editMarker.scale.copy(keyring.body.getWorldScale(bodyScale));
        }
      }
      renderer.render(scene, camera);
    };
    frame = window.requestAnimationFrame(tick);
    setReady(true);
    return () => {
      disposed = true;
      chainPhysics = null;
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
  useEffect(() => { controllerRef.current?.record(recordAppearance); }, [recordAppearance]);
  useEffect(() => { if (editorFace) controllerRef.current?.showFace(editorFace); }, [editorFace, editorTool]);
  useEffect(() => { if (reset > 0) controllerRef.current?.reset(); }, [reset]);
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const freeRotation = product === "e-linker";
    const keys = freeRotation ? ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "q", "Q", "e", "E"] : ["ArrowLeft", "ArrowRight", "Home"];
    if (presentation || event.ctrlKey || event.metaKey || event.altKey || !keys.includes(event.key)) return;
    event.preventDefault();
    if (keyringEditor && keyringEditor.tool !== "rotate") {
      const left = event.key === "ArrowLeft", right = event.key === "ArrowRight";
      const up = event.key === "ArrowUp", down = event.key === "ArrowDown";
      if (keyringEditor.tool === "hole" && (left || right || up || down)) {
        const holes = keyringHoles(configuration.shape);
        const index = holes.findIndex(hole => hole.id === configuration.keyring.hole);
        keyringEditor.onHole(holes[(index + holes.length + (left || up ? -1 : 1)) % holes.length].id);
      }
      if (keyringEditor.tool === "text") {
        const { x, y } = configuration.keyring[keyringEditor.face];
        const limit = (n: number) => Math.max(-100, Math.min(100, n));
        if (event.key === "Home") keyringEditor.onText(keyringEditor.face, { x: 0, y: 0 });
        else if (left || right || up || down)
          keyringEditor.onText(keyringEditor.face, { x: limit(x + (left ? -10 : right ? 10 : 0)), y: limit(y + (up ? 10 : down ? -10 : 0)) });
      }
      return;
    }
    if (event.key === "Home") controllerRef.current?.reset();
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") controllerRef.current?.rotate((event.key === "ArrowRight" ? 1 : -1) * Math.PI / 12);
    else if (event.key === "ArrowUp" || event.key === "ArrowDown") controllerRef.current?.rotate(0, (event.key === "ArrowDown" ? 1 : -1) * Math.PI / 12);
    else controllerRef.current?.rotate(0, 0, (event.key.toLowerCase() === "e" ? -1 : 1) * Math.PI / 12);
  };
  return <div className={styles.sceneWrap} data-ready={ready && !unavailable}>
    <div ref={hostRef} className={styles.scene} data-edit-tool={keyringEditor?.tool} data-rotation={product === "e-linker" && !presentation ? "free" : "horizontal"} role={presentation ? "img" : "group"} tabIndex={presentation || (unavailable && !keyringEditor) ? undefined : 0} aria-label={presentation ? `Presentazione animata di ${product}` : keyringEditor?.tool === "hole" ? "Posizione del foro. Trascina sul portachiavi o usa le frecce." : keyringEditor?.tool === "text" ? "Posizione della scritta. Trascina sul portachiavi o usa le frecce." : product === "e-linker" ? "Anteprima e-linker. Trascina in ogni direzione o usa le quattro frecce per ruotare. Q ed E inclinano il modello; Home ripristina la vista." : "Anteprima e-disk. Trascina in orizzontale o usa le frecce sinistra e destra per ruotare; Home ripristina la vista."} onKeyDown={keyboard} />
    {(!ready || unavailable) && <div className={styles.sceneFallback}><ProductIllustration product={product} configuration={configuration} showChain={!presentation} face={keyringEditor?.face} highlightHole={keyringEditor?.tool === "hole"} /></div>}
    {unavailable && <span className={styles.webglNotice}>Vista illustrata · 3D non disponibile su questo dispositivo</span>}
  </div>;
}
