/**
 * Generate viewer material factories from .rcsmaterial files.
 *
 * `rcsdump -g` emits the engine's own vertex and fragment programs as GLSL, and
 * `rcsdump --json` emits the binding tables that say what to feed them. This
 * turns the pair into a TypeScript factory, so a material is wired up by
 * running a command rather than by hand-reading a disassembly.
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/gen-materials.ts [--top N]
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/gen-materials.ts <name>...
 *
 * Writes webviews/threeView/materials/rcs/generated/<name>.ts and prints the
 * import lines to add to that directory's index.
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { sync as globSync } from "glob";

const RCSDUMP = "/home/admin/workspaces/wipeout/vscode/rcs/rcsdump";
const DATA = "/home/admin/workspaces/wipeout/vscode/project-example/ps3/hdf/data";
const OUT = path.join(__dirname, "../webviews/threeView/materials/rcs/generated");

/**
 * Shaders shared across materials, keyed by content hash.
 *
 * Materials reuse each other's vertex and fragment programs heavily -- one
 * shader appears in 61 of them -- so inlining the GLSL per material duplicated
 * 55% of it. They are emitted once into _shaders.ts and referenced by name.
 */
const shaderPool = new Map<string, string>();

/**
 * Lines spliced into every generated shader, by kind.
 *
 * The RSX programs rcsdump emits are complete and self-contained, but the
 * viewer is not a PS3: a few things the hardware provides implicitly have to be
 * stated in GLSL. Those belong HERE, in the generator, so they are written to
 * _shaders.ts once and are readable and greppable like any other code.
 *
 * They were previously applied as regex rewrites at material-construction time,
 * which meant the shader that actually ran existed only in memory -- not in the
 * file, not in the bundle, and not in anything that could be inspected. Every
 * attempt to confirm a change had landed read the pre-patch source instead.
 *
 * Keep each entry small and say WHY it is needed; a prelude is a place for
 * things the hardware does for free, not a place to patch around bugs.
 */
const VP_PRELUDE: string[] = [
  // Empty: anything the viewer's main() needs -- uniforms included -- is
  // declared by the viewer, in _compose.ts, so it can be changed without
  // regenerating. Use this only for something the DECOMPILED BODY needs.
];

/**
 * main() is NOT generated, and neither is anything it needs.
 *
 * rcsdump emits the decompiled program as bare statements, and the viewer wraps
 * them in a main() it writes -- see composeVertex/composeFragment in
 * materials/rcs/_compose.ts, which also declares rcsOutput and any uniform the
 * composition introduces. Emitting those here would bake the composition into
 * 600 shader strings, so changing how the viewer drives these programs would
 * mean regenerating every one.
 *
 * Empty for the same reason as VP_PRELUDE: use it only for something the
 * DECOMPILED BODY needs, which the composer cannot know about.
 */
const FP_PRELUDE: string[] = [];

/**
 * Splice the prelude in after the `#define clamp01` line, which every emitted
 * program carries and which precedes all declarations.
 */
function withPrelude(glsl: string, kind: "vp" | "fp"): string {
  const lines = kind === "vp" ? VP_PRELUDE : FP_PRELUDE;
  const marker = "#define clamp01(v) clamp((v), 0.0, 1.0)\n";
  const at = glsl.indexOf(marker);
  let out = glsl;
  if (lines.length && at >= 0) {
    const cut = at + marker.length;
    out = out.slice(0, cut) + "\n" + lines.join("\n") + "\n" + out.slice(cut);
  }

  return out;
}

/**
 * One decompiled program, split into the parts the viewer assembles.
 *
 * Emitting a finished shader string would bake the entry point into the file;
 * emitting the PARTS lets the viewer build the program it wants -- adding a
 * uniform, wrapping an attribute, driving gl_Position differently -- without
 * the generator having produced anything for that. See _compose.ts.
 */
type Decl = {
  kind: "attribute" | "uniform" | "varying";
  type: string;
  name: string;
  array?: number;
  comment?: string;
};

type ShaderParts = {
  /** Declarations, PARSED -- see the Decl note in _compose.ts. */
  decls: Decl[];
  /** The program's statements, bare: no function, no main(). */
  body: string;
  /** Attribute registers the body seeds, in order. */
  params: string[];
  /** Which register carries the normal, from rcsdump's own annotation. */
  normal: string | null;
};

/**
 * Parse one declaration line.
 *
 * Emitting these as records rather than strings is what lets the viewer rewrite
 * them structurally -- swapping four `vec4` matrix columns for one `mat4`,
 * adding a uniform -- instead of matching text and hoping the spelling holds.
 */
function parseDecl(line: string): Decl | null {
  const m = /^(attribute|uniform|varying)\s+(\w+)\s+(\w+)\s*(?:\[(\d+)\])?\s*;\s*(?:\/\/\s*(.*))?$/.exec(line);
  if (!m) return null;
  const d: Decl = { kind: m[1] as Decl["kind"], type: m[2], name: m[3] };
  if (m[4]) d.array = Number(m[4]);
  if (m[5]) d.comment = m[5].trim();
  return d;
}

/**
 * Split what rcsdump emits into declarations and body.
 *
 * The split point is the function line: everything above it is declarations and
 * the `#define`, everything from it down is the program. Comments above the
 * define go with the declarations so the dump stays readable.
 */
function splitParts(glsl: string): ShaderParts {
  const lines = glsl.split("\n");
  // rcsdump marks where its declarations end and its statements begin. The
  // statements are bare -- no function, no main() -- so the viewer pastes them
  // into a main() it writes and anything it defines for the program is an
  // ordinary local in the same scope.
  const at = lines.findIndex((l) => l.trim() === "// -- program --");
  const head = at < 0 ? lines : lines.slice(0, at);
  const body = at < 0 ? "" : lines.slice(at + 1).join("\n");

  const decls = head.map(parseDecl).filter((d): d is Decl => d !== null);
  // Which register the body seeds from which attribute, and which of those is
  // the normal -- both stated by rcsdump rather than inferred here.
  const params = [...body.matchAll(/^\s*vec4 (v\d+) = a_v\d+;$/gm)].map((m) => m[1]);
  const normal = /\/\/ rcs:normal=(v\d+)/.exec(glsl)?.[1] ?? null;
  return { decls, body, params, normal };
}

function poolShader(glsl: string, kind: "vp" | "fp"): string {
  const withPre = withPrelude(glsl, kind);
  const key = createHash("md5").update(withPre).digest("hex").slice(0, 12);
  if (!shaderPool.has(key)) shaderPool.set(key, withPre);
  return `S_${key}`;
}

type Binding = { id: number; reg?: number; unit?: number; slot?: number; rows?: number; name: string };
type Sho = {
  attributes: Binding[];
  samplers: Binding[];
  uniforms: Binding[];
  /** VP only: the default constants embedded in the program's preamble --
   * the values the shader was compiled against for bank slots it reads but
   * the permutation does not declare (the tangent unpack's (2,1), the
   * byte-normal unpack's (255,128), a wave's pi/2). The one source these have. */
  defaults?: { slot: number; value: [number, number, number, number] }[];
};
type Perm = { index: number; backend: string; name: string; vp: Sho | null; fp: Sho | null };

/** One permutation's GLSL, keyed by the blob offset the listing prints. */
function extractGlsl(file: string): Map<string, string> {
  const text = execFileSync(RCSDUMP, ["material", "-g", file], { maxBuffer: 1 << 28 }).toString();
  const out = new Map<string, string>();
  let kind: string | null = null, addr = "", buf: string[] = [];
  for (const line of text.split("\n")) {
    const head = /^([0-9a-f]{8}) <(VERTEX|FRAGMENT) crc=/.exec(line);
    if (head) { addr = head[1]; continue; }
    if (line.includes("-- vp code --")) { kind = "vp"; buf = []; continue; }
    if (line.includes("-- fp code --")) { kind = "fp"; buf = []; continue; }
    if (!kind) continue;
    if (line.startsWith("   ") && line.includes("\t")) { kind = null; continue; }
    // rcsdump emits an explicit terminator: the statements it produces are
    // bare, so there is no closing brace to stop at.
    if (line.trim() === "// -- end --") { out.set(`${kind}:${parseInt(addr, 16)}`, buf.join("\n")); kind = null; continue; }
    buf.push(line);
  }
  return out;
}

/** perm index -> {vpOff, fpOff}, from the permutation table. */
function extractOffsets(file: string): Map<number, { vp: number; fp: number }> {
  const text = execFileSync(RCSDUMP, ["material", "-t", file], { maxBuffer: 1 << 28 }).toString();
  const out = new Map<number, { vp: number; fp: number }>();
  for (const line of text.split("\n")) {
    const m = /^\s*(\d+)\s+([0-9a-f]{6})\s+([0-9a-f]{4})\s+([0-9a-f]{6})\s+([0-9a-f]{4})/.exec(line);
    if (m) out.set(Number(m[1]), { vp: parseInt(m[2], 16), fp: parseInt(m[4], 16) });
  }
  return out;
}

/** The `c[]` window a shader declares, from the emitter's own comment. */
function bankWindow(glsl: string): { base: number; size: number } | null {
  const m = /uniform vec4 c\[(\d+)\];\s*\/\/ engine bank slots (\d+)\.\.(\d+)/.exec(glsl);
  return m ? { base: Number(m[2]), size: Number(m[1]) } : null;
}

/**
 * A material name as a JS identifier.
 *
 * Some names start with a digit -- 01_normal_diffuse_specularonalpha,
 * 2uv_offset_lights -- which is not a legal identifier and, worse, parses as an
 * octal literal rather than failing outright. Prefixed with `m_` so those stay
 * distinguishable from a name that legitimately begins with a letter.
 */
const ident = (s: string) => {
  const cleaned = s.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(cleaned) ? `m_${cleaned}` : cleaned;
};

function generate(file: string): string | null {
  const base = path.basename(file, ".rcsmaterial");
  const json = JSON.parse(execFileSync(RCSDUMP, ["material", "--json", file], { maxBuffer: 1 << 28 }).toString());
  const perms: Perm[] = json.permutations;
  const glsl = extractGlsl(file);
  const offsets = extractOffsets(file);

  // Keep only permutations that actually draw: a vertex AND fragment program,
  // and a position stream. The rest are depth/shadow passes with nothing to
  // show, and the colour test below rejects those.
  //
  // A sampler is NOT required. Requiring one threw away every colour pass of
  // any material that draws a flat colour: cf_constantcolourglow's colour
  // permutations write `H0.xyz = Constant1` with no texture at all, so the only
  // survivors were its AmbientShadow and shadow-map passes -- which sample
  // engine render targets a viewer cannot supply and render black. The material
  // is named for exactly the behaviour the filter discarded.
  const usable = perms.filter((p) => {
    if (!p.vp || !p.fp) return false;
    if (!p.vp.attributes.some((a) => a.name === "position")) return false;
    const o = offsets.get(p.index);
    if (!o || !glsl.has(`vp:${o.vp}`) || !glsl.has(`fp:${o.fp}`)) return false;

    // Reject passes that produce no colour.
    //
    // A .rcsmaterial holds both halves of a two-pass draw, and the alpha half
    // never writes anything visible -- it exists to lay down coverage or depth
    // for the colour pass that follows. Their sampler sets are identical, so
    // nothing downstream can tell them apart, and picking one draws the object
    // as a black silhouette or, once alpha is honoured, as a hole.
    //
    // Two shapes, both seen in the corpus:
    //   - an explicit black write (nr_crowd_bustle perm 1) -- black avatars
    //   - no colour write at all, only H0.w (jd_alphalambert_alphatest, 164k
    //     verts of vineta_k's track) -- H0.rgb stays at its zero initialiser
    //     and every pixel discards, showing the sky through the track
    const body = glsl.get(`fp:${o.fp}`)!.split("// -- program --")[1] ?? "";
    if (/H0\.xyz = \(vec4\(0, 0, 0, 0\)/.test(body)) return false;
    const declaration = "vec4 H0 = vec4(0.0);";
    if (!/H0(\.xyz|\.rgb)?\s*=\s*\((?!vec4\(0\.0\))/.test(body.replace(declaration, ""))) return false;

    // A whole-register write whose RGB lands on a zero component.
    //
    // `H0 = (vec4(0, 1, 0, 0).xxxy)` is cf_constantcolourglow's ZAlphaOnly
    // pass: it writes alpha from the literal's y and leaves rgb on x, which is
    // 0. The earlier tests miss it because the write is not masked to .xyz and
    // the literal is not all-zero -- but the visible result is still black, and
    // picking it renders the object as a silhouette.
    const whole = [...body.matchAll(/H0 = \(vec4\(([-\d., ]+)\)\.([xyzw]{4})\)/g)];
    if (whole.length) {
      const last = whole[whole.length - 1];
      const lit = last[1].split(",").map((n) => Number(n.trim()));
      const rgb = last[2].slice(0, 3).split("").map((c) => lit["xyzw".indexOf(c)] ?? 0);
      if (rgb.every((v) => v === 0)) return false;
    }
    return true;
  });
  if (!usable.length) return null;

  // One variant per distinct (streams, samplers) signature -- that is what the
  // mesh can actually discriminate on. Richest sampler set first, so a mesh
  // that carries a lightmap gets the lightmapped shader.
  const bySig = new Map<string, Perm>();
  for (const p of usable) {
    const sig = JSON.stringify([
      p.vp!.attributes.map((a) => a.id).sort(),
      p.fp!.samplers.map((s) => s.id).sort(),
    ]);
    // On a tie, keep the variant that reads MORE vertex streams.
    //
    // The signature covers samplers and attributes, but two permutations can
    // still tie on it -- and when they do, keeping whichever came first is
    // arbitrary. diffuse_normal_specular_emmissive's perms 7 and 12 sample the
    // same three textures; the only difference is that 12 also reads
    // SpuVertexColours, the per-vertex baked colour. Dropping it silently chose
    // the shader with less light available to it.
    const prev = bySig.get(sig);
    const richer =
      !prev ||
      p.fp!.samplers.length > prev.fp!.samplers.length ||
      (p.fp!.samplers.length === prev.fp!.samplers.length &&
        p.vp!.attributes.length > prev.vp!.attributes.length);
    if (richer) bySig.set(sig, p);
  }
  // Samplers the ENGINE binds, not the material: zone volumes, shadow and spot
  // render targets, the per-light lightmap atlas. A viewer has none of them, so
  // a variant needing one can never be fed and picking it renders nothing.
  const engineOnly = (n: string) =>
    /^zone|ShadowTex$|^textureSpot|^shadowMapTex$|^directionalLight0LightmapTex$|^ambientShadowTex$/.test(n);

  // Prefer the variant with the FEWEST engine-only samplers, then the most
  // material ones -- the richest shader the viewer can actually satisfy.
  const cost = (p: Perm) => {
    const s = p.fp!.samplers;
    return [s.filter((x) => engineOnly(x.name)).length, -s.filter((x) => !engineOnly(x.name)).length];
  };
  const variants = [...bySig.values()]
    .sort((a, b) => { const ca = cost(a), cb = cost(b); return ca[0] - cb[0] || ca[1] - cb[1]; })
    .slice(0, 8);

  const lines: string[] = [];
  lines.push(`/**`);
  lines.push(` * GENERATED by scripts/gen-materials.ts from`);
  lines.push(` *   ${file.replace(DATA + "/", "data/")}`);
  lines.push(` *`);
  lines.push(` * ${perms.length} permutations in the file; ${usable.length} draw something, reduced to`);
  lines.push(` * ${variants.length} distinct (vertex-stream, sampler) signatures -- the only thing a mesh`);
  lines.push(` * can be matched against, since the engine's own choice depends on render state`);
  lines.push(` * the viewer does not model. Do not edit: regenerate instead.`);
  lines.push(` */`);
  lines.push(`import * as THREE from "three";`);
  lines.push(`import { MaterialFactory } from "../_abstract";`);
  lines.push(`import { Permutation } from "../_raw";`);
  lines.push(`import { GeneratedRcsMaterial } from "../_generated";`);
  lines.push(`import { makeVariant, pickVariant, GeneratedVariant } from "../_variant";`);

  const refs = variants.map((p) => {
    const o = offsets.get(p.index)!;
    return { vert: poolShader(glsl.get(`vp:${o.vp}`)!, "vp"), frag: poolShader(glsl.get(`fp:${o.fp}`)!, "fp") };
  });
  const used = [...new Set(refs.flatMap((r) => [r.vert, r.frag]))].sort();
  lines.push(`import { ${used.join(", ")} } from "./_shaders";`);
  lines.push(``);

  lines.push(`const VARIANTS: GeneratedVariant[] = [`);
  variants.forEach((p, i) => {
    const vpGlsl = glsl.get(`vp:${offsets.get(p.index)!.vp}`)!;
    const win = bankWindow(vpGlsl);
    const attrs = p.vp!.attributes.map((a) => `{ id: ${a.id}, reg: ${a.reg}, name: ${JSON.stringify(a.name)} }`);
    const samps = p.fp!.samplers.map((s) => `{ id: ${s.id}, unit: ${s.unit}, name: ${JSON.stringify(s.name)} }`);
    const bank = [...p.vp!.uniforms, ...p.fp!.uniforms]
      .filter((u) => u.slot !== undefined && u.slot >= 454 && u.slot <= 467)
      .map((u) => `{ slot: ${u.slot}, name: ${JSON.stringify(u.name)}, rows: ${u.rows || 1} }`);
    lines.push(`  {`);
    lines.push(`    material: ${JSON.stringify(base + ".rcsmaterial")},`);
    lines.push(`    permutation: ${p.index},`);
    lines.push(`    backend: ${JSON.stringify(p.backend)},`);
    lines.push(`    vert: ${refs[i].vert},`);
    lines.push(`    frag: ${refs[i].frag},`);
    lines.push(`    attributes: [${attrs.join(", ")}],`);
    lines.push(`    samplers: [${samps.join(", ")}],`);
    lines.push(`    bank: [${bank.join(", ")}],`);
    lines.push(`    bankWindow: ${win ? `{ base: ${win.base}, size: ${win.size} }` : "null"},`);
    // The VP preamble's embedded constants, straight from the SHO. These seed
    // the bank BEFORE the named layout: without them an undeclared slot reads
    // zero, and zero times a tangent is a collapsed TBN.
    const defs = (p.vp!.defaults ?? []).map(
      (d) => `{ slot: ${d.slot}, value: [${d.value.join(", ")}] }`
    );
    lines.push(`    bankDefaults: [${defs.join(", ")}],`);
    lines.push(`  },`);
  });
  lines.push(`];`);
  lines.push(``);
  lines.push(`export const ${ident(base)}_gen: MaterialFactory = {`);
  lines.push(`  name: ${JSON.stringify(base + ".rcsmaterial")},`);
  lines.push(`  minTextures: 1,`);
  lines.push(`  maxTextures: 8,`);
  lines.push(`  make: (textures: THREE.Texture[]) => makeVariant(VARIANTS[VARIANTS.length - 1], new Map(), textures),`);
  lines.push(`  makeById: (channels: Map<number, THREE.Texture>, streams?: Set<number>) =>`);
  lines.push(`    makeVariant(pickVariant(VARIANTS, channels, streams), channels, []),`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`export const ${ident(base)}_VARIANTS = VARIANTS;`);
  return lines.join("\n");
}

// ---- main ----
const args = process.argv.slice(2);
let names: string[] = args.filter((a) => !a.startsWith("--"));
const topIdx = args.indexOf("--top");
if (topIdx >= 0) {
  const n = Number(args[topIdx + 1] ?? 10);
  const rank = JSON.parse(fs.readFileSync("/tmp/material-rank.json", "utf8")) as string[];
  names = rank.slice(0, n);
}
if (!names.length) { console.error("give material names or --top N"); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const done: string[] = [];
for (const name of names) {
  const hits = globSync(`${DATA}/**/${name}.rcsmaterial`);
  if (!hits.length) { console.log(`SKIP ${name}: not found`); continue; }
  try {
    const src = generate(hits[0]);
    if (!src) { console.log(`SKIP ${name}: no drawable permutation`); continue; }
    fs.writeFileSync(path.join(OUT, `${name}.ts`), src + "\n");
    done.push(name);
    console.log(`OK   ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${(e as Error).message.split("\n")[0]}`);
  }
}
const pool = [`/**`, ` * GENERATED by scripts/gen-materials.ts -- the shader programs themselves.`,
  ` *`, ` * Materials share these heavily (one appears in 61 of them), so they live here`,
  ` * once and each material references the ones it uses. Do not edit: regenerate.`,
  ` *`,
  ` * Each entry is the program in PARTS -- its declarations, its body, and the`,
  ` * shape of its entry function -- not a finished shader. materials/rcs/_compose.ts`,
  ` * assembles them, so the main() and any uniform the viewer adds are edits there`,
  ` * rather than a regeneration of every file here.`, ` */`,
  `import type { ShaderParts } from "../_compose";`, ``];
for (const [key, glsl] of shaderPool) {
  // Emitted as PARTS, not as a finished shader. The viewer assembles the
  // program from these (see _compose.ts), so what wraps the engine's code --
  // main(), the uniforms that main() needs, how an attribute is transformed on
  // the way in -- is a viewer-side edit and never requires regenerating.
  const p = splitParts(glsl);
  pool.push(
    `export const S_${key}: ShaderParts = {\n` +
      `  decls: [\n` +
      p.decls.map((d) => `    ${JSON.stringify(d)},\n`).join("") +
      `  ],\n` +
      `  params: ${JSON.stringify(p.params)},\n` +
      `  normal: ${JSON.stringify(p.normal)},\n` +
      `  body: /* glsl */ \`\n${p.body}\`,\n` +
      `};\n`
  );
}
fs.writeFileSync(path.join(OUT, "_shaders.ts"), pool.join("\n"));
console.log(`\nshader pool: ${shaderPool.size} distinct programs`);

/**
 * Rewrite the generated half of materials/rcs/index.ts.
 *
 * The imports and the GENERATED list are derived entirely from what this script
 * just wrote, so keeping them by hand means re-editing 441 lines after every
 * run. Only the two generated regions are touched; everything else in the file
 * -- createMaterial, the cache, the flags -- is left exactly as it is.
 */
function updateIndex(generated: string[]) {
  const indexPath = path.join(OUT, "..", "index.ts");
  let src = fs.readFileSync(indexPath, "utf8");

  const imports = generated.map((n) => `import { ${ident(n)}_gen } from "./generated/${n}";`).join("\n");
  const list = generated.map((n) => `  ${ident(n)}_gen,`).join("\n");

  src = src.replace(/import \{ \w+_gen \} from "\.\/generated\/[^"]+";\n/g, "");
  const anchor = 'import { MaterialFactory } from "./_abstract";';
  src = src.replace(
    anchor,
    `${anchor}\n\n// Generated from the engine's own shaders by scripts/gen-materials.ts.\n${imports}\n`
  );
  src = src.replace(
    /const GENERATED: MaterialFactory\[\] = \[[^\]]*\];/,
    `const GENERATED: MaterialFactory[] = [\n${list}\n];`
  );

  fs.writeFileSync(indexPath, src);
  console.log(`index.ts: ${generated.length} factories registered`);
}

updateIndex(done);
console.log(`\ngenerated ${done.length} factories`);
