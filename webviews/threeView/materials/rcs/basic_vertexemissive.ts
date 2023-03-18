import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const basic_vertexemissive: MaterialFactory = {
  name: "basic_vertexemissive.rcsmaterial",
  textures: 0,
  make: (_textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
    });
  },
};