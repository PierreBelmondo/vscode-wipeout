import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/mt_uvanim_diffuse_emissive2.rcsmaterial
 *
 *   tex[0] DiffuseTexture  under_strut.gtf
 *   tex[1] ?               under_strut_glow.gtf — emissive layer
 *   tex[2] lightmap
 *   GlowTint               (1.0, 0.732, 0.172) constant
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: the "uvanim" part — the glow layer scrolls its UVs over time. Static
 *   here; the scroll rate lives in one of the rgba constant slots.
 */
export const mt_uvanim_diffuse_emissive2: MaterialFactory = {
  name: "mt_uvanim_diffuse_emissive2.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, glow, lightMap] = textures;
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(glow ? { emissiveMap: glow } : {}),
      emissive: new THREE.Color(0xffbb2b),
    });
  },
};
