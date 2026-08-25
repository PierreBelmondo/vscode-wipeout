import * as THREE from "three";

/**
 * Permutation-aware materials transcribed from the engine's own shaders.
 *
 * The 371 factories beside this file each map a .rcsmaterial onto one of
 * Three's built-in materials. That works when a material is "a diffuse map and
 * maybe a lightmap", and stops working the moment it is not: Three's material
 * model has exactly one `map`, so a shader sampling a diffuse AND a specular
 * AND a mask has nowhere to put the extras. 227 of those factories end up
 * writing several textures into the same slot, where all but the last are
 * silently discarded, and 296 carry a TODO saying the shader's own maths was
 * never transcribed.
 *
 * A material built here instead declares the channels it wants by their engine
 * id and gets a shader that samples all of them. The cost is that the lighting
 * has to be written out rather than inherited, so this is for materials where
 * that is worth it — not for a plain diffuse.
 *
 * ## Permutations
 *
 * A .rcsmaterial is not one shader but a table of precompiled variants: 27 for
 * base_diffusespecular, 91 for jd_simplespecular. The engine picks one per draw
 * from the render state. Reading their uniform sets shows what the axes are —
 * a directional light, a lightmap, the zone effect, shadow maps, up to two spot
 * lights — and which combination each variant is.
 *
 * We implement the one a viewer can honour: lit, lightmapped, no zone, no
 * shadow map, no spots. `Permutation` names it so a factory says which variant
 * it transcribed rather than leaving it implicit, and so the rest can be added
 * later without guessing what the existing code assumed.
 */
export const enum Permutation {
  /** Lit by directionalLight0 + lightmap. No zone, no shadow map, no spots. */
  LitLightmapped,
}

/** A texture the shader samples, named by the engine's id for the channel. */
export type RawChannel = {
  /** The channel id, e.g. Channel.DiffuseTexture. */
  id: number;
  /** The GLSL sampler name to bind it to. */
  uniform: string;
  /** The texture itself, or null when the material ships this slot empty. */
  texture: THREE.Texture | null;
};

/**
 * Common GLSL for the transcribed materials.
 *
 * The engine's fragment programs work in world space with an unpacked vertex
 * normal and a view vector handed down from the vertex program, so the shaders
 * here do the same rather than translating into Three's view-space conventions.
 */
export const RAW_COMMON_VERTEX = /* glsl */ `
  // Three's ShaderMaterial prefix declares position, normal and uv, but NOT
  // uv2 -- it injects that one only for its own materials that use lightmaps.
  // Declaring it here is what makes the lightmap coordinate set reachable; the
  // attribute itself is set by RCSModelLoader when the mesh has one.
  #ifdef HAS_UV2
    attribute vec2 uv2;
  #endif

  varying vec2 vUv;
  varying vec2 vUv2;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  void computeCommon(vec3 objectNormal) {
    vUv = uv;
    #ifdef HAS_UV2
      vUv2 = uv2;
    #else
      vUv2 = uv;
    #endif
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    vViewW = normalize(cameraPosition - worldPosition.xyz);
  }
`;

/**
 * Blinn-Phong as the engine computes it, plus the lightmap term.
 *
 * Transcribed from the fragment program rather than approximated: the engine
 * normalises the interpolated normal and view vector, takes N·L against the
 * directional light, and raises N·H by the specular power with the LG2/EX2 pair
 * the PS3 fragment ISA uses for pow(). `prelitScale` stands in for the engine's
 * `prelitBias`/`prelitScaleSpecular`, which ship no value in the file.
 */
export const RAW_COMMON_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vUv2;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  uniform vec3 lightDirection;
  uniform vec3 lightColour;
  uniform vec3 ambientColour;
  uniform float prelitScale;

  vec3 lit(vec3 albedo, vec3 specularColour, float specularPower, vec3 prelit) {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewW);
    vec3 L = normalize(-lightDirection);

    float ndotl = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float ndoth = max(dot(N, H), 0.0);
    // pow() as the fragment ISA spells it: EX2(power * LG2(ndoth)).
    float spec = ndoth > 0.0 ? exp2(specularPower * log2(ndoth)) : 0.0;

    vec3 diffuse = albedo * (ambientColour + lightColour * ndotl + prelit * prelitScale);
    return diffuse + specularColour * spec * ndotl;
  }
`;

/**
 * Uniforms every transcribed material shares, wired to the scene's own lights
 * by RawRcsMaterial.syncLights().
 */
export function rawCommonUniforms(): Record<string, THREE.IUniform> {
  return {
    lightDirection: { value: new THREE.Vector3(-1, -2, -3).normalize() },
    lightColour: { value: new THREE.Color(1, 1, 1) },
    ambientColour: { value: new THREE.Color(0, 0, 0) },
    prelitScale: { value: 4.0 },
  };
}

/**
 * Base for the transcribed materials.
 *
 * Takes the scene's directional and ambient lights each frame so these stay in
 * step with the Rendering toolbox, which drives them; a ShaderMaterial gets
 * none of Three's automatic light plumbing.
 */
export class RawRcsMaterial extends THREE.ShaderMaterial {
  readonly permutation: Permutation;

  constructor(params: THREE.ShaderMaterialParameters, permutation: Permutation) {
    super(params);
    this.permutation = permutation;
  }

  /**
   * Per-frame hook, which RCSModelLoader registers because this class exposes
   * it. A ShaderMaterial gets none of Three's automatic light plumbing, so the
   * scene's lights have to be pushed into the uniforms — and they change while
   * the viewer runs, since the Rendering toolbox drives them.
   *
   * The scene is reached from a mesh using this material rather than stored,
   * so the material does not outlive or pin a World it no longer belongs to.
   */
  tick(_delta: number) {
    const scene = this._scene;
    if (scene) this.syncLights(scene);
  }

  /** Set by RCSModelLoader once the material is attached to a scene. */
  private _scene: THREE.Scene | null = null;

  attachScene(scene: THREE.Scene) {
    this._scene = scene;
  }

  syncLights(scene: THREE.Scene) {
    let ambient = new THREE.Color(0, 0, 0);
    scene.traverse((object) => {
      if (object instanceof THREE.AmbientLight) {
        ambient.add(object.color.clone().multiplyScalar(object.intensity));
      } else if (object instanceof THREE.DirectionalLight && !object.name.startsWith(".World")) {
        this.uniforms.lightColour.value.copy(object.color).multiplyScalar(object.intensity);
        // The engine's uniform is the direction the light travels, which is the
        // negation of Three's light-position convention.
        this.uniforms.lightDirection.value.copy(object.position).normalize().negate();
      }
    });
    this.uniforms.ambientColour.value.copy(ambient);
  }
}
