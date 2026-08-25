import * as THREE from "three";

/**
 * Materials whose shaders take a `time` uniform.
 *
 * The engine feeds one clock (`time`, hash #906b67ba, bound as an engine
 * uniform rather than a texture slot) into every animated material, which uses
 * it as a UV offset before sampling:
 *
 *     MOVR R0.x, f[TEX1].w       ; interpolated V
 *     ADDR R0.w, R0.x, <rate>    ; V + time * rate
 *     MOVR R1.z, f[TEX0].w       ; U
 *     TEXR H0, R1.zwzz, TEX0     ; diffuse at the scrolled coordinate
 *     TEXR H1, R1.zwzz, TEX1     ; emissive at the same coordinate
 *
 * so diffuse and emissive scroll together and stay registered with each other.
 *
 * Which stage does the offset varies by material. Some materials do it in the
 * fragment program, as above; others do it in the VERTEX program, adding
 * `time * rate` to the Uv1 attribute and passing the result down in a pair of
 * interpolators -- see jd_uvanim_emissivealphamultiply.ts and basic_uv_scroll.ts
 * for worked examples with the disassembly. Either way the visible result is a
 * scrolled sample, so the same class serves both.
 *
 * The per-material rates are real per-material uniform reads (category U,
 * size 1) that the runtime patches from the material -- e.g. c463.x / c462.x in
 * jd_uvanim_emissivealphamultiply -- so they ARE recoverable in principle, just
 * not from the SHO's own constant words, which hold no value and often no
 * friendly name either. Each factory passes the rate it wants and the default
 * is a slow drift.
 *
 * TODO: recover the real rates by reading the patched constants out of the
 *   engine's material setup rather than the shader bundle.
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

/**
 * The magstrip / magwall effect: a wave texture scrolled across the surface and
 * used to light an emissive mask, so a pulse travels along the strip.
 *
 * The fragment program samples four maps -- diffuse, an emissive mask, a normal
 * map and a `Wave` texture -- then:
 *
 *     MOVR R0.zw, f[TEX4].xxxy      ; the UV
 *     MOVR R0.x,  <const>           ; accumulator
 *     MADR R0.xy, R0.zwzz, <k>, R0.x ; UV scaled into the wave's space
 *     TEXR H0.xyz, R0, TEX3         ; sample Wave at that coordinate
 *     ADDH H0.xyz, -H2, H0          ; difference against the mask sample
 *     MADH H0.xyz, H2.w, H0, H2     ; blend by the mask's alpha
 *
 * so the mask decides *where* the strip can glow and the wave decides *when*.
 * `time` is patched into this program by the loader, which is what moves the
 * wave; the emissive mask itself never moves.
 *
 * The scroll axis is per-material, so it is a parameter. Some of these shaders
 * do the UV maths in the *vertex* program and pass the result down in a pair of
 * interpolators, in which case both components can carry the time addend and the
 * wave travels diagonally -- see mageffect_modded.ts for a worked example with
 * the disassembly. `rateV` defaults to 0 for the U-only case.
 *
 * TODO: the scroll axis for the callers that still take the default. Where the
 *   loader patches `time` directly into an operand word of the wave's TEXR
 *   rather than into a constant block, older dumps could not resolve which of
 *   U/V the wave travels along. U is the assumption because the strip textures
 *   are laid out lengthwise; if the pulse runs across the strip rather than
 *   along it, swap the axis.
 */
export class MagStripMaterial extends THREE.MeshPhongMaterial {
  private readonly wave?: THREE.Texture;
  private readonly rate: number;
  private readonly rateV: number;
  private elapsed = 0;

  constructor(params: THREE.MeshPhongMaterialParameters, wave?: THREE.Texture, rate = 0.25, rateV = 0.0) {
    super(params);
    this.rate = rate;
    this.rateV = rateV;
    if (!wave) return;

    // The wave is the only channel that moves: the diffuse, the normal map and
    // the emissive mask all stay put.
    this.wave = wave.clone();
    this.wave.wrapS = THREE.RepeatWrapping;
    this.wave.wrapT = THREE.RepeatWrapping;
    this.wave.needsUpdate = true;
    this.emissiveMap = this.wave;
  }

  tick(delta: number) {
    if (!this.wave) return;
    this.elapsed += delta;
    this.wave.offset.x = this.elapsed * this.rate;
    this.wave.offset.y = this.elapsed * this.rateV;
  }
}

/**
 * Two different textures scrolled along two *different* axes and then summed.
 *
 * The hologram-with-static family builds one varying that carries both a
 * U-scrolled and a V-scrolled copy of the same UV, then samples a different
 * texture through each half of it. From dc_hologramwithstatic2, permutation 2
 * (Backend=Static "Ambient", VP @0x000f50, FP @0x001110), where c463 = `Speed`
 * (#31182e0d), c462 = an unnamed per-material rate (#b6573513) and
 * c464 = `time` (#906b67ba):
 *
 *     ; VP -- one interpolator, four components
 *     001030+00e0: MOV o10(TEX3).yz, v2.yyxy         ; y = Uv1.y, z = Uv1.x  (untouched)
 *     001050+0100: MOV R0.w, c464.xxxx               ; R0.w = time
 *     001060+0110: MAD o10(TEX3).w, R0.wwww, c462.xxxx, v2.yyyy ; w = Uv1.y + time * #b6573513
 *     001080+0130: MAD o10(TEX3).x, R0.wwww, c463.xxxx, v2.xxxx ; x = Uv1.x + time * Speed
 *
 *     ; FP -- two samplers, two halves of that varying
 *     001160+0050: TEXR H1.xyz, f[TEX3].zwzz, TEX1   ; t[1] at (z, w) = (Uv1.x, V')
 *     001170+0060: TEXR H0.xyz, f[TEX3], TEX0        ; t[0] at (x, y) = (U', Uv1.y)
 *     001180+0070: ADDH H0.xyz, H0, H1  ; END        ; the two SUMMED
 *
 * So TEX3 = (U', Uv1.y, Uv1.x, V'). The default swizzle on the second TEXR
 * reads .xy, which is the U-scrolled pair; the `.zwzz` on the first reads
 * (z, w), which is the V-scrolled pair. Decoding that swizzle is what settles
 * the axes -- reading the two TEXRs without it gets them backwards.
 *
 * ScrollingMaterial cannot express this: it drives every channel it owns from
 * one shared rateU/rateV, so it would move both textures along the same axis.
 * Here each texture gets its own axis and its own rate.
 *
 * The combine is ADDH, an unweighted sum, so the two layers are mapped onto
 * `map` and `emissiveMap` with AdditiveBlending rather than Phong's default
 * multiply, which would compute the wrong product.
 *
 * No literal scale to apply, unlike ShieldMaterial's `3.0`: both multiplies
 * take a resolved uniform (c463 = Speed, c462 = #b6573513) and neither carries
 * an inline constant. The rates below are therefore placeholder drifts, and
 * only their axes are recovered.
 *
 * TODO: resolve `Speed` (#31182e0d) and #b6573513 via the engine's material
 *   setup to recover the intended magnitudes.
 */
export class CrossScrollMaterial extends THREE.MeshPhongMaterial {
  private readonly uScrolled?: THREE.Texture;
  private readonly vScrolled?: THREE.Texture;
  private readonly rateU: number;
  private readonly rateV: number;
  private elapsed = 0;

  /**
   * @param uTexture the texture sampled at (Uv1.x + time * Speed, Uv1.y).
   * @param vTexture the texture sampled at (Uv1.x, Uv1.y + time * #b6573513).
   */
  constructor(
    params: THREE.MeshPhongMaterialParameters,
    uTexture?: THREE.Texture,
    vTexture?: THREE.Texture,
    rateU = 0.05,
    rateV = 0.05,
  ) {
    super(params);
    this.rateU = rateU;
    this.rateV = rateV;

    // Each layer needs its own Texture: they move on different axes, and a
    // shared image must not have one layer's offset dragged by the other.
    if (uTexture) {
      this.uScrolled = uTexture.clone();
      this.uScrolled.wrapS = THREE.RepeatWrapping;
      this.uScrolled.wrapT = THREE.RepeatWrapping;
      this.uScrolled.needsUpdate = true;
      this.map = this.uScrolled;
    }
    if (vTexture) {
      this.vScrolled = vTexture.clone();
      this.vScrolled.wrapS = THREE.RepeatWrapping;
      this.vScrolled.wrapT = THREE.RepeatWrapping;
      this.vScrolled.needsUpdate = true;
      this.emissiveMap = this.vScrolled;
    }
  }

  tick(delta: number) {
    this.elapsed += delta;
    // U' = Uv1.x + time * Speed  -- the x MAD only, so .y stays put.
    if (this.uScrolled) this.uScrolled.offset.x = this.elapsed * this.rateU;
    // V' = Uv1.y + time * #b6573513  -- the w MAD only, so .x stays put.
    if (this.vScrolled) this.vScrolled.offset.y = this.elapsed * this.rateV;
  }
}
