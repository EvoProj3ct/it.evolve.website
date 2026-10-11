"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import styles from "./AgentHardwareScene.module.css";

type Props = {
  progress: number;
  mode: "rotate" | "explode";
  activePart: number;
  hoverPart?: number | null;
  onAnchorsChange?: (anchors: Array<{ x: number; y: number }>) => void;
  onHoverPartChange?: (part: number | null) => void;
};

type Controller = { update: (progress: number, activePart: number, hoverPart: number | null) => void };

function ease(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function box(
  parent: THREE.Group,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  color: number,
  opacity = 1,
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: .62,
    metalness: .08,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  if (opacity < 1) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x8ade71, transparent: true, opacity: .68 }),
    );
    edges.position.copy(mesh.position);
    parent.add(edges);
  }
  return mesh;
}

function createBrandTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#a9ee91";
    context.font = "700 44px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("YOUR BRAND", 256, 80);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function AgentHardwareScene({ progress, mode, activePart, hoverPart = null, onAnchorsChange, onHoverPartChange }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const onAnchorsChangeRef = useRef(onAnchorsChange);
  const onHoverPartChangeRef = useRef(onHoverPartChange);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    onAnchorsChangeRef.current = onAnchorsChange;
  }, [onAnchorsChange]);

  useEffect(() => {
    onHoverPartChangeRef.current = onHoverPartChange;
  }, [onHoverPartChange]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setUnavailable(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xe8f7e7, 2.1));
    const light = new THREE.DirectionalLight(0xa2ed9b, 3.2);
    light.position.set(-4, 7, 8);
    scene.add(light);
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100);
    camera.position.set(6, 6.5, 8);
    camera.lookAt(0, mode === "explode" ? .7 : .15, 0);

    const assembly = new THREE.Group();
    scene.add(assembly);
    const board = new THREE.Group();
    const network = new THREE.Group();
    const cooling = new THREE.Group();
    const caseBase = new THREE.Group();
    const caseLid = new THREE.Group();
    assembly.add(board);
    if (mode === "explode") assembly.add(network, cooling, caseBase, caseLid);
    const componentGroups = [board, network, cooling, caseLid, caseBase];

    // Immediate visual while the CC0 STL is loading.
    const placeholder = new THREE.Group();
    box(placeholder, 3.4, .08, 2.18, 0, -.18, 0, 0x277443, .9);
    box(placeholder, .76, .18, .7, -.3, -.02, 0, 0x1a4730);
    box(placeholder, .52, .4, .55, 1.48, .04, -.47, 0x648c6a);
    box(placeholder, .55, .28, .42, 1.47, -.02, .54, 0x648c6a);
    board.add(placeholder);

    if (mode === "explode") {
      // The extra parts are conceptual Evolve assembly elements, separate from the sourced board.
      box(network, .67, .42, .8, 0, 0, 0, 0x1e4c32, .86);
      box(network, .5, .23, .45, .03, .06, 0, 0x96bf9d, .8);
      const networkLight = new THREE.Mesh(
        new THREE.SphereGeometry(.055, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x94ed76 }),
      );
      networkLight.position.set(.18, .14, .42);
      network.add(networkLight);

      box(cooling, 1.05, .12, .98, 0, 0, 0, 0x2e7650, .88);
      for (let index = 0; index < 7; index += 1) {
        box(cooling, .055, .38, .9, -.43 + index * .14, .22, 0, 0x6fa782, .9);
      }

      box(caseBase, 3.82, .14, 2.54, 0, -.57, 0, 0x173f27, .4);
      box(caseBase, 3.82, .45, .12, 0, -.34, -1.21, 0x173f27, .38);
      box(caseBase, 3.82, .45, .12, 0, -.34, 1.21, 0x173f27, .38);
      box(caseBase, .12, .45, 2.31, -1.85, -.34, 0, 0x173f27, .38);
      box(caseBase, .12, .45, 2.31, 1.85, -.34, 0, 0x173f27, .38);

      box(caseLid, 3.86, .1, 2.58, 0, .68, 0, 0x1b5c34, .24);
      for (let index = 0; index < 5; index += 1) {
        box(caseLid, 1.14, .025, .045, -.84, .745, -.46 + index * .2, 0x8ade71, .72);
      }
    }

    const brandTexture = mode === "explode" ? createBrandTexture() : null;
    if (brandTexture) {
      const brand = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, .33),
        new THREE.MeshBasicMaterial({ map: brandTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      brand.rotation.x = -Math.PI / 2;
      brand.position.set(.79, .755, .04);
      caseLid.add(brand);
    }

    let target = 0;
    let current = 0;
    let selectedPart = 0;
    let hoveredPart: number | null = null;
    let frame = 0;
    let disposed = false;
    const originalOpacity = new WeakMap<THREE.Material, number>();
    const originalDepthWrite = new WeakMap<THREE.Material, boolean>();

    const draw = () => {
      if (mode === "rotate") {
        const turn = ease(current);
        assembly.rotation.set(-.12 - turn * .08, -.58 + turn * Math.PI * 2, -.03);
        board.position.set(0, 0, 0);
      } else {
        const networkReveal = ease((current - .18) / .27);
        const coolingReveal = ease((current - .39) / .27);
        const caseReveal = ease((current - .68) / .17);
        // The lid, cooling, board and tray share one assembly axis. They begin
        // apart, then travel farther along that same axis as the story advances.
        assembly.rotation.set(-.06, -.38, 0);
        board.position.set(0, 0, 0);
        network.position.set(3.5 + networkReveal, .08 + networkReveal * .2, -.55);
        cooling.position.set(0, 1.7 + coolingReveal * .5, 0);
        caseBase.position.set(0, -3.4 - caseReveal * .7, 0);
        caseLid.position.set(0, cooling.position.y + 3.2 + caseReveal * .2, 0);
        const reveals = [1, ease((current - .14) / .16), ease((current - .37) / .16), caseReveal, caseReveal];
        componentGroups.forEach((group, index) => {
          const reveal = reveals[index];
          group.visible = reveal > .002;
          group.userData.pickable = reveal > .5;
          const emphasis = (hoveredPart ?? selectedPart) === (index === 4 ? 3 : index) ? 1 : .72;
          const hovered = hoveredPart === (index === 4 ? 3 : index);
          group.traverse((object) => {
            if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              if (!originalOpacity.has(material)) {
                originalOpacity.set(material, material.opacity);
                originalDepthWrite.set(material, material.depthWrite);
              }
              const baseOpacity = originalOpacity.get(material) ?? 1;
              const nextTransparent = reveal < .999 || baseOpacity < .999;
              if (material.transparent !== nextTransparent) {
                material.transparent = nextTransparent;
                material.needsUpdate = true;
              }
              material.depthWrite = reveal >= .999 ? (originalDepthWrite.get(material) ?? true) : false;
              material.opacity = object instanceof THREE.LineSegments
                ? Math.min(1, .35 + .5 * emphasis + (hovered ? .15 : 0)) * reveal
                : baseOpacity * reveal;
              if (material instanceof THREE.MeshStandardMaterial) {
                material.emissive.setHex(hovered ? 0x68c953 : 0x000000);
                material.emissiveIntensity = hovered ? .42 : 0;
              }
            }
          });
        });
        camera.updateMatrixWorld(true);
        assembly.updateMatrixWorld(true);
        const projected = [
          new THREE.Vector3(0, 0, 0).applyMatrix4(board.matrixWorld),
          new THREE.Vector3(0, 0, 0).applyMatrix4(network.matrixWorld),
          new THREE.Vector3(0, .25, 0).applyMatrix4(cooling.matrixWorld),
          new THREE.Vector3(0, .68, 0).applyMatrix4(caseLid.matrixWorld),
        ].map((position) => {
          position.project(camera);
          return { x: (position.x + 1) / 2, y: (1 - position.y) / 2 };
        });
        onAnchorsChangeRef.current?.(projected);
      }
      renderer.render(scene, camera);
    };

    const tick = () => {
      frame = 0;
      current += (target - current) * .14;
      if (Math.abs(target - current) < .0005) current = target;
      draw();
      if (current !== target) frame = window.requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame && !disposed) frame = window.requestAnimationFrame(tick);
    };
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const aspect = width / height;
      const mobile = window.innerWidth <= 800;
      const span = mode === "rotate"
        ? (mobile ? Math.max(2.8, 2.2 / aspect) : 2.85)
        : (mobile ? Math.max(6.5, 5.7 / aspect) : 6.2);
      camera.left = -span * aspect;
      camera.right = span * aspect;
      camera.top = span;
      camera.bottom = -span;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clearHover = () => {
      if (hoveredPart === null) return;
      hoveredPart = null;
      renderer.domElement.style.cursor = "";
      onHoverPartChangeRef.current?.(null);
      draw();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (mode !== "explode" || event.pointerType === "touch") return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      let nextPart: number | null = null;
      for (const hit of raycaster.intersectObjects(componentGroups, true)) {
        if (!(hit.object instanceof THREE.Mesh)) continue;
        let part: THREE.Object3D | null = hit.object;
        while (part && part.parent !== assembly) part = part.parent;
        if (!part) continue;
        const index = componentGroups.indexOf(part as THREE.Group);
        if (index < 0 || !componentGroups[index].userData.pickable) continue;
        nextPart = index === 4 ? 3 : index;
        break;
      }
      if (nextPart === hoveredPart) return;
      hoveredPart = nextPart;
      renderer.domElement.style.cursor = nextPart === null ? "" : "pointer";
      onHoverPartChangeRef.current?.(nextPart);
      draw();
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", clearHover);
    controllerRef.current = {
      update(value, part, hover) {
        target = Math.min(1, Math.max(0, value));
        selectedPart = part;
        hoveredPart = hover;
        schedule();
      },
    };
    controllerRef.current.update(progress, activePart, hoverPart);

    const loader = new STLLoader();
    void loader.loadAsync("/models/agents/raspberry-pi-5.stl").then((geometry) => {
      if (disposed) {
        geometry.dispose();
        return;
      }
      geometry.computeBoundingBox();
      const extent = new THREE.Vector3();
      geometry.boundingBox?.getSize(extent);
      if (Math.max(extent.x, extent.y, extent.z) <= 0) {
        geometry.dispose();
        return;
      }
      geometry.scale(3.4 / Math.max(extent.x, extent.y, extent.z), 3.4 / Math.max(extent.x, extent.y, extent.z), 3.4 / Math.max(extent.x, extent.y, extent.z));
      geometry.center();
      geometry.computeVertexNormals();
      const face = new THREE.MeshStandardMaterial({
        color: 0x2b9b55,
        roughness: .67,
        metalness: .06,
        transparent: true,
        opacity: .76,
        side: THREE.DoubleSide,
      });
      const edges = new THREE.EdgesGeometry(geometry, 33);
      const outline = new THREE.LineBasicMaterial({ color: 0x91e774, transparent: true, opacity: .83 });
      const model = new THREE.Group();
      model.add(new THREE.Mesh(geometry, face), new THREE.LineSegments(edges, outline));
      board.remove(placeholder);
      placeholder.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) object.material.dispose();
        }
      });
      board.add(model);
      draw();
    }).catch(() => {
      // Keep the immediate schematic board if the external model cannot load.
      draw();
    });

    return () => {
      disposed = true;
      controllerRef.current = null;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", clearHover);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      brandTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Keep the WebGL scene stable; scroll only updates the controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    controllerRef.current?.update(progress, activePart, hoverPart);
  }, [progress, activePart, hoverPart]);

  return (
    <div className={styles.scene} ref={mountRef}>
      {unavailable && <div className={styles.fallback}>Anteprima 3D non disponibile</div>}
    </div>
  );
}
