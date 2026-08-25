import * as THREE from "three";
import { SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { Permutation, RAW_COMMON_FRAGMENT, RAW_COMMON_VERTEX, RawRcsMaterial, rawCommonUniforms } from "./_raw";

/**
 * data/environments/amphiseum/materials/base_diffusespecular.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_cement_base_edges.gtf, dc_edgingstrips.gtf, dc_basewallconcrete.gtf   -> map
 *   tex[1] #20c3e476                    dc_cement_base_edges_specular.gtf, dc_edgingstripsspecular.gtf, dc_basewallconcretespecular.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_06-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf   -> lightMap
 *   tex[3] #370a63cb                    (no file)   -> map
 *   tex[4] #2924e4ad                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Transcribed from the shader rather than approximated with Phong; see
 * _raw.ts for why. The permutation implemented is index 5 of the file's 27 --
 * Static, lit by directionalLight0, lightmapped, no zone/shadow/spot -- whose
 * binding table names every channel and its texture unit:
 *
 *   F  #11cb4f74  DiffuseTexture    t0
 *   F  #20c3e476  SpecularTexture   t1
 *   F  #37b5db58  lightmap          t2
 *   F  #370a63cb  SpecularColour        (a colour, not a texture)
 *   F  #002c73e8  prelitBias
 *   F  #8670f0be  prelitScaleSpecular
 *   F  #02df31e5  directionalLight0DirectionWorldSpace
 *   F  #2dba643d  directionalLight0Colour
 *
 * The vertex program hands down TEX4.xy as the diffuse uv and TEX4.zw as the
 * lightmap uv, so the two coordinate sets are genuinely distinct here.
 *
 * The Phong version this replaces wrote the diffuse, the specular map and two
 * empty channels all into `map`, so the specular texture overwrote the diffuse
 * and 197 of these across the shipped tracks rendered with the wrong texture.
 *
 * TODO: `prelitBias`, `prelitScaleSpecular` and `SpecularColour` ship no values
 *   in the .rcsmaterial -- they are set per draw -- so the constants below are
 *   viewer conventions, as everywhere else.
 */

const VERTEX = /* glsl */ `
  ${RAW_COMMON_VERTEX}
  void main() {
    computeCommon(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  ${RAW_COMMON_FRAGMENT}

  uniform sampler2D diffuseTexture;
  uniform sampler2D specularTexture;
  uniform sampler2D lightmapTexture;
  uniform vec3 specularColour;
  uniform float specularPower;

  #ifndef HAS_SPECULAR
    #define HAS_SPECULAR 0
  #endif
  #ifndef HAS_LIGHTMAP
    #define HAS_LIGHTMAP 0
  #endif

  void main() {
    vec4 albedo = texture2D(diffuseTexture, vUv);

    // The specular map is its own texture here, not the diffuse's alpha.
    vec3 specular = specularColour;
    #if HAS_SPECULAR
      specular *= texture2D(specularTexture, vUv).rgb;
    #endif

    vec3 prelit = vec3(0.0);
    #if HAS_LIGHTMAP
      prelit = texture2D(lightmapTexture, vUv2).rgb;
    #endif

    gl_FragColor = vec4(lit(albedo.rgb, specular, specularPower, prelit), albedo.a);
  }
`;

export const base_diffusespecular: MaterialFactory = {
  name: "base_diffusespecular.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [diffuse, specular, lightmap] = textures;
    const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    white.needsUpdate = true;

    return new RawRcsMaterial(
      {
        side: THREE.DoubleSide,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        defines: {
          HAS_SPECULAR: specular ? 1 : 0,
          HAS_LIGHTMAP: lightmap ? 1 : 0,
          ...(lightmap ? { HAS_UV2: "" } : {}),
        },
        uniforms: {
          ...rawCommonUniforms(),
          diffuseTexture: { value: diffuse ?? white },
          specularTexture: { value: specular ?? white },
          lightmapTexture: { value: lightmap ?? white },
          specularColour: { value: new THREE.Color(SPECULAR_COLOR) },
          specularPower: { value: SPECULAR_SHININESS },
        },
      },
      Permutation.LitLightmapped
    );
  },
};
