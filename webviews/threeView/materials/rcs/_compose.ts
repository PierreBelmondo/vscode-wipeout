/**
 * The viewer's entry points for a decompiled RSX program.
 *
 * `rcsdump -g` emits each program as a FUNCTION -- `rcsVertex(vec4 v0, ...)`
 * and `rcsFragment()` -- and never a `main()`. This file supplies the main()
 * that calls it, along with any uniform that main() needs.
 *
 * Keeping both here is the point. If the generator emitted them, then adding a
 * uniform, changing how an attribute is transformed on the way in, or driving
 * gl_Position from a different matrix would mean regenerating 600 shader
 * strings and re-reading them to check the change landed. Here it is an
 * ordinary edit: the decompiled bodies never change, and what the viewer wraps
 * around them is visible in one file.
 *
 * A program's shape -- which parameters it takes, which one is the normal --
 * comes from the variant table, because only the generator can see it.
 */

/**
 * One declaration, parsed rather than left as a line of GLSL.
 *
 * The composer rewrites these -- replacing four `vec4` matrix columns with one
 * `mat4`, adding a uniform, renaming an attribute -- and doing that on strings
 * means matching text and hoping the spelling never changes. As a record it is
 * a filter and a map over typed fields.
 */
export type Decl = {
  kind: "attribute" | "uniform" | "varying";
  /** `vec4`, `mat4`, `sampler2D`, ... */
  type: string;
  name: string;
  /** Array length, for `uniform vec4 c[14]`. */
  array?: number;
  /** rcsdump's trailing note -- the bound stream or channel, where it knows. */
  comment?: string;
};

/** One decompiled program, as the generator emits it. */
export type ShaderParts = {
  /** Declarations, parsed. */
  decls: Decl[];
  /** The program's statements, bare: no function, no main(). */
  body: string;
  /** Attribute registers the body seeds, in order. */
  params: string[];
  /** Which register carries the normal, from rcsdump's own annotation. */
  normal: string | null;
};

/** Render a declaration back to GLSL. */
export function declText(d: Decl): string {
  const array = d.array === undefined ? "" : `[${d.array}]`;
  const comment = d.comment ? `  // ${d.comment}` : "";
  return `${d.kind} ${d.type} ${d.name}${array};${comment}`;
}

/**
 * Uniforms the viewer's main() introduces, declared per shader.
 *
 * Listed here rather than in the generated GLSL so a new one costs an entry in
 * this array and nothing else. Each is emitted only when `needed` says the
 * program actually calls for it -- an unused uniform is harmless in GLSL but
 * noisy in a dump, and some drivers warn.
 */
type ComposedUniform = {
  decl: Decl;
  needed: (parts: ShaderParts) => boolean;
};

const VERTEX_UNIFORMS: ComposedUniform[] = [
  {
    // The mesh's world matrix, written per draw by GeneratedRcsMaterial.
    //
    // The engine's programs carry no model transform: on PS3 it is folded into
    // positionScale/positionBias before the shader runs, so the vertex data
    // arriving is already in world space -- and so is the stored normal. This
    // viewer places meshes with a scene graph instead, which is also where the
    // animated ANIM_TRANSFORM pivots live, so the normal has to be brought into
    // world space to match the lights it is dotted against.
    decl: {
      kind: "uniform",
      type: "mat3",
      name: "rcsNormalMatrix",
      comment: "inverse-transpose of the mesh's world matrix, for the normal",
    },
    needed: (s) => s.normal !== null,
  },
];

/**
 * A group of engine uniforms replaced by one the viewer would rather feed.
 *
 * RSX has no matrix type, so rcsdump emits a 4x4 as four `vec4` columns:
 *
 *     uniform vec4 viewProj_0;   ...  viewProj_3;
 *
 * Feeding that means splitting a Matrix4 into four Vector4s on the CPU every
 * frame and keeping the column order straight. Declaring a `mat4` instead and
 * unpacking it back into the four names at the top of main() lets the viewer
 * bind a Three matrix directly, while the decompiled body -- which reads
 * `viewProj_0` and knows nothing of this -- is untouched.
 *
 * `columns` are matched against the program's own declarations, so a rewrite
 * applies only where the group is actually present and complete.
 */
type UniformRewrite = {
  /** Does this program declare the group? Given the parsed declarations. */
  matches: (decls: Decl[]) => boolean;
  /** Which declarations it consumes. */
  consumes: (d: Decl) => boolean;
  /** What to declare instead, or null when the unpack needs no uniform. */
  replacement: Decl | null;
  /** Statements rebuilding the originals, emitted at the top of main(). */
  unpack: string[];
};

/**
 * Every 4x4 the engine splits into columns; the viewer binds one Matrix4.
 *
 * The full set, taken from the corpus rather than guessed: a group left out
 * here keeps its four `vec4` declarations, and since nothing binds those the
 * matrix reads as zero and whatever it transforms collapses.
 */
const MATRIX_UNIFORMS = [
  "viewProj",
  "world",
  "ambientShadowMatrix",
  "directionalLight0Proj",
  "shadowMatrix",
  "textureSpot0Proj",
  "textureSpot1Proj",
  // A FRAGMENT-side matrix: the screen-space refraction materials project a
  // normal-displaced world point back to the screen with it. rcsdump names
  // its rows `refractProject_0..3` like a VP matrix; the material binds the
  // scene's view-projection.
  "refractProject",
  // Its reflection twin (reflectplane_dc_seawater): the same shape, sampling
  // screenSpaceReflectionTex. The engine renders that target with a mirrored
  // camera and this is that camera's view-projection; the viewer binds the
  // main view's for now, which samples coherently but is not a true mirror.
  "reflectProject",
];

/**
 * Dequantisation, computed in the preamble from Three's own per-mesh matrix.
 *
 * The engine's programs open with `v0 * positionScale + positionBias`, which
 * turns the buffer's raw int16 into world space. Those two were bound as
 * material uniforms, and that cannot work here: a material is shared by every
 * mesh that uses it and those meshes do NOT share a transform, so one mesh's
 * scale overwrites another's. `GeneratedRcsMaterial` fought that by rewriting
 * them per draw in onBeforeRender, which is fragile in exactly the way it
 * sounds -- and it left the values wrong for whichever mesh was not last.
 *
 * Three already solves this: `modelMatrix` is a built-in it supplies PER MESH,
 * with no sharing and no ordering to get right. The transform these meshes
 * carry is scale + translation with no rotation (loadPart sets only position
 * and scale), so a TRS matrix IS the scale/bias pair the program wants:
 * the diagonal is the scale, the last column the bias.
 *
 * So the preamble computes both names from modelMatrix and the decompiled body
 * -- which reads `positionScale` and knows nothing of this -- is untouched.
 * Nothing needs to bind them, which is the point: there is no per-mesh value
 * left on a shared object to get wrong.
 */
const dequantMatches = (decls: Decl[]) =>
  decls.some((d) => d.name === "positionScale") && decls.some((d) => d.name === "positionBias");
const dequantConsumes = (d: Decl) => d.name === "positionScale" || d.name === "positionBias";

/**
 * The preferred form, used when the position register is known: the seed is
 * transformed by the FULL modelMatrix (see composeVertex) and the body's
 * `v0 * positionScale + positionBias` is neutralised into a no-op.
 *
 * Not the diagonal short-cut this first was. Taking modelMatrix's diagonal as
 * the scale and its last column as the bias is exact for the static track
 * (scale + translate only) and wrong for anything under a rotating
 * ANIM_TRANSFORM pivot: a rotated matrix carries cosines on its diagonal and
 * the rotation in the off-diagonals, so a ship's animated airbrake had its
 * rotation converted into a fake SCALE and its placement dropped.
 */
const DEQUANT_NEUTRAL: UniformRewrite = {
  matches: dequantMatches,
  consumes: dequantConsumes,
  // Nothing is declared in their place; the neutral constants below satisfy
  // the body's reads.
  replacement: null,
  unpack: [
    "  // Neutralised: the position register is already transformed by the full",
    "  // modelMatrix at its seed, so the body's dequantisation must be a no-op.",
    "  vec4 positionScale = vec4(1.0);",
    "  vec4 positionBias = vec4(0.0);",
  ],
};

/**
 * Fallback when the binding table names no position register: the diagonal
 * approximation. Exact for scale+translate transforms, wrong under rotation --
 * but with no register to rewrite there is nothing better to do, and the
 * corpus check found no variant without a position binding.
 */
const DEQUANT_DIAGONAL: UniformRewrite = {
  matches: dequantMatches,
  consumes: dequantConsumes,
  replacement: null,
  unpack: [
    "  // Dequantisation from Three's per-mesh modelMatrix -- see _compose.ts.",
    "  vec4 positionScale = vec4(modelMatrix[0][0], modelMatrix[1][1], modelMatrix[2][2], 1.0);",
    "  vec4 positionBias = vec4(modelMatrix[3].xyz, 0.0);",
  ],
};

const UNIFORM_REWRITES: UniformRewrite[] = MATRIX_UNIFORMS.map((name) => {
  const isColumn = (d: Decl) =>
    d.kind === "uniform" && d.type === "vec4" && new RegExp(`^${name}_[0-3]$`).test(d.name);
  return {
    matches: (decls) => decls.filter(isColumn).length === 4,
    consumes: isColumn,
    replacement: {
      kind: "uniform",
      type: "mat4",
      name,
      comment: "the four vecx4 columns the program reads, as one matrix",
    },
    unpack: [
      `  // ${name}: the engine's four columns, from the matrix the viewer binds.`,
      `  // The program accumulates x*col0 + y*col1 + z*col2 + col3, so these are`,
      `  // columns -- and mat4[i] indexes a column in GLSL, so it lines up.`,
      ...[0, 1, 2, 3].map((i) => `  vec4 ${name}_${i} = ${name}[${i}];`),
    ],
  };
});

/**
 * Apply every rewrite whose group this program fully declares.
 *
 * Returns the surviving declarations plus the statements main() needs to
 * restore what the body expects.
 */
function applyRewrites(decls: Decl[], extra: UniformRewrite[] = []): { decls: Decl[]; unpack: string[] } {
  let out = decls;
  const unpack: string[] = [];
  for (const r of [...UNIFORM_REWRITES, ...extra]) {
    if (!r.matches(out)) continue;
    const kept = out.filter((d) => !r.consumes(d));
    out = r.replacement ? [...kept, r.replacement] : kept;
    unpack.push(...r.unpack);
  }
  return { decls: out, unpack };
}

/** Shared by both stages; the engine's programs assume these. */
const COMMON_HEAD = [
  "precision highp float;",
  "#define clamp01(v) clamp((v), 0.0, 1.0)",
];

/**
 * The sRGB encode every fragment shader here ends with.
 *
 * Three injects its colour-management chunks into every material it builds a
 * shader for but NOT into a raw ShaderMaterial, so these programs would write
 * linear values into an sRGB target and come out far too dark -- 0.5 displaying
 * as 0.21. rcsdump emits the CALL; this supplies the function.
 */
const RCS_OUTPUT = [
  "vec4 rcsOutput(vec4 v) {",
  "  // max(): these transcribed RSX programs genuinely produce negative",
  "  // colour -- they multiply by unclamped dot products -- and pow() of a",
  "  // negative is undefined. On PS3 the framebuffer write clamps; this is",
  "  // that clamp.",
  "  vec3 c = max(v.rgb, vec3(0.0));",
  "  vec3 lo = c * 12.92;",
  "  vec3 hi = pow(c, vec3(0.41666)) * 1.055 - 0.055;",
  "  return vec4(mix(hi, lo, vec3(lessThanEqual(c, vec3(0.0031308)))), v.a);",
  "}",
].join("\n");

/**
 * Replace every transcribed program with a plain Phong. A bisect, not a mode.
 *
 * When a surface renders wrong, the cause is somewhere in a chain nobody can
 * see end to end: mesh streams, the scene graph's transform, the light
 * uniforms, the picked permutation, and ~200 lines of decompiled RSX per
 * material. Switching this on cuts that chain in half -- the geometry, the
 * texture binding, the channel ids, the scene lights and the loader all still
 * run exactly as they do normally, and only the decompiled body is swapped for
 * shading simple enough to be certainly correct:
 *
 *   - still wrong  -> the fault is UPSTREAM of the shaders. Geometry,
 *                     transform, light uniforms, or texture binding.
 *   - looks right  -> the fault is INSIDE the transcribed programs, and
 *                     everything feeding them is sound.
 *
 * Either answer halves the search space, which reading the disassembly does
 * not. Off by default; flip it, rebuild, and look.
 */
export const PHONG_OVERRIDE = false;

/**
 * Which sampler carries base colour.
 *
 * From the corpus, not guessed. `Texture1` (960 uses), `DiffuseTexture` (456)
 * and `Diffuse_Texture` (160) dominate, but the exporters were inconsistent and
 * a long tail spells it `diffuse`, `Diffuse`, `diffuseTexture` or `Colour`.
 * Matching only the top three left half the corpus falling back to flat grey,
 * which would have made a lit render impossible to read.
 *
 * Deliberately NOT matched: `lightmap`, `Emiss*`, `Normal`, `Wave`, and the
 * engine render targets (`zoneTex*`, `paraboloid*`, `*ShadowTex`) -- binding a
 * normal map as albedo would produce a confidently wrong lavender surface.
 */
const DIFFUSE_SAMPLER =
  /^([Tt]exture1|[Dd]iffuse([_ ]?[Tt]exture)?|Colour|base_texture|rock|snow1?|ice|dirt|sand)$/;

/** Does this program sample a diffuse texture, and on which unit? */
export function diffuseUnit(samplers: { unit: number; name: string }[]): number | null {
  const hit = samplers.find((s) => DIFFUSE_SAMPLER.test(s.name));
  return hit ? hit.unit : null;
}

/**
 * A Phong vertex shader over the engine's own attribute registers.
 *
 * Deliberately NOT written against Three's `position`/`normal`/`uv`. The
 * geometry carries both those and the `vN` aliases, and it is the aliasing that
 * is under suspicion -- a stream bound to the wrong register, or not bound at
 * all, is exactly the kind of fault that renders a surface black. Reading the
 * same registers the real programs read keeps that link inside the test.
 *
 * `rcsModelMatrix` and `viewProj` are the same uniforms the composed programs
 * take, so the transform path is unchanged too.
 */
export function phongVertex(parts: ShaderParts, regs: PhongRegs): string {
  // The registers this permutation binds, so the same aliasing is exercised.
  // Declared from the program's own parameter list, plus anything the table
  // names that the body happened not to seed -- an attribute read here but
  // never declared will not link.
  const declared = new Set(parts.params);
  for (const r of [regs.position, regs.normal, regs.uv]) if (r) declared.add(r);

  return [
    ...COMMON_HEAD,
    "",
    ...[...declared].map((p) => `attribute vec4 a_${p};`),
    "uniform mat4 viewProj;",
    "uniform mat4 rcsModelMatrix;",
    "varying vec3 vNormalW;",
    "varying vec2 vUv;",
    "",
    "void main() {",
    // No position register means the binding table itself is incomplete, which
    // is worth seeing as geometry collapsed to a point rather than hidden.
    regs.position
      ? `  vec4 p = rcsModelMatrix * vec4(a_${regs.position}.xyz, 1.0);`
      : "  vec4 p = vec4(0.0, 0.0, 0.0, 1.0);",
    regs.normal
      ? // Normalised: the model matrix carries the ~1/100 dequantisation scale,
        // which would otherwise crush the normal and black out the lighting.
        `  vNormalW = normalize(mat3(rcsModelMatrix) * a_${regs.normal}.xyz);`
      : "  vNormalW = vec3(0.0, 1.0, 0.0);",
    regs.uv ? `  vUv = a_${regs.uv}.xy;` : "  vUv = vec2(0.0);",
    "  gl_Position = viewProj * p;",
    "}",
    "",
  ].join("\n");
}

/** The three registers Phong needs, resolved from the permutation's table. */
export type PhongRegs = {
  position: string | null;
  normal: string | null;
  uv: string | null;
};

/**
 * Find position, normal and UV among the registers this permutation binds.
 *
 * By stream NAME from the binding table, not by register number: `Uv1` lands on
 * v2 in 26315 permutations, v3 in 12081 and v4 in 3064, so a fixed register
 * would sample the wrong stream on most of the corpus.
 */
export function phongRegs(attributes: { reg: number; name: string }[]): PhongRegs {
  const find = (re: RegExp) => {
    const hit = attributes.find((a) => re.test(a.name));
    return hit ? `v${hit.reg}` : null;
  };
  return {
    position: find(/^position$/),
    normal: find(/^normal$/i),
    // Uv1 is the diffuse UV in the overwhelming majority; the others are
    // lightmap or second-layer sets that would sample the albedo wrongly.
    uv: find(/^(Uv1|Uvset1|diffuseUV|Diffuse_uv|diffuseUVs)$/),
  };
}

/**
 * A Phong fragment shader reading the same sun and ambient uniforms.
 *
 * `directionalLight0Colour`, `directionalLight0DirectionWorldSpace` and
 * `constantAmbientColour` are written by the same syncLights that feeds the
 * real programs, so a black result here indicts those uniforms directly.
 * Output goes through the same rcsOutput encode, so brightness stays comparable
 * with a working generated material rather than differing by a gamma.
 */
export function phongFragment(unit: number | null): string {
  return [
    ...COMMON_HEAD,
    "",
    unit === null ? "" : `uniform sampler2D TEX${unit};`,
    "uniform vec4 directionalLight0Colour;",
    "uniform vec4 directionalLight0DirectionWorldSpace;",
    "uniform vec4 constantAmbientColour;",
    "varying vec3 vNormalW;",
    "varying vec2 vUv;",
    "",
    RCS_OUTPUT,
    "",
    "void main() {",
    unit === null
      ? "  vec3 albedo = vec3(0.8);"
      : `  vec3 albedo = texture2D(TEX${unit}, vUv).rgb;`,
    "  vec3 n = normalize(vNormalW);",
    // The uniform is the direction light TRAVELS, so the vector back toward the
    // sun is its negation. Which sign is right has been contested all session
    // and never settled by a measurement -- abs() sidesteps it, lighting both
    // faces. A surface black under BOTH signs is a far stronger signal than one
    // that merely picked the wrong one.
    "  float ndl = abs(dot(n, normalize(-directionalLight0DirectionWorldSpace.xyz)));",
    "  vec3 lit = albedo * (constantAmbientColour.rgb + directionalLight0Colour.rgb * ndl);",
    "  gl_FragColor = rcsOutput(vec4(lit, 1.0));",
    "}",
    "",
  ].join("\n");
}

/** The complete vertex shader: declarations, the engine's program, main(). */
export type ComposeVertexRegs = {
  /** Register carrying the position stream, from the binding table. */
  position?: string | null;
};

export function composeVertex(parts: ShaderParts, regs: ComposeVertexRegs = {}): string {
  const positionReg = regs.position ?? null;
  const uniforms = VERTEX_UNIFORMS.filter((u) => u.needed(parts)).map((u) => u.decl);
  // Dequantisation is vertex-only: `modelMatrix` is a Three built-in that the
  // fragment stage does not receive. With a known position register the seed
  // is transformed by the full matrix and the body's scale/bias neutralised;
  // without one, fall back to the diagonal approximation.
  const canTransformSeed = !!positionReg && parts.params.includes(positionReg);
  const { decls, unpack } = applyRewrites(parts.decls, [
    canTransformSeed ? DEQUANT_NEUTRAL : DEQUANT_DIAGONAL,
  ]);

  // The normal, in world space AND at unit length.
  //
  // The body opens by seeding `vN = a_vN` for every attribute, so overriding
  // one is a plain assignment after the paste -- no signature, no scope to
  // cross. The engine's programs read the stored normal directly, which is
  // right on PS3 where Static geometry is baked in world space; this viewer
  // places meshes with a scene graph, so the normal has to be brought into the
  // same space as the lights it is dotted against.
  //
  // rcsNormalMatrix, NOT mat3(model), and re-normalised -- both matter:
  //
  //  - The mesh's matrix is the int16 dequantisation, a ~1/100 PER-AXIS scale.
  //    mat3(model) shrank the normal to ~0.01 length, and the programs never
  //    normalise (0 `normalize` calls in the corpus -- on PS3 the stored normal
  //    arrives unit-length and is used raw). `clamp01(dot(N, sun))` then
  //    capped at ~0.01 and every lit surface rendered black.
  //  - The scale is per-axis (the int16 range is fitted to each axis of the
  //    part's AABB), and a direction under non-uniform scale transforms by the
  //    INVERSE-TRANSPOSE, or slanted normals skew toward the long axis.
  //    Three's Matrix3.getNormalMatrix is exactly that, written per draw.
  //
  // The scaled-by-inversesqrt form rather than normalize(): a mesh without the
  // stream reads a_vN as (0,0,0,1), and normalize(vec3(0)) is undefined -- NaN
  // on most GPUs, which poisons everything downstream. max() keeps that case a
  // plain zero vector, which lights as black the way an absent normal should.
  //
  // Inserted straight after the seeding lines, since the program reads the
  // register immediately afterwards -- appending it would be too late.
  let body = parts.body;
  if (parts.normal) {
    const n = parts.normal;
    const seed = `  vec4 ${n} = a_${n};`;
    const fix =
      `\n  ${n}.xyz = rcsNormalMatrix * ${n}.xyz;` +
      `\n  ${n}.xyz *= inversesqrt(max(dot(${n}.xyz, ${n}.xyz), 1e-12));`;
    body = body.replace(seed, seed + fix);
  }

  // The position, through the FULL modelMatrix -- rotation included.
  //
  // The engine's `v0 * positionScale + positionBias` is a scale-plus-translate
  // affine and cannot carry a rotation, so feeding it values derived from a
  // rotated matrix (the diagonal short-cut above) turned an animated pivot's
  // rotation into a fake scale: ship airbrakes scaled instead of swinging.
  // Transforming the register itself has no such limit, and the neutralised
  // scale/bias make the body's own dequantisation a no-op. w is preserved --
  // WebGL seeds it 1 for a 3-component stream, and the bodies swizzle .xyzx.
  if (canTransformSeed && positionReg) {
    const p = positionReg;
    const seed = `  vec4 ${p} = a_${p};`;
    // w is the literal 1 rather than a_vN.w: position streams supply three
    // components (w comes from WebGL's default), the bodies swizzle .xyzx and
    // never read .w -- and reading it here tripped the undersupplied-component
    // warning on every position in the scene.
    const fix = `\n  ${p} = vec4((modelMatrix * vec4(${p}.xyz, 1.0)).xyz, 1.0);`;
    body = body.replace(seed, seed + fix);
  }


  return [
    "#define clamp01(v) clamp((v), 0.0, 1.0)",
    "",
    ...[...decls, ...uniforms].map(declText),
    "",
    "void main() {",
    ...unpack,
    body,
    "}",
    "",
  ].join("\n");
}

/** The complete fragment shader: declarations, rcsOutput, the program, main(). */
export function composeFragment(parts: ShaderParts, passAlpha = false): string {
  const { decls, unpack } = applyRewrites(parts.decls);

  // The final write is rcsdump's own boilerplate, not decompiled maths -- the
  // emitter prints `rcsOutput(vec4(H0.rgb, 1.0))` uniformly because most
  // programs use alpha as scratch and forwarding it made whole tracks
  // translucent. A material on the BLEND list computes a real coverage value
  // in H0.w, so for those the constant becomes the program's own alpha.
  // rcsOutput passes v.a through untouched.
  let body = parts.body;
  if (passAlpha) {
    body = body.replace(
      "gl_FragColor = rcsOutput(vec4(H0.rgb, 1.0));",
      "gl_FragColor = rcsOutput(vec4(H0.rgb, clamp01(H0.w)));"
    );
  }

  return [
    ...COMMON_HEAD,
    "",
    ...decls.map(declText),
    "",
    RCS_OUTPUT,
    "",
    "void main() {",
    ...unpack,
    body,
    "}",
    "",
  ].join("\n");
}
