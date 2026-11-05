import * as THREE from "three";

export type KeyringChainRig = {
  body: THREE.Group;
  outline: THREE.Shape;
  anchor: THREE.Vector3;
  links: THREE.Mesh[];
  ring: THREE.Mesh;
};

type ChainState = { positions: THREE.Vector3[]; velocities: THREE.Vector3[]; sides: THREE.Vector3[] };

// Collider cinematico: profilo reale estruso, compreso il foro e gli angoli raccordati.
class KeyringCollider {
  private loops: THREE.Vector2[][];
  private bounds = new THREE.Box2();
  private inverse = new THREE.Matrix4();
  private rotation = new THREE.Quaternion();
  private local = new THREE.Vector3();
  private normal = new THREE.Vector3();
  scale = 1;

  constructor(shape: THREE.Shape) {
    const points = shape.extractPoints(16);
    this.loops = [points.shape, ...points.holes];
    this.bounds.setFromPoints(points.shape);
  }

  pose(matrix: THREE.Matrix4, rotation: THREE.Quaternion, scale: number) {
    this.inverse.copy(matrix).invert(); this.rotation.copy(rotation); this.scale = scale;
  }

  project(point: THREE.Vector3, radius: number, correction: THREE.Vector3) {
    const p = this.local.copy(point).applyMatrix4(this.inverse);
    const r = radius / this.scale;
    if (p.x < this.bounds.min.x - r || p.x > this.bounds.max.x + r || p.y < this.bounds.min.y - r || p.y > this.bounds.max.y + r || p.z < -.02 - r || p.z > .18 + r) return false;
    let material = false, nearest = Infinity, nx = 0, ny = 0;
    for (const loop of this.loops) {
      let inside = false;
      for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
        const a = loop[j], b = loop[i];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
        if (length < 1e-12) continue;
        const t = THREE.MathUtils.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length, 0, 1);
        const ex = p.x - a.x - dx * t, ey = p.y - a.y - dy * t;
        const distance = ex * ex + ey * ey;
        if (distance < nearest) { nearest = distance; nx = ex; ny = ey; }
      }
      // Even-odd comprende anche il vuoto del foro.
      if (inside) material = !material;
    }
    const distance = Math.sqrt(nearest);
    const xy = material ? -distance : distance;
    const z = Math.abs(p.z - .08) - .1;
    const outsideXY = Math.max(xy, 0), outsideZ = Math.max(z, 0);
    const signed = Math.hypot(outsideXY, outsideZ) + Math.min(Math.max(xy, z), 0);
    if (signed >= r) return false;
    const direction = material ? -1 : 1;
    const inverseDistance = distance > 1e-8 ? direction / distance : 0;
    this.normal.set(nx * inverseDistance, ny * inverseDistance, 0);
    if (outsideXY > 0 && outsideZ > 0) this.normal.multiplyScalar(outsideXY).setZ(Math.sign(p.z - .08) * outsideZ);
    else if (z >= xy || distance < 1e-8) this.normal.set(0, 0, p.z >= .08 ? 1 : -1);
    correction.copy(this.normal).normalize().applyQuaternion(this.rotation).multiplyScalar((r - signed) * this.scale);
    return true;
  }
}

/** Catena a vincoli di distanza e contatti, indipendente dalla rotazione del corpo. */
export class KeyringChainPhysics {
  private positions = Array.from({ length: 8 }, () => new THREE.Vector3());
  private velocities = Array.from({ length: 8 }, () => new THREE.Vector3());
  private before = Array.from({ length: 8 }, () => new THREE.Vector3());
  private contacts = Array.from({ length: 8 }, () => new THREE.Vector3());
  private sides = Array.from({ length: 7 }, () => new THREE.Vector3());
  private masses = [0, 1, 1, 1, 1, 1, 1, .35];
  private collider: KeyringCollider;
  private gravity: THREE.Vector3;
  private down: THREE.Vector3;
  private right: THREE.Vector3;
  private front: THREE.Vector3;
  private lastPosition = new THREE.Vector3();
  private lastRotation = new THREE.Quaternion();
  private position = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private scale = new THREE.Vector3();
  private posePosition = new THREE.Vector3();
  private poseRotation = new THREE.Quaternion();
  private matrix = new THREE.Matrix4();
  private inverse = new THREE.Matrix4();
  private inverseRotation = new THREE.Quaternion();
  private basis = new THREE.Matrix4();
  private meshRotation = new THREE.Quaternion();
  private axis = new THREE.Vector3();
  private side = new THREE.Vector3();
  private normal = new THREE.Vector3();
  private center = new THREE.Vector3();
  private point = new THREE.Vector3();
  private correction = new THREE.Vector3();
  private delta = new THREE.Vector3();
  private initialized = false;
  private restored = false;
  private size = 1;

  constructor(private rig: KeyringChainRig, cameraOrientation: THREE.Quaternion) {
    this.collider = new KeyringCollider(rig.outline);
    this.down = new THREE.Vector3(0, -1, 0).applyQuaternion(cameraOrientation);
    this.gravity = this.down.clone().multiplyScalar(17);
    this.right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraOrientation);
    this.front = new THREE.Vector3(0, 0, 1).applyQuaternion(cameraOrientation);
  }

  snapshot(): ChainState | undefined {
    if (!this.initialized) return;
    return { positions: this.positions.map(p => p.clone()), velocities: this.velocities.map(v => v.clone()), sides: this.sides.map(s => s.clone()) };
  }

  restore(state: ChainState) {
    this.positions.forEach((p, i) => p.copy(state.positions[i]));
    this.velocities.forEach((v, i) => v.copy(state.velocities[i]));
    this.sides.forEach((s, i) => s.copy(state.sides[i]));
    this.restored = true;
  }

  reset() { this.initialized = false; this.restored = false; }

  private hang() {
    this.positions[0].copy(this.rig.anchor).applyMatrix4(this.matrix);
    for (let i = 1; i < 8; i++) {
      const length = (Math.min(i, 6) * .26 + (i === 7 ? .32 : 0)) * this.size;
      // Stato iniziale sul lato visibile del corpo; poi agiscono soltanto gravità e contatti.
      this.positions[i].copy(this.positions[0]).addScaledVector(this.down, length).addScaledVector(this.front, .2 * this.size + length * .5);
    }
    this.velocities.forEach(v => v.set(0, 0, 0));
    this.sides.forEach((s, i) => s.copy(i % 2 ? this.front : this.right));
  }

  private frame(index: number) {
    const a = this.positions[index], b = this.positions[index + 1];
    this.axis.subVectors(b, a);
    if (this.axis.lengthSq() < 1e-10) this.axis.copy(this.down);
    else this.axis.normalize();
    const side = this.sides[index];
    side.addScaledVector(this.axis, -side.dot(this.axis));
    if (side.lengthSq() < 1e-8) {
      side.copy(this.right).addScaledVector(this.axis, -this.right.dot(this.axis));
      if (side.lengthSq() < 1e-8) side.copy(this.front).addScaledVector(this.axis, -this.front.dot(this.axis));
    }
    this.side.copy(side.normalize());
    this.normal.crossVectors(this.side, this.axis).normalize();
    this.center.copy(b);
    if (index !== 6) this.center.add(a).multiplyScalar(.5);
  }

  private constrain() {
    for (let i = 0; i < 7; i++) {
      const a = this.positions[i], b = this.positions[i + 1];
      const wa = this.masses[i], wb = this.masses[i + 1];
      this.delta.subVectors(b, a);
      const distance = this.delta.length();
      if (distance < 1e-9) continue;
      const error = (distance - (i === 6 ? .32 : .26) * this.size) / distance;
      a.addScaledVector(this.delta, error * wa / (wa + wb));
      b.addScaledVector(this.delta, -error * wb / (wa + wb));
    }
  }

  private collide() {
    for (let i = 0; i < 7; i++) {
      const ring = i === 6, samples = ring ? 32 : 12;
      const length = (ring ? .36 : .185) * this.size;
      const width = (ring ? .36 : .11) * this.size;
      const rest = (ring ? .32 : .26) * this.size;
      for (let sample = 0; sample < samples; sample++) {
        this.frame(i);
        const angle = sample / samples * Math.PI * 2;
        const along = Math.sin(angle) * length;
        this.point.copy(this.center).addScaledVector(this.axis, along).addScaledVector(this.side, Math.cos(angle) * width);
        if (!this.collider.project(this.point, .032 * this.size, this.correction)) continue;
        const t = THREE.MathUtils.clamp((ring ? 1 : .5) + along / rest, 0, 1);
        const a = (1 - t) * this.masses[i], b = t * this.masses[i + 1];
        const weight = a * (1 - t) + b * t;
        if (weight < .02) continue;
        this.correction.clampLength(0, .06 * this.size);
        const relaxation = .7 / Math.max(.15, weight);
        this.positions[i].addScaledVector(this.correction, a * relaxation);
        this.positions[i + 1].addScaledVector(this.correction, b * relaxation);
        this.contacts[i].addScaledVector(this.correction, a);
        this.contacts[i + 1].addScaledVector(this.correction, b);
      }
    }
  }

  step(dt: number, reducedMotion: boolean) {
    this.rig.body.updateWorldMatrix(true, false);
    this.rig.body.matrixWorld.decompose(this.position, this.rotation, this.scale);
    this.size = this.scale.x;
    if (!this.initialized) {
      this.lastPosition.copy(this.position); this.lastRotation.copy(this.rotation);
      this.matrix.copy(this.rig.body.matrixWorld);
      if (!this.restored) {
        this.hang();
        this.collider.pose(this.matrix, this.rotation, this.size);
        // Risolve la posa iniziale senza trasformare l'assestamento in un impulso.
        for (let iteration = 0; iteration < 36; iteration++) { this.constrain(); this.collide(); }
      }
      this.initialized = true;
    }
    const angularSteps = Math.ceil(this.lastRotation.angleTo(this.rotation) / .06);
    const steps = reducedMotion ? 1 : Math.min(24, Math.max(1, angularSteps, Math.ceil(Math.min(dt, .05) * 120)));
    const h = Math.min(dt, .05) / steps;
    for (let step = 0; step < steps; step++) {
      const alpha = (step + 1) / steps;
      this.posePosition.lerpVectors(this.lastPosition, this.position, alpha);
      this.poseRotation.slerpQuaternions(this.lastRotation, this.rotation, alpha);
      this.matrix.compose(this.posePosition, this.poseRotation, this.scale);
      this.collider.pose(this.matrix, this.poseRotation, this.size);
      if (reducedMotion) this.hang();
      else for (let i = 1; i < 8; i++) {
        this.before[i].copy(this.positions[i]);
        this.velocities[i].multiplyScalar(Math.exp(-2 * h)).addScaledVector(this.gravity, h);
        this.positions[i].addScaledVector(this.velocities[i], h);
      }
      this.positions[0].copy(this.rig.anchor).applyMatrix4(this.matrix);
      this.contacts.forEach(n => n.set(0, 0, 0));
      for (let iteration = 0; iteration < (reducedMotion ? 24 : 12); iteration++) { this.constrain(); this.collide(); }
      if (!reducedMotion && h > 0) for (let i = 1; i < 8; i++) {
        const velocity = this.velocities[i].subVectors(this.positions[i], this.before[i]).divideScalar(h);
        if (this.contacts[i].lengthSq() > 1e-12) {
          const normal = this.contacts[i].normalize();
          const impact = velocity.dot(normal);
          velocity.addScaledVector(normal, -impact * (impact < 0 ? 1.05 : .85)).multiplyScalar(.86);
        }
        velocity.clampLength(0, 20);
      }
    }
    this.lastPosition.copy(this.position); this.lastRotation.copy(this.rotation);
    this.inverse.copy(this.rig.body.matrixWorld).invert();
    this.inverseRotation.copy(this.rotation).invert();
    for (let i = 0; i < 7; i++) {
      this.frame(i);
      const mesh = i === 6 ? this.rig.ring : this.rig.links[i];
      mesh.position.copy(this.center).applyMatrix4(this.inverse);
      this.basis.makeBasis(this.side, this.axis, this.normal);
      this.meshRotation.setFromRotationMatrix(this.basis);
      mesh.quaternion.copy(this.inverseRotation).multiply(this.meshRotation);
    }
  }
}
