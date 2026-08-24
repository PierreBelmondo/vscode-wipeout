import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/ship_lod_vcol.rcsmaterial
 *
 * Distant-LOD ship body: diffuse skin modulated by vertex colour.
 * Real slots: tex[0] Diffuse_Texture. The lightmap is empty and the
 * remaining two slots are rgba constants (one of them SpecScale=300).
 *
 * Permutation: 52 in the file, and NONE of them is spot-free and
 *   shadow-free — this material is only ever drawn lit. What follows is an
 *   approximation of the lit look, not a specific permutation.
 *   TODO: pick a real one once spots/shadows exist in the viewer.
 */
export const ship_lod_vcol: MaterialFactory = {
  name: "ship_lod_vcol.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      map: textures[0],
      specular: new THREE.Color(0x222222),
      shininess: 60,
    });
  },
};
