import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/nitro_perspex_new.rcsmaterial
 *
 * Ship canopy. Real bound slots after the loader's filtering:
 * tex[0] ?               holographic_02_rich_glow.gtf  (emissive sheen)
 * tex[1] EnvMap          iridescence.gtf
 * tex[2] ?               <livery>.gtf                  (diffuse)
 * tex[3] Normal_Texture  <livery>_n.gtf
 *
 * Same normal-mapped reflection path as nitro_body_new, plus an additive
 * holographic layer — rendered here as an emissive map on a transparent hull.
 *
 * Permutation: 52 in the file, and NONE of them is spot-free and
 *   shadow-free — this material is only ever drawn lit. What follows is an
 *   approximation of the lit look, not a specific permutation.
 *   TODO: pick a real one once spots/shadows exist in the viewer.
 */
export const nitro_perspex_new: MaterialFactory = {
  name: "nitro_perspex_new.rcsmaterial",
  minTextures: 4,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [emissiveMap, envMap, map, normalMap] = textures;
    if (envMap) envMap.mapping = THREE.EquirectangularReflectionMapping;
    return new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      ...(map ? { map } : {}),
      ...(normalMap ? { normalMap } : {}),
      ...(envMap ? { envMap } : {}),
      envMapIntensity: 0.8,
      ...(emissiveMap ? { emissiveMap } : {}),
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
  },
};
