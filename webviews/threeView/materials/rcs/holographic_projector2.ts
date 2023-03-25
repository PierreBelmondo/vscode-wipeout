import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const holographic_projector2: MaterialFactory = {
  name: "holographic_projector2.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      specular: 0x000000,
      emissiveIntensity: 2.0,
      map: textures[0],
      emissiveMap: textures[0],
      transparent: true,
      opacity: 0.75,
    });
  },
};