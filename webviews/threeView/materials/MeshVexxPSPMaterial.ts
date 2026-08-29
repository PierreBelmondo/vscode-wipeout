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
   * @param alphaRef   The GE alpha-test reference the chunk asks for, 0-255, or
   *                   undefined for the old fixed 0.5.  The file uses two: 0x00
   *                   on 10,040 chunks and 0x7f on 2,855.  Doubled to match the
   *                   0-128 -> 0-1 alpha the shader below applies, then nudged
   *                   above zero: the GE discards on `alpha <= ref`, so ref 0
   *                   still drops fully transparent texels, while Three's
   *                   `alpha < alphaTest` would keep them at exactly 0.
   */
  constructor(map: THREE.Texture, hasNormals = false, alphaRef?: number) {
    super({
      map,
      alphaTest: alphaRef === undefined ? 0.5 : Math.max(1 / 255, Math.min(1, (alphaRef * 2) / 255)),
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
