import * as THREE from "three";
import { MaterialFactory } from "../_abstract";

/*
data/art/published/ships/materials/2048_ship_tech.rcsmaterial
PSVita (WipEout 2048)

Textures: tech_template.gxt (diffuse), tech_template_n.gxt (normal)
*/
export const ship_tech_2048: MaterialFactory = {
  name: "2048_ship_tech.rcsmaterial",
  minTextures: 1,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    const opts: THREE.MeshStandardMaterialParameters = {
      side: THREE.DoubleSide,
      map: textures[0],
      roughness: 0.7,
      metalness: 0.3,
    };
    if (textures[1]) opts.normalMap = textures[1];
    return new THREE.MeshStandardMaterial(opts);
  },
};
