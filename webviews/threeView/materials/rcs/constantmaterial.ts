import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/zone_1/materials/constantmaterial.rcsmaterial
  data/environments/zone_2/materials/constantmaterial.rcsmaterial
  data/environments/zone_3/materials/constantmaterial.rcsmaterial
  data/environments/zone_4/materials/constantmaterial.rcsmaterial

  { id: 3117619978, name: 'position', align: 10, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 10, type: 22, offset: 6 }
*/
export const constantmaterial: MaterialFactory = {
  name: "constantmaterial.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0xffffff,
    });
  },
};