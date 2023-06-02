import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/billboards/simpletextureandtexturealphauvoffsetscale.rcsmaterial
  data/fe/flyers/materials/simpletextureandtexturealphauvoffsetscale.rcsmaterial

  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 2050970140, name: 'uv1', align: 14, type: 35, offset: 10 }
*/
export const simpletextureandtexturealphauvoffsetscale: MaterialFactory = {
  name: "simpletextureandtexturealphauvoffsetscale.rcsmaterial",
  minTextures: 1,
  maxTextures: 1,
  make: (textures: THREE.Texture[]) => {
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: textures[0],
      //alphaMap: textures[0], // TODO
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  },
};
