import * as THREE from "three";
import { BankDefaults, BankLayout, BankWindow } from "./_bank";
import { AttrBinding, SamplerBinding } from "./_bindings";
import { GeneratedRcsMaterial } from "./_generated";
import {
  composeFragment,
  composeVertex,
  declText,
  diffuseUnit,
  phongFragment,
  phongRegs,
  phongVertex,
  PHONG_OVERRIDE,
  ShaderParts,
} from "./_compose";
import { Permutation } from "./_raw";

/**
 * One drawable permutation of a generated material.
 *
 * A .rcsmaterial holds dozens to hundreds of precompiled variants and the
 * engine picks per draw from render state the viewer does not model. What it
 * CAN match on is the signature each variant declares -- which vertex streams
 * it reads and which texture channels it samples -- so a material keeps one
 * entry per distinct signature and chooses by what the mesh and the file
 * actually carry. See pickVariant.
 */
/**
 * Materials whose alpha is coverage rather than data.
 *
 * Opt-in, because nothing in the files distinguishes the two -- see makeVariant.
 * A name here is a claim that the material is a cutout, made from looking at it:
 * the crowd atlases are 45-53% fully transparent, the foliage and fences are
 * alpha-cut sprites, and their names say so.
 */
const CUTOUT_MATERIALS = new Set<string>([
  "nr_crowd_bustle.rcsmaterial",
  "cf_cheap_crowd.rcsmaterial",
  "jd_alphalambert_alphatest.rcsmaterial",
  "cf_tree.rcsmaterial",
  "fence_alpha.rcsmaterial",
  "grass_overlay.rcsmaterial",
]);

/**
 * Materials that BLEND with their computed alpha, opt-in like the cutouts.
 *
 * Same reasoning as CUTOUT_MATERIALS: whether a shader's final alpha means
 * coverage or scratch cannot be read off the program, so the default stays
 * opaque and a material that genuinely blends is listed. These get
 * transparent=true, no depth write, and the composer passes the program's own
 * H0.w through instead of the emitter's constant 1.
 *
 * nitro_perspex_new: a ship canopy. Its fragment program computes a real
 * coverage value -- a view-angle term plus a 0.25 base plus the holographic
 * glow, scaled by globalAlphaScaler -- and the surface is meant to read as
 * tinted glass, not painted hull.
 */
type BlendMode = "alpha" | "additive";
const BLEND_MATERIALS = new Map<string, BlendMode>([
  ["nitro_perspex_new.rcsmaterial", "alpha"],
  // Ship glass: its fragment program carries the diffuse texture's alpha
  // (ag_systems_glass.gtf, DXT5) unchanged to the end as the coverage value.
  ["glass_texture.rcsmaterial", "alpha"],
  // Engine exhaust. Coverage is the vertex alpha times a fresnel rim fade,
  // and the colour is a flame texture on black scaled by a constant -- a
  // glow, which only reads right ADDED to the scene: alpha-blending it would
  // darken everything around the flame with the texture's black. The
  // texture's own alpha is not coverage at all; the program uses it to
  // offset the second uv lookup, a flow distortion.
  ["flame_test.rcsmaterial", "additive"],
]);

/**
 * Values for the constants the ENGINE injects into a fragment program.
 *
 * A fragment program's constants live inline in its microcode and are patched
 * at load time. Most patch sites map to a named uniform; ~0.19% belong to a
 * register with no name in the mapping table -- constants the engine writes
 * from its own state (viewport, projection) rather than from material data.
 * rcsdump emits those as `u_engine<reg>`, and the viewer's generic neutral
 * (1, or 0 for anything feeding a texture coordinate) is wrong for the ones
 * that encode a projection: zero collapses the sample to a single texel.
 *
 * The register number is per PROGRAM, so `u_engine2` means different things
 * in different shaders and a global override cannot express it. This table
 * is keyed by material, and each value is READ OFF THE PROGRAM's own use of
 * the constant -- mt_tunnelrefraction's u_engine2 does `R1.xy *= .w;
 * R1.zw = .xy; uv = (R1.x + R1.z, R1.w - R1.y)`, which is ndc * 0.5 + 0.5
 * with the y-flip of a top-left-origin render target, so (0.5, 0.5, s, 0.5);
 * .z scales the refraction direction and starts at 1 for tuning.
 *
 * Opt-in and explicit, like the cutout and blend lists: a value here is
 * viewer knowledge about one material, never a guess applied everywhere.
 */
const ENGINE_CONSTANTS: Record<string, Record<string, [number, number, number, number]>> = {
  "mt_tunnelrefraction.rcsmaterial": { u_engine2: [0.5, 0.5, 1.0, 0.5] },
  // Same idiom, but the projection lands on register 3 in most permutations
  // and on register 1 in one; a name the picked program does not declare is
  // simply an unused uniform, so both are listed.
  "cl_tunnelrefraction.rcsmaterial": { u_engine3: [0.5, 0.5, 1.0, 0.5], u_engine1: [0.5, 0.5, 1.0, 0.5] },
  // reflectplane_dc_seawater's three "engine" rows turned out to be rows 1-3
  // of a named mat4 (reflectProject) whose registers unused parameters had
  // squatted on; rcsdump now names them and the composer binds the matrix,
  // so nothing is needed here.
};

export type GeneratedVariant = {
  /** The .rcsmaterial this came from, for the cutout list above. */
  material: string;
  permutation: number;
  backend: string;
  /**
   * The decompiled programs, in PARTS rather than as finished shaders.
   *
   * composeVertex/composeFragment assemble them (see _compose.ts), so the
   * main(), the uniforms it introduces and any declaration it rewrites are
   * viewer-side edits that never require regenerating these files.
   */
  vert: ShaderParts;
  frag: ShaderParts;
  attributes: AttrBinding[];
  samplers: SamplerBinding[];
  bank: BankLayout;
  bankWindow: BankWindow | null;
  /**
   * Default constants embedded in the vertex program's own preamble -- the
   * values the shader was compiled against for bank slots it reads but the
   * permutation does not declare. Straight from the SHO via rcsdump; the one
   * source of truth for these. Seeded into the bank before the named layout.
   */
  bankDefaults?: BankDefaults;
};

function solidTexture(r: number, g: number, b: number, a: number) {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, a]), 1, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}

/**
 * Declare a texture's colour space from the channel it fills.
 *
 * The game authors colour textures in sRGB and data textures -- normals,
 * specular masks, lightmaps -- linearly. Three needs telling which is which, or
 * it samples everything as linear: an sRGB texel read as linear comes out far
 * too dark, and 0.5 becomes 0.21.
 *
 * The hand-written materials get this from applyChannelSlots, which keys off
 * Three's own slot names (`map`, `lightMap`). A generated material has no such
 * slots -- its samplers are TEXn -- so nothing was setting it and every texture
 * defaulted to linear, including the diffuse maps. That is a large part of why
 * shadowed areas read as black.
 *
 * A lightmap is deliberately linear: it carries light values, not colour, and
 * the shader raises it to a power where a gamma curve would compound.
 */
const LINEAR_CHANNELS = /Normal|Specular|lightmap|Lightmap|Mask|Occlusion|paraboloid|Shadow|^zone/i;

/**
 * Channels whose uv must CLAMP rather than repeat.
 *
 * Every texture is loaded with RepeatWrapping, which is right for a tiling
 * surface map and wrong for anything whose uv is COMPUTED. glass_texture builds
 * its reflection uv from the normal and the eye vector:
 *
 *     R2.xy = -(R0.yz) + -(R1.yz)      // reflection vector
 *     R0.w  = R2.y * sign + bias       // sign from a condition code
 *     uv    = vec2(-R2.x * 0.5 + 0.5, R0.w + 0.25)
 *
 * That is a dual-paraboloid map: the two hemispheres are packed into one
 * texture and the sign term picks between them, so v jumps from 0.26 to 0.73
 * as the normal crosses zero. The seam is intentional. What is not intentional
 * is that a uv straying past a hemisphere's edge WRAPS to the opposite side of
 * the atlas instead of stopping at the edge -- neighbouring pixels then sample
 * unrelated parts of the image, which is the dense noise on the train glass.
 */
const CLAMPED_CHANNELS = /Reflection|Refraction|paraboloid|screenSpace|Shadow|Lightmap|ambient/i;

/**
 * Vector/data textures recognised by FILENAME, for channels with generic names.
 *
 * The sampler-name test above misses a whole family: diffuse_normal_specular
 * and friends bind their normal map to a channel literally called "Texture2",
 * so it classified as colour and uploaded sRGB. The GPU then LINEARISES every
 * sample -- 0.5 becomes 0.214 -- and the program's `sample*2-1` unpack turns
 * the flat-normal texel (0.5, 0.5, 1.0) into (-0.57, -0.57, +0.96): every
 * normal tilted ~40 degrees off the vertex normal, differently per pixel.
 *
 * That one misclassification was three symptoms at once: walls whose geometry
 * faces the sun (facingSun 30-80%) rendering BLACK and getting blacker as the
 * sun rises (the tilted normal crosses N.L=0, and the unclamped diffuse term
 * goes negative and subtracts); specular far stronger than the game's
 * (reflect() around a wrong N); and the dense noise on normal-mapped glass.
 * The track surface survived because its materials carry no normal map and its
 * N.L margin is too large to flip.
 *
 * The texture's own filename says what it is where the channel name does not:
 * the corpus suffixes normal maps `_n` (ds_floorplain_n.gtf).
 */
const VECTOR_FILENAMES = /_n\.[a-z]+$|_nm\.[a-z]+$|_norm/i;

function encodeForSampler(texture: THREE.Texture, name: string) {
  const linear = LINEAR_CHANNELS.test(name) || VECTOR_FILENAMES.test(texture.name);
  const encoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
  if (texture.encoding !== encoding) {
    texture.encoding = encoding;
    texture.needsUpdate = true;
  }
  const wrap = CLAMPED_CHANNELS.test(name) ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (texture.wrapS !== wrap || texture.wrapT !== wrap) {
    texture.wrapS = wrap;
    texture.wrapT = wrap;
    texture.needsUpdate = true;
  }
}

/**
 * What to sample when a channel has no texture.
 *
 * White is the right neutral for a colour map -- it leaves whatever multiplies
 * it unchanged -- but it is wrong for the engine's own render targets, and
 * those are exactly the ones a viewer can never provide. A reflection probe
 * sampled as white makes a surface look like a mirror pointed at the sun, which
 * is why vineta_k's sea came out white once its reflection term stopped being
 * multiplied to zero. Black is the honest answer there: no reflection.
 *
 * Shadow and occlusion probes go the other way: white means "unshadowed", which
 * is what a viewer with no shadow pass should show.
 */
/**
 * A stand-in for the engine's reflection probes.
 *
 * These materials are pure reflection: water_test_2's fragment program samples
 * `paraboloidReflectionTex`, multiplies the whole colour by it, and adds only a
 * dim ambient term on top. A black fallback therefore makes the surface black
 * AND flat -- both symptoms at once -- because every path except the ambient is
 * multiplied away.
 *
 * A mid-grey is the honest stand-in: it keeps the reflection term alive at a
 * plausible sky brightness without pretending to be a real environment probe.
 * The sky cube would be better still, but it is a cube map and these samplers
 * are sampler2D, so it cannot be bound directly.
 */
function reflectionFallback(): THREE.Texture {
  return solidTexture(140, 160, 185, 255);
}

function fallbackFor(name: string): THREE.Texture {
  // Reflections and image-based lighting: no probe, so a neutral sky value.
  if (/Reflection|Refraction|paraboloid|screenSpace/i.test(name)) return reflectionFallback();
  // Zone volumes: the effect is off, so it contributes nothing.
  if (/^zone/i.test(name)) return solidTexture(0, 0, 0, 0);
  // Shadow and spot probes: fully lit.
  return solidTexture(255, 255, 255, 255);
}

/**
 * Samplers the ENGINE fills, which no material file can ship.
 *
 * Reflection probes, shadow buffers and screen-space targets are outputs of
 * render passes the viewer does not run. An unmatched one is expected, not a
 * mismatch, so it takes its neutral fallback silently.
 */
const ENGINE_TARGET =
  // Case-SENSITIVE, and `lightmap` is deliberately absent. A material's own
  // baked lightmap is spelled `lightmap`; the engine's per-light atlas is
  // `directionalLight0LightmapTex`. Matching case-insensitively on "Lightmap"
  // catches both, which would let a variant needing a real lightmap the
  // material does not ship be judged satisfiable and render unlit.
  /Reflection|Refraction|paraboloid|screenSpace|ShadowTex|LightmapTex|ambientShadow|^zone|^shadowMapTex$/;

/**
 * The richest variant whose channels the material actually ships.
 *
 * Variants arrive sorted with the most samplers first, so this takes the most
 * detailed shader the data can feed -- a lightmapped variant when a lightmap is
 * present, the plain lit one when it is not. Falling back to the last entry
 * rather than failing keeps a mesh visible even when nothing matches, which is
 * what the empty-channel case needs.
 */
export function pickVariant(
  variants: GeneratedVariant[],
  channels: Map<number, THREE.Texture>,
  streams?: Set<number>
): GeneratedVariant {
  // A variant may also need vertex STREAMS the mesh does not carry. Two
  // permutations can sample exactly the same textures and differ only in that
  // -- diffuse_normal_specular_emmissive's perms 7 and 12 are identical but for
  // SpuVertexColours, the per-vertex baked colour -- so a variant is only fully
  // satisfiable when the mesh can feed its attributes too. Without this the
  // choice between them came down to file order.
  const feeds = (v: GeneratedVariant) =>
    !streams || v.attributes.every((a) => a.name === "?" || streams.has(a.id));

  // A sampler the ENGINE fills is not a missing channel.
  //
  // Reflection probes, shadow buffers and screen-space targets are outputs of
  // passes the viewer does not run, so NO material ships them and every variant
  // that reads one would be judged unsatisfiable. That is how d_s_n_customr
  // ended up on perm 4 -- a lightmap-only shadow pass with no diffuse texture,
  // which renders black -- while its real colour pass, perm 7, was rejected for
  // wanting a paraboloidReflectionTex nothing can ever provide. fallbackFor()
  // gives these a designed stand-in, so needing one must not disqualify a
  // variant; only a MATERIAL channel that is genuinely absent should.
  const satisfied = (v: GeneratedVariant) =>
    v.samplers.every((s) => channels.has(s.id) || ENGINE_TARGET.test(s.name));

  for (const v of variants) if (satisfied(v) && feeds(v)) return v;
  for (const v of variants) if (satisfied(v)) return v;

  // Nothing is fully satisfiable -- a material whose lightmap channel ships
  // empty, most often. Take the variant missing the FEWEST channels rather than
  // the last in the list: the list is ordered by how much a variant asks for,
  // so its tail is the most demanding one and the worst possible fallback.
  // Engine targets are excluded from the count for the same reason as above.
  let best = variants[0];
  let bestMissing = Infinity;
  for (const v of variants) {
    const missing = v.samplers.filter(
      (s) => !channels.has(s.id) && !ENGINE_TARGET.test(s.name)
    ).length;
    if (missing < bestMissing) { best = v; bestMissing = missing; }
  }
  return best;
}

/**
 * A neutral value for a uniform the viewer has no real source for.
 *
 * The engine sets these per draw from state a viewer does not model, so a
 * generated shader declares them and nothing fills them in. Three defaults an
 * undeclared uniform to zero, and zero is the WRONG neutral for most of them:
 * anything that scales a term collapses the whole expression to black. That is
 * why vineta_k's sea rendered black -- its reflection is multiplied by
 * `iblScalePower`, which no one was setting, and 481 shaders read that one
 * uniform alone.
 *
 * The name is the only signal available, so it is classified by what the engine
 * calls it: a scale or intensity defaults to 1, a colour or tint to white, an
 * offset or bias to 0. Guessing 1 for an unknown is deliberate -- it leaves the
 * term it multiplies unchanged, where 0 would erase it.
 */
function neutralValue(name: string): THREE.Vector4 {
  // Offsets and biases are additive: zero leaves the term alone.
  // `time` is not a constant: GeneratedRcsMaterial.tick() advances it from the
  // frame clock every frame. Zero is just where it starts.
  if (name === "time") return new THREE.Vector4(0, 0, 0, 0);
  if (/Offset|Bias|Origin|Point[AB]?$|Direction/i.test(name)) return new THREE.Vector4(0, 0, 0, 0);
  // Zone and shadow terms belong to effects the viewer does not run.
  if (/^zone|Shadow|^textureSpot/i.test(name)) return new THREE.Vector4(0, 0, 0, 0);
  // Everything else -- scales, powers, colours, tints -- is multiplicative.
  return new THREE.Vector4(1, 1, 1, 1);
}

/**
 * Fill in every `uniform vec4` the shader declares that nothing else provides.
 *
 * Parsing the GLSL is what makes this complete: the alternative is a hand-kept
 * list, and 114 distinct uniform names appear across the corpus, most of them
 * in only a handful of shaders.
 */
/**
 * Whether an unnamed uniform ends up modifying a texture coordinate.
 *
 * The neutral for a value we cannot name depends on what it feeds. Most are
 * scales, where 1 is right. But a term that reaches a uv is different: uv space
 * is [0,1] across the whole texture, so a scale of 1 on a [0,1] input shifts
 * the sample by an ENTIRE texture. nr_crowd_bustle does exactly that --
 *
 *     R0.y = crowdnoise.y * u_f139ff6d;   // per-sprite offset
 *     R0.x = v_TEX2.w + R0.y;             // ... added to the atlas coordinate
 *     H0   = texture2D(TEX1, R0);
 *
 * -- so 1 sampled a whole atlas away, into the transparent margin, and with
 * alphaTest every pixel was discarded: the crowd disappeared entirely.
 *
 * Zero is the honest answer for those. It costs the animation -- the avatars
 * stop cycling -- but samples the sprite the geometry actually points at, which
 * is the part that matters. Guessing a magnitude would be inventing data.
 */
function feedsTextureCoordinate(glsl: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The register this uniform is combined into...
  const producers = new RegExp(`(R\\d+)[\\w.]*\\s*=\\s*\\([^;]*\\b${esc}\\b`, "g");
  const regs = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = producers.exec(glsl)) !== null) regs.add(m[1]);
  if (!regs.size) return false;
  // ...and any register derived from it, one hop, then used as a uv.
  for (const r of [...regs]) {
    const derived = new RegExp(`(R\\d+)[\\w.]*\\s*=\\s*\\([^;]*\\b${r}\\b`, "g");
    while ((m = derived.exec(glsl)) !== null) regs.add(m[1]);
  }
  for (const r of regs) {
    if (new RegExp(`texture2D\\([^,]+,\\s*vec2\\(${r}\\b`).test(glsl)) return true;
  }
  return false;
}

function declaredUniforms(glsl: string, existing: Record<string, THREE.IUniform>) {
  const out: Record<string, THREE.IUniform> = {};
  const re = /^uniform vec4 (\w+);/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(glsl)) !== null) {
    const name = m[1];
    if (existing[name] || out[name]) continue;
    // A synthesised name says nothing, so read the usage; a real name is the
    // better signal where we have one.
    const value =
      name.startsWith("u_") && feedsTextureCoordinate(glsl, name)
        ? new THREE.Vector4(0, 0, 0, 0)
        : name.startsWith("u_")
          ? new THREE.Vector4(1, 1, 1, 1)
          : neutralValue(name);
    out[name] = { value };
  }
  return out;
}

/** Uniforms every generated shader may declare; unused ones are simply ignored. */
function commonUniforms(): Record<string, THREE.IUniform> {
  return {
    // A MATRIX, not four columns.
    //
    // The engine's programs read `viewProj_0..3` because RSX has no matrix
    // type, but _compose.ts rewrites those four declarations into one `mat4`
    // and unpacks it back into the four names at the top of main(). So what has
    // to be bound is the matrix -- binding the columns would leave the mat4 at
    // zero and collapse every vertex to the origin.
    viewProj: { value: new THREE.Matrix4() },
    // The refraction materials' own projection, rewritten from four
    // fragment-side rows the same way; written per frame alongside viewProj,
    // which is what it is in this viewer.
    refractProject: { value: new THREE.Matrix4() },
    reflectProject: { value: new THREE.Matrix4() },
    // Likewise rewritten from four columns; see MATRIX_UNIFORMS in _compose.ts.
    // `world` is the mesh's own transform, written per draw alongside
    // rcsModelMatrix. ambientShadowMatrix belongs to a shadow pass the viewer
    // does not run, so identity is the honest value.
    world: { value: new THREE.Matrix4() },
    ambientShadowMatrix: { value: new THREE.Matrix4() },
    eyePositionWorldSpace: { value: new THREE.Vector4() },
    // The engine's own dequantisation, exactly as the .rcsmodel states it:
    // these turn raw int16 vertex data into MODEL space. The mesh's placement
    // in the world is no longer folded in here -- see rcsModelMatrix.
    // The mesh's world matrix, written per draw by bindPositionTransform.
    // The VP prelude declares it and the emitter uses it to put the normal in
    // world space; without a value here it is the zero matrix and every normal
    // collapses to (0,0,0), which renders the whole mesh black.
    rcsModelMatrix: { value: new THREE.Matrix4() },
    // Inverse-transpose of the mesh's world matrix, for the normal: the
    // dequantisation scale is per-axis, and a direction under non-uniform
    // scale transforms by the inverse-transpose or it skews. Written per draw
    // by bindPositionTransform, next to rcsModelMatrix.
    rcsNormalMatrix: { value: new THREE.Matrix3() },
    positionScale: { value: new THREE.Vector4(1, 1, 1, 1) },
    positionBias: { value: new THREE.Vector4(0, 0, 0, 0) },
    // tone-map themselves, so renderer.toneMappingExposure never reaches them.
    // Overwritten from the track's .envsettings when it loads.
    prelitBias: { value: new THREE.Vector4(1, 1, 1, 0) },
    prelitScaleSpecular: { value: new THREE.Vector4(1, 1, 1, 1) },
    fogColour: { value: new THREE.Vector4(0, 0, 0, 0) },
    constantAmbientColour: { value: new THREE.Vector4(0, 0, 0, 1) },
    directionalLight0DirectionWorldSpace: { value: new THREE.Vector4(0, -1, 0, 0) },
    directionalLight0Colour: { value: new THREE.Vector4(1, 1, 1, 1) },
    SpecularColour: { value: new THREE.Vector4(1, 1, 1, 1) },
    // The engine's fade control, read as `alpha * y + x` (y scale, x bias).
    // Declared here because the invented all-ones neutral is WRONG for a
    // scale/bias pair: it computed alpha*1 + 1, clamping every pixel to fully
    // opaque -- nitro_perspex blended with a constant 1 and looked untouched,
    // and any cutout program with this line could never discard. Identity is
    // scale 1, bias 0.
    globalAlphaScaler: { value: new THREE.Vector4(0, 1, 1, 1) },
  };
}

/**
 * Build the material for one variant.
 *
 * `channels` is keyed by the engine's channel id, which is what the sampler
 * table binds against. `positional` is the loader's older array form, used only
 * when a caller has no ids -- it maps onto the variant's samplers in order,
 * which holds because the loader registers channels in slot order.
 */
/** Reported mismatches, so a shared material warns once rather than per mesh. */
const warnedUnmatched = new Set<string>();

export function makeVariant(
  variant: GeneratedVariant,
  channels: Map<number, THREE.Texture>,
  positional: THREE.Texture[]
): GeneratedRcsMaterial {
  const uniforms = commonUniforms();

  // Bind by channel id ONLY.
  //
  // The id is the engine's own link between a texture the material ships and a
  // sampler the shader declares; it either matches or it does not. Two guesses
  // used to stand in when it did not -- the loader's channel-slot array indexed
  // by position, and "spare" textures handed to whatever sampler was still
  // empty -- and both invent a binding the data does not state. That produced
  // confident nonsense: waves2.gtf bound to water_noref's ambientShadowTex, and
  // livery_01.gtf (another object's texture entirely) bound to a
  // lambertzeroalpha diffuse. Worse, a plausible-looking wrong texture hides
  // the mismatch it came from, which is the thing actually worth fixing.
  //
  // An unmatched sampler now takes its neutral fallback and says so.
  // `positional` is the no-ids entry point only (MaterialFactory.make, for
  // callers that have textures but no channel table). When ids ARE available
  // -- which is every path RCSMODELLoader takes, since it always passes
  // channelIds -- it is empty and plays no part.
  const byUnit = channels.size === 0;
  const unmatched: string[] = [];
  variant.samplers.forEach((s) => {
    const bound = byUnit ? positional[s.unit] : channels.get(s.id);
    if (bound) encodeForSampler(bound, s.name);
    // Engine render targets -- reflection probes, shadow and screen-space
    // buffers -- are produced by passes the viewer does not run, so NO material
    // ships them and the neutral fallback is the correct answer, not a fault.
    // They are the overwhelming majority of unmatched samplers and reporting
    // them buries the ones that are genuinely a mismatch in the id table.
    else if (!ENGINE_TARGET.test(s.name)) unmatched.push(`${s.name}#${s.id}@TEX${s.unit}`);
    uniforms[`TEX${s.unit}`] = { value: bound ?? fallbackFor(s.name) };
  });
  if (unmatched.length) {
    // The channel ids the material DOES ship, so a mismatch can be traced to
    // the id table rather than guessed at. Once per material+permutation: the
    // same material is built for hundreds of meshes.
    const key = `${variant.material}|${variant.permutation}|${unmatched.join(" ")}`;
    if (!warnedUnmatched.has(key)) {
      warnedUnmatched.add(key);
      const shipped = [...channels.keys()].join(",");
      console.warn(
        `[variant] ${variant.material} perm=${variant.permutation}:` +
          ` no channel for ${unmatched.join(" ")} -- material ships ids [${shipped}]`
      );
    }
  }
  // Anything the shader declares that the list above does not cover. Without
  // this those default to zero and multiply their term to black.
  // The declarations and the body: a uniform is declared in the former, and
  // feedsTextureCoordinate reads the latter to choose its neutral.
  // Rendered back to GLSL text via declText -- decls are parsed Decl RECORDS
  // since the composer restructure, and joining records directly produced
  // "[object Object]" lines that the declaration regex could never match. So
  // declaredUniforms invented NOTHING: `time` never existed on any material
  // (tick()'s `if (clock)` silently skipped, freezing all 529 clock-reading
  // shaders), and every other invented neutral -- Constant1, Refbrightness --
  // sampled as GLSL zero instead.
  // The position register, from the permutation's own binding table, so the
  // composer can transform it by the full modelMatrix -- the scale/bias pair
  // the body computes with cannot carry an animated pivot's rotation.
  const positionAttr = variant.attributes.find((a) => a.name === "position");
  const positionReg = positionAttr ? `v${positionAttr.reg}` : null;

  // Compose first, then scan the COMPOSED text for uniforms to invent. The
  // scan used to run over the raw declarations, so the four `world_N` columns
  // the composer folds into one `mat4 world` were each given a vec4 neutral
  // as well -- four uniforms the shader never declares, cluttering every pick
  // log and every toolbox with values nothing reads.
  const vertSrc = PHONG_OVERRIDE
    ? phongVertex(variant.vert, phongRegs(variant.attributes))
    : composeVertex(variant.vert, { position: positionReg });
  const fragSrc = PHONG_OVERRIDE
    ? phongFragment(diffuseUnit(variant.samplers))
    : composeFragment(variant.frag, BLEND_MATERIALS.has(variant.material));
  Object.assign(uniforms, declaredUniforms(vertSrc, uniforms));
  Object.assign(uniforms, declaredUniforms(fragSrc, uniforms));
  // Engine-injected constants this material is known to need; see
  // ENGINE_CONSTANTS. After declaredUniforms, so a known value replaces the
  // invented neutral rather than being replaced by it.
  // A "material#permutation" key wins over the material-wide one: register
  // numbers are per program, and a material whose permutations put the same
  // constant on different registers needs one entry per permutation.
  const engineConstants =
    ENGINE_CONSTANTS[`${variant.material}#${variant.permutation}`] ?? ENGINE_CONSTANTS[variant.material] ?? {};
  for (const [name, v] of Object.entries(engineConstants)) {
    uniforms[name] = { value: new THREE.Vector4(v[0], v[1], v[2], v[3]) };
  }

  // Alpha cutout: opt-in per material, never inferred.
  //
  // Whether a shader's alpha means COVERAGE or DATA cannot be read off the
  // shader. 192 of the 441 picked programs write a computed final alpha, and
  // the value is coverage for some (the crowd's avatar atlas, 45% transparent)
  // and data for others (weapon_pads takes its alpha from a normal map whose
  // alpha averages 0.063 -- gloss, not opacity). The .rcsmaterial does not say
  // which: 88% of its permutations are unnamed, and the named ones only mark
  // the non-colour passes the generator already discards.
  //
  // Three heuristics were tried -- match anywhere, last-write-only, trace the
  // register to its sampler -- and each fixed the case in front of it while
  // breaking another: the crowd, then vineta_k's track, then the pads. Guessing
  // wrong in the cutout direction is the damaging one, because a wrong cutoff
  // discards most of a surface and the object vanishes rather than looking
  // slightly off.
  //
  // So the default is opaque, and a material that genuinely cuts out is listed
  // here. Being wrong now means a sprite draws as a solid quad -- visible, and
  // obviously wrong -- instead of geometry silently disappearing.
  const writesAlpha = CUTOUT_MATERIALS.has(variant.material);
  const blendMode = BLEND_MATERIALS.get(variant.material);
  const blends = blendMode !== undefined;
  // The shader does the discard itself -- Three's alphaTest only sets a
  // #define whose chunk a raw ShaderMaterial never includes -- so the threshold
  // is passed as a uniform. Zero disables it for materials that blend.
  uniforms.u_alphaTest = { value: writesAlpha ? 0.5 : 0.0 };

  // The shaders were composed above (see vertSrc/fragSrc); PHONG_OVERRIDE in
  // _compose.ts swaps in the bisect there. Everything else -- channels, ids,
  // streams, uniforms, the picked permutation -- is the same either way.
  const built = new GeneratedRcsMaterial(
    {
      // Front faces only, as RSX draws these by default. DoubleSide made the
      // tunnel's outer shell occlude its own windows from the inside: the
      // screen-space refraction target rendered the shell's BACK faces behind
      // the glass, so the windows showed the tunnel interior instead of the
      // world outside. Winding is consistent with the decoded normals
      // (face-vs-vertex alignment 0.99), so FrontSide is the visible side.
      side: THREE.FrontSide,
      vertexShader: vertSrc,
      fragmentShader: fragSrc,
      uniforms,
      ...(writesAlpha ? { transparent: false, alphaTest: 0.5 } : {}),
      // Blend materials draw with their computed alpha over what is already
      // there; no depth write, so the hull behind the canopy still renders.
      ...(blends
        ? {
            transparent: true,
            depthWrite: false,
            // Additive = src * srcAlpha + dst: the computed coverage still
            // scales the glow, it just never darkens what is behind it.
            blending: blendMode === "additive" ? THREE.AdditiveBlending : THREE.NormalBlending,
          }
        : {}),
    },
    Permutation.LitLightmapped,
    variant.bank,
    {
      time: 0,
      eyePositionWorldSpace: new THREE.Vector3(),
      prelitBias: new THREE.Vector4(1, 1, 1, 0),
      prelitScaleSpecular: new THREE.Vector4(1, 1, 1, 1),
    },
    variant.attributes,
    variant.bankWindow ?? { base: 454, size: 14 },
    variant.bankDefaults ?? []
  );
  // Which permutation actually ran, for the pick log: a wrong colour is most
  // often a uniform this variant reads and nothing sets, and naming the
  // permutation is what makes the shader findable in generated/_shaders.ts.
  built.userData.variant = variant;
  return built;
}
