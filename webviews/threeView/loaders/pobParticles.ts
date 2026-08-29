import * as THREE from "three";

import { POBEmitter, POBAnimationPath, POBPathSlot } from "@core/formats/pob";

/**
 * A running particle system, built from one emitter's decoded parameters.
 *
 * This is a simulation of what the file describes, not of the shipped engine:
 * the emitter's rate, cone, gravity and lifetime are decoded (see
 * `POBEmitter.params`), as are the size and alpha curves and the colour
 * gradient. The fields that are still grey -- most of the emitter head and tail
 * -- are simply not applied, so an effect may be missing behaviour the original
 * had. Nothing here is invented to fill those gaps.
 */
export class PobParticleSystem {
  /** Cap per emitter, so a high rate cannot exhaust memory. */
  private static readonly MAX_PARTICLES = 2000;

  /** Fallback when an emitter's lifetime field reads as zero. */
  private static readonly DEFAULT_LIFETIME = 2;

  readonly points: THREE.Points;

  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  /** Per-particle cell origin in UV space; the size of a cell is a uniform. */
  private readonly cells: Float32Array;
  private readonly frame: Int32Array;

  private readonly velocity: Float32Array;
  private readonly age: Float32Array;
  private readonly lifetime: Float32Array;
  private live = 0;
  private pending = 0;

  private readonly rate: number;
  private readonly cone: number;
  private readonly gravity: number;
  private readonly life: number;
  private readonly gradient: Uint8Array;
  private readonly sizePath?: POBAnimationPath;
  private readonly alphaPath?: POBAnimationPath;
  private readonly material: THREE.ShaderMaterial;
  private readonly columns: number;
  private readonly rows: number;

  constructor(emitter: POBEmitter, texture: THREE.Texture | undefined, worldScale: number) {
    const params = emitter.params;
    this.rate = Math.min(Math.max(params.emissionRate, 0), 400);
    this.cone = params.coneAngle;
    // The engine integrates per frame at 60fps (v += g each tick), so the
    // acceleration in per-second terms is g * 60 -- without that factor the
    // default -0.1 gives -10 units/s^2 against launch speeds of ~60 units/s,
    // an arc too shallow to see. Scaled to the viewer's world like the rest.
    this.gravity = params.gravity * worldScale * 60;
    // +0x58 reads as seconds for continuous systems (rain 1.8, smoke 10.9) but
    // as a count for bursts (every explosion is exactly 30) -- unresolved, so
    // for display the value is clamped to a watchable loop rather than letting
    // an "explosion" smoulder for thirty seconds.
    const raw = params.lifetimeOrCount;
    this.life = raw > 0 ? Math.min(Math.max(raw, 0.5), 6) : PobParticleSystem.DEFAULT_LIFETIME;
    this.gradient = params.gradient;
    this.sizePath = emitter.paths[POBPathSlot.SIZE];
    this.alphaPath = emitter.paths[POBPathSlot.ALPHA];

    const max = PobParticleSystem.MAX_PARTICLES;
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 4);
    this.sizes = new Float32Array(max);
    this.cells = new Float32Array(max * 2);
    this.frame = new Int32Array(max);
    this.velocity = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.lifetime = new Float32Array(max);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 4));
    geometry.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute("cell", new THREE.BufferAttribute(this.cells, 2));
    geometry.setDrawRange(0, 0);

    this.columns = Math.max(1, params.gridColumns);
    this.rows = Math.max(1, params.gridRows);
    this.points = new THREE.Points(geometry, PobParticleSystem.material(texture, this.columns, this.rows));
    this.material = this.points.material as THREE.ShaderMaterial;
    this.points.frustumCulled = false;
  }

  /**
   * Additive point sprites. Particles are drawn back-to-front-agnostic: they do
   * not write depth, which is what the original does for glows and smoke.
   */
  private static material(texture: THREE.Texture | undefined, columns: number, rows: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture ?? null },
        hasMap: { value: texture ? 1 : 0 },
        cellSize: { value: new THREE.Vector2(1 / columns, 1 / rows) },
      },
      vertexShader: `
        attribute float size;
        attribute vec4 color;
        attribute vec2 cell;
        varying vec4 vColor;
        varying vec2 vCell;
        void main() {
          vColor = color;
          vCell = cell;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        uniform float hasMap;
        uniform vec2 cellSize;
        varying vec4 vColor;
        varying vec2 vCell;
        void main() {
          // Sample one cell of the sheet's frame grid. A 1x1 grid makes cellSize
          // (1,1) and vCell (0,0), so a single-frame sheet is unaffected.
          vec2 uv = vCell + gl_PointCoord * cellSize;
          // Without a sheet -- PS3 and Vita reference theirs externally and it
          // may not have arrived yet -- fall back to a soft round dot so the
          // system is still visible rather than silently absent.
          vec2 d = gl_PointCoord - vec2(0.5);
          float dot = max(0.0, 1.0 - length(d) * 2.0);
          vec4 texel = hasMap > 0.5 ? texture2D(map, uv) : vec4(1.0, 1.0, 1.0, dot * dot);
          gl_FragColor = vec4(texel.rgb * vColor.rgb, texel.a * vColor.a);
          if (gl_FragColor.a < 0.01) discard;
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  /** Sample a path at normalised lifetime `t`, mapped onto its value range. */
  private static sample(path: POBAnimationPath | undefined, t: number, fallback: number): number {
    if (!path || path.keys.length === 0) return fallback;
    const keys = path.keys;
    let value = keys[keys.length - 1].value;
    if (t <= keys[0].time) value = keys[0].value;
    else {
      for (let i = 1; i < keys.length; i++) {
        if (t > keys[i].time) continue;
        const a = keys[i - 1];
        const b = keys[i];
        const span = b.time - a.time;
        value = span <= 0 ? b.value : a.value + ((t - a.time) / span) * (b.value - a.value);
        break;
      }
    }
    return path.minValue + value * (path.maxValue - path.minValue);
  }

  private spawn(scale: number, originX: number) {
    if (this.live >= PobParticleSystem.MAX_PARTICLES) return;
    const i = this.live++;

    // Particles live in the system's own space, not the emitter's: once
    // released they keep the position they were born at, so a moving emitter
    // leaves a trail instead of dragging its particles with it.
    this.positions[i * 3] = originX;
    this.positions[i * 3 + 1] = 0;
    this.positions[i * 3 + 2] = 0;

    // Direction inside the emitter's cone. A zero cone emits straight up.
    const half = this.cone / 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = half > 0 ? Math.acos(1 - Math.random() * (1 - Math.cos(half))) : 0;
    const speed = scale * (0.3 + Math.random() * 0.4);
    this.velocity[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    this.velocity[i * 3 + 1] = Math.cos(phi) * speed;
    this.velocity[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

    this.age[i] = 0;
    this.lifetime[i] = this.life * (0.75 + Math.random() * 0.5);
    // A multi-frame sheet starts each particle on a random cell, so a burst
    // does not show one identical sprite; a 1x1 sheet has only cell 0.
    this.frame[i] = Math.floor(Math.random() * this.columns * this.rows);
  }

  private retire(i: number) {
    const last = --this.live;
    if (i === last) return;
    for (let k = 0; k < 3; k++) {
      this.positions[i * 3 + k] = this.positions[last * 3 + k];
      this.velocity[i * 3 + k] = this.velocity[last * 3 + k];
    }
    this.age[i] = this.age[last];
    this.lifetime[i] = this.lifetime[last];
    this.frame[i] = this.frame[last];
  }

  tick(delta: number, scale: number, originX = 0) {
    // Emit. Fractional particles carry over so a low rate still emits.
    this.pending += this.rate * delta;
    while (this.pending >= 1) {
      this.pending -= 1;
      this.spawn(scale, originX);
    }

    for (let i = 0; i < this.live; ) {
      this.age[i] += delta;
      if (this.age[i] >= this.lifetime[i]) {
        this.retire(i);
        continue;
      }

      this.velocity[i * 3 + 1] += this.gravity * delta;
      for (let k = 0; k < 3; k++) this.positions[i * 3 + k] += this.velocity[i * 3 + k] * delta;

      const t = this.age[i] / this.lifetime[i];

      // Colour and alpha from the emitter's 256-entry gradient, modulated by
      // the alpha curve where the emitter has one.
      const entry = Math.min(255, Math.max(0, Math.floor(t * 255))) * 4;
      this.colors[i * 4] = this.gradient[entry] / 255;
      this.colors[i * 4 + 1] = this.gradient[entry + 1] / 255;
      this.colors[i * 4 + 2] = this.gradient[entry + 2] / 255;
      const alpha = PobParticleSystem.sample(this.alphaPath, t, 255);
      this.colors[i * 4 + 3] = (this.gradient[entry + 3] / 255) * Math.min(1, alpha / 255);

      // The size curve is in engine units; normalise by its own range so a
      // path of [4 .. 18] scales a particle 0.2x..1x of the base size instead
      // of feeding raw units into gl_PointSize, which the GPU clamps -- the
      // clamped giant blobs were what made the system look static.
      const size = PobParticleSystem.sample(this.sizePath, t, 1);
      const reference = this.sizePath && this.sizePath.maxValue > 0 ? this.sizePath.maxValue : 1;
      this.sizes[i] = Math.max(0.5, (size / reference) * scale * 0.4);

      // Walk the grid over the particle's life, starting from its own cell.
      const total = this.columns * this.rows;
      const cell = total > 1 ? (this.frame[i] + Math.floor(t * total)) % total : 0;
      this.cells[i * 2] = (cell % this.columns) / this.columns;
      this.cells[i * 2 + 1] = Math.floor(cell / this.columns) / this.rows;

      i++;
    }

    const geometry = this.points.geometry;
    geometry.setDrawRange(0, this.live);
    for (const name of ["position", "color", "size", "cell"]) geometry.getAttribute(name).needsUpdate = true;
  }

  /** Attach the sheet once it has loaded, for systems that start without one. */
  setTexture(texture: THREE.Texture) {
    this.material.uniforms.map.value = texture;
    this.material.uniforms.hasMap.value = 1;
  }

  /**
   * Release the GPU buffers.
   *
   * Not called today: the .pob editor loads one system per webview and the
   * whole context goes away with it. Kept so that a viewer which swaps files in
   * place has the hook it needs.
   */
  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
