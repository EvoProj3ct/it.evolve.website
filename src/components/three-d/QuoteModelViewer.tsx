"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import styles from "./QuoteModelViewer.module.css";

type ModelResources = {
  group: THREE.Group;
  geometry: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
  face: THREE.MeshStandardMaterial;
  outline: THREE.LineBasicMaterial;
};

type ViewerController = { replace: (geometry: THREE.BufferGeometry) => void };

function disposeModel(model: ModelResources) {
  model.group.removeFromParent();
  model.geometry.dispose();
  model.edges.dispose();
  model.face.dispose();
  model.outline.dispose();
}

export function QuoteModelViewer({ url, label }: { url: string; label: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ViewerController | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setStatus("error");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 100);
    camera.position.set(7, 5.5, 8);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const light = new THREE.DirectionalLight(0xc6f3c3, 3);
    light.position.set(-4, 8, 7);
    scene.add(light);

    const rotation = new THREE.Group();
    rotation.rotation.x = -.1;
    scene.add(rotation);
    let currentModel: ModelResources | null = null;
    let frame = 0;
    let previousTime = performance.now();
    let activePointer: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let resumeRotationAt = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const aspect = width / height;
      const span = aspect < .85 ? 4.8 : aspect < 1.2 ? 4.1 : 3.7;
      camera.left = -span * aspect;
      camera.right = span * aspect;
      camera.top = span;
      camera.bottom = -span;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };

    const tick = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1000, .05);
      previousTime = time;
      if (!reducedMotion && activePointer === null && time >= resumeRotationAt) rotation.rotation.y += elapsed * .46;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(tick);
    };

    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      activePointer = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      mount.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      rotation.rotation.y += (event.clientX - lastPointerX) * .009;
      rotation.rotation.x = THREE.MathUtils.clamp(rotation.rotation.x + (event.clientY - lastPointerY) * .007, -1.15, 1.15);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      resumeRotationAt = performance.now() + 1600;
      if (mount.hasPointerCapture(event.pointerId)) mount.releasePointerCapture(event.pointerId);
    };
    const keyDown = (event: KeyboardEvent) => {
      const turns: Record<string, [number, number]> = {
        ArrowLeft: [0, -.15], ArrowRight: [0, .15], ArrowUp: [-.15, 0], ArrowDown: [.15, 0],
      };
      const turn = turns[event.key];
      if (!turn) return;
      event.preventDefault();
      rotation.rotation.x = THREE.MathUtils.clamp(rotation.rotation.x + turn[0], -1.15, 1.15);
      rotation.rotation.y += turn[1];
      resumeRotationAt = performance.now() + 1600;
    };

    mount.addEventListener("pointerdown", pointerDown);
    mount.addEventListener("pointermove", pointerMove);
    mount.addEventListener("pointerup", pointerUp);
    mount.addEventListener("pointercancel", pointerUp);
    mount.addEventListener("lostpointercapture", pointerUp);
    mount.addEventListener("keydown", keyDown);

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    frame = window.requestAnimationFrame(tick);

    controllerRef.current = {
      replace(geometry) {
        geometry.rotateX(-Math.PI / 2);
        geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        geometry.boundingBox?.getSize(size);
        const longest = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(longest) || longest <= 0) {
          geometry.dispose();
          throw new Error("Invalid STL geometry");
        }

        geometry.scale(4.4 / longest, 4.4 / longest, 4.4 / longest);
        geometry.center();
        const face = new THREE.MeshStandardMaterial({
          color: 0x397c4b,
          roughness: .62,
          metalness: .06,
          transparent: true,
          opacity: .9,
          side: THREE.DoubleSide,
        });
        const edges = new THREE.EdgesGeometry(geometry, 28);
        const outline = new THREE.LineBasicMaterial({ color: 0x9ce478, transparent: true, opacity: .8 });
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geometry, face), new THREE.LineSegments(edges, outline));

        if (currentModel) disposeModel(currentModel);
        rotation.add(group);
        currentModel = { group, geometry, edges, face, outline };
        renderer.render(scene, camera);
      },
    };

    return () => {
      controllerRef.current = null;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      mount.removeEventListener("pointerdown", pointerDown);
      mount.removeEventListener("pointermove", pointerMove);
      mount.removeEventListener("pointerup", pointerUp);
      mount.removeEventListener("pointercancel", pointerUp);
      mount.removeEventListener("lostpointercapture", pointerUp);
      mount.removeEventListener("keydown", keyDown);
      if (currentModel) disposeModel(currentModel);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    let cancelled = false;
    setStatus("loading");

    void new STLLoader().loadAsync(url).then((geometry) => {
      if (cancelled) {
        geometry.dispose();
        return;
      }
      controller.replace(geometry);
      setStatus("ready");
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className={styles.viewer} ref={mountRef} role="group" tabIndex={0} aria-label={`Anteprima 3D di ${label}. Trascina o usa le frecce per ruotare il modello.`}>
      {status !== "ready" && (
        <span className={styles.status} role="status">
          {status === "loading" ? "Caricamento modello…" : "Anteprima 3D non disponibile"}
        </span>
      )}
    </div>
  );
}
