import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/nitro_body_new.rcsmaterial
 *
 * Ship hull. Bound slots (RCSMODELLoader drops the empty lightmap and the
 * rgba-constant slots, so only the three real files reach make()):
 * tex[0] EnvMap          iridescence.gtf
 * tex[1] ?               <livery>.gtf          (diffuse)
 * tex[2] Normal_Texture  <livery>_n.gtf
 *
 * The Ambient permutation samples Normal_Texture, unpacks it with the usual
 * 2*x-1 bias, renormalises via DIVSQR, then reflects the view vector against
 * it to look up the paraboloid/env map — i.e. normal-mapped iridescent paint.
 *
 * Permutation: 52 in the file, and NONE of them is spot-free and
 *   shadow-free — this material is only ever drawn lit. What follows is an
 *   approximation of the lit look, not a specific permutation.
 *   TODO: pick a real one once spots/shadows exist in the viewer.
 */
export const nitro_body_new: MaterialFactory = {
  name: "nitro_body_new.rcsmaterial",
  minTextures: 3,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [envMap, map, normalMap] = textures;
    if (envMap) envMap.mapping = THREE.EquirectangularReflectionMapping;
    return new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      ...(map ? { map } : {}),
      ...(normalMap ? { normalMap } : {}),
      ...(envMap ? { envMap } : {}),
      envMapIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.4,
    });
  },
};
