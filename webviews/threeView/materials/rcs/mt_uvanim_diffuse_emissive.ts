import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/02_track/materials/mt_uvanim_diffuse_emissive.rcsmaterial
 *
 *   tex[0] DiffuseTexture               m_lightstripv01_d.gtf, mt_lightstrip01_da.gtf, and_fizzypowerpanel_glowv02.gtf   -> map
 *   tex[1] #b1f2a176                    m_lightstripv01_e.gtf, mt_gradient_d.gtf, m_lightstripv02_e.gtf   -> emissiveMap
 *   tex[2] lightmap                     ile_mesh_combine9-lmap.gtf, ile_mesh_combine-lmap.gtf, ile_mesh_combine1-lmap.gtf   -> lightMap
 *   tex[3] #78256a45                    (no file)   -> map
 *   tex[4] #78787596                    (no file)   -> map
 *   tex[5] #e8bcd7f5                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. `time` (#906b67ba) is *declared* in the
 * fragment program's uniform table of the implemented permutation:
 *
 *     001eb0+0060:  #906b67ba  U  time    c[148]  02010001
 *     001ee4+0094:  0001        #906b67ba  R  time    c[1]
 *
 * but it is never read by any instruction. Both texture lookups take their
 * coordinate straight from an interpolated attribute, unmodified:
 *
 *     0020f0+02a0:  TEXR H1.xyzw, f[TEX3], TEX0     ; diffuse, raw f[TEX3]
 *     002130+02e0:  TEXR H4.xyz, R2.zwzz, TEX1      ; emissive
 *
 * and every multiply/add feeding that path carries explicit zero literals
 * ('{0x00000000(0), ...}') rather than a resolved uniform name, so they are
 * real zeros and not a misread `time`. The vertex program agrees: it has no
 * uniforms at all (uc=0) and copies the UV attribute through untouched --
 * 'MOV o10(TEX3).xy, v2.xyxx'. No UV scroll exists here.
 *
 * All 15 permutations were checked. `time` is referenced by name in only one
 * of them (index 6, FP-off=002370), which binds
 * directionalLight0ShadowTex/LightmapTex and so is outside the permutation
 * implemented here; even there it only combines f[TEX4].x/.y with `GlowTint`
 * before the lookup, which is not a single-axis UV scroll either.
 *
 * An earlier version of this factory used ScrollingMaterial and claimed the
 * shader offset its sample coordinate by `time`. That was a misreading from
 * before the disassembler was fixed and has been removed.
 *
 * Permutation: Static[5], FP-off=001e50 — the lit, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const mt_uvanim_diffuse_emissive: MaterialFactory = {
  name: "mt_uvanim_diffuse_emissive.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
