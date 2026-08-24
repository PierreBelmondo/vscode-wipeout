import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/**
 * data/materials/ships/carbonfibre.rcsmaterial
 *
 * { id: 3117619978, name: 'position', align: 22, type: 53, offset: 0 },
 * { id: 3732576027, name: 'normal', align: 22, type: 22, offset: 6 },
 * { id: 3689280535, name: 'tangent', align: 22, type: 68, offset: 10 },
 * { id: 1955845200, name: 'VertexColour1', align: 22, type: 68, offset: 14 },
 * { id: 1114772732, name: 'Uv1', align: 22, type: 35, offset: 18 }
 *
 * Permutation: 52 in the file, and NONE of them is spot-free and
 *   shadow-free — this material is only ever drawn lit. What follows is an
 *   approximation of the lit look, not a specific permutation.
 *   TODO: pick a real one once spots/shadows exist in the viewer.
 */
export const carbonfibre: MaterialFactory = {
  name: "carbonfibre.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    textures[0].repeat.set(4, 4);
    textures[1].repeat.set(4, 4);
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      specular: 0xffffff,
      specularMap: textures[0],
      normalMap: textures[0],
      map: textures[1],
      shininess: 90,
    });
  },
};
