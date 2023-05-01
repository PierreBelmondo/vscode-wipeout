import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/tech_de_ra/materials/tech_de_ra_rocks.rcsmaterial
  data/environments/tech_de_ra/materials_reversed/tech_de_ra_rocks.rcsmaterial

  { id: 3117619978, name: 'position', align: 26, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 26, type: 22, offset: 6 },
  { id: 3689280535, name: 'tangent', align: 26, type: 68, offset: 10 },
  { id: 1114772732, name: 'Uv1', align: 26, type: 35, offset: 14 },
  { id: 1955845200, name: 'VertexColour1', align: 26, type: 68, offset: 18 },
  { id: 648525413, name: '_unknown', align: 26, type: 35, offset: 22 }
*/
export const tech_de_ra_rocks: MaterialFactory = {
  name: "tech_de_ra_rocks.rcsmaterial",
  minTextures: 3,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    switch (textures.length) {
      case 3:
        // 0 = diffuse
        // 1 = normals
        // 2 = ??
        return new THREE.MeshStandardMaterial({
          side: THREE.DoubleSide,
          map: textures[0],
          normalMap: textures[1],
        });
      case 4:
        // 0 = ??
        // 1 = ??
        // 2 = ??
        // 3 = ??
        return new THREE.MeshStandardMaterial({
          side: THREE.DoubleSide,
          map: textures[0],
        });
    }
  },
};
