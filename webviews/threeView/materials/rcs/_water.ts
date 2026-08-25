import * as THREE from "three";

/**
 * Shared behaviour for the PS3 water materials.
 *
 * Their vertex program drives everything from a `time` uniform. Verified
 * against water_noref (VP @ 0x001b30), where the uniform table gives
 * `#906b67ba U time c[458]`:
 *
 *     MOV R1.w, c457.zzzz          ; fixed preamble constant (NOT time)
 *     MUL R1.w, R1.wwww, c458.xxxx ; × time -> animation phase
 *     MAD R0.xy,   R1.wwww, c459.xxxx, R0.xyxx   ; temp register
 *     MAD o11.zw,  R1.wwww, c460.xxxx, R3.xxxy   ; UV set A -> TEX4.zw
 *     MAD o11.xy,  R1.wwww, c461.xxxx, R0.zwzz   ; UV set B -> TEX4.xy
 *
 * Only the last two reach an interpolator: the fragment program samples the
 * wave texture at `f[TEX4]` and at `f[TEX4].zwzz`, so there are **two**
 * scrolling UV layers, not three. The c459 MAD writes the temp R0.xy, which
 * feeds later maths rather than a TEX4 output.
 *
 * Each MAD writes both components of its pair, so both layers drift in U and V
 * together — the scroll is diagonal, which is what this class approximates by
 * moving `map` one way and `normalMap` the other.
 *
 * The two speeds are the patched uniforms c460/c461. They are not resolved to
 * values by the disassembler, so the rates here stay a visual guess; there is
 * no literal scale factor in the instructions to apply.
 *
 * TODO: real multi-layer scroll needs a ShaderMaterial sampling the one wave
 *   texture at both UV sets, with the rates read from the material's constant
 *   slots.
 */
export class WaterMaterial extends THREE.MeshPhongMaterial {
  private readonly scrollU: number;
  private readonly scrollV: number;

  constructor(params: THREE.MeshPhongMaterialParameters, scrollU = 0.02, scrollV = 0.013) {
    super(params);
    this.scrollU = scrollU;
    this.scrollV = scrollV;
    for (const t of [this.map, this.normalMap, this.specularMap]) {
      if (!t) continue;
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    }
  }

  /** Called each frame by World.updateAnimations(). */
  tick(delta: number) {
    if (this.map) {
      this.map.offset.x += this.scrollU * delta;
      this.map.offset.y += this.scrollV * delta;
    }
    // Second layer drifts the other way so the two never lock together.
    if (this.normalMap && this.normalMap !== this.map) {
      this.normalMap.offset.x -= this.scrollU * 0.6 * delta;
      this.normalMap.offset.y += this.scrollV * 0.8 * delta;
    }
  }
}
