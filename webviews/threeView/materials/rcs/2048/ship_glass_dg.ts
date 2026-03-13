import * as THREE from "three";
import { MaterialFactory } from "../_abstract";

/*
data/art/published/ships/materials/2048_ship_glass_dg.rcsmaterial
PSVita (WipEout 2048)

Texture: glass_spec_blank.gxt
*/
export const ship_glass_dg_2048: MaterialFactory = {
  name: "2048_ship_glass_dg.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhysicalMaterial({
      side: THREE.DoubleSide,
      color: 0xffffff,
      transmission: 0.9,
      roughness: 0.1,
      ior: 1.5,
      map: textures[0],
    });
  },
};
