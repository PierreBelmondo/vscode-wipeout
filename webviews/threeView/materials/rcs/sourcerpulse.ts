import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/sourcerpulse.rcsmaterial
 *
 *   tex[0] #28e981a4                    sourcerplasmavibea.gtf   -> map
 *   tex[1] Wave                         ds_wave_c.gtf   -> unused
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #e8a23c93                    (no file)   -> map
 *   tex[4] #220cf0e6                    (no file)   -> map
 *   tex[5] #7961a57f                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. The fragment program declares `time` and the
 * loader patches it into c[0], but no instruction ever reads that register:
 *
 *     00171c: #906b67ba  U  time  c[106]  02010001     ; declared
 *     00174a: 0000       #906b67ba  R  time  c[0]      ; patch slot
 *
 *     MOVR R0.w, f[TEX1]                               ; V, untouched
 *     MOVR R0.z, f[TEX0].w                             ; U, untouched
 *     TEXR H0.xyzw, R0.zwzz, TEX0                      ; sampled at the plain UV
 *     TEXR H1.xyz,  R0.zwzz, TEX1                      ; same coordinate
 *     MADH H1.z, -H1, H2, {1, 0, 0, 0}.x
 *     MADH H0.xyz, H0, {0, 0, 0, 0}, H1
 *     MOVH H0.w, {0, 0, 0, 0}                          ; END
 *
 * Every constant operand is either a temp register or an inline literal, so
 * c[0] is dead. The matching vertex program (0x0015b0) declares no `time`
 * uniform at all -- only viewProj, eyePositionWorldSpace, positionScale and
 * positionBias -- so neither stage moves anything.
 *
 * Checked on permutation idx 2 ("Ambient", Backend=Static, FP 0x0016e0 /
 * VP 0x0015b0), the lit/Ambient/no-shadow/no-spot point of the matrix, and
 * cross-checked against idx 3 (FP 0x001ac0), whose whole 0x410-byte code block
 * shows the same pattern. An earlier comment here claimed the shader modulated
 * the emissive term with `time`; the disassembly does not support that and the
 * PulsingMaterial it used has been removed.
 *
 * TODO: a stray vertex block at 0x1170 (crc 5a429c70) does consume `time` as a
 *   UV-scroll term (`ADD o10(TEX3).x, v2.yyyy, -c464.xxxx`), but it appears in
 *   no VP-off column of this material's 21 permutations, so it is orphaned or
 *   belongs to an axis the permutation summary does not enumerate.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const sourcerpulse: MaterialFactory = {
  name: "sourcerpulse.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, _unused1, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
