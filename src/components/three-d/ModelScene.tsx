"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { modelAssets } from "./modelAssets";
import styles from "./ModelScene.module.css";

type ModelSceneProps = { progress: number };
type SceneController = { setProgress: (progress: number) => void };
type ModelEntry = {
  group: THREE.Group;
  geometry: THREE.BufferGeometry;
  edgesGeometry: THREE.EdgesGeometry;
  face: THREE.MeshStandardMaterial;
  edgeMaterial: THREE.LineBasicMaterial;
  height: number;
};

function ease(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

export function ModelScene({ progress }: ModelSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SceneController | null>(null);
  const [unavailable, setUnavailable] = useState(false);

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
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100);
    camera.up.set(0, 0, -1);
    const ambient = new THREE.AmbientLight(0xffffff, 2.2);
    const directional = new THREE.DirectionalLight(0xcde8d1, 3);
    directional.position.set(-4, 8, 6);
    scene.add(ambient, directional);
    const assembly = new THREE.Group();
    scene.add(assembly);
    const models: ModelEntry[] = [];

    let target = 0;
    let current = 0;
    let frame = 0;
    let disposed = false;

    const draw = () => {
      const cameraLift = ease((current - .18) / .44);
      const lift = ease((current - .1) / .52);
      const turn = ease((current - .66) / .3);
      const cameraPosition = new THREE.Vector3(0, 12, .001).lerp(new THREE.Vector3(6.7, 7, 9.3), cameraLift);
      const mobile = window.innerWidth <= 800;
      const focusHeight = mobile ? lift * 1.1 : 0;
      camera.position.copy(cameraPosition);
      camera.position.y += focusHeight;
      camera.lookAt(0, .3 + focusHeight, 0);
      if (mobile) {
        const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        camera.position.addScaledVector(screenUp, -camera.top * .16);
      }
      camera.updateProjectionMatrix();
      assembly.rotation.y = turn * .7;
      assembly.rotation.x = turn * .1;

      models.forEach(({ group, face, height }) => {
        const depth = .025 + .975 * lift;
        group.scale.y = depth;
        group.position.y = height * depth / 2;
        face.opacity = .16 + lift * .66;
      });
      renderer.render(scene, camera);
    };

    const tick = () => {
      frame = 0;
      current += (target - current) * .115;
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
      const compactSpan = aspect < .85 ? 3.7 : 3.25;
      const span = window.innerWidth <= 800
        ? Math.max(aspect < .85 ? 4.8 : 4.3, 3.35 / aspect)
        : width <= 800 ? compactSpan : (aspect < .85 ? 4.6 : 4.05);
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
    controllerRef.current = {
      setProgress(value) {
        target = Math.min(1, Math.max(0, value));
        schedule();
      },
    };
    controllerRef.current.setProgress(progress);

    const loader = new STLLoader();
    void Promise.allSettled(modelAssets.map(({ url }) => loader.loadAsync(url))).then((results) => {
      if (disposed) {
        results.forEach((result) => {
          if (result.status === "fulfilled") result.value.dispose();
        });
        return;
      }

      results.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const config = modelAssets[index];
        const geometry = result.value;

        // The STL extrusion axis becomes vertical: the first frame shows its 2D profile.
        geometry.rotateX(-Math.PI / 2);
        geometry.computeBoundingBox();
        const extent = new THREE.Vector3();
        geometry.boundingBox?.getSize(extent);
        const longestSide = Math.max(extent.x, extent.y, extent.z);
        if (!Number.isFinite(longestSide) || longestSide <= 0) {
          geometry.dispose();
          return;
        }
        const scale = config.size / longestSide;
        geometry.scale(scale, scale, scale);
        geometry.center();
        geometry.computeBoundingBox();

        const face = new THREE.MeshStandardMaterial({
          color: config.color,
          roughness: .7,
          metalness: .04,
          transparent: true,
          opacity: .16,
          side: THREE.DoubleSide,
          depthWrite: true,
        });
        const edgesGeometry = new THREE.EdgesGeometry(geometry, 34);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x92dd72, transparent: true, opacity: .78 });
        const group = new THREE.Group();
        group.position.set(config.x, 0, config.z);
        group.add(new THREE.Mesh(geometry, face), new THREE.LineSegments(edgesGeometry, edgeMaterial));
        assembly.add(group);
        models.push({
          group,
          geometry,
          edgesGeometry,
          face,
          edgeMaterial,
          height: (geometry.boundingBox?.max.y ?? 0) - (geometry.boundingBox?.min.y ?? 0),
        });
      });

      if (models.length === 0) setUnavailable(true);
      draw();
    });

    return () => {
      disposed = true;
      controllerRef.current = null;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      models.forEach(({ geometry, edgesGeometry, face, edgeMaterial }) => {
        geometry.dispose();
        edgesGeometry.dispose();
        face.dispose();
        edgeMaterial.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // The scene is created once; subsequent scroll values only update its controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.setProgress(progress);
  }, [progress]);

  return (
    <div className={styles.scene} ref={mountRef}>
      {unavailable && <div className={styles.fallback}>Anteprima 3D non disponibile</div>}
    </div>
  );
}
