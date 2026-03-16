import * as THREE from "three";

/**
 * Material for caustic light patterns projected onto underwater track meshes.
 *
 * The PSP game engine projected animated caustic textures (from the VEXX
 * texture table, named "caustics/save.XX.tga") onto track meshes identified
 * by reserved1 != 0xff in the mesh header.  The textures are tiled and
 * scrolled to simulate rippling underwater light.
 *
 * This material renders as a second additive pass on top of the base
 * track material, using world-space XZ coordinates for UV mapping so that
 * the caustic pattern tiles uniformly across the geometry.
 *
 * The effect is attenuated by the surface normal's Y component — faces
 * looking straight up receive full caustics while vertical/downward faces
 * receive none, simulating light projected from above the water surface.
 */
export class MeshCausticMaterial extends THREE.MeshBasicMaterial {
  private static readonly SCROLL_SPEED_U = 0.04;
  private static readonly SCROLL_SPEED_V = 0.03;

  /** World-space UV tiling (higher = smaller/sharper caustic pattern). */
  private static readonly WORLD_SCALE = 0.025;

  /** Overall intensity multiplier (lower = more subtle). */
  private static readonly INTENSITY = 0.3;

  private _causticMaps: THREE.Texture[];
  private _elapsed = 0;
  private _frameIndex = 0;
  private _scrollOffset = new THREE.Vector2(0, 0);
  private _shaderRef: { uniforms: Record<string, THREE.IUniform> } | null = null;
  private _surfaceY = 0;

  /** Seconds per caustic frame (16 frames @ ~8 FPS). */
  private static readonly FRAME_DURATION = 1 / 8;

  constructor(causticMaps: THREE.Texture[]) {
    const firstMap = causticMaps[0].clone();
    firstMap.wrapS = THREE.RepeatWrapping;
    firstMap.wrapT = THREE.RepeatWrapping;
    firstMap.magFilter = THREE.LinearFilter;
    firstMap.minFilter = THREE.LinearMipmapLinearFilter;
    firstMap.needsUpdate = true;

    super({
      map: firstMap,
      color: new THREE.Color(0xffffff),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this._causticMaps = causticMaps;

    this.onBeforeCompile = (shader) => {
      shader.uniforms.causticScroll = { value: this._scrollOffset };
      shader.uniforms.causticIntensity = { value: MeshCausticMaterial.INTENSITY };
      shader.uniforms.causticSurfaceY = { value: this._surfaceY };

      // Pass normal attenuation and depth fade to fragment
      shader.vertexShader =
        "uniform vec2 causticScroll;\nuniform float causticSurfaceY;\nvarying float vCausticAtten;\n" +
        shader.vertexShader;

      // Project UVs from world-space XZ + scroll, compute attenuation
      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
        vec4 causticWorldPos = modelMatrix * vec4(position, 1.0);
        vUv = causticWorldPos.xz * ${MeshCausticMaterial.WORLD_SCALE.toFixed(4)} + causticScroll;
        // Progressive normal attenuation: full on upward faces, fades on angled
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        float normalFactor = pow(max(0.0, worldNormal.y), 0.6);
        // Depth fade: start 15 units below surface, full at 35 units deep
        float depth = causticSurfaceY - causticWorldPos.y;
        float depthFade = smoothstep(55.0, 75.0, depth);
        vCausticAtten = normalFactor * depthFade;`
      );

      // Declare varying + uniform in fragment
      shader.fragmentShader =
        "uniform float causticIntensity;\nvarying float vCausticAtten;\n" +
        shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        // PSP alpha (0-128 → 0-1) as caustic mask, keep full gradient
        float causticMask = min(1.0, diffuseColor.a * 2.0);
        // Gentle high-pass: dim the flat base, keep the bright lines
        causticMask = smoothstep(0.3, 1.0, causticMask);
        float finalAlpha = causticMask * vCausticAtten * causticIntensity;
        // Tint: turquoise
        vec3 deepTurq = vec3(0.2, 0.5, 0.9);
        vec3 brightTurq = vec3(0.5, 0.75, 1.0);
        diffuseColor.rgb = mix(deepTurq, brightTurq, causticMask);
        diffuseColor.a = finalAlpha;`
      );

      this._shaderRef = shader;
    };
  }

  /** Called each frame by World.updateAnimations(). */
  tick(delta: number) {
    if (!this.map) return;

    // UV scroll via uniform
    this._scrollOffset.x += MeshCausticMaterial.SCROLL_SPEED_U * delta;
    this._scrollOffset.y += MeshCausticMaterial.SCROLL_SPEED_V * delta;
    if (this._shaderRef) {
      this._shaderRef.uniforms.causticScroll.value = this._scrollOffset;
    }

    // Frame animation
    if (this._causticMaps.length > 1) {
      this._elapsed += delta;
      if (this._elapsed >= MeshCausticMaterial.FRAME_DURATION) {
        this._elapsed -= MeshCausticMaterial.FRAME_DURATION;
        this._frameIndex = (this._frameIndex + 1) % this._causticMaps.length;
        const nextMap = this._causticMaps[this._frameIndex];
        (this.map as THREE.DataTexture).image = (nextMap as THREE.DataTexture).image;
        this.map.needsUpdate = true;
      }
    }
  }
}
