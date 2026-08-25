import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/modesto_heights/materials/uvanim_diffuse_emissive_bloom.rcsmaterial
 *
 *   tex[0] DiffuseTexture               and_stationadclamp.gtf   -> map
 *   tex[1] #b1f2a176                    ricochet_verticaladvert.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine_track_section4_01-lmap.gtf   -> lightMap
 *   tex[3] #78256a45                    (no file)   -> map
 *   tex[4] #78787596                    (no file)   -> map
 *   tex[5] #f0d90109                    (no file)   -> map
 *   tex[6] #a24bc055                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 3, Static -- DiffuseTexture + directionalLight0 + fog +
 *   constantAmbientColour, no shadow, no spot, no lightmap. VP at 001c30,
 *   FP at 001dc0. The others are TODO.
 *
 * NOT animated, despite the name. The fragment program's uniform table does
 * declare both clocks:
 *
 *     001e20+0060:  #906b67ba  U  time    c[160]  02010001
 *     001e38+0078:  #f0d90109  U  speed   c[164]  02010001
 *     001e60+00a0:  0003       #906b67ba  R  time   c[3]
 *     001e64+00a4:  0004       #f0d90109  R  speed  c[4]
 *
 * but no instruction in this permutation ever names either of them. The UV
 * chain has the shape of a V scroll and yet every operand in it is a genuine
 * inline zero:
 *
 *     001f90+01d0:  MOVR R1.zw, f[TEX4].xxxy        ; U in .z, V in .w
 *     001fb0+01f0:  ADDR R1.w, R1, {0, 0, 0, 0}.x   ; V + 0 -- biases V only
 *     002020+0260:  MULR R3.xy, R1.zwzz, {0,0,0,0}.x
 *     0020a0+02e0:  TEXR H6.xyzw, R3, TEX1          ; emissive/bloom, scrolled coord
 *     0020e0+0320:  TEXR H2.xyzw, f[TEX4], TEX0     ; diffuse, raw coord
 *
 * and the vertex program passes Uv1 straight through with no time term:
 *
 *     001d60+0130:  MOV o11(TEX4).xy, v2.xyxx
 *
 * so this permutation as compiled is static, and a ScrollingMaterial here
 * would be inventing motion the disassembly does not show.
 *
 * Three places in the file *do* print `time`/`speed`, and all three were
 * checked and are mislabels -- do not "fix" this factory from them:
 *   - perm 5 (FP 002900) `DP3R R0.w, R3, {time, ?, speed, 0}`: R3 is the
 *     world-space normal and the result feeds the usual normalize-and-saturate
 *     N.L term, so the real operand is directionalLight0DirectionWorldSpace
 *     (a 3-component 02030001 uniform). The resolver walked into the wrong
 *     adjacent patch slot.
 *   - `MULR H7.w, H6.x, {?, ?, prelitScaleSpecular, time}.x` and
 *     `ADDR_sat R4.w, |R0.y|, {?, 0, prelitScaleSpecular, time}.x`: both read
 *     .x, i.e. the first word; `time` sits in .w and is merely a neighbouring
 *     word printed as part of the whole 4-word block.
 *
 * TODO: perm 2 (Ambient, FP 001a20) has `ADDR R0.x, R1.y, {?, speed, 0, 0}.x`
 *   on the V coord, which hints the zero literals above are patch sites the
 *   loader fills with a V-axis scroll of the bloom map at run time. Confirm
 *   against the patch-site table (preamble at 001e84 lists 9 patch offsets)
 *   before adding animation back; Ambient is not the permutation implemented
 *   here, so it cannot settle it on its own.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const uvanim_diffuse_emissive_bloom: MaterialFactory = {
  name: "uvanim_diffuse_emissive_bloom.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5] = textures;
    return new THREE.MeshPhongMaterial({
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
    });
  },
};
