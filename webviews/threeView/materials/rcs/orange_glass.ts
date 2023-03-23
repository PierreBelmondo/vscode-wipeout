import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

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
