import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const simpletextureandtexturealpha: MaterialFactory = {
  name: "simpletextureandtexturealpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      alphaMap: textures[0] // TODO
    });
  },
};
