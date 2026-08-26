import { DEFAULT_RENDER_SETTINGS } from "../../renderSettings";

/**
 * A `.rcsmaterial` is not one shader: it ships every *permutation* the engine
 * might need, precompiled. `diffuse_vcol` has 52, `lambert` has 100+.
 *
 * The engine picks one per draw call by evaluating the render state — it never
 * looks up a name. The axes, read off the resources each permutation binds:
 *
 *   Backend      Static | RigidBody | StaticQuake   geometry type; StaticQuake
 *                                                   is the in-game track quake
 *   Pass         ZAlphaOnly | lit                   depth prepass or colour
 *   Light        Ambient | IBL                      does the object take IBL
 *   Shadow       on | off                           is it in the sun's shadow map
 *   Spots        0 | 1 | 2                          spot lights reaching it
 *   SVC          0 | 1                              see the TODO below
 *
 * For `diffuse_vcol` that is exactly 2·2·3·2 = 24, plus ZAlphaOnly and Ambient,
 * = 26 per backend × 2 backends = 52. The arithmetic is exact.
 *
 * The factories below implement ONE point of that matrix — the one a viewer can
 * actually honour:
 *
 *   Backend = whatever the model is, Pass = lit, Light = Ambient,
 *   Shadow = off, Spots = 0, SVC = 0
 *
 * i.e. no IBL probes, no shadow maps and no spot lights, because the viewer has
 * none of them. Every other permutation is unimplemented.
 *
 * TODO: the remaining permutations. In rough order of value:
 *   - Shadow=on   needs a shadow map pass and `shadowMatrix`/`shadowMapTex`
 *   - Spots=1,2   needs `textureSpot0*`/`textureSpot1*` (position, falloff,
 *                 projection, cookie texture) driven by scene lights
 *   - Light=IBL   needs the environment probes `iblScalePower` scales
 *   - ZAlphaOnly  only useful if a depth prepass is ever added
 *   - Zone*       `zoneBaseInner`/`zoneBaseOuter` and friends — the zone-mode
 *                 effect, present in the track materials
 *
 * TODO: the SVC axis is not understood. Permutations i and i+12 bind an
 * identical resource set yet compile to different code, so one axis is invisible
 * from the resource signature alone. The EBOOT has `SVC0`/`SVC1` tokens next to
 * the other permutation names, which is where the guess comes from. "The larger
 * program is SVC1" holds for 369 of 612 pairs and fails for 243, so it is not a
 * usable rule — do not encode it until the real discriminator is found.
 */
/**
 * Scales every baked lightmap.
 *
 * The engine's fragment programs scale every baked lightmap by `prelitBias`
 * and `prelitScaleSpecular` before use, and those uniforms ship no value a
 * viewer can read. One factor stands in for them so the scaling has a single
 * place to change.
 *
 * TODO: read the real `prelitScale`/`prelitBias` values per material instead
 *   of one global factor.
 */
export const LIGHTMAP_INTENSITY = DEFAULT_RENDER_SETTINGS.lightmapIntensity;

/**
 * Default specular response.
 *
 * The engine scales specular by `prelitScaleSpecular` and derives the exponent
 * from it with LG2/EXP in the fragment program. That uniform ships no value in
 * the .rcsmaterial -- it is set per node at runtime -- so the real strength is
 * genuinely not readable from these files. These are therefore a *viewer
 * convention*, not decompiled values.
 *
 * The previous defaults (0x222222 at shininess 30) were a near-matte surface:
 * 0.13 reflectance with a very broad lobe. Combined with a tone mapper that
 * compressed highlights, specular was effectively invisible. This is brighter
 * and tighter so the highlight reads.
 *
 * TODO: read `prelitScaleSpecular` per node if it ever becomes reachable.
 */
export const SPECULAR_COLOR = DEFAULT_RENDER_SETTINGS.specularColor;
export const SPECULAR_SHININESS = DEFAULT_RENDER_SETTINGS.specularShininess;

export type MaterialFactory = {
  name: string;
  minTextures: number;
  maxTextures: number;
  make: (textures: THREE.Texture[]) => THREE.Material;
  /**
   * Build from channels keyed by their engine id, when the factory has one.
   *
   * The positional `make` is what the 371 hand-written factories use: they were
   * written against "tex[0] is the diffuse, tex[1] the specular", which holds
   * because the loader registers channels in slot order. A generated material
   * cannot rely on that -- its shader binds samplers by texture unit, and which
   * channel id lands on which unit is the permutation's choice -- so it takes
   * the ids instead. Optional so nothing else has to change.
   */
  /**
   * @param streams the vertex stream ids every mesh using this material
   * carries, when known. Two permutations can sample the same textures and be
   * told apart only by the attributes they read, so the picker needs this to
   * choose between them rather than falling back on file order.
   */
  makeById?: (channels: Map<number, THREE.Texture>, streams?: Set<number>) => THREE.Material;
};
