import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/talons_junction/materials/mageffect08_floor.rcsmaterial
 *
 *   tex[0] #28e981a4                    ds_floor_cs.gtf   -> map
 *   tex[1] #1202d8df                    mag_emiss_talons.gtf   -> map
 *   tex[2] Normal                       ds_floor_n_rh.gtf   -> normalMap
 *   tex[3] Wave                         ds_mag_wave_c.gtf   -> unused
 *   tex[4] lightmap                     ile_mesh_combine_tracksurface_02-lmap.gtf, ile_mesh_combine_tracksurface_05-lmap.gtf, ile_mesh_combine_tracksurface_01-lmap.gtf   -> lightMap
 *   tex[5] Colour                       (no file)   -> unused
 *   tex[6] #370a63cb                    (no file)   -> map
 *   tex[7] #81e0e773                    (no file)   -> map
 *   tex[8] #220cf0e6                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * NOT animated. The fragment program declares a `time` uniform but never reads
 * it. From the "Ambient" Static permutation (FP block at file offset 0048e0),
 * the uniform table binds:
 *
 *     00491c+003c:  #906b67ba  U  time  c[102]  02010001
 *
 * yet the word `time` appears nowhere in an instruction operand of the
 * `-- fp code --` section, and the companion vertex block at 004780 declares
 * uc=0 (viewProj / eyePositionWorldSpace / positionScale / positionBias only),
 * so it is dead in both stages. The only per-pixel coordinate the shader
 * computes is built from real zero literals:
 *
 *     MOVR R0.x, {0, 0, Colour, ?}.x          ; .x is the literal 0
 *     MADR R1.zw, R1, {0, 0, 0, 0}.x, R0.x    ; multiplied by 0
 *     TEXR H1.xyzw, f[TEX3], TEX1             ; base sample
 *     TEXR H0.xyz,  R1.zwzz, TEX2             ; second sample, static coords
 *     ADDH H0.xyz, -H1, H0
 *     MADH H3.xyz, H1.w, H0, H1               ; lerp(TEX1, TEX2, H1.w)
 *     ...
 *     TEXR H1.xyz, f[TEX3], TEX0
 *     MADH H0.xyz, H0, H1, H2  ; END          ; plain TEX0 modulate
 *
 * i.e. a static blend of TEX1/TEX2 plus a TEX0 modulate. An earlier version of
 * this factory used PulsingMaterial and claimed the emissive term was modulated
 * by `time`; that was a misreading of the uniform table and has been removed.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO — if a richer permutation is later
 *   found to actually consume `time`, this needs revisiting.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const mageffect08_floor: MaterialFactory = {
  name: "mageffect08_floor.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, normalMap, _unused3, lightMap, _unused5, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(normalMap ? { normalMap: normalMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
