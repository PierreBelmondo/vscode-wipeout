import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/*\/materials/mageffect08.rcsmaterial
 *
 *   tex[0] #28e981a4  ds_magstrip_*_cs.gtf, ds_magwall_*_cs.gtf   diffuse
 *   tex[1] #1202d8df  ds_emiss_mask*.gtf, ds_mag*_illum.gtf       emissive mask
 *   tex[2] Normal     ds_magstrip_*_n.gtf, ds_magwall_*_n.gtf     normal map
 *   tex[3] Wave       ds_wave_c.gtf                               scrolling wave
 *   tex[4] lightmap   lmaps/*-lmap.gtf
 *   tex[5] Colour     (no file)                                   tint uniform
 *
 * Animated: the vertex program scrolls the UV fed to the Wave sampler on both
 * axes identically, via `time` (c[464], hash #906b67ba) broadcast through its
 * `.xxxx` swizzle:
 *
 *   VERTEX crc=f70e2fe1 uniform table:
 *      006e88+0038:  #220cf0e6  U  ?                      c[463]  02010001
 *      006eb8+0068:  #906b67ba  U  time                   c[464]  02010001
 *
 *   vp code:
 *      007000+01b0:  ADD R2.xyz, -R4.xyzx, c465.xyzx
 *      007030+01e0:  MUL R5.xy, R5.xyxx, c463.xxxx
 *      007040+01f0:  ADD o14(TEX7).xy, R5.xyxx, c464.xxxx
 *
 *   (R5.x came from v3.x [Uvset1.u]; R5.y from -v3.y+c462.z, i.e. Uvset1.v)
 *
 *   FRAGMENT crc=e4f1cf7a samples with that coordinate:
 *      007500+03f0:  TEXR H1.xyz, f[TEX7], TEX3
 *
 * So the Uvset1-derived base UV is scaled by uniform c463 (unnamed, not a
 * literal) and `time` is added identically to both x and y via the .xxxx
 * broadcast, then used to sample the Wave texture (tex[3]) directly -- both
 * axes scroll together at the same rate along a diagonal, not per-axis
 * independently. This pattern recurs identically across effectively every
 * permutation in this shader file, always feeding the Wave sampler.
 *
 * No literal constant is combined with time in this instruction -- both
 * operands (c463 and c464) are named/unnamed uniforms, not baked literals,
 * so there is nothing to apply as an explicit scale constant the way
 * ShieldMaterial applies its 3.0.
 *
 * The previous version of this factory used a bespoke MagStripMaterial that
 * scrolled the wave along U only and blended it against the emissive mask in
 * script (an FP-blend pattern that does not match this evidence, which shows
 * a plain two-axis UV scroll feeding a direct texture sample). Three.js's
 * Phong material has no separate "Wave" slot, so the wave is bound as `map`
 * here and scrolled by ScrollingMaterial; the diffuse and emissive mask are
 * assigned after construction so they are excluded from the scroll and stay
 * registered with the mesh.
 *
 * Permutation: Static[5] of 130 -- the lit, Ambient, no-shadow, no-spot point
 *   of the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: `Colour` is a per-draw tint uniform with no file; the emissive colour
 *   here is a neutral white so the wave and mask supply the variation.
 */
export const mageffect08: MaterialFactory = {
  name: "mageffect08.rcsmaterial",
  minTextures: 1,
  maxTextures: 9,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMask, normalMap, wave, lightMap] = textures;
    const material = new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(wave ? { map: wave } : {}),
        ...(normalMap ? { normalMap } : {}),
        ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.6,
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05,
      0.05,
    );

    // Diffuse and the emissive mask do not scroll -- assign them after
    // construction so ScrollingMaterial's clone-and-offset pass (which only
    // touches map/emissiveMap/alphaMap/specularMap present at construction
    // time) does not pick them up.
    if (map) material.map ? (material.alphaMap = map) : (material.map = map);
    if (emissiveMask) material.emissiveMap = emissiveMask;

    return material;
  },
};
