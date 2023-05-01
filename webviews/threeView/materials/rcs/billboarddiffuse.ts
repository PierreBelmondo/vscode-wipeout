import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/amphiseum/materials/billboarddiffuse.rcsmaterial
  data/environments/amphiseum/materials_reversed/billboarddiffuse.rcsmaterial
  data/environments/modesto_heights/materials/billboarddiffuse.rcsmaterial
  data/environments/modesto_heights/materials_reversed/billboarddiffuse.rcsmaterial
  data/environments/talons_junction/materials/billboarddiffuse.rcsmaterial
  data/environments/talons_junction/materials_reversed/billboarddiffuse.rcsmaterial
  data/environments/tech_de_ra/materials/billboarddiffuse.rcsmaterial
  data/environments/tech_de_ra/materials_reversed/billboarddiffuse.rcsmaterial
  data/environments/zone_1/materials/billboarddiffuse.rcsmaterial
  data/environments/zone_2/materials/billboarddiffuse.rcsmaterial
  data/environments/zone_3/materials/billboarddiffuse.rcsmaterial
  data/environments/zone_4/materials/billboarddiffuse.rcsmaterial

  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
*/
export const billboarddiffuse: MaterialFactory = {
  name: "billboarddiffuse.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
    });
  },
};
