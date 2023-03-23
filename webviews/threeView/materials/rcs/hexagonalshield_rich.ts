import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const hexagonalshield_rich: MaterialFactory = {
  name: "hexagonalshield_rich.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      emissive: 0x8080ff,
      emissiveIntensity: 0.5,
      emissiveMap: textures[0],
      side: THREE.DoubleSide,
      //map: textures[0],
      transparent: true,
      opacity: 0.8,
    });
  },
};