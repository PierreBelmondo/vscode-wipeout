import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/cf_anulpha_glow.rcsmaterial
 *
 *   tex[0] Texture1                     mar_cellular_lamps_blue.gtf, mar_cellular_tile_blue.gtf, mar_cellular_tile.gtf   -> map
 *   tex[1] Texture2                     under_strut_glow.gtf, cf_greygrad.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine14-lmap.gtf, ile_mesh_combine-lmap.gtf, ile_mesh_combine3-lmap.gtf   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated. `time` (#906b67ba) is declared in this permutation's fragment
 * preamble and patched into the constant bank as c[0], but no instruction ever
 * reads it. The whole program is eight instructions (FRAGMENT block at file
 * offset 0x008a00, permutation idx 1 "Ambient"):
 *
 *     MOVR R0.w, 0.0                ; accumulator := 0
 *     TEXR H0.xyzw, f[TEX0], TEX0   ; Texture1 at the interpolated UV
 *     MULR R0.z, R0.w, 0.25         ; 0 * 0.25 -> still 0
 *     TEXR H1.xyz, R0.z, TEX1       ; Texture2 at that fixed coordinate
 *     MULH H2.xyz, H0, H0.w         ; Texture1 premultiplied by its own alpha
 *     MOVH H0.w, 0.0
 *     MULH H1.xyz, H2, H1           ; the two samples multiplied
 *     MADH H0.xyz, H0, 0.0, H1      ; result = H1
 *
 * so this is a static two-texture modulate: Texture2's lookup coordinate comes
 * from a literal-derived register that evaluates to 0, not from the clock. The
 * 0.25 literal in the MULR proves the disassembler resolves genuine constants
 * here, so the 0.0 operands are real zeroes rather than unresolved words, and
 * neither c[0] (time) nor c[1] (constantAmbientColour) is consumed. The paired
 * VERTEX block at 0x008880 declares only viewProj/quakeOffset/quakePointB/
 * quakePointA -- pure quake deformation, no time either.
 *
 * (An earlier revision of this file used PulsingMaterial and claimed the shader
 * modulated the emissive term with `time`. The disassembly above contradicts
 * that, so it has been reverted to a plain Phong material.)
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. Richer permutations of this same
 *   material -- e.g. FRAGMENT at 0x00a150, "HalfBrightIleVertexSunSpot0" -- do
 *   consume `time`, feeding an EX2R_sat rim/fresnel falloff rather than any
 *   texture coordinate, but none of those are implemented here.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const cf_anulpha_glow: MaterialFactory = {
  name: "cf_anulpha_glow.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
