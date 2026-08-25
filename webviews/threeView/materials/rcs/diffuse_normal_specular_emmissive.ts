import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { Permutation, RAW_COMMON_FRAGMENT, RAW_COMMON_VERTEX, RawRcsMaterial, rawCommonUniforms } from "./_raw";

/**
 * data/environments/*\/materials/diffuse_normal_specular_emmissive.rcsmaterial
 *
 * The track surface. All 22 `Track_Surface_New:wohdtrack_*Shape` nodes in
 * 01_vineta_k use this material, and nothing else does the road — without it
 * the track itself is the one thing missing from the scene.
 *
 *   tex[0] Texture1  ds_sfline_trench_cs.gtf | ds_rail_cs.gtf
 *                    "_cs" = colour + specular (specular in alpha)
 *   tex[1] Texture2  ds_sfline_trench_ne.gtf | ds_rail_ne.gtf
 *                    "_ne" = normal + emissive (emissive in alpha)
 *   tex[2] lightmap  lmaps/*-lmap.gtf — a real file here
 *   Constant1        (0.000, 0.271, 0.656) — the blue trench glow
 *
 * The `_cs`/`_ne` packing is why this needs both maps: alpha of tex[0] is gloss
 * and alpha of tex[1] is the emissive mask, so neither can be used as a cutout.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts), of 70. The others are TODO.
 */
/*
 * Transcribed from the shader (see _raw.ts). Permutation 5 -- Static, lit by
 * directionalLight0, no lightmap/zone/shadow/spot -- binds:
 *
 *   F  #3bdc0403  Texture1    t0     colour, with specular MASK in alpha
 *   F  #a2d555b9  Texture2    t1     tangent-space NORMAL map
 *   F  #7611a2d8  Constant1          an emissive colour, not a texture
 *
 * The fragment program builds a tangent frame from the interpolated
 * TEX0/TEX2/TEX3 basis and unpacks Texture2 with the usual 2n-1:
 *
 *   TEXR R1.xyzw, f[TEX4], TEX1
 *   MADR R2.w, R1.x, {2, -1}.x, {2, -1}.y     ; tangent term
 *   MADR R1.x, R1.y, {2, -1}.x, {2, -1}.y     ; bitangent term
 *   MADR R2.xyz, R0, R2.w, R2                 ; accumulate into the frame
 *   MADR R1.xyz, f[TEX2], R2.w, R2
 *
 * then takes N.H against the halfway vector and raises it by a literal 32:
 *
 *   DIVSQR_sat R0.w, R2.x, R2.y     ; normalised N.H
 *   LG2R R0.w, R0.w
 *   MULR R0.w, R0, {32}.x           ; the specular power
 *   EX2R R0.x, R0.w
 *   MULR R0.w, R0.x, R1.x           ; x Texture1.a, the specular mask
 *
 * The emissive is `Texture2.a * Constant1`:
 *
 *   TEXR R1.xyzw, f[TEX4], TEX1          ; R1.w is Texture2's ALPHA
 *   MADH H4.xyz, R1.w, <Constant1>, H0   ; emissive = mask * Constant1, added
 *
 * so Texture2 carries the normal in RGB and the glow mask in A. The Phong
 * version this replaces bound it as both normalMap and emissiveMap, which got
 * the channels wrong in both directions.
 *
 * TODO: Constant1 ships no value, so EMISSIVE below is a viewer convention.
 */

/** The literal 32 the fragment program raises N.H by. */
const SPECULAR_POWER = 32.0;

/** Stands in for Constant1, which the file does not carry a value for. */
const EMISSIVE = 0x0045a7;

const VERTEX = /* glsl */ `
  ${RAW_COMMON_VERTEX}
  void main() {
    computeCommon(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  ${RAW_COMMON_FRAGMENT}

  uniform sampler2D colourTexture;
  uniform sampler2D normalTexture;
  uniform sampler2D lightmapTexture;
  uniform vec3 emissiveColour;
  uniform float specularPower;

  #ifndef HAS_NORMAL
    #define HAS_NORMAL 0
  #endif
  #ifndef HAS_LIGHTMAP
    #define HAS_LIGHTMAP 0
  #endif

  void main() {
    vec4 colour = texture2D(colourTexture, vUv);

    // Texture2's ALPHA is the emissive mask -- see the note above. Sampled once
    // and reused so the normal unpack and the mask share the fetch.
    vec4 nmap = vec4(0.5, 0.5, 1.0, 0.0);
    #if HAS_NORMAL
      nmap = texture2D(normalTexture, vUv);
    #endif

    vec3 N = normalize(vNormalW);
    #if HAS_NORMAL
      // 2n-1, as the MADs above do. Without a per-vertex tangent to build a
      // full frame from, perturb the geometric normal instead: the direction
      // is right even though the tangent basis is approximated.
      vec3 tn = nmap.xyz * 2.0 - 1.0;
      N = normalize(N + tn.x * normalize(cross(N, vec3(0.0, 1.0, 0.0))) + tn.y * normalize(cross(N, cross(N, vec3(0.0, 1.0, 0.0)))));
    #endif

    vec3 V = normalize(vViewW);
    vec3 L = normalize(-lightDirection);
    float ndotl = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float ndoth = max(dot(N, H), 0.0);
    // Texture1's ALPHA is the specular mask.
    float spec = ndoth > 0.0 ? exp2(specularPower * log2(ndoth)) * colour.a : 0.0;

    vec3 prelit = vec3(0.0);
    #if HAS_LIGHTMAP
      prelit = texture2D(lightmapTexture, vUv2).rgb;
    #endif

    vec3 rgb = colour.rgb * (ambientColour + lightColour * ndotl + prelit * prelitScale);
    rgb += lightColour * spec;
    // MADH H4.xyz, R1.w, <Constant1>, H0 -- R1.w is Texture2.a, so the emissive
    // is MASKED, not added flat. Adding it unmasked (as this first did) washed
    // a flat blue over every pit and wall pixel.
    rgb += emissiveColour * nmap.a;
    gl_FragColor = vec4(rgb, 1.0);
  }
`;

export const diffuse_normal_specular_emmissive: MaterialFactory = {
  name: "diffuse_normal_specular_emmissive.rcsmaterial",
  minTextures: 2,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [colourSpec, normalMap, lightMap] = textures;
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    white.needsUpdate = true;

    return new RawRcsMaterial(
      {
        side: THREE.DoubleSide,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        defines: {
          HAS_NORMAL: normalMap ? 1 : 0,
          HAS_LIGHTMAP: lightMap ? 1 : 0,
          ...(lightMap ? { HAS_UV2: "" } : {}),
        },
        uniforms: {
          ...rawCommonUniforms(),
          colourTexture: { value: colourSpec ?? white },
          normalTexture: { value: normalMap ?? white },
          lightmapTexture: { value: lightMap ?? white },
          emissiveColour: { value: new THREE.Color(EMISSIVE) },
          specularPower: { value: SPECULAR_POWER },
        },
      },
      Permutation.LitLightmapped
    );
  },
};
