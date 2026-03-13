import * as THREE from "three";
import { MaterialFactory } from "../_abstract";

/*
data/art/published/ships/materials/2048_engine_additive.rcsmaterial
PSVita (WipEout 2048)

Textures: flame_01.gxt (diffuse), facing_gradient.gxt
*/
export const engine_additive_2048: MaterialFactory = {
  name: "2048_engine_additive.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  },
};
