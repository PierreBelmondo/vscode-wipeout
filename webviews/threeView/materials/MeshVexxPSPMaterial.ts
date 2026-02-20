import * as THREE from "three";

/**
 * Material for VEXX v3/v4 (PSP) meshes.
 *
 * Handles PSP-specific rendering quirks:
 *  - Alpha range: PSP stores alpha as 0-128 (128 = fully opaque).
 *    The shader scales it to 0-1 for WebGL.
 *  - Flat shading: matches the PSP GU's per-face shading model.
 */
export class MeshVexxPSPMaterial extends THREE.MeshPhongMaterial {
  constructor(map: THREE.Texture) {
    super({
      map,
      alphaTest: 0.5,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.a = min(1.0, diffuseColor.a * 2.0); // PSP alpha is 0-128`
      );
    };
  }
}
