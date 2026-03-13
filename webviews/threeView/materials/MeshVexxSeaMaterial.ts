import * as THREE from "three";

/**
 * Material for VEXX SEA / SEA_REFLECT nodes.
 *
 * SEA nodes have renderFlags=0x0001 (opaque) and vtxdef=0x123 (per-vertex
 * normals present).  The original PSP rendering was opaque Phong-lit water.
 *
 * We add a subtle blue-green tint and elevated specular to give the flat
 * water texture a more liquid appearance, without inventing any animation
 * that is not present in the VEXX file.
 *
 * PSP alpha correction (0-128 → 0-1) is applied the same as other PSP
 * materials.
 */
export class MeshVexxSeaMaterial extends THREE.MeshPhongMaterial {
  constructor(map: THREE.Texture) {
    const ownMap = map.clone();
    ownMap.wrapS = THREE.RepeatWrapping;
    ownMap.wrapT = THREE.RepeatWrapping;
    ownMap.needsUpdate = true;

    super({
      map: ownMap,
      // Subtle blue-green tint blended with the source texture colour
      color: new THREE.Color(0x99bbcc),
      // Elevated specular for water surface sparkle
      shininess: 120,
      specular: new THREE.Color(0x6699bb),
      side: THREE.DoubleSide,
    });

    // PSP alpha correction (0-128 → 0-1)
    this.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.a = min(1.0, diffuseColor.a * 2.0); // PSP alpha is 0-128`
      );
    };
  }
}
