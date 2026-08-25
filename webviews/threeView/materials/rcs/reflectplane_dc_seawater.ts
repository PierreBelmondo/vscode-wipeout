import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * The `time` scale the vertex program MADs into U.
 *
 * The disassembler resolves FP uniforms by name but prints VP constant
 * registers as raw indices, so this figure is read out of the VP preamble's
 * raw literal block rather than printed by the tool: the trailing floats of
 * idx 2's preamble are `40 00 00 00 3f 80 00 00 3d 4c cc cd` = 2.0, 1.0,
 * 0.05, and `3d 4c cc cd` sits in the slot the `c464.zzzz` operand indexes.
 * That is a positional match, not a resolved literal -- see the TODO below.
 */
const TIME_SCALE = 0.05;

/**
 * data/environments/03_track/materials/reflectplane_dc_seawater.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_waternormalmap.gtf   -> map
 *   tex[1] #06a77e50                    dc_waternormalmap.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine25-lmap.gtf, ile_mesh_combine20-lmap.gtf, ile_mesh_combine26-lmap.gtf   -> lightMap
 *   tex[3] #4d60d566                    (no file)   -> map
 *   tex[4] #5e5b1937                    (no file)   -> map
 *   tex[5] #370a63cb                    (no file)   -> map
 *   tex[6] #81e0e773                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: sea water. `time` (#906b67ba, bound at c[465] in this permutation)
 * is scaled and MADded into the *U* coordinate of two samples, in opposite
 * directions, by the vertex program:
 *
 *     MOV R0.w, c464.zzzz                        ; the 0.05 scale
 *     MAD o10(TEX3).z, R0.wwww, c465.xxxx, -v3.xxxx   ; U - time * 0.05
 *     MAD o10(TEX3).x, R0.wwww, c465.xxxx,  v3.xxxx   ; U + time * 0.05
 *     TEXR R4.yw, f[TEX3], TEX0                  ; DiffuseTexture at U + ...
 *     TEXR R0.yw, R0.zwzz, TEX1                  ; t[1] at U - ...
 *
 * so the two water-normal layers slide across each other along U while V is
 * passed through untouched -- the counter-scroll is what makes the surface
 * read as moving water. Confirmed identical in permutation idx 6 (Static, no
 * shadow/spot, VP-off=003da0), where the same pair of MADs feed o12(TEX5) and
 * a further plain literal 1.15 scales the already-shifted UV before the t[1]
 * sample.
 *
 * Three.js offsets one coordinate per texture, so only the additive layer is
 * modelled here; the opposing `-time` layer would need a second sampler.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (idx 2, VP-off=0019b0, FP-off=001b80; see _abstract.ts). The others are TODO.
 *
 * TODO: confirm TIME_SCALE. It is inferred positionally from the VP preamble's
 *   raw float bytes because the disassembler's uniform-patch-table resolution
 *   covers fragment preambles only, so the vertex-side constant is not printed
 *   as a named literal. The axis and the counter-scroll are certain; the
 *   magnitude is the soft part of this finding.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const reflectplane_dc_seawater: MaterialFactory = {
  name: "reflectplane_dc_seawater.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        ...(map5 ? { map: map5 } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      // U scrolls at the shader's `time * 0.05`; V is never touched by the MADs.
      TIME_SCALE,
      0.0,
    );
  },
};
