import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/uvanim_diffuse_emissive.rcsmaterial
 *
 *   tex[0] DiffuseTexture               m_lightstripv01_d.gtf, mr_tracklamp.gtf, and_stadiumglowstrip.gtf   -> map
 *   tex[1] #b1f2a176                    m_lightstripv01_e.gtf, pipefx_02_firey.gtf, and_verticalemissive.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine_track01_01-lmap.gtf, ile_mesh_combine_track01_02-lmap.gtf, ile_mesh_combine_track01_06-lmap.gtf   -> lightMap
 *   tex[3] #78256a45                    (no file)   -> map
 *   tex[4] #78787596                    (no file)   -> map
 *   tex[5] #e8bcd7f5                    (no file)   -> map
 *   tex[6] #f0d90109                    (no file)   -> map
 *   tex[7] #a24bc055                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 2 "Ambient" (Backend=Static, no shadow, no spot) -- the lit,
 *   Ambient point of the matrix (see _abstract.ts). The others are TODO.
 *
 * Despite the name, this permutation does NOT animate. The fragment program at
 * 0x1cf0 (crc=8d6cc759) does declare and read the engine clock --
 *
 *     #906b67ba  U  time  c[130]              ; time is a named uniform here
 *     MOVR R0.zw, f[TEX3].xxxy                ; the diffuse UV set
 *     ADDR R0.x, R0.w, {time, ?, GlowTint, speed}.x   ; U + time
 *     MULR R0.w, R0.x, {0, 0, 0, 0}.x         ; ...times a literal 0.0
 *     TEXR H0.xyzw, f[TEX3], TEX0             ; diffuse: raw attribute, no R0
 *     MADR R0.w, R1.x, {0, 0, 0, 0}.x, R0
 *     MULR R0.zw, R0, {0, 0, 0, 0}.x          ; coord zeroed again
 *     TEXR H1.xyz, R0.zwzz, TEX1              ; emissive sampled at (0, 0)
 *
 * -- but every path from `time` to a sampler passes through a multiply by a
 * genuine literal 0.0. Those {0x00000000} operands were checked against the
 * permutation's own uniform/patch table (uc=2, both uniforms named) and match no
 * declared slot, so they are baked-in zeros rather than misresolved uniform
 * names. The diffuse TEXR samples f[TEX3] directly and never touches R0 at all.
 * Net effect: the time term is dead code, and the material is static.
 *
 * Previously this factory extended ScrollingMaterial and claimed the channels
 * scroll; that claim is contradicted by the disassembly above and was removed.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: only permutation idx 2 was disassembled. Sibling permutations (idx 3/4/6/7,
 *   e.g. the FP at 0x20b0) reuse the same {time, ?, GlowTint, speed} uniform set
 *   alongside directionalLight/shadow terms; if one of them patches a non-zero
 *   multiplier into that slot at run time, the animation would be real there and
 *   this file would need a ScrollingMaterial on the U axis (TEX3.x feeding TEX1).
 */
export const uvanim_diffuse_emissive: MaterialFactory = {
  name: "uvanim_diffuse_emissive.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
