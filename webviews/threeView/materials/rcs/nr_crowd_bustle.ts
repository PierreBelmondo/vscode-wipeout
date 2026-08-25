import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";

/**
 * data/environments/01_vineta_k/materials/nr_crowd_bustle.rcsmaterial
 *
 *   tex[0] DiffuseTexture               crowdgroup.gtf, crowdavatars.gtf, crowd_avatars_22x4.gtf   -> map
 *   tex[1] lightmap                     ile_mesh_combine22-lmap.gtf, ile_mesh_combine23-lmap.gtf   -> lightMap
 *   tex[2] #0379ee32                    crowdnoise.gtf   -> avatar SELECTOR,
 *                                       not a colour layer (see make())
 *   tex[3] #18a719bf                    (no file)   -> map
 *   tex[4] #f139ff6d                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * The material IS animated in the engine, but not in a way this factory can
 * reproduce -- see make() for the disassembly and why. The short version: the
 * vertex program scrolls the coordinate that samples `crowdnoise`, and the
 * fragment program adds the sampled noise to each sprite's own atlas
 * coordinate, so the animation advances *which avatar* each spectator shows.
 * That needs a texture-sampled UV, which Three's fixed pipeline has no way to
 * express.
 *
 * The `0.05` rate is a genuine hardcoded literal, not a patched uniform: the
 * shipped bytes `437f0000 43000000 3d4ccccd` decode as c462 = [255.0, 128.0, ?,
 * 0.05], and c462 is absent from the uniform patch table. (The 255.0 and 128.0
 * belong to unrelated R1.z/EX2 maths in the same VP.) It is recorded here for
 * whoever writes the custom shader.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO. Permutations 3 and 6 share this
 *   fragment block and differ only by an extra SpuVertexColours attribute.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.

 */

export const nr_crowd_bustle: MaterialFactory = {
  name: "nr_crowd_bustle.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const [map, lightMap] = textures;
    // Only the avatar atlas is bound, and the material is NOT animated here.
    //
    // `crowdnoise` (#0379ee32) is not a colour layer and the scroll is not a
    // scroll of anything visible. The vertex program animates the coordinate
    // that samples the NOISE:
    //
    //     MUL R2.xy, v1.xyxx, c465.xxxx     ; uv * scale
    //     MUL R0.w,  R0.w,    c464.xxxx     ; literal * time
    //     ADD o7(TEX0).xy, R0.wwww, R2.xyxx ; -> the noise sampler's coord
    //
    // and the fragment program then uses the sampled noise as an OFFSET into
    // each sprite's own atlas coordinate:
    //
    //     TEXR R0.y, f[TEX3].yzxx, TEX0   ; crowdnoise at the animated coord
    //     MULR R0.y, R0, <scale>
    //     ADDR R0.x, f[TEX2].w, R0.y      ; + this sprite's base U
    //     ADDR R0.y, f[TEX3].x, R0        ; + this sprite's base V
    //     TEXR H0.xyzw, R0, TEX1          ; atlas sampled there
    //
    // so the animation is "advance which avatar each spectator shows", which
    // needs a texture-sampled UV that Three's fixed pipeline cannot express.
    // Scrolling the atlas instead — as this factory did — just slides the sheet
    // across its own cell boundaries and reads as the crowd changing colour.
    // Better to render the atlas correctly and stand still.
    //
    // TODO: a custom ShaderMaterial could do the real thing: sample crowdnoise
    //   at (uv * scale + time * 0.05), add the result to the sprite's base uv,
    //   and sample the atlas there.
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      // The atlases are cutout sprites -- crowdavatars.gtf is 45% fully
      // transparent, crowd_avatars_22x4.gtf 53% -- so without an alpha test the
      // spectators render as solid quads with the gaps filled in.
      // Cutout, not blended: alpha-blending these sorts badly against the
      // track and, with DoubleSide, drops them out entirely. Same convention
      // as cf_tree.ts and fence_alpha.ts.
      transparent: false,
      alphaTest: 0.5,
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
