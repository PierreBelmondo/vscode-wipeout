import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { WaterMaterial } from "./_water";

/**
 * data/environments/*\/materials/cf_waterfall.rcsmaterial
 *
 *   tex[0] ?  martin_waterfallspray_alphablend.gtf
 *   tex[1] ?  and_waterfoam_blend.gtf
 *   tex[2]    lightmap
 *
 * Falling spray. Both textures are `_alphablend`/`_blend`, so alpha blending
 * with depthWrite off; scrolls faster and mostly downwards.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const cf_waterfall: MaterialFactory = {
  name: "cf_waterfall.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [spray, , lightMap] = textures;
    return new WaterMaterial(
      {
        side: THREE.DoubleSide,
        ...(spray ? { map: spray } : {}),
        ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        color: new THREE.Color(0xdff0f5),
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        shininess: 20,
      },
      0.0,
      -0.35
    );
  },
};
