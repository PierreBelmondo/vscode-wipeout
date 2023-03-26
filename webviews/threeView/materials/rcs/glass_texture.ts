import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const glass_texture: MaterialFactory = {
  name: "glass_texture.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0x101010,
      specular: 0xffffff,
      transparent: true,
      shininess: 90,
      reflectivity: 1.0,
      refractionRatio: 0.98,
      map: textures[0],
    });
  },
};
