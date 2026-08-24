import * as THREE from "three";

/**
 * Materials whose shaders take a `time` uniform.
 *
 * The engine feeds one clock (`time`, hash #906b67ba, bound as an engine
 * uniform rather than a texture slot) into every animated material. The
 * fragment programs use it as a UV offset before sampling:
 *
 *     MOVR R0.x, f[TEX1].w       ; interpolated V
 *     ADDR R0.w, R0.x, <rate>    ; V + time * rate
 *     MOVR R1.z, f[TEX0].w       ; U
 *     TEXR H0, R1.zwzz, TEX0     ; diffuse at the scrolled coordinate
 *     TEXR H1, R1.zwzz, TEX1     ; emissive at the same coordinate
 *
 * so diffuse and emissive scroll together and stay registered with each other.
 *
 * The per-material rates live in constant registers the runtime loads, not in
 * uniforms the file names, so they cannot be read back from the SHO. Each
 * factory passes the rate it wants and the default is a slow drift.
 *
 * TODO: recover the real rates. They would have to come from the engine's
 *   material setup rather than the shader bundle.
 */
export class ScrollingMaterial extends THREE.MeshPhongMaterial {
  private readonly rateU: number;
  private readonly rateV: number;
  private readonly scrolled: THREE.Texture[] = [];

  constructor(params: THREE.MeshPhongMaterialParameters, rateU = 0.0, rateV = 0.05) {
    super(params);
    this.rateU = rateU;
    this.rateV = rateV;

    // Every channel the shader samples at the animated coordinate has to move
    // together, and each needs its own Texture so the offsets do not collide
    // with another material sharing the same image.
    for (const key of ["map", "emissiveMap", "alphaMap", "specularMap"] as const) {
      const texture = this[key];
      if (!texture) continue;
      const clone = texture.clone();
      clone.wrapS = THREE.RepeatWrapping;
      clone.wrapT = THREE.RepeatWrapping;
      clone.needsUpdate = true;
      this[key] = clone;
      this.scrolled.push(clone);
    }
  }

  /** Called each frame by World.updateAnimations(). */
  tick(delta: number) {
    for (const texture of this.scrolled) {
      texture.offset.x += this.rateU * delta;
      texture.offset.y += this.rateV * delta;
    }
  }
}

/**
 * A material whose emissive channel pulses rather than scrolls.
 *
 * Glow shaders multiply the emissive sample by a value derived from `time`
 * instead of offsetting the lookup, which reads as a slow throb.
 */
export class PulsingMaterial extends THREE.MeshPhongMaterial {
  private readonly base: THREE.Color;
  private readonly rate: number;
  private readonly depth: number;
  private phase = 0;

  constructor(params: THREE.MeshPhongMaterialParameters, rate = 1.5, depth = 0.35) {
    super(params);
    this.base = this.emissive.clone();
    this.rate = rate;
    this.depth = depth;
  }

  tick(delta: number) {
    this.phase += delta * this.rate;
    const scale = 1 - this.depth + this.depth * (0.5 + 0.5 * Math.sin(this.phase));
    this.emissive.copy(this.base).multiplyScalar(scale);
  }
}
