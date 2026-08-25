import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/05_ubermall/materials/mr_2nduvanimdiffuseemissive.rcsmaterial
 *
 *   tex[0] DiffuseTexture               joy_noodles_bits.gtf, ignition_bits.gtf, ignition_shop_front.gtf   -> map (static)
 *   tex[1] #b1f2a176                    mr_rainbowstripes.gtf   -> emissiveMap (scrolled)
 *   tex[2] lightmap                     (no file)   -> lightMap
 *   tex[3] #de3c49ac                    (no file)   -> unused (the scroll-rate uniform, not an image; see below)
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: idx 3, Backend=Static -- the lit, Ambient, no-shadow, no-spot
 *   point of the matrix (see _abstract.ts): DiffuseTexture + directionalLight +
 *   fog + ambient. The others are TODO. VP block @0x001240, FP block @0x0013d0.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: `time` drives a UV scroll on the *second* sampler only, and only
 * along U. The maths starts in the vertex program:
 *
 *     ; VP @0x001240   c463 = #906b67ba "time", c464 = #de3c49ac (unnamed rate)
 *     001330+00f0: MOV R0.w, c463.xxxx                          ; R0.w = time
 *     001370+0130: MAD o7(TEX0).w, R0.wwww, c464.xxxx, v8.zzzz  ; TEX0.w = time * rate + v8.z
 *
 * and the fragment program samples t[1] with that varying as its U:
 *
 *     ; FP @0x0013d0   t[1] = #b1f2a176
 *     001500+0130: MOVR R2.z, f[TEX0].w   ; U = the time-animated coord
 *     0014e0+0110: MOVR R2.w, R1          ; V = R1.x = f[TEX1].x, normal-derived
 *     001550+0180: TEXR H0.xyzw, R2.zwzz, TEX1
 *
 * The sample coordinate is `R2.zwzz`, so R2.z is the horizontal component --
 * and R2.z is the one carrying the time term, while R2.w never sees it. R2.w
 * comes from the TEX1 interpolant, which the VP writes as the vertex normal
 * (`MOV o8(TEX1).xyz, v1.xyzx`), so V is a matcap-style normal lookup rather
 * than a second scroll axis. Hence rateU only, rateV = 0 -- this is a one-axis
 * scroll, not a diagonal one.
 *
 * DiffuseTexture (t[0]) is sampled separately at an untouched coordinate:
 *
 *     TEXR H1.xyzw, f[TEX3], TEX0   ; o10(TEX3).xy = v8.xyxx, a plain vertex UV
 *
 * so the base texture does NOT move. Note ScrollingMaterial offsets `map`
 * alongside `emissiveMap`, so the static diffuse is dragged along here too --
 * the one place this approximation departs from the shader. It is kept because
 * the alternative is a bespoke class for a single material; revisit if the
 * drifting base texture reads badly in-game.
 *
 * No hardcoded literal is multiplied into the time term, unlike ShieldMaterial's
 * `3.0`: the only scale is c464 (#de3c49ac), declared in the uniform table as
 * `#de3c49ac U ? c[464] 02010001` and confirmed present at a patch site, i.e. a
 * real per-material uniform the loader writes at run time rather than a baked-in
 * number. Its friendly name did not resolve. So there is no shader constant to
 * fold in, and the rate below is the placeholder drift described in _animated.ts.
 *
 * The same c463 -> R0.w -> MAD-into-o7(TEX0).w pattern recurs identically in
 * every Static/RigidBody permutation VP block (idx 2-14), so this is the
 * material's real behaviour rather than an artifact of the one permutation traced.
 *
 * NOTE: an earlier revision of this file used a plain ScrollingMaterial with the
 * default rates and claimed "the texture channels scroll" -- all of them, on the
 * V axis. The disassembly above shows only t[1] is animated and only along U;
 * that claim was wrong. The same revision also assigned `map:` four times in one
 * object literal, so DiffuseTexture was silently overwritten by the later
 * image-less slots and never reached the renderer.
 *
 * TODO: recover c464 (#de3c49ac) from the engine's material setup so the scroll
 *   runs at the real rate rather than the default.
 */
export const mr_2nduvanimdiffuseemissive: MaterialFactory = {
  name: "mr_2nduvanimdiffuseemissive.rcsmaterial",
  minTextures: 1,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [map, emissiveMap, lightMap] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        // tex[1] is the channel the shader scrolls; ScrollingMaterial offsets
        // emissiveMap, so it moves as the shader does.
        ...(emissiveMap ? { emissiveMap: emissiveMap, emissive: new THREE.Color(0xffffff) } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        specular: new THREE.Color(0x222222),
        shininess: 30,
      },
      // U scrolls, V does not -- TEX0.w is the only component time reaches.
      0.05,
      0.0,
    );
  },
};
