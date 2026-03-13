import * as THREE from "three";

/**
 * Unlit material for VEXX v3/v4 (PSP) transparent/emissive meshes.
 *
 * Applies the same PSP alpha correction as MeshVexxPSPMaterial:
 * PSP stores alpha as 0-128; this shader scales it to 0-1 for WebGL.
 * Without this, additive/blend materials render at ~50% intended intensity.
 */
export class MeshVexxPSPBasicMaterial extends THREE.MeshBasicMaterial {
  constructor(params: THREE.MeshBasicMaterialParameters) {
    super(params);

    this.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.a = min(1.0, diffuseColor.a * 2.0); // PSP alpha is 0-128`
      );
    };
  }
}
