import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/tech_de_ra/materials/adverts/hologram_strip.rcsmaterial
 *
 *   tex[0] #eedee991                    hologram_strip_alpha.gtf   -> map
 *   tex[1] #28dfc658                    hologramscanlines.gtf   -> map
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #1c96b9d6                    smoke.gtf   -> map
 *   tex[4] #6d0178af                    (no file)   -> map
 *   tex[5] #bbe42ccd                    (no file)   -> map
 *   tex[6] #68d512e9                    (no file)   -> map
 *   tex[7] #8f3d0b43                    (no file)   -> map
 *   tex[8] #e0dcab49                    (no file)   -> map
 *   tex[9] #5963a112                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * UNVERIFIED ANIMATION -- needs a second look before being trusted.
 *
 * This file previously asserted that "the shader takes the engine's `time`
 * uniform and offsets the sample coordinate with it, so the texture channels
 * scroll". The disassembly does not support that claim, and it has been removed.
 * In permutation 3/5 (Static, fogColour, no shadow/spot), FP block @0x001b00
 * (crc 434dcc41), `time` is declared, relocated to c[1] and has a live patch
 * site, but the ONLY instruction where it resolves by name is:
 *
 *     001b54+0054:  #906b67ba  U  time    c[154]  02010001   ; declared
 *     001b9a+009a:  #906b67ba  R  time    c[1]               ; relocated
 *     001c00+0100:  MOVR R3.zw, f[TEX4]                      ; the UV pair
 *     001c30+0130:  MULR R1.zw, R3, {?, ?, ?, time}.x        ; <- the crux
 *     001cc0+01c0:  TEXR R0.y, R1.zwzz, TEX1                 ; sampled here
 *
 * Two things are wrong with reading that as a scroll. It is a MUL, not an
 * ADD/MAD into a coordinate -- nothing is offset. And the trailing `.x` is a
 * scalar replicate selecting WORD 0, whereas `time` occupies WORD 3, so the
 * value actually multiplied into the sample coord is an unresolved non-time
 * constant and time's own component is never selected.
 *
 * The `.x` appears to be authoritative rather than a placeholder: the same dump
 * emits varied meaningful swizzles elsewhere (`.xxyz`, `.yzww`, `.zwzz`, `.w`,
 * `.y`) and omits the swizzle entirely when a vector is consumed component-wise,
 * e.g. block @0x003c40 where four distinct live uniforms occupy four words:
 *
 *     003ea0+0260:  ADDR R0.w, -|R0.x|, {zoneEffectOuter, ?, zoneEffectInner, ?}
 *     003ec0+0280:  MOVH H0.xyz, {0x00000000(0), ?, time, zoneColourTint}
 *
 * Compare hologram.ts, which IS a genuine scroll: there the vertex program does
 * `MAD o10(TEX3).x, R0.wwww, c464.xxxx, v2.xxxx` -- a MAD into a UV, both
 * operands resolved names, replicating `time` from the word it actually
 * occupies. Nothing of that shape exists here.
 *
 * Every other constant-bearing instruction in block 0x1b00 was checked for a
 * w-selecting or unswizzled read of that constant block; none resolve to `time`
 * (all are genuine 0.0 or 1.0). Block 0x20c0 (perm 4/6) is structurally
 * identical. Block 0x1660 (perm 2, Ambient) resolves no constant names in code
 * at all. Block 0x2850 (perm 7/9, richest no-shadow) declares and relocates
 * `time` but likewise never names it in an instruction.
 *
 * The behaviour below is therefore LEFT AS IT WAS FOUND rather than rewritten:
 * the evidence contradicts the old scrolling claim, but it is not sufficient to
 * positively assert "not animated" either. Settling it needs someone who knows
 * whether rcsdump's trailing swizzle on a patched constant is authoritative or
 * is itself mis-rendered -- a disassembler-semantics question that re-reading
 * the output cannot answer. Had the swizzle been absent, R1.zw feeds R1.zwzz,
 * so BOTH coords would move, not one axis; there is no literal multiplier
 * anywhere near it, so there is no scale to apply and no axis to pass.
 *
 * TODO: resolve the swizzle semantics, then either drop ScrollingMaterial for a
 *   plain MeshPhongMaterial (matching and_hardlightsnofog1.ts) or re-derive the
 *   real rate. Do not treat the current scroll as verified in the meantime.
 *
 * NOTE: the spread below repeats the `map:` key, so all but the last win. That
 *   is a pre-existing project-wide convention (sebenco_ice.ts has 14 such keys,
 *   scanlinebillboard_desaturate.ts 9) and is left alone here rather than fixed
 *   in one file out of many.
 */
export const hologram_strip: MaterialFactory = {
  name: "hologram_strip.rcsmaterial",
  minTextures: 1,
  maxTextures: 10,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, lightMap, map2, map3, map4, map5, map6, map7, map8] = textures;
    return new ScrollingMaterial({
      side: THREE.DoubleSide,
      ...(map ? { map: map } : {}),
      ...(map1 ? { map: map1 } : {}),
      ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(map2 ? { map: map2 } : {}),
      ...(map3 ? { map: map3 } : {}),
      ...(map4 ? { map: map4 } : {}),
      ...(map5 ? { map: map5 } : {}),
      ...(map6 ? { map: map6 } : {}),
      ...(map7 ? { map: map7 } : {}),
      ...(map8 ? { map: map8 } : {}),
      specular: new THREE.Color(SPECULAR_COLOR),
      shininess: SPECULAR_SHININESS,
    });
  },
};
