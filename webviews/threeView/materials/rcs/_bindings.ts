import * as THREE from "three";

/**
 * The permutation binding tables, as exported by `rcsdump material --json`.
 *
 * A generated shader names its inputs after RSX registers -- `attribute vec4 v2`,
 * `uniform sampler2D TEX1` -- which on their own say nothing about which vertex
 * stream or texture belongs there. The SHO attribute table closes that gap by
 * binding each register to a 32-bit id, and that id is the same one
 * core/formats/rcs/ids.ts uses, so no name matching is involved.
 *
 * The register assignment is a property of the PERMUTATION, not the material:
 * Uv1 lands on v2 in 26315 permutations, v3 in 12081 and v4 in 3064. So this
 * has to be read per permutation rather than baked in.
 */

export type AttrBinding = { id: number; reg: number; name: string };
export type SamplerBinding = { id: number; unit: number; name: string };
export type UniformBinding = { id: number; slot: number; rows: number; name: string };

export type ShoBindings = {
  kind: "vp" | "fp";
  attributes: AttrBinding[];
  samplers: SamplerBinding[];
  uniforms: UniformBinding[];
};

export type PermutationBindings = {
  index: number;
  backend: string;
  name: string;
  backendId: number;
  nameId: number;
  vp: ShoBindings | null;
  fp: ShoBindings | null;
};

/**
 * Point the geometry's streams at the registers this permutation expects.
 *
 * The generated vertex shader reads `v0`..`v8`, so each bound stream is aliased
 * onto that name. Three needs the attribute to exist under the shader's own
 * name; aliasing rather than copying keeps one buffer per stream.
 *
 * A stream the mesh does not carry is left unbound: the shader still declares
 * the attribute, and WebGL supplies (0,0,0,1) for it. That is preferable to
 * refusing to draw, and matches what the engine does for an absent stream.
 */
/**
 * Which of `candidates` the vertex program reads off register `reg`.
 *
 * Every read of an attribute in a generated shader is written `vN` followed by
 * a swizzle -- `v8.zwzz`, `v0.xyzx` -- or bare, which is all four components.
 */
/** Cases already reported, so a shared material warns once, not per mesh. */
const warnedUnderSupply = new Set<string>();

function readsComponents(glsl: string, reg: number, candidates: string): string {
  // Skip the seeding lines. The composed program declares `attribute vec4
  // a_vN;` and opens with `vec4 vN = a_vN;` -- and that seed's bare `vN` is a
  // WRITE, which would otherwise count as a read of all four components and
  // make EVERY attribute look like it reads .w. (The declarations themselves
  // are harmless now: `a_v0` has no word boundary before the `v0`, so the
  // register regex below never matches them.)
  const body = glsl.replace(/^\s*vec4 v\d+ = a_v\d+;\s*$/gm, "");
  const re = new RegExp(`\\bv${reg}\\b(\\.([xyzw]+))?`, "g");
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    // No swizzle reads the whole vec4.
    for (const c of m[2] ?? "xyzw") seen.add(c);
  }
  return [...candidates].filter((c) => seen.has(c)).join("");
}

export function bindAttributes(
  geometry: THREE.BufferGeometry,
  bindings: AttrBinding[],
  streams: Map<number, THREE.BufferAttribute>,
  vertexShader?: string
): { bound: number; missing: AttrBinding[] } {
  let bound = 0;
  const missing: AttrBinding[] = [];
  for (const b of bindings) {
    const attr = streams.get(b.id);
    if (!attr) {
      missing.push(b);
      continue;
    }
    // `a_` prefix, matching the shader's declaration EXACTLY. The composed
    // program declares `attribute vec4 a_vN;` and opens with `vec4 vN = a_vN;`
    // -- the rcsdump restructure renamed the attributes so the registers could
    // become plain local variables. Three binds buffers to attributes by name
    // and nothing else, so registering this as `vN` (as it was before the
    // rename) leaves every shader attribute unbound: WebGL feeds the constant
    // (0,0,0,1) instead, every vertex lands on the same point, and every
    // generated mesh silently rasterises to nothing -- no compile error, no
    // link error, no warning.
    geometry.setAttribute(`a_v${b.reg}`, attr);
    bound++;
    // A stream that supplies fewer components than the shader READS.
    //
    // WebGL fills what a stream does not supply from (0,0,0,1), which is
    // harmless for the usual cases -- a 3-component position wants w=1, and a
    // 2-component uv whose .zw is never read costs nothing. It is only a fault
    // when the vertex program actually reads a missing component: a register
    // packing two uv pairs into one vec4 (2rocksandblend's v8 does this, xy for
    // the rock/sand uv and zw for the blend mask) would sample the whole
    // surface at the single texel (0,1) and paint it one flat colour.
    //
    // So this needs the shader source, not just the item size. Warning on size
    // alone fired on every position, normal and uv in the scene and buried the
    // real cases.
    if (attr.itemSize < 4 && vertexShader) {
      const missing = "xyzw".slice(attr.itemSize);
      const read = readsComponents(vertexShader, b.reg, missing);
      if (read) {
        // Once per distinct case, not once per mesh: a material is shared by
        // hundreds of meshes and the raw form buried everything else.
        const key = `${b.id}|${b.reg}|${read}`;
        if (!warnedUnderSupply.has(key)) {
          warnedUnderSupply.add(key);
          console.warn(
            `[attr] v${b.reg} (${b.name}#${b.id} ${attr.name}) supplies ${attr.itemSize} components` +
              ` but the vertex program reads .${read} -- those come from the (0,0,0,1) default`
          );
        }
      }
    }
  }
  return { bound, missing };
}

/**
 * Build the sampler uniforms, keyed by the texture unit the shader declares.
 *
 * `textures` is keyed by channel id -- the material's own identity for the
 * slot -- so which unit it lands on is the permutation's choice, not ours.
 */
export function bindSamplers(
  bindings: SamplerBinding[],
  textures: Map<number, THREE.Texture>,
  fallback: THREE.Texture
): Record<string, THREE.IUniform> {
  const uniforms: Record<string, THREE.IUniform> = {};
  for (const b of bindings) {
    uniforms[`TEX${b.unit}`] = { value: textures.get(b.id) ?? fallback };
  }
  return uniforms;
}
