import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/modesto_heights/materials/uvanim_diffuse_emissive_coltint_bloom.rcsmaterial
 *
 *   tex[0] DiffuseTexture               ad_v_long1_alpha.gtf, ad_generic_v_long1_alpha.gtf   -> map
 *   tex[1] #b1f2a176                    lunarparcs_verticaladvert.gtf, ricochet_verticaladvert.gtf, pandaface_verticaladvert.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #a9335f0c                    (no file)   -> map
 *   tex[4] #78256a45                    (no file)   -> map
 *   tex[5] #78787596                    (no file)   -> map
 *   tex[6] #e8bcd7f5                    (no file)   -> map
 *   tex[7] #f0d90109                    (no file)   -> map
 *   tex[8] #a24bc055                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: the shader takes the engine's `time` uniform and offsets the
 * sample coordinate with it, so the texture channels scroll (see _animated.ts).
 */
export const uvanim_diffuse_emissive_coltint_bloom: MaterialFactory = {
  name: "uvanim_diffuse_emissive_coltint_bloom.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5, map6, map7] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
