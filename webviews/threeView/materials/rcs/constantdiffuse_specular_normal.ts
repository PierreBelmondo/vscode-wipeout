import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/constantdiffuse_specular_normal.rcsmaterial
 *
 *   tex[0] Texture1  #3bdc0403  ds_sfblend_ns.gtf     normal map (see below)
 *   tex[1] lightmap  #37b5db58  lmaps/*-lmap.gtf      baked lighting
 *   tex[2] Constant1 #7611a2d8  (no file)             constantAmbientColour
 *
 * Used by the track surface blend layer. "constantdiffuse" is the third slot:
 * the shader has no diffuse texture at all, it multiplies a flat
 * `constantAmbientColour` by the lightmap, and the only sampled colour comes
 * from the normal map's specular response. The permutation binding lightmap +
 * Texture1 + Constant1 unpacks Texture1 as a normal (`2 * t - 1` on x/y/z),
 * rotates it into world space, then runs an N.L term and a specular power of
 * 32 scaled by `prelitScaleSpecular`.
 *
 * The `_ns` suffix on the texture name is the giveaway: it is a normal+specular
 * map, not a colour map, which is why feeding it to `map` renders the road as
 * flat blue-violet.
 *
 * Permutation: Static[7] of 70 -- the lit, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO, notably the Zone* family
 *   this material carries for the zone-mode effect.
 */
export const constantdiffuse_specular_normal: MaterialFactory = {
  name: "constantdiffuse_specular_normal.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const [normalMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      // `Constant1` ships no file: the engine's per-draw colour is unknown
      // here, so the lightmap alone carries the shading.
      color: 0xffffff,
      ...(normalMap ? { normalMap } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x333333),
      shininess: 32,
    });
  },
};
