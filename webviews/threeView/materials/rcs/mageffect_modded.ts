import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { MagStripMaterial } from "./_animated";

/**
 * data/environments/04_chenghou_project/materials/mageffect_modded.rcsmaterial
 *
 *   tex[0] #28e981a4                    jd_chenghou_grilleanim_01.gtf, mar_archcells.gtf   -> map
 *   tex[1] #1202d8df                    jd_chenghou_grilleanim_02.gtf, mar_archmask.gtf   -> map
 *   tex[2] Wave                         jd_chenghou_grilleanim_03.gtf, ds_wave_c.gtf   -> emissiveMap (scrolled)
 *   tex[3] lightmap                     ile_mesh_combine14-lmap.gtf, ile_mesh_combine1-lmap.gtf   -> lightMap
 *   tex[4] Colour                       (no file)   -> unused
 *   tex[5] #220cf0e6                    (no file)   -> unused (a scalar, not an image; see below)
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: Idx=2 "Ambient", Backend=Static — the lit, Ambient, no-shadow,
 *   no-spot point of the matrix (see _abstract.ts). The others are TODO.
 *   VP block @0x0016b0, FP block @0x001830.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: `time` drives a UV scroll on the `Wave` sampler, not a glow pulse.
 * The maths is in the *vertex* program, which writes the scrolled coordinate
 * into two interpolators the fragment program then samples with:
 *
 *     ; VP @0x0016b0   c463 = #220cf0e6 (unnamed), c464 = #906b67ba (time)
 *     MUL R1.xy, v8.zwzz, c463.xxxx    ; base UV scaled by a per-instance rate
 *     ADD R1.xy, R1.xyxx, c464.xxxx    ; + time, the same addend on both axes
 *     MOV o7(TEX0).w, R1.xxxx          ; U' -> TEX0.w
 *     MOV o8(TEX1).w, R1.yyyy          ; V' -> TEX1.w
 *
 *     ; FP @0x001830   t[2] = #85c9fd48 "Wave"
 *     MOVR R0.w, f[TEX1]               ; V'
 *     MOVR R0.z, f[TEX0].w             ; U'
 *     TEXR H1.xyz, R0.zwzz, TEX2       ; sample Wave at (U', V')
 *
 * Both components carry the time addend, so the wave travels diagonally; the
 * two axes differ only in which vertex attribute they start from (v8.z vs
 * v8.w). Hence equal U/V rates below. Only `Wave` moves — the base texture is
 * sampled from f[TEX3] at an untouched coordinate — which is why this uses
 * MagStripMaterial (wave-only scroll) rather than ScrollingMaterial, whose
 * scrolled set includes `map` and would drag the base texture along with it.
 *
 * No literal scale to apply, unlike ShieldMaterial's `3.0`: the multiplier
 * here is c463, a uniform the loader patches per instance (patch-site pattern
 * 000501cf, hash unresolved — it is not in the hash table). tex[5] carries the
 * same hash because the channel table lists it as a sampler slot, but the
 * shader reads it as a vertex-program scalar, so there is no image to bind.
 * The rate below is therefore the usual guess, not a recovered value.
 *
 * TODO: recover c463. It would have to come from the engine's material setup
 *   rather than the shader bundle.
 *
 * NOTE: this permutation's final combine is
 *   `MADH H0.xyz, H0, {0,0,0,0}, H1` — the base-texture term is multiplied by
 *   a genuine hardcoded zero (confirmed real, not a mis-decoded `time`: the
 *   uniform table declares only Colour and constantAmbientColour beyond the
 *   VP-side time/positionScale, and neither patches that word), leaving the
 *   Wave term as the entire output. That is not reproduced here — zeroing the
 *   diffuse would render these surfaces as bare wave pattern and lose the
 *   underlying geometry read, which is unlikely to be what ships on screen for
 *   every permutation. Revisit once the other permutations are transcribed.
 */
export const mageffect_modded: MaterialFactory = {
  name: "mageffect_modded.rcsmaterial",
  minTextures: 1,
  maxTextures: 6,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, wave, lightMap] = textures;
    return new MagStripMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(wave ? { emissive: new THREE.Color(0xffffff) } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      wave,
      0.05,
      0.05,
    );
  },
};
