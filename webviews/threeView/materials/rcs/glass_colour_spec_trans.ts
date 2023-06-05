import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/glass_colour_spec_trans.rcsmaterial
 
  { id: 3117619978, name: 'position', align: 10, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 10, type: 22, offset: 6 }
*/
export const glass_colour_spec_trans: MaterialFactory = {
  name: "glass_colour_spec_trans.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhysicalMaterial({
      metalness: 0,
      roughness: 1,
      envMapIntensity: 0.9,
      clearcoat: 1,
      transparent: true,
      transmission: .95,
      opacity: 1,
      reflectivity: 0.1,
  })
  },
};
