import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/05_ubermall/materials/nr_lcd_strips_alpha.rcsmaterial
 *
 *   tex[0] #9965651b                    animgradient_noisergb.gtf, mr_faded_metaldetail_spec.gtf   -> map
 *   tex[1] diffuseTexture               assegai_lcd.gtf, piranha_lcd.gtf, ag_lcd.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] alpha                        (no file)   -> alphaMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const nr_lcd_strips_alpha: MaterialFactory = {
  name: "nr_lcd_strips_alpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, alphaMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(alphaMap ? { alphaMap: alphaMap } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
