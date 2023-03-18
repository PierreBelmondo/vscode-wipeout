import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const emissive_bloom: MaterialFactory = {
  name: "emissive_bloom.rcsmaterial",
  textures: 1,
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