import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/amphiseum/materials/uvanim_diffuse_emissivealpha.rcsmaterial
 *
 *   tex[0] DiffuseTexture               piranha_lcd.gtf, ag_portrait_rounded02a.gtf, assegai_lcd.gtf   -> map
 *   tex[1] #b1f2a176                    pipefx_02_firey.gtf, j_m_lightstripv01_e.gtf, dc_windowshexdiffuse.gtf   -> emissiveMap
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #78256a45                    (no file)   -> map
 *   tex[4] #78787596                    (no file)   -> map
 *   tex[5] #e8bcd7f5                    (no file)   -> map
 *   tex[6] #a24bc055                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Not animated, despite the name. `time` (hash #906b67ba) is declared in the
 * binding table but never read by the fragment program. In permutation 2,
 * "Ambient" (Static backend, FRAGMENT at file offset 001710, no Shadow/Spot
 * textures) it binds to c[1]:
 *
 *     001740+0030: #81db67ea  U  constantAmbientColour  c[116]  02030001
 *     00174c+003c: #906b67ba  U  time                   c[118]  02010001
 *     001784+0074: 0005  #81db67ea  R  constantAmbientColour  c[5]
 *     001786+0076: 0001  #906b67ba  R  time                   c[1]
 *
 * and c[1] then appears in no operand of the body, whose second UV set is built
 * entirely from the interpolated f[TEX3] and real zero literals:
 *
 *     MOVR R0.xy, f[TEX3]                        ; the interpolated UV
 *     MOVR R0.z,  R0.x                           ; -> U slot
 *     ADDR R0.x,  R0.y, {0x00000000(0)}.x        ; V + 0
 *     MADR R0.w,  R0.x, {0x00000000(0)}.x, R0    ; V * 0 + V
 *     TEXR H0.xyzw, f[TEX3], TEX0                ; diffuse, unscrolled
 *     MULR R0.zw, R0, {0x00000000(0)}.x
 *     TEXR H1.xyz, R0.zwzz, TEX1                 ; emissive at the same UV
 *     MADH H0.xyz, H0.w, H1, H0
 *
 * so the second coordinate collapses to a static passthrough of f[TEX3]. This
 * was re-checked against permutation 3 (FRAGMENT at 001aa0, the richer Static
 * permutation with directionalLight0/fogColour): same binding, same absence,
 * while `directionalLight0DirectionWorldSpace` *is* resolved by name in its
 * body -- so the disassembler does resolve uniforms into operands, and there is
 * genuinely no `time` consumption here. An earlier revision of this factory
 * used ScrollingMaterial on the strength of the filename and a disassembler
 * bug; that has been reverted.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: if this material really does scroll in game, the driver is not the
 *   `time` global in the permutations dumped here -- look to the Shadow/Spot
 *   variants this project does not implement, or to a per-instance/vertex
 *   attribute feeding f[TEX3].
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 */
export const uvanim_diffuse_emissivealpha: MaterialFactory = {
  name: "uvanim_diffuse_emissivealpha.rcsmaterial",
  minTextures: 1,
  maxTextures: 7,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap, map1, map2, map3, map4] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(emissiveMap ? { emissiveMap: emissiveMap } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      specular: new THREE.Color(0x222222),
      shininess: 30,
    });
  },
};
