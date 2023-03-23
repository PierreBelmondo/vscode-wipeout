import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

export const tech_de_ra_rocks: MaterialFactory = {
  name: "tech_de_ra_rocks.rcsmaterial",
  minTextures: 3,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    switch (textures.length) {
      case 3:
        // 0 = diffuse
        // 1 = normals
        // 2 = ??
        return new THREE.MeshStandardMaterial({
          side: THREE.DoubleSide,
          map: textures[0],
          normalMap: textures[1],
        });
      case 4:
        // 0 = ??
        // 1 = ??
        // 2 = ??
        // 3 = ??
        return new THREE.MeshStandardMaterial({
          side: THREE.DoubleSide,
          map: textures[0],
        });
    }
  },
};
