import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { KeyringFace } from "@evolve/ecommerce-server/keyring-design";
import type { ProductConfiguration } from "./products";
import { keyringDepth, keyringHoleRadius, keyringHoles, keyringLetteringLayout, keyringLogoLayout, keyringOutline } from "./keyringGeometry";
import type { KeyringChainRig } from "./KeyringChainPhysics";

export type RecordAppearance = { title: string; color: string };
export type ProductModel = {
  group: THREE.Group; record?: THREE.Group; setRecordAppearance?: (appearance?: RecordAppearance) => void; chain?: KeyringChainRig;
  keyring?: { body: THREE.Group; depth: number; letters: Partial<Record<KeyringFace, THREE.Group>> };
};

function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function labelTexture(text: string, background: string, color: string, square = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = square ? 512 : 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, 512, canvas.height);
    context.fillStyle = color;
    context.textAlign = "center";
    context.font = "bold 70px Arial, sans-serif";
    context.fillText(text, 256, square ? 245 : 135, 400);
    context.font = "20px monospace";
    context.fillText("EVOLVE", 256, square ? 315 : 185);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Modello di presentazione derivato dalle proporzioni del giradischi dell'app.
export function createTurntable(primary: THREE.MeshStandardMaterial, secondary: THREE.MeshStandardMaterial): ProductModel {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: "#111417", roughness: .4, metalness: .16 });
  const hardware = new THREE.MeshPhysicalMaterial({ color: "#16191d", roughness: .3, metalness: .4, clearcoat: .25 });
  add(group, new RoundedBoxGeometry(6.4, .62, 4.75, 4, .18), primary);
  add(group, new RoundedBoxGeometry(6.12, .14, 4.47, 4, .13), secondary, 0, .35);
  for (const x of [-2.45, 2.45]) for (const z of [-1.65, 1.65]) add(group, new THREE.CylinderGeometry(.23, .26, .28, 24), dark, x, -.43, z);
  add(group, new THREE.CylinderGeometry(1.84, 1.84, .15, 96), hardware, -.65, .49);
  const record = new THREE.Group();
  record.position.set(-.65, .61, 0);
  group.add(record);
  const vinyl = new THREE.MeshPhysicalMaterial({ color: "#090b0e", roughness: .24, metalness: .12, clearcoat: .65, clearcoatRoughness: .23 });
  add(record, new THREE.CylinderGeometry(1.94, 1.94, .09, 128), vinyl).castShadow = false;
  const grooves = new THREE.MeshStandardMaterial({ color: "#25282d", roughness: .3, metalness: .28 });
  for (let radius = .65; radius < 1.9; radius += .09) {
    const groove = add(record, new THREE.TorusGeometry(radius, .003, 4, 128), grooves, 0, .05);
    groove.rotation.x = Math.PI / 2;
    groove.castShadow = false;
    groove.receiveShadow = false;
  }
  const recordLabel = new THREE.MeshBasicMaterial({ map: labelTexture("e-disk", "#eae9da", "#101914", true) });
  const label = add(record, new THREE.CircleGeometry(.57, 64), recordLabel, 0, .055);
  label.castShadow = false;
  label.rotation.x = -Math.PI / 2;
  add(group, new THREE.CylinderGeometry(.045, .045, .14, 24), hardware, -.65, .75);
  add(group, new THREE.CylinderGeometry(.29, .31, .16, 32), dark, 2.1, .51, -1.4);
  add(group, new THREE.CylinderGeometry(.17, .17, .3, 32), hardware, 2.1, .71, -1.4);
  const arm = new THREE.Group();
  arm.position.set(2.1, .88, -1.4);
  group.add(arm);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(.15, 0, .6), new THREE.Vector3(.1, -.02, 1.25), new THREE.Vector3(-.9, -.08, 2.15)]);
  add(arm, new THREE.TubeGeometry(curve, 64, .05, 12, false), hardware);
  const head = add(arm, new RoundedBoxGeometry(.27, .15, .42, 3, .025), dark, -.9, -.08, 2.15);
  head.rotation.y = -.65;
  add(group, new THREE.CylinderGeometry(.2, .2, .2, 40), hardware, 2.5, .55, 1.55);
  add(group, new THREE.CylinderGeometry(.12, .12, .04, 32), dark, 2.5, .67, 1.55);
  add(group, new THREE.SphereGeometry(.05, 12, 8), new THREE.MeshBasicMaterial({ color: "#c1ff00" }), 1.95, .48, 1.55);
  const brand = add(group, new THREE.PlaneGeometry(.82, .38), new THREE.MeshStandardMaterial({ map: labelTexture("evolve", "#101914", "#f5f1e8"), roughness: .8 }), -2.3, .04, 2.381);
  brand.rotation.x = 0;
  return { group, record, setRecordAppearance: appearance => {
    vinyl.color.set(appearance?.color ?? "#090b0e");
    recordLabel.map?.dispose();
    recordLabel.map = labelTexture(appearance?.title ?? "e-disk", "#eae9da", "#101914", true);
    recordLabel.needsUpdate = true;
  } };
}

function fitXY(object: THREE.Object3D, width: number, height: number, y: number, flipY = false) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = Math.min(width / Math.max(.001, size.x), height / Math.max(.001, size.y));
  object.scale.set(scale, flipY ? -scale : scale, 1);
  object.position.x = -center.x * scale;
  object.position.y = y - center.y * (flipY ? -scale : scale);
  object.position.z = .152;
}

export function createKeyring(configuration: ProductConfiguration, font: Font | null, primary: THREE.MeshStandardMaterial, secondary: THREE.MeshStandardMaterial, onError: (message: string) => void, withChain = true): ProductModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.x = -Math.PI / 2;
  body.rotation.z = -.18;
  body.position.y = -.23;
  group.add(body);
  const shape = new THREE.Shape(keyringOutline(configuration.shape).map(({ x, y }) => new THREE.Vector2(x, y)));
  shape.closePath();
  const holes = keyringHoles(configuration.shape);
  const hole = holes.find(point => point.id === configuration.keyring.hole) ?? holes[0];
  const bore = new THREE.Path();
  bore.absarc(hole.x, hole.y, keyringHoleRadius, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const depth = keyringDepth(configuration.shape);
  const edge = new THREE.MeshStandardMaterial({ color: "#829ba3", roughness: .48, metalness: .06 });
  // Il bordo neutro riprende il piccolo marchio: la superficie rimane del colore scelto.
  const base = add(body, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .02, bevelThickness: .02, curveSegments: 40 }), [primary, edge]);
  let chain: KeyringChainRig | undefined;
  if (withChain) {
    const chainMetal = new THREE.MeshStandardMaterial({ color: "#b6bfbb", metalness: .92, roughness: .26 });
    const ovalGeometry = (halfLength: number, halfWidth: number) => {
      const points = new THREE.EllipseCurve(0, 0, halfWidth, halfLength, 0, Math.PI * 2, false, 0).getPoints(64).slice(0, -1);
      return new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(point.x, point.y, 0)), true);
    };
    // Il raccordo rimane fissato attraverso il foro; le sei maglie e l'anello sono mobili.
    const connectorHalfLength = hole.reach / 2 + .11;
    const hinge = new THREE.Group();
    hinge.position.set(hole.x, hole.y, depth / 2);
    hinge.rotation.z = Math.atan2(-hole.dx, hole.dy);
    body.add(hinge);
    const connector = add(hinge, new THREE.TubeGeometry(ovalGeometry(connectorHalfLength, depth / 2 + .18), 96, .025, 10, true), chainMetal, 0, hole.reach / 2);
    connector.rotation.y = Math.PI / 2;
    const reach = hole.reach + .11;
    const at = (distance: number) => [hole.x + hole.dx * distance, hole.y + hole.dy * distance, depth / 2] as const;
    const links = Array.from({ length: 6 }, (_, index) => {
      const mesh = add(body, new THREE.TubeGeometry(ovalGeometry(.185, .11), 64, .022, 10, true), chainMetal, ...at(reach + .12 + index * .26));
      mesh.rotation.y = index % 2 === 1 ? Math.PI / 2 : 0;
      mesh.rotation.z = hinge.rotation.z;
      return mesh;
    });
    const splitRingPoints = Array.from({ length: 193 }, (_, index) => {
      const angle = index / 192 * Math.PI * 4;
      return new THREE.Vector3(Math.cos(angle) * .36, Math.sin(angle) * .36, -.025 + index / 192 * .055);
    });
    const ring = add(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(splitRingPoints), 192, .023, 10, false), chainMetal, ...at(reach + 1.87));
    chain = { body, outline: shape, depth, anchor: new THREE.Vector3(...at(reach - .01)), links, ring };
  }
  const letters: Partial<Record<KeyringFace, THREE.Group>> = {};
  for (const face of ["front", "back"] as const) {
    const style = configuration.keyring[face];
    const inscription = face === "front" ? configuration.text : configuration.keyring.back.text;
    if (!inscription.trim() || !font) continue;
    const safeText = [...inscription.trim()].filter(character => font.data.glyphs[character]).join("");
    const vertical = style.orientation === "vertical";
    const text = new THREE.Group();
    let cursor = 0;
    for (const character of safeText) {
      const glyph = font.data.glyphs[character];
      if (glyph.o?.trim()) {
        const material = face === "front" && safeText === "e-linker." && character === "." ? new THREE.MeshStandardMaterial({ color: "#72c94f", roughness: .45 }) : secondary;
        const geometry = new TextGeometry(character, { font, size: 1, depth: .018, curveSegments: 12, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 2 });
        if (vertical) {
          geometry.computeBoundingBox();
          const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
          geometry.translate(-center.x, -center.y, 0);
        }
        const letter = add(text, geometry, material, vertical ? 0 : cursor, vertical ? -cursor : 0);
        letter.castShadow = false;
      }
      cursor += vertical ? 1.06 : glyph.ha / font.data.resolution + .015;
    }
    if (text.children.length) {
      const layout = keyringLetteringLayout(configuration.shape, style, safeText, face === "front" && !!configuration.logo);
      const lettering = new THREE.Group();
      fitXY(text, layout.width, layout.height, 0);
      text.position.z = 0;
      lettering.add(text);
      const back = face === "back";
      lettering.position.set(back ? -layout.x : layout.x, layout.y, back ? -.022 : depth + .022);
      if (back) lettering.rotation.y = Math.PI;
      body.add(lettering);
      letters[face] = lettering;
    }
  }
  if (configuration.shape === "rectangle") {
    if (Math.hypot(hole.x + 1.34, hole.y + .95) > .42) {
      const accent = new THREE.MeshStandardMaterial({ color: "#72c94f", roughness: .45 });
      add(body, new THREE.BoxGeometry(.22, .025, .006), accent, -1.42, -.95, .154).castShadow = false;
      add(body, new THREE.BoxGeometry(.07, .025, .006), accent, -1.23, -.95, .154).castShadow = false;
    }
    if (Math.hypot(hole.x - 1.45, hole.y + .95) > .3)
      add(body, new THREE.CircleGeometry(.025, 16), edge, 1.45, -.95, .154).castShadow = false;
  }
  const logo = configuration.logo;
  const logoLayout = keyringLogoLayout(configuration.shape, !!configuration.text.trim());
  if (logo?.kind === "svg") {
    try {
      const parsed = new SVGLoader().parse(logo.data);
      const mark = new THREE.Group();
      for (const path of parsed.paths) {
        const pathStyle = path.userData.style as { fill?: string } | undefined;
        if (pathStyle?.fill === "none") continue;
        for (const outline of SVGLoader.createShapes(path)) add(mark, new THREE.ExtrudeGeometry(outline, { depth: .018, bevelEnabled: false, curveSegments: 12 }), secondary);
      }
      if (!mark.children.length) throw new Error("empty logo");
      fitXY(mark, logoLayout.width, logoLayout.height, logoLayout.y, true);
      mark.position.z = depth + .022;
      body.add(mark);
    } catch {
      onError("Non riesco a leggere i tracciati del logo. Prova un SVG con forme piene e testo convertito in tracciati, oppure un PNG.");
    }
  } else if (logo?.kind === "image") {
    const logoMaterial = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const logoMesh = add(body, new THREE.PlaneGeometry(1, 1), logoMaterial, 0, logoLayout.y, depth + .024);
    const texture = new THREE.TextureLoader().load(logo.data, loaded => {
      if (group.userData.disposed) { loaded.dispose(); return; }
      const image = loaded.image as HTMLImageElement;
      const ratio = image.width / Math.max(1, image.height);
      const height = Math.min(logoLayout.height, logoLayout.width / ratio);
      logoMesh.scale.set(height * ratio, height, 1);
    }, undefined, () => { if (!group.userData.disposed) onError("L’immagine non è leggibile. Prova un altro file PNG o JPG."); });
    texture.colorSpace = THREE.SRGBColorSpace;
    logoMaterial.map = texture;
  }
  // La centratura segue il corpo, senza inseguire l'oscillazione della catena.
  body.position.sub(new THREE.Box3().setFromObject(base).getCenter(new THREE.Vector3()));
  group.scale.setScalar(1.12);
  return { group, chain, keyring: { body, depth, letters } };
}

export function disposeModel(root: THREE.Object3D, sharedMaterials: THREE.Material[] = []) {
  root.userData.disposed = true;
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (!sharedMaterials.includes(material)) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => {
    const map = (material as THREE.MeshStandardMaterial).map;
    map?.dispose();
    material.dispose();
  });
}
