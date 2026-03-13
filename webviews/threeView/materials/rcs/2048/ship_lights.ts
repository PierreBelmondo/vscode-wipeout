import * as THREE from "three";
import { MaterialFactory } from "../_abstract";

/*
data/art/published/ships/materials/2048_ship_lights.rcsmaterial
PSVita (WipEout 2048)

Texture: colours_flashing_glow.gxt (emissive)
*/
export const ship_lights_2048: MaterialFactory = {
  name: "2048_ship_lights.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveIntensity: 2.0,
      emissiveMap: textures[0],
    });
  },
};
