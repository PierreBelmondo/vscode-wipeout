import * as THREE from "three";

/**
 * Shared behaviour for the PS3 water materials.
 *
 * Their vertex program drives everything from a `time` uniform:
 *
 *     MOV R1.w, c457.zzzz          ; time
 *     MUL R1.w, R1.wwww, c458.xxxx ; time * rate
 *     MAD R0.xy,   R1.wwww, c459.xxxx, R0.xyxx   ; UV set 1
 *     MAD o11.zw,  R1.wwww, c460.xxxx, R3.xxxy   ; UV set 2
 *     MAD o11.xy,  R1.wwww, c461.xxxx, R0.zwzz   ; UV set 3
 *
 * i.e. three UV sets scrolling at three different rates, which is what gives
 * the surface its motion. Three.js only carries one `map.offset`, so this
 * reproduces the dominant scroll; the per-set rates (c459/c460/c461) are known
 * to exist but their values are not extracted.
 *
 * TODO: real multi-layer scroll needs a ShaderMaterial with the three UV sets
 *   and the rates read from the material's constant slots.
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
