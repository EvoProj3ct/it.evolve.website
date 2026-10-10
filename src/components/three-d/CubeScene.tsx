"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./CubeScene.module.css";

type CubeSceneProps = { progress: number };
type SceneController = { setProgress: (progress: number) => void };

const cubePositions = [
  { x: -1.85, z: .7, size: 1.35, height: 1.3 },
  { x: 0, z: -.55, size: 1.65, height: 1.7 },
  { x: 1.85, z: .6, size: 1.2, height: 1.15 },
] as const;

function ease(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

export function CubeScene({ progress }: CubeSceneProps) {
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

    const cubes = cubePositions.map(({ x, z, size, height }, index) => {
      const geometry = new THREE.BoxGeometry(size, height, size);
      const face = new THREE.MeshStandardMaterial({
        color: index === 1 ? 0x396e48 : 0x295839,
        roughness: .65,
        metalness: .06,
        transparent: true,
        opacity: .14,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      const edge = new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({ color: 0x92dd72 }));
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.add(new THREE.Mesh(geometry, face), edge);
      assembly.add(group);
      return { group, geometry, edgesGeometry, face, edgeMaterial: edge.material as THREE.LineBasicMaterial, height };
    });

    let target = 0;
    let current = 0;
    let frame = 0;
    let disposed = false;

    const draw = () => {
      const cameraLift = ease((current - .18) / .44);
      const lift = ease((current - .1) / .52);
      const turn = ease((current - .66) / .3);
      const cameraPosition = new THREE.Vector3(0, 12, .001).lerp(new THREE.Vector3(6.7, 7, 9.3), cameraLift);
      camera.position.copy(cameraPosition);
      camera.lookAt(0, .3, 0);
      camera.updateProjectionMatrix();
      assembly.rotation.y = turn * .7;
      assembly.rotation.x = turn * .1;

      cubes.forEach(({ group, face, height }) => {
        const depth = .025 + .975 * lift;
        group.scale.y = depth;
        group.position.y = height * depth / 2;
        face.opacity = .12 + lift * .62;
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
      const span = aspect < .85 ? 4.6 : 4.05;
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

    return () => {
      disposed = true;
      controllerRef.current = null;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      cubes.forEach(({ geometry, edgesGeometry, face, edgeMaterial }) => {
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
      {unavailable && <div className={styles.fallback} aria-hidden="true"><i /><i /><i /></div>}
    </div>
  );
}
