import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { KeyringShape, ProductConfiguration } from "./products";

export type RecordAppearance = { title: string; color: string };
export type ProductModel = { group: THREE.Group; record?: THREE.Group; setRecordAppearance?: (appearance?: RecordAppearance) => void };

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

function roundedRectangle(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function keyringOutline(kind: KeyringShape) {
  let shape: THREE.Shape;
  if (kind === "circle") {
    shape = new THREE.Shape();
    shape.absarc(0, 0, 1.8, 0, Math.PI * 2, false);
  } else if (kind === "triangle") {
    shape = new THREE.Shape();
    shape.moveTo(-.12, 1.71);
    shape.quadraticCurveTo(0, 1.92, .12, 1.71);
    shape.lineTo(1.78, -1.16);
    shape.quadraticCurveTo(1.91, -1.38, 1.65, -1.38);
    shape.lineTo(-1.65, -1.38);
    shape.quadraticCurveTo(-1.91, -1.38, -1.78, -1.16);
    shape.closePath();
  } else shape = roundedRectangle(kind === "square" ? 3.2 : 3.8, kind === "square" ? 3.2 : 2.65, .4);
  const topY = kind === "triangle" ? 1.815 : kind === "circle" ? 1.8 : kind === "square" ? 1.6 : 1.325;
  const holeY = kind === "triangle" ? 1.15 : topY - .34;
  const holeX = kind === "rectangle" ? 1.45 : kind === "square" ? 1.15 : 0;
  const hole = new THREE.Path();
  hole.absarc(holeX, holeY, .16, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return { shape, holeX, holeY, topY };
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

export function createKeyring(configuration: ProductConfiguration, font: Font | null, primary: THREE.MeshStandardMaterial, secondary: THREE.MeshStandardMaterial, onError: (message: string) => void): ProductModel {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.x = -Math.PI / 2;
  body.rotation.z = -.18;
  body.position.y = -.23;
  group.add(body);
  const { shape, holeX, holeY, topY } = keyringOutline(configuration.shape);
  const edge = new THREE.MeshStandardMaterial({ color: "#829ba3", roughness: .48, metalness: .06 });
  // Il bordo neutro riprende il piccolo marchio: la superficie rimane del colore scelto.
  add(body, new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .02, bevelThickness: .02, curveSegments: 40 }), [primary, edge]);
  const chainMetal = new THREE.MeshStandardMaterial({ color: "#b6bfbb", metalness: .92, roughness: .26 });
  const ovalLink = (centerY: number, halfLength: number, halfWidth: number, vertical: boolean, wire: number) => {
    const points = new THREE.EllipseCurve(0, 0, halfWidth, halfLength, 0, Math.PI * 2, false, 0).getPoints(64).slice(0, -1);
    const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(holeX + (vertical ? 0 : point.x), centerY + point.y, .065 + (vertical ? point.x : 0))), true);
    return add(body, new THREE.TubeGeometry(path, 96, wire, 10, true), chainMetal);
  };
  // Il raccordo attraversa il foro e scavalca il bordo, sopra e sotto la base.
  // Le maglie successive si alternano di 90° e si sovrappongono nello spazio vuoto.
  const connectorHalfLength = (topY - holeY) / 2 + .11;
  const connectorCenter = (topY + holeY) / 2;
  ovalLink(connectorCenter, connectorHalfLength, .25, true, .025);
  const firstLinkY = connectorCenter + connectorHalfLength + .12;
  for (let index = 0; index < 6; index++) ovalLink(firstLinkY + index * .26, .185, .11, index % 2 === 1, .022);
  const ringY = firstLinkY + 5 * .26 + .45;
  // Due spire ravvicinate, unite alle estremità: il classico anello apribile.
  const splitRingPoints = Array.from({ length: 193 }, (_, index) => {
    const angle = index / 192 * Math.PI * 4;
    return new THREE.Vector3(holeX + Math.cos(angle) * .36, ringY + Math.sin(angle) * .36, .04 + index / 192 * .055);
  });
  add(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(splitRingPoints), 192, .023, 10, false), chainMetal);
  const maxWidth = configuration.shape === "triangle" ? 1.7 : configuration.shape === "rectangle" ? 2.2 : 2.1;
  const centerY = configuration.shape === "triangle" ? -.45 : 0;
  if (configuration.text.trim() && font) {
    const safeText = [...configuration.text].filter(character => font.data.glyphs[character]).join("");
    const text = new THREE.Group();
    let cursor = 0;
    for (const character of safeText) {
      const glyph = font.data.glyphs[character];
      if (glyph.o?.trim()) {
        const material = safeText === "e-linker." && character === "." ? new THREE.MeshStandardMaterial({ color: "#72c94f", roughness: .45 }) : secondary;
        const letter = add(text, new TextGeometry(character, { font, size: 1, depth: .018, curveSegments: 12, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 2 }), material, cursor);
        letter.castShadow = false;
      }
      cursor += glyph.ha / font.data.resolution + .015;
    }
    if (text.children.length) {
      fitXY(text, maxWidth, configuration.logo ? .25 : .34, centerY - (configuration.logo ? .65 : 0));
      body.add(text);
    }
  }
  if (configuration.shape === "rectangle") {
    const accent = new THREE.MeshStandardMaterial({ color: "#72c94f", roughness: .45 });
    add(body, new THREE.BoxGeometry(.22, .025, .006), accent, -1.42, -.95, .154).castShadow = false;
    add(body, new THREE.BoxGeometry(.07, .025, .006), accent, -1.23, -.95, .154).castShadow = false;
    add(body, new THREE.CircleGeometry(.025, 16), edge, 1.45, -.95, .154).castShadow = false;
  }
  const logo = configuration.logo;
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
      fitXY(mark, maxWidth * .8, configuration.text.trim() ? .85 : 1.3, centerY + (configuration.text.trim() ? .25 : 0), true);
      body.add(mark);
    } catch {
      onError("Non riesco a leggere i tracciati del logo. Prova un SVG con forme piene e testo convertito in tracciati, oppure un PNG.");
    }
  } else if (logo?.kind === "image") {
    const logoMaterial = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const logoMesh = add(body, new THREE.PlaneGeometry(1, 1), logoMaterial, 0, centerY + (configuration.text.trim() ? .25 : 0), .154);
    const texture = new THREE.TextureLoader().load(logo.data, loaded => {
      if (group.userData.disposed) { loaded.dispose(); return; }
      const image = loaded.image as HTMLImageElement;
      const ratio = image.width / Math.max(1, image.height);
      const height = Math.min(configuration.text.trim() ? .95 : 1.4, maxWidth * .8 / ratio);
      logoMesh.scale.set(height * ratio, height, 1);
    }, undefined, () => { if (!group.userData.disposed) onError("L’immagine non è leggibile. Prova un altro file PNG o JPG."); });
    texture.colorSpace = THREE.SRGBColorSpace;
    logoMaterial.map = texture;
  }
  // Centra l'intero oggetto, compresa la catena, anche durante la rotazione libera.
  body.position.sub(new THREE.Box3().setFromObject(body).getCenter(new THREE.Vector3()));
  group.scale.setScalar(1.12);
  return { group };
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
