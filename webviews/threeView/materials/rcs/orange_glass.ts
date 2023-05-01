import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/tech_de_ra/materials/orange_glass.rcsmaterial
  data/environments/tech_de_ra/materials_reversed/orange_glass.rcsmaterial

  { id: 3117619978, name: 'position', align: 22, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 22, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 22, type: 35, offset: 14 },
  { id: 3682288966, name: 'Uv2', align: 22, type: 35, offset: 18 },
  { id: 447706673, name: '_unknown', align: 22, type: 68, offset: 10 },
  { id: 451929380, name: '_unknown', align: 22, type: 67, offset: 14 }
*/
export const orange_glass: MaterialFactory = {
  name: "orange_glass.rcsmaterial",
  minTextures: 3,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
      shininess: 90,
      reflectivity: 1.0,
      refractionRatio: 0.98,
      map: textures[0],
    });
  },
};
