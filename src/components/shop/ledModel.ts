import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { disposeModel } from "./productModels";
import type { LedConfiguration } from "./led";

export type LedModel = { group: THREE.Group; animate: (time: number, config: LedConfiguration, power: boolean, immediate?: boolean) => THREE.Color };

export function createLedModel(config: LedConfiguration, font: Font): LedModel {
  const group = new THREE.Group();
  const casing = new THREE.MeshPhysicalMaterial({ color: config.primary, roughness: .37, metalness: .09, clearcoat: .18 });
  const lights: { face: THREE.MeshStandardMaterial; trace: THREE.MeshBasicMaterial; phase: number }[] = [];
  const target = new THREE.Color(), average = new THREE.Color(), base = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  let contours = 0;
  const luminousShape = (shapes: THREE.Shape[], phase: number) => {
    const element = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shapes, { depth: .1, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 10 }), casing);
    body.castShadow = true; body.receiveShadow = true; element.add(body);
    const face = new THREE.MeshStandardMaterial({ color: "#bacbc4", emissive: config.secondary, emissiveIntensity: 1.5, roughness: .32, metalness: .02 });
    const diffuser = new THREE.Mesh(new THREE.ShapeGeometry(shapes, 10), face);
    diffuser.position.z = .114; element.add(diffuser);
    const trace = new THREE.MeshBasicMaterial({ color: new THREE.Color(config.secondary).multiplyScalar(4) });
    lights.push({ face, trace, phase });
    for (const shape of shapes) for (const path of [shape, ...shape.holes]) {
      const points = path.getPoints(10);
      contours += points.length;
      if (contours > 24000) throw new Error("Il logo è troppo complesso per il render luminoso. Prova un SVG più semplice.");
      if (points.length < 3) continue;
      if (points[0].distanceToSquared(points[points.length - 1]) < 1e-8) points.pop();
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, p.y, .125)), true, "centripetal");
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(240, Math.max(24, points.length * 2)), .009, 6, true), trace);
      element.add(tube);
    }
    return element;
  };
  const fit = (object: THREE.Group, width: number, height: number, flipY = false) => {
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.x) || size.x < .001 || size.y < .001) throw new Error("Il contenuto non contiene forme visibili. Usa un testo o un logo con tracciati pieni.");
    const scale = Math.min(width / size.x, height / size.y);
    object.scale.set(scale, flipY ? -scale : scale, 1);
    object.position.set(-center.x * scale, -center.y * scale * (flipY ? -1 : 1), 0);
  };
  try {
    const composition = new THREE.Group(); group.add(composition);
    const textVisible = config.mode !== "logo";
    const logoVisible = config.mode !== "text" && config.logo?.kind === "svg";
    if (!textVisible && !logoVisible) throw new Error("Carica un logo SVG per creare questa anteprima.");
    if (textVisible) {
      const word = new THREE.Group(), text = config.text.trim() || "LA TUA LUCE";
      composition.add(word);
      let cursor = 0;
      [...text].forEach((character, index) => {
        const glyph = font.data.glyphs[character];
        if (!glyph) return;
        const shapes = font.generateShapes(character, 1);
        if (shapes.length) {
          const letter = luminousShape(shapes, index / Math.max(1, text.length));
          letter.position.x = cursor; word.add(letter);
        }
        cursor += glyph.ha / font.data.resolution + .045;
      });
      fit(word, logoVisible ? 4.5 : 6.4, logoVisible ? 1.25 : 1.6);
      if (logoVisible) word.position.x += 1.05;
    }
    if (logoVisible && config.logo) {
      const mark = new THREE.Group(); composition.add(mark);
      const parsed = new SVGLoader().parse(config.logo.data);
      const outlines = parsed.paths.filter(path => {
        const style = path.userData.style as { fill?: string } | undefined;
        return style?.fill !== "none";
      }).flatMap(path => SVGLoader.createShapes(path));
      const bounds = new THREE.Box2().setFromPoints(outlines.flatMap(shape => shape.getPoints(10)));
      const size = bounds.getSize(new THREE.Vector2()), center = bounds.getCenter(new THREE.Vector2());
      if (!Number.isFinite(size.x) || size.x < .001 || size.y < .001) throw new Error("Il logo non contiene forme piene. Converti linee e testi in tracciati.");
      const scale = Math.min((textVisible ? 1.65 : 5) / size.x, (textVisible ? 1.65 : 2.4) / size.y);
      const points = (path: THREE.Path) => path.getPoints(10).map(p => new THREE.Vector2((p.x - center.x) * scale, -(p.y - center.y) * scale));
      outlines.forEach((source, index) => {
        // Normalizza prima dell'estrusione: anche SVG molto grandi mantengono lo stesso filo LED.
        const shape = new THREE.Shape(points(source)); shape.closePath();
        shape.holes = source.holes.map(hole => { const path = new THREE.Path(points(hole)); path.closePath(); return path; });
        mark.add(luminousShape([shape], index / Math.max(1, outlines.length)));
      });
      if (textVisible) mark.position.x = -2.65;
    }
    const bounds = new THREE.Box3().setFromObject(composition), center = bounds.getCenter(new THREE.Vector3());
    composition.position.sub(center); composition.position.z += .055;
    const size = bounds.getSize(new THREE.Vector3());
    // Una sottile traversa e distanziali rendono leggibile la struttura stampata.
    const rail = new THREE.Mesh(new RoundedBoxGeometry(Math.max(1.8, size.x * .88), .055, .06, 2, .015), casing);
    rail.position.set(0, -.1, -.075); group.add(rail);
    for (const x of [-Math.max(.65, size.x * .32), Math.max(.65, size.x * .32)]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .14, 16), casing);
      foot.rotation.x = Math.PI / 2; foot.position.set(x, -.1, -.16); group.add(foot);
    }
  } catch (error) {
    disposeModel(group);
    // I materiali creati prima di un contenuto non valido potrebbero non essere nel gruppo.
    casing.dispose(); lights.forEach(light => { light.face.dispose(); light.trace.dispose(); });
    throw error;
  }
  const naturalWidth = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3()).x;
  const nominalScale = Math.min(1, 6.4 / Math.max(.01, naturalWidth));
  return { group, animate(time, state, power, immediate = false) {
    const targetScale = nominalScale * (state.width / 100) ** .32;
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, targetScale, immediate ? 1 : .16));
    casing.color.lerp(target.set(state.primary), immediate ? 1 : .16);
    base.set(state.secondary).getHSL(hsl);
    const t = time;
    const modulation = state.effect === "breathe" ? .65 + .35 * Math.sin(t * 1.6) : state.effect === "pulse" ? .4 + .6 * ((Math.sin(t * 2.8) + 1) / 2) ** 2 : 1;
    const intensity = power ? state.brightness / 100 * modulation : 0;
    average.setRGB(0, 0, 0);
    lights.forEach(light => {
      if (state.effect === "flow") target.setHSL((hsl.h + t * .055 + light.phase * .24) % 1, .92, .6);
      else target.copy(base);
      light.face.emissive.lerp(target, immediate ? 1 : .16);
      light.face.emissiveIntensity = intensity * 2;
      light.face.color.setRGB(.13 + intensity * .45, .16 + intensity * .45, .15 + intensity * .45);
      light.trace.color.copy(light.face.emissive).multiplyScalar(intensity * 5 + .08);
      average.add(light.face.emissive);
    });
    if (lights.length) average.multiplyScalar(1 / lights.length * intensity);
    return average;
  } };
}
