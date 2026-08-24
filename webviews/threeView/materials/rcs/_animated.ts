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

/**
 * A shield: one texture sampled twice and the two results multiplied, with the
 * second lookup scrolled along U.
 *
 *     MOVR R0.y, f[TEX0].w          ; first coord
 *     MOVR R0.z, R0.y               ; -> U slot
 *     MOVR R0.x, f[TEX1].w          ; second coord
 *     MOVR R0.w, R0.x               ; -> V slot
 *     TEXR H2.w, R0.zwzz, TEX0      ; static sample at (U, V)
 *     MADR R0.z, R1.w, 3.0, R0.y    ; U' = scroll * 3 + U    <- U, not V
 *     TEXR H0.xyz, R0.zwzz, TEX0    ; scrolled sample
 *     MULH H0.w, H0, H1             ; the two multiplied
 *
 * The sample coordinate is `R0.zwzz`, so R0.z is the horizontal component --
 * and R0.z is the one the MADR offsets, while R0.w is never touched. The
 * interference between the moving copy and the still one is what makes the hex
 * pattern shimmer.
 *
 * Three.js has no second sampler of the same map on a Phong material, so the
 * static layer is `emissiveMap` and the moving one is `map`, which multiplies
 * into it -- the same product the shader computes, one texture short of the
 * real thing.
 *
 * TODO: sample one texture twice in a ShaderMaterial rather than approximating
 *   with two slots.
 *
 * The 3.0 multiplier is a literal in the instruction and is applied as such.
 * What it multiplies is `time * rate`, where the rate lives in a constant word
 * the loader patches at run time, so only that factor is unknown.
 */
export class ShieldMaterial extends THREE.MeshPhongMaterial {
  /** The `3.0` the shader's MADR multiplies its scroll term by. */
  private static readonly SCROLL_SCALE = 3.0;

  private readonly scrolling?: THREE.Texture;
  private readonly rate: number;
  private elapsed = 0;

  constructor(params: THREE.MeshPhongMaterialParameters, texture?: THREE.Texture, rate = 0.03) {
    super(params);
    this.rate = rate;
    if (!texture) return;

    // Its own clone: the static layer must stay put while this one moves.
    this.scrolling = texture.clone();
    this.scrolling.wrapS = THREE.RepeatWrapping;
    this.scrolling.wrapT = THREE.RepeatWrapping;
    this.scrolling.needsUpdate = true;
    this.map = this.scrolling;
  }

  tick(delta: number) {
    if (!this.scrolling) return;
    // U' = time * rate * 3.0 + U, as the MADR computes it.
    this.elapsed += delta;
    this.scrolling.offset.x = this.elapsed * this.rate * ShieldMaterial.SCROLL_SCALE;
  }
}
