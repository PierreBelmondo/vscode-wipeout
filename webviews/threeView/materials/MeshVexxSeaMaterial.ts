import * as THREE from "three";

/**
 * Material for VEXX SEA / SEA_REFLECT nodes.
 *
 * SEA nodes have renderFlags=0x0001 (opaque) and vtxdef=0x123 (per-vertex
 * normals present).  The original PSP rendering was opaque Phong-lit water
 * with scrolling UV to simulate caustic reflections (renderFlags bit 4).
 *
 * We add a subtle blue-green tint, elevated specular, and UV scrolling to
 * reproduce the animated water surface from the game.
 *
 * PSP alpha correction (0-128 → 0-1) is applied the same as other PSP
 * materials.
 */
export class MeshVexxSeaMaterial extends THREE.MeshPhongMaterial {
  /** UV scroll speed in texture units per second (approximate PSP rate). */
  private static readonly SCROLL_SPEED_U = 0.03;
  private static readonly SCROLL_SPEED_V = 0.02;

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

  /** Called each frame by World.updateAnimations() to scroll UVs. */
  tick(delta: number) {
    if (!this.map) return;
    this.map.offset.x += MeshVexxSeaMaterial.SCROLL_SPEED_U * delta;
    this.map.offset.y += MeshVexxSeaMaterial.SCROLL_SPEED_V * delta;
  }
}
