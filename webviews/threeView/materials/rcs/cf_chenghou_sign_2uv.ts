import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/04_chenghou_project/materials/cf_chenghou_sign_2uv.rcsmaterial
 *
 *   tex[0] Texture1                     cf_chenghou_sign.gtf, jd_sebenco_startsign_01.gtf   -> map
 *   tex[1] Texture2                     jd_chenghou_startsign_02.gtf, jd_sebenco_startsign_02.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: 2, "Ambient" (Static backend, no shadow, no spot) -- the lit,
 *   Ambient, no-shadow, no-spot point of the matrix (see _abstract.ts). The
 *   others are TODO.
 *
 * Not animated. The permutation declares `time` in its uniform table, packed
 * into a constant quad beside `constantAmbientColour`:
 *
 *     0010c8+0018: #81db67ea  U  constantAmbientColour  c[64]  02030001
 *     0010d4+0024: #906b67ba  U  time                   c[66]  02010001
 *
 * but the fragment program never reads it. The whole of the FP block at file
 * offset 0010b0 is:
 *
 *     MOVR R0.w, {constantAmbientColour, time, 0, 0}.x   ; .x = ambient, not time
 *     MADR R0.w, R0, 0.2, R1.y                           ; V' = ambient*0.2 + V
 *     MOVR R1.xy, f[TEX3]
 *     MOVR R0.z, R1.x
 *     TEXR H1.xyz, R0.zwzz, TEX1
 *     MULH H1.xyz, f[TEX0], H1
 *     TEXR H0.xyz, f[TEX3].zwzz, TEX0
 *     MADH H0.xyz, H0, {0,0,0,0}, H1                     ; END
 *
 * The only instruction touching that constant quad selects `.x`, which is
 * `constantAmbientColour`. `time` sits at word index 1 (`.y`) and no
 * instruction in the program ever selects it -- it is patched into the constant
 * bank and left dead. Both texture coordinates derive from f[TEX3] and the
 * ambient-derived R0.w term (the 0.2 is a literal in the MADR), not from a
 * clock. All 15 entries of the permutation table were checked; the
 * DirectionalLight variants (3/5) likewise declare `time` without consuming it.
 *
 * An unrelated FRAGMENT blob at offset 0011b0 in the same file (GlowTint /
 * speed / DiffuseTexture) shows the same constant-packing pattern, but no
 * FP-offset in this material's permutation table points at it -- it belongs to
 * another material bundled in the same archive.
 *
 * A previous revision of this factory used PulsingMaterial on the strength of
 * `time` appearing in the uniform list; that was a misreading of the swizzle and
 * has been reverted.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: the shadow/spot permutations (4/6/8/10/12/14) are not implemented; if
 *   any of them turns out to consume `time`, revisit.
 */
export const cf_chenghou_sign_2uv: MaterialFactory = {
  name: "cf_chenghou_sign_2uv.rcsmaterial",
  minTextures: 1,
  maxTextures: 3,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
