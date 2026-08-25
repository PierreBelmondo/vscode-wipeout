import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/clouds.rcsmaterial
 *
 *   tex[0] #fd669142                    clouds_new.gtf   -> map
 *   tex[1] diffuse                      cloud mask.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #05fec07d                    (no file)   -> map
 *   tex[4] #549310b8                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * NOT animated, despite declaring `time`. The uniform table does list the
 * engine clock (`#906b67ba  U  time  c[80]`, bound at `R  time  c[0]`), but it
 * is never consumed. The implemented permutation's whole fragment program is:
 *
 *     MOVR R2.w, {0}.x
 *     ADDH H0.xyz, {0}, f[TEX0]     ; ambient/vertex colour
 *     MOVR R0.zw, f[TEX3].xxxy      ; R0.z = TEX3.x, R0.w = TEX3.y
 *     TEXR H2.x, f[TEX3].zwzz, TEX0
 *     MOVR R1.w, R0                 ; R1.w = TEX3.y
 *     MADR R1.z, R2.w, {0}.x, R0    ; R1.z = (0 * 0) + R0.z = TEX3.x
 *     MOVH H0.w, H2.x               ; alpha from the TEX0 sample's .x
 *     TEXR H1.xyz, R1.zwzz, TEX1    ; sampled at the raw interpolated UV
 *     MULH H0.xyz, H0, H1  ; END    ; plain modulate, no emissive term
 *
 * The MADR has the canonical UV-scroll shape (rate * scale + base) and its
 * result feeds the TEXR, but both of its first two operands are genuine inline
 * zeros: R2.w is set from an inline zero one instruction earlier, so
 * R1.z = R0.z = TEX3.x unchanged and neither axis moves.
 *
 * Those zeros were confirmed to be real rather than unresolved uniform patches
 * by the patch-site arithmetic: the preamble's three patch sites (0x24, 0x28,
 * 0x2c) all fall below `preamble_size=0x30`, so none of them lands on an
 * instruction constant. The disassembler does resolve patched constants by name
 * when they do land on one -- e.g. `ADDR R1.w, -|R0|, {zoneColourTint, ...}` --
 * and only two such sites exist in the whole file, neither of them `time`.
 *
 * Checked across all 8 distinct fragment programs in the material, not just the
 * implemented one: every `time` hit in the disassembly is a `U` declaration or
 * an `R` binding row, none inside an instruction operand. So this is unconsumed
 * everywhere, including the zone/shadow/spot variants -- not merely absent from
 * the permutation implemented here.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const clouds: MaterialFactory = {
  name: "clouds.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
