import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/03_track/materials/dc_hologramsigns.rcsmaterial
 *
 *   tex[0] #b1f2a176                    dc_ignitionlogoanim.gtf, dc_cornerarrows.gtf   -> map
 *   tex[1] lightmap                     (no file)   -> lightMap
 *   tex[2] #5beb1759                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts) -- permutation idx 12, Static backend, no shadow and no
 *   spot textures. The others are TODO.
 *
 * Not animated, despite the name and despite `time` being bound. The uniform
 * table of idx 12 (FRAGMENT block at file offset 003f20, crc=74c7ad7b) declares
 *
 *     003f98+0078:  #906b67ba  U  time      c[192]  02010001
 *     003fe0+00c0:  0000       #906b67ba  R  time   c[0]
 *
 * so `time` is genuinely patched in and genuinely read -- but the value dies
 * where it is produced:
 *
 *     0040a0+0180:  DIVSQR   R0.xyz, f[TEX2], R0
 *     0040b0+0190:  ADDR_sat R2.w, |R0.y|, {time, zoneColourTint, 0, 0}.x
 *     ...           (R2.w never read between here and the MOVR below)
 *     004320+0400:  MOVR     R2.w, R2        ; R2.w := R2.x, clobbered
 *     004330+0410:  MULR     R2.w, R2, |R2.x|
 *     004370+0450:  MULR     H2.xyz, R2.w, R1  ; uses the overwritten R2.w
 *
 * The only consumer reads the clobbered register, so the time-derived term is
 * dead code -- most likely left over from a shared shader template. No TEXR in
 * this program takes an operand derived from `time`, so nothing scrolls.
 *
 * The other permutations naming `time` in their fp code (idx 13 at 0047d0,
 * idx 15 at 005620, idx 16) were checked too: each consumes it as a scalar
 * coefficient inside an ADDR_sat / DP3R_sat rim-light term, never as a texture
 * coordinate and never with a literal scale. Idx 9 declares `time` in its
 * uniform table but never mentions it in the instruction stream at all.
 *
 * An earlier version of this factory used ScrollingMaterial and claimed the
 * texture channels scroll; the disassembly above contradicts that, so it is now
 * a plain Phong material.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const dc_hologramsigns: MaterialFactory = {
  name: "dc_hologramsigns.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, map1] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
