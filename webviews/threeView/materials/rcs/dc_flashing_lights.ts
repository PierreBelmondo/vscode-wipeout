import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/03_track/materials/dc_flashing_lights.rcsmaterial
 *
 *   tex[0] DiffuseTexture               dc_ringtracersdiffuse.gtf   -> map
 *   tex[1] #b1f2a176                    dc_grad.gtf, dc_grad_b.gtf   -> map
 *   tex[2] lightmap                     ile_mesh_combine22-lmap.gtf, ile_mesh_combine23-lmap.gtf   -> lightMap
 *   tex[3] #e8bcd7f5                    (no file)   -> map
 *   tex[4] #3fcae4b3                    (no file)   -> map
 *   tex[5] #d1634606                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 3, FP at 001f00 — the Static backend with DiffuseTexture,
 *   directionalLight0, fogColour, constantAmbientColour and GlowTint, no shadow
 *   and no spot texture: the lit, Ambient, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO.
 *
 * NOT animated. `time` (#906b67ba) is declared in this permutation's uniform
 * table and given a patch-site remap, but the fragment program never reads it:
 *
 *     001f54+0054:  #906b67ba  U  time    c[146]  02010001   ; declared
 *     001f92+0092:  0002       #906b67ba  R  time  c[2]      ; remapped to c[2]
 *
 * and yet no `time` operand appears anywhere between the `-- fp code --` marker
 * and END. Every constant operand in the code section is a raw literal:
 *
 *     002010+0110:  DP3R H5.x, R1, {0x00000000(0), ...}
 *     0020e0+01e0:  MULR R0.w, f[TEX2], {0x00000000(0), ...}
 *     002230+0330:  MADR H0.xyz, R0.z, H0, R1  ; END
 *
 * The matching vertex program (VP at 001db0) does not declare `time` at all.
 * So it is a declared-but-dead uniform here and the material is static — an
 * earlier revision of this file claimed the shader "modulates the emissive term
 * with `time`, so the glow pulses" and used PulsingMaterial; that was a
 * misreading of one of the zero literals above, and has been removed.
 *
 * Other permutations of this same material do read `time` by name (idx 5/8/11/14
 * add lightmap+prelitBias, idx 21/22 drop the directional light), e.g.
 *
 *     002a40+0160:  DP3R R1.z, R0, {prelitScaleSpecular, 0x00000000(0), time, ?}
 *
 * but even there it feeds a dot product against a texcoord that is immediately
 * consumed by a DIVSQR_sat normalize (R1.z is overwritten straight after) — not
 * a TEXR coordinate and not an emissive scalar. If a factory ever targets one of
 * those permutations, that usage needs tracing on its own; it is not a pulse.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const dc_flashing_lights: MaterialFactory = {
  name: "dc_flashing_lights.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4] = textures;
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
