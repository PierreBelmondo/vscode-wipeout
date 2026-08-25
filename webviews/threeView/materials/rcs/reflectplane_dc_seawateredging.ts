import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/reflectplane_dc_seawateredging.rcsmaterial
 *
 * Where the sea meets the shore — the foam edge.
 *
 *   tex[0] DiffuseTexture  and_waterfoam_blend.gtf
 *   tex[1] ?               dc_watergrad_blend.gtf   shore-to-deep gradient
 *   tex[2] ?               dc_waterdiffuse.gtf
 *   tex[3] lightmap
 *   SpecularColour  (0.693, 0.699, 0.514)
 *
 * The foam texture carries its own alpha, so this blends rather than cuts out —
 * unlike the vegetation materials.
 *
 * This material does NOT animate, despite the name. `time` (#906b67ba) is
 * declared and bound to a constant slot in all 21 permutations, but no
 * instruction ever reads it. In the implemented permutation (idx 6,
 * Static/Ambient, no shadow, no spot, FP @ 0x003080) the uniform table has
 *
 *     U  #906b67ba  time  c[144]  02010001    ; remapped to c[0]
 *
 * and the full 0x3f0 bytes of that program mention `time` nowhere. Every
 * mention anywhere in the file is dead code: `time` sits in a packed
 * 4-component constant whose selected swizzle is always `.x`, which lands on a
 * *sibling* uniform, never on time's own slot —
 *
 *     MOVR R0.w, {constantAmbientColour, time, 0, 0}.x      ; .x = the ambient colour
 *     MOVR R0.x, {0,0,0,0}.x                                ; a real literal zero
 *     MADR R0.w, R0.x, {fogColour, ?, time, 0}.x, R0        ; .x = fogColour, × 0
 *     MADR R1.w, R1.x, {zoneBaseAltInner, constantAmbientColour, ?, time}.x, R0
 *
 * — and the multiplicand register in the MADRs traces back to that literal
 * zero, so the ops are no-ops even before the swizzle is considered. No
 * permutation reads `time` via .y/.z/.w either.
 *
 * This previously used WaterMaterial, whose header describes a vertex-program
 * MAD chain (c460/c461) scrolling two UV sets. That chain is not in this
 * material: its vertex program (@ 0x002e90) contains no `time` reference and no
 * such chain. That comment describes water_noref (VP @ 0x001b30), since
 * confirmed there, so the scroll is gone and this is a plain Phong surface.
 *
 * Permutation: idx 6 of 21 — the lit, Ambient, no-shadow, no-spot point of the
 *   matrix (see _abstract.ts). The others are TODO.
 */
export const reflectplane_dc_seawateredging: MaterialFactory = {
  name: "reflectplane_dc_seawateredging.rcsmaterial",
  minTextures: 2,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [foam, , diffuse, lightMap] = textures;
    return new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: foam ?? diffuse,
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      specular: new THREE.Color(0xb1b283),
      shininess: 65,
      transparent: true,
      depthWrite: false,
    });
  },
};
