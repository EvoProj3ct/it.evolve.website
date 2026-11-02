"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import styles from "./EDisk.module.css";

export default function TurntableScene({ playing, reducedMotion }: { playing: boolean; reducedMotion: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playback = useRef({ playing, reducedMotion });
  playback.current = { playing, reducedMotion };
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
    camera.position.set(6.8, 7.1, 8.2);
    camera.lookAt(0, .05, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    pmrem.dispose();
    room.traverse(object => {
      if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose()); }
    });

    scene.add(new THREE.HemisphereLight(0xffffff, 0x768c76, 2.2));
    const light = new THREE.DirectionalLight(0xffffff, 4.5);
    light.position.set(-3, 9, 4);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    light.shadow.bias = -.001;
    light.shadow.normalBias = .035;
    scene.add(light);
    const edgeLight = new THREE.PointLight(0x9dea73, 15, 20);
    edgeLight.position.set(2, 4, -4);
    scene.add(edgeLight);

    const deck = new THREE.Group();
    deck.rotation.y = -.09;
    scene.add(deck);
    const metal = new THREE.MeshStandardMaterial({ color: "#d2e3d3", metalness: .5, roughness: .33 });
    const dark = new THREE.MeshStandardMaterial({ color: "#14231b", metalness: .45, roughness: .32 });
    const silver = new THREE.MeshStandardMaterial({ color: "#e2eee3", metalness: .92, roughness: .2 });
    const rubber = new THREE.MeshStandardMaterial({ color: "#26382b", roughness: .85 });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = deck) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(new RoundedBoxGeometry(6.4, .43, 4.75, 4, .16), metal, 0, 0, 0);
    add(new RoundedBoxGeometry(6.15, .11, 4.5, 3, .1), new THREE.MeshStandardMaterial({ color: "#dceadd", metalness: .24, roughness: .45 }), 0, .24, 0);
    for (const x of [-2.5, 2.5]) for (const z of [-1.7, 1.7]) add(new THREE.CylinderGeometry(.23, .25, .27, 28), rubber, x, -.31, z);
    add(new THREE.CylinderGeometry(1.78, 1.78, .13, 96), metal, -.65, .37, 0);
    add(new THREE.TorusGeometry(1.785, .022, 8, 128), silver, -.65, .4, 0).rotation.x = Math.PI / 2;

    const record = new THREE.Group();
    record.position.set(-.65, .49, 0);
    deck.add(record);
    const glass = new THREE.MeshPhysicalMaterial({ color: "#6fcd50", transmission: .74, thickness: .23, roughness: .13, ior: 1.45, metalness: 0, clearcoat: 1, clearcoatRoughness: .09, attenuationColor: new THREE.Color("#479a42"), attenuationDistance: 2.8 });
    add(new THREE.CylinderGeometry(1.96, 1.96, .075, 128), glass, 0, 0, 0, record);
    const grooveMaterial = new THREE.MeshBasicMaterial({ color: "#2b6a36", transparent: true, opacity: .29, depthWrite: false });
    for (let radius = .62; radius < 1.91; radius += .085) add(new THREE.TorusGeometry(radius, .0045, 4, 128), grooveMaterial, 0, .043, 0, record).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(1.97, .012, 6, 160), new THREE.MeshBasicMaterial({ color: "#b8f58c", transparent: true, opacity: .8 }), 0, .02, 0, record).rotation.x = Math.PI / 2;
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = labelCanvas.height = 256;
    const ink = labelCanvas.getContext("2d");
    if (ink) {
      ink.fillStyle = "#dcedce"; ink.fillRect(0, 0, 256, 256);
      ink.strokeStyle = "#80ad73"; ink.lineWidth = 2; ink.beginPath(); ink.arc(128, 128, 116, 0, Math.PI * 2); ink.stroke();
      ink.fillStyle = "#244e33"; ink.textAlign = "center"; ink.font = "34px Arial"; ink.fillText("e-disk", 128, 105);
      ink.font = "11px monospace"; ink.fillText("EVOLVE", 128, 171);
    }
    const texture = new THREE.CanvasTexture(labelCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = add(new THREE.CircleGeometry(.49, 64), new THREE.MeshBasicMaterial({ map: texture }), 0, .046, 0, record);
    label.rotation.x = -Math.PI / 2;
    add(new THREE.CylinderGeometry(.045, .045, .16, 24), silver, -.65, .59, 0);

    add(new THREE.CylinderGeometry(.28, .3, .17, 32), dark, 2.12, .42, -1.4);
    add(new THREE.CylinderGeometry(.18, .18, .29, 32), silver, 2.12, .59, -1.4);
    const arm = new THREE.Group();
    arm.position.set(2.12, .73, -1.4);
    deck.add(arm);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.22, 0, .5), new THREE.Vector3(.12, -.02, 1.3), new THREE.Vector3(-1, -.1, 2.2)]);
    add(new THREE.TubeGeometry(curve, 48, .047, 10, false), silver, 0, 0, 0, arm);
    const head = add(new THREE.BoxGeometry(.22, .12, .4), dark, -1, -.1, 2.2, arm);
    head.rotation.y = -.68;
    add(new THREE.CylinderGeometry(.015, .008, .15, 8), silver, -1.02, -.23, 2.23, arm);
    add(new THREE.CylinderGeometry(.17, .17, .18, 32), silver, 2.53, .39, 1.55);
    add(new THREE.CylinderGeometry(.09, .09, .035, 24), dark, 2.53, .5, 1.55);
    const ledMaterial = new THREE.MeshBasicMaterial({ color: "#57804e" });
    add(new THREE.SphereGeometry(.045, 12, 8), ledMaterial, 2.05, .35, 1.6);
    add(new THREE.BoxGeometry(.65, .035, .025), new THREE.MeshStandardMaterial({ color: "#4b6b49", roughness: .45 }), -2.4, .02, 2.39);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.ShadowMaterial({ color: "#406445", opacity: .16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.47;
    floor.receiveShadow = true;
    scene.add(floor);
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height);
      camera.aspect = bounds.width / bounds.height;
      camera.zoom = Math.min(1, camera.aspect / 1.05);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(host);
    let target = 0;
    const pointer = (event: PointerEvent) => { if (event.pointerType === "mouse") { const box = host.getBoundingClientRect(); target = ((event.clientX - box.left) / box.width - .5) * .16; } };
    const leave = () => { target = 0; };
    host.addEventListener("pointermove", pointer);
    host.addEventListener("pointerleave", leave);
    let frame = 0, previous = 0, speed = 0;
    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      if (!visible || now - previous < 30) return;
      const dt = previous ? Math.min((now - previous) / 1000, .05) : .03;
      previous = now;
      const active = playback.current.playing;
      const reduced = playback.current.reducedMotion;
      speed += ((active && !reduced ? .85 : 0) - speed) * Math.min(1, dt * 2.4);
      record.rotation.y -= speed * dt;
      arm.rotation.y += ((active ? -.28 : .12) - arm.rotation.y) * (reduced ? 1 : Math.min(1, dt * 2));
      deck.rotation.y += ((reduced ? -.09 : -.09 + target) - deck.rotation.y) * .06;
      ledMaterial.color.set(active ? "#8ee76a" : "#57804e");
      renderer.render(scene, camera);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect();
      host.removeEventListener("pointermove", pointer); host.removeEventListener("pointerleave", leave);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)); } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      texture.dispose(); environment.dispose(); light.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className={styles.scene} role="img" aria-label="Giradischi tridimensionale con disco verde trasparente">{fallback && <div className={styles.sceneFallback} data-playing={playing}><div /><span /></div>}</div>;
}
