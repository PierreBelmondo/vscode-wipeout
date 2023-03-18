import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const glass_texture: MaterialFactory = {
  name: "glass_texture.rcsmaterial",
  textures: 0,
  make: (_textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0x000000,
      specular: 0xffffff,
      transparent: true,
      opacity: 0.5,
      shininess: 90,
      reflectivity: 1.0,
      refractionRatio: 0.98,
    });
  },
};
