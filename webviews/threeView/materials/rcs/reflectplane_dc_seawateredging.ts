import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { WaterMaterial } from "./_water";

/**
 * data/environments/*\/materials/reflectplane_dc_seawateredging.rcsmaterial
 *
 * Where the sea meets the shore — the foam edge.
 *
 *   tex[0] DiffuseTexture  and_waterfoam_blend.gtf
 *   tex[1] ?               dc_watergrad_blend.gtf   shore-to-deep gradient
 *   tex[2] ?               dc_waterdiffuse.gtf
 *   tex[3] lightmap
 *   SpecularColour  (0.693, 0.699, 0.514)
 *
 * The foam texture carries its own alpha, so this blends rather than cuts out —
 * unlike the vegetation materials.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 */
export const reflectplane_dc_seawateredging: MaterialFactory = {
  name: "reflectplane_dc_seawateredging.rcsmaterial",
  minTextures: 2,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [foam, , diffuse, lightMap] = textures;
    return new WaterMaterial(
      {
        side: THREE.DoubleSide,
        map: foam ?? diffuse,
        ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(0xb1b283),
        shininess: 65,
        transparent: true,
        depthWrite: false,
      },
      0.035,
      0.02
    );
  },
};
