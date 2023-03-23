import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const glass_texture_clamped: MaterialFactory = {
  name: "glass_texture_clamped.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      transparent: true,
      opacity: 0.95,
    });
  },
};