import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/lambert.rcsmaterial

  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 2050970140, name: 'uv1', align: 14, type: 35, offset: 10 }

  data/environments/02_track/materials/lambert.rcsmaterial
  data/environments/02_track/materials_dlc/lambert.rcsmaterial
  data/environments/amphiseum/materials/lambert.rcsmaterial
  data/environments/amphiseum/materials_reversed/lambert.rcsmaterial
  data/materials/lambert.rcsmaterial

  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 2050970140, name: 'uv1', align: 18, type: 35, offset: 10 },
  { id: 447706673, name: '_unknown', align: 18, type: 68, offset: 14 }

  data/environments/modesto_heights/materials/lambert.rcsmaterial
  data/environments/modesto_heights/materials_reversed/lambert.rcsmaterial

  { id: 3117619978, name: 'position', align: 18, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 18, type: 22, offset: 6 },
  { id: 2050970140, name: 'uv1', align: 18, type: 35, offset: 10 },
  { id: 648525413, name: '_unknown', align: 18, type: 35, offset: 14 }
*/
export const lambert: MaterialFactory = {
  name: "lambert.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      map: textures[0]
    });
  },
};
