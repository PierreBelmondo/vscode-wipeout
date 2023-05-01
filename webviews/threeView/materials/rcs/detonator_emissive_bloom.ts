import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/detonator_emissive_bloom.rcsmaterial

  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 1114772732, name: 'Uv1', align: 14, type: 35, offset: 10 }
*/
export const detonator_emissive_bloom: MaterialFactory = {
  name: "detonator_emissive_bloom.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    textures[0].repeat.set(20, 20);
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.0,
      map: textures[0],
    });
  },
};