import * as THREE from "three";
import { MaterialFactory } from "../_abstract";

/*
data/art/published/ships/materials/2048_ship_paint_shiny_final.rcsmaterial
PSVita (WipEout 2048)

Textures: livery.gxt (diffuse), livery_n.gxt (normal)
*/
export const ship_paint_shiny_final_2048: MaterialFactory = {
  name: "2048_ship_paint_shiny_final.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const opts: THREE.MeshStandardMaterialParameters = {
      side: THREE.DoubleSide,
      map: textures[0],
      roughness: 0.3,
      metalness: 0.5,
    };
    if (textures[1]) opts.normalMap = textures[1];
    return new THREE.MeshStandardMaterial(opts);
  },
};
