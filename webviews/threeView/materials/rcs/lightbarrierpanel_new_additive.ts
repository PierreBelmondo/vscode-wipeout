import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/lightbarrierpanel_new_additive.rcsmaterial
 *
 *   tex[0] #2d006ed5                    lightbarrier_hexagons.gtf   -> map
 *   tex[1] #8590dfc5                    lightbarrier_panelpulsing.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #69d42acc                    (no file)   -> map
 *   tex[4] Colour                       (no file)   -> unused
 *   tex[5] #d0989794                    (no file)   -> map
 *   tex[6] #31182e0d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the "panelpulsing" texture name. `time` is declared and
 * relocated in the implemented permutation but never reaches an instruction
 * operand -- it appears only in the uniform table:
 *
 *     00168c+003c: #906b67ba  U  time  c[106]  02010001
 *     0016ba+006a: 0001                  #906b67ba  R  time  c[1]
 *
 * and the UV chain feeding every TEXR is built from inline literals alone. The
 * two ADDR offsets on the UV register -- exactly the shape a scroll would take
 * -- add genuine zeros:
 *
 *     MOVR R1.xyzw, f[TEX3]
 *     MULR R0.zw, R1, {0x3ecccccd(0.4), ...}.x     ; the one real UV scale
 *     ADDR R3.xy, R0.zwzz, -{0x00000000(0), ...}.x ; zero, not time
 *     ADDR R3.zw, R3.xxxy, {0, 0x3f000000(0.5), ...}.y ; half-texel centering
 *     ADDR R3.xy, R0.zwzz, {0x00000000(0), ...}.x  ; zero, not time
 *     TEXR R0.w, R3.zwzz, TEX0
 *     TEXR R0.w, R3, TEX0
 *
 * Checked against a verified disassembly whose uniform-name resolution is known
 * good on this file (it names `Colour`, `Speed` and `time` at operands
 * elsewhere), so the absence here is real rather than a tooling gap. Two traps
 * for anyone re-checking:
 *
 *   - The only by-name `time` operand in the whole file is at 0x4d20, in a
 *     permutation this project does not implement, and it is a packed 4-slot
 *     constant `{zoneBaseAltOuter, constantAmbientColour, time, zoneColourTint}`
 *     read as `.w` -- so the component consumed is `zoneColourTint`, not
 *     `time`, and the ADDR/LG2R/MUL 5/EX2R around it is a pow() rim term.
 *   - This permutation's vertex program does `MOV o7(TEX0).xyz, c464.xxxx`, and
 *     c464 is the `time` slot in *other* permutations -- but this VP declares
 *     only viewProj, eyePositionWorldSpace, positionScale and positionBias, so
 *     c464 is an unpatched zero here.
 *
 * An earlier revision of this factory used PulsingMaterial and claimed the
 * shader modulated the emissive term with `time`; the disassembly does not
 * support that. Any animation would have to come from a permutation the viewer
 * does not implement.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const lightbarrierpanel_new_additive: MaterialFactory = {
  name: "lightbarrierpanel_new_additive.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, _unused4, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
