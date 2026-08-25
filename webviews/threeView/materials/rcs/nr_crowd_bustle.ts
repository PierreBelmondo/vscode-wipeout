import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/01_vineta_k/materials/nr_crowd_bustle.rcsmaterial
 *
 *   tex[0] DiffuseTexture               crowdgroup.gtf, crowdavatars.gtf, crowd_avatars_22x4.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine22-lmap.gtf, ile_mesh_combine23-lmap.gtf   -> lightMap
 *   tex[2] #0379ee32                    crowdnoise.gtf   -> map
 *   tex[3] #18a719bf                    (no file)   -> map
 *   tex[4] #f139ff6d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Animated: a diagonal UV scroll, and unusually it is computed in the *vertex*
 * program, not the fragment one. Permutation 6 (Static, no shadow/spot), VP at
 * file offset 002a90, declares the engine clock:
 *
 *     #906b67ba  U  time    c[463]  02010001
 *
 * and folds it into the interpolated UV before handing it to the rasteriser:
 *
 *     MOV R1.w, c462.wwww           ; the 0.05 literal
 *     MUL R1.w, R1.wwww, c463.xxxx  ; 0.05 * time
 *     ADD o11(TEX4).xy, R1.wwww, R1.xyxx  ; added to BOTH u and v
 *
 * The `.wwww` swizzle broadcasts one scalar into both components of TEX4.xy, so
 * u and v advance at the same rate -- the scroll is diagonal, not axis-isolated.
 *
 * The fragment program (crc 9f380be4) never mentions `time`; it just samples the
 * varying that the VP already animated:
 *
 *     MOVR R3.zw, f[TEX4]
 *     TEXR R3.y, f[TEX4], TEX0
 *
 * TEX0 is bound to the unnamed texture #0379ee32 (`t[0]` in this permutation's
 * attribute table), i.e. the crowdnoise channel -- so that is the one map that
 * moves. Verified in the shipped file: the bytes `437f0000 43000000 3d4ccccd`
 * decode as c462 = [255.0, 128.0, ?, 0.05]. c462 is absent from the uniform
 * patch table, so 0.05 is a genuine hardcoded literal and is applied as such
 * below rather than folded into a guessed rate. The neighbouring 255.0 and
 * 128.0 belong to unrelated R1.z/EX2 maths in the same VP -- not to the scroll.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. Permutations 3 and 6 share this
 *   fragment block and differ only by an extra SpuVertexColours attribute.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * TODO: ScrollingMaterial offsets the sampler on the CPU, which reproduces the
 *   motion but not its per-vertex nature. The real VP adds the term to each
 *   vertex's UV, so on heavily distorted crowd geometry the two will diverge.
 */

/** The `0.05` literal in c462.w that the VP's MUL scales `time` by. */
const CROWD_SCROLL_SCALE = 0.05;

export const nr_crowd_bustle: MaterialFactory = {
  name: "nr_crowd_bustle.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap, crowdnoise, map2, map3] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        // #0379ee32 is the channel TEX0 samples at the animated coordinate.
        ...(crowdnoise ? { map: crowdnoise } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(map3 ? { map: map3 } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      // One scalar drives both axes, so u and v get the same rate.
      CROWD_SCROLL_SCALE,
      CROWD_SCROLL_SCALE,
    );
  },
};
