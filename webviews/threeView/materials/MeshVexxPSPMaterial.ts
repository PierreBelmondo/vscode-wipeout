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
  /**
   * @param map        Diffuse texture.
   * @param hasNormals Pass true when the geometry supplies a per-vertex normal
   *                   attribute (vtxdef has NORMAL bits set).  When false the
   *                   material falls back to flatShading so Three.js generates
   *                   face normals via screen-space derivatives — without this
   *                   geometry that has no normal attribute renders solid black.
   */
  constructor(map: THREE.Texture, hasNormals = false) {
    super({
      map,
      alphaTest: 0.5,
      flatShading: !hasNormals,
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
