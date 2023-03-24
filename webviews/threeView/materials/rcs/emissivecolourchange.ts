import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const emissivecolourchange: MaterialFactory = {
  name: "emissivecolourchange.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0x00FF00,
      emissive: 1.0,
    });
  },
};
