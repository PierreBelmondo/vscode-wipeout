import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { PulsingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/mageffectloop.rcsmaterial
 *
 *   tex[0] #1202d8df                    mag_emiss_floor_seethru_talons.gtf   -> map
 *   tex[1] #cc98c527                    dc_iridescent_gradient.gtf   -> map
 *   tex[2] Texture2                     glass_etched_tech.gtf   -> map
 *   tex[3] Wave                         ds_mag_wave_c.gtf   -> unused
 *   tex[4] lightmap                     (no file)   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #6c57ba63                    (no file)   -> map
 *   tex[7] #e93dfe2c                    (no file)   -> map
 *   tex[8] #81e0e773                    (no file)   -> map
 *   tex[9] #220cf0e6                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated -- UNVERIFIED, needs a second look. The material does declare the
 * engine clock in permutation 5 (Static, dirlight, no shadow/spot), FRAGMENT
 * @0x005680:
 *
 *     005704+0084: #906b67ba  U  time    c[214]  02010001
 *     005756+00d6: 0000       #906b67ba  R  time  c[0]
 *
 * but no instruction in the current disassembly prints `time` by name, so the
 * three sites the loader patches with it print as raw zeros:
 *
 *     005ca0+0620: MULH H3.xyz, H4, {0, 0, 0, 0}
 *     005d30+06b0: MADH H4.xyz, H4.x, {0, 0, 0, 0}, -H3
 *     005d50+06d0: MADH H3.xyz, H4, {0, 0, 0, 0}.w, H3
 *
 * H4 there is the paraboloid reflection sample and H4.x its luminance:
 *
 *     005c70+05f0: TEXR H4.xyz, R2, TEX2
 *     005ce0+0660: DP3H H4.x, H4, {0.300049, 0.589844, 0.109985, 0}
 *
 * i.e. a colour / desaturation blend on the TEX2 reflection chain, not a UV
 * scroll -- the one UV-building MADR that feeds a fetch is patched by
 * directionalLight0DirectionWorldSpace (slot 0x17), not by time:
 *
 *     005940+02c0: MADR R1.zw, R1, {0, 0, 0, 0}.x, R2.y
 *     0059a0+0320: TEXR H6.xyz, R1.zwzz, TEX3
 *
 * The decompile agent reported confidence "low" and time_role "unclear": the
 * SHO preamble parser (format/sho/sho.c:248-262, format/sho/fp.c:209-214) reads
 * the FP preamble as `[u32 count][u32 byte-offsets...]` and matches patches by
 * byte range, when the real layout is `[u32 count][u32 ptr per uniform...]`,
 * each ptr pointing at `[u16 n][u16 slot]*n` where `slot` is a 16-byte
 * INSTRUCTION index and the patched constant is the 16 bytes following it. The
 * uniform->instruction mapping above is that agent's manual re-derivation
 * (16/16 patch sites landing on real constant blocks), not tool output. It also
 * warns that the two places the tool *does* print `time` by name in other
 * permutations (FP 0x4d10 `MOVH H5.xyz, {...}` and FP 0x6b20 `MULR H6.xyz,
 * R2.w, {...}`) are artifacts of the same bug, not genuine reads.
 *
 * So: `uv_scroll` is affirmatively ruled out, and a colour modulation of the
 * emissive term -- what PulsingMaterial does below -- is consistent with the
 * trace but not confirmed. The open question is emissive_pulse vs colour_ramp.
 * The behaviour is deliberately left unchanged pending a fixed preamble parser
 * and a re-run.
 */
export const mageffectloop: MaterialFactory = {
  name: "mageffectloop.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, _unused3, lightMap, _unused5, map3, map4, map5, map6] = textures;
    return new PulsingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
