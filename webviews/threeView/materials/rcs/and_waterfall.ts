import * as THREE from "three";
import { MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/*\/materials/and_waterfall.rcsmaterial
 *
 * Binds and_bubbles.gtf several times over — the same art sampled at
 * independently scrolled coordinates to build up a churn. Three of those units
 * are actually sampled by the fragment program:
 *
 *     002294+0054:  #030fd39b  A  emissive   t[1]
 *     00229c+005c:  #089fa691  A  ?          t[2]
 *     0022a4+0064:  #f29bbc7c  A  ?          t[0]
 *
 * The scroll is computed in the **vertex** program, not the fragment one, and
 * handed down as varyings. Permutation 5 (Static, lit, Ambient+directional, no
 * shadow/spot/zone), VP @ 0x001ff0, where the uniform table names
 * `#906b67ba U time c[464]`:
 *
 *     MOV o11(TEX4).x, v2.xxxx              ; U passed through — NOT animated
 *     MOV R0.x, c464.xxxx                   ; R0.x = time
 *     MAD o11(TEX4).y, R0.xxxx, c460.xxxx, v2.yyyy   ; V + time*c460
 *     MAD R0.y, R0.xxxx, c462.xxxx, v2.yyyy          ; V + time*c462
 *     MAD R0.x, R0.xxxx, c463.xxxx, v2.xxxx          ; U + time*c463
 *     MUL R0.zw, R0.xxxy, c461.xxxx         ; that same pair rescaled by c461
 *     MOV o10(TEX3).xyzw, R0.xyzw
 *
 *     TEXR H1.xyzw, f[TEX4], TEX2           ; t[2] at the V-only coordinate
 *     TEXR H0.xyzw, f[TEX3], TEX0           ; base map at the scrolled uv
 *     TEXR H2.w, f[TEX3].zwzz, TEX1         ; emissive at the c461-rescaled uv
 *
 * So the base map scrolls on **both** axes (U via c463, V via c462) and the
 * emissive layer follows the same pair rescaled by c461 — hence rateU and rateV
 * are both non-zero here. The old comment claiming only the first texture is
 * used was wrong, as was binding one Texture object as both `map` and
 * `emissiveMap`: `ScrollingMaterial` clones each channel so the two layers get
 * their own offsets, which is what lets them read as separate sheets of water.
 *
 * There is **no literal scale** on the time path: every operand is a
 * runtime-patched constant slot (c460 #71950466, c461 #191d3100, c462 #2481ef75,
 * c463 #87d769dc), none of which the SHO resolves to a value, so the rates below
 * are a hand-tuned stand-in. (c459 *is* a real literal pair but it belongs to the
 * EX2/fog-exponent term, `MAD R0.z, v3.wwww, c459.xxxx, -c459.yyyy`, not to time.)
 * The same MOV/MAD chain appears in permutations 2 and 3, so this is not a
 * one-permutation artifact.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO — `time` only becomes a *fragment*
 *   uniform in the zone-effect permutations 7-14, which are unimplemented.
 *
 * TODO: `ScrollingMaterial` moves every cloned channel at one rate, so the
 *   c461 rescale that makes the emissive layer drift against the base is not
 *   reproduced; that needs per-channel rates or a ShaderMaterial. The third
 *   sampled layer (t[2] #089fa691, V-only via c460) has no Three.js slot bound
 *   at all.
 */
export const and_waterfall: MaterialFactory = {
  name: "and_waterfall.rcsmaterial",
  minTextures: 1,
  maxTextures: 5,
  make: (textures: THREE.Texture[]) => {
    const bubbles = textures[0];
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(bubbles ? { map: bubbles } : {}),
        ...(bubbles ? { emissiveMap: bubbles } : {}),
        emissive: new THREE.Color(0x223344),
        color: new THREE.Color(0xcce4ee),
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      },
      0.02,
      -0.28
    );
  },
};
