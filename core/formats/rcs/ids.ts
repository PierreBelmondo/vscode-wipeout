import { crc32 } from "@core/utils/crc32";

/**
 * Raw ids for the things a .rcsmodel names by hash: vertex streams, texture
 * channels, shader uniforms.
 *
 * The file identifies every one of these by a 32-bit hash of its authored name.
 * The parser used to translate those into strings immediately and key everything
 * downstream off the string — which meant an id absent from the lookup table
 * became `"_unknown"` and then, in effect, invisible: `attributes["_unknown"]`
 * collides for every unnamed stream, and code that tests `name == "tangent"`
 * silently stops working the moment a variant spells it differently. Several
 * rendering bugs traced back to exactly that (1360 crowd meshes lost their UVs
 * because 0xb67dc4be had no name; 192 more lost theirs to names the loader's
 * alias list did not happen to list).
 *
 * So the id is the identity. Names are debug metadata, recovered when we happen
 * to know them and never load-bearing. That also means we do not have to solve
 * the hash to use a channel — an id we cannot name is still an id we can bind,
 * compare and route.
 *
 * The constants below are the ids actually present in the shipped tracks, with
 * their observed usage counts. Anything not listed is still perfectly usable as
 * a number; these are conveniences, not a whitelist.
 */

/** Vertex stream ids. Counts are meshes across the 16 shipped tracks. */
export const Stride = {
  position: 0xb9d31b0a, //   x19009
  normal: 0xde7a971b, //     x19009
  Uv1: 0x427214fc, //        x13210
  Lightmap_uv: 0x26a7b665, // x6633
  uv1: 0x7a3f521c, //         x2628
  tangent: 0xdbe5f417, //     x2613
  crowdUV: 0xb67dc4be, //     x1360
  Uv2: 0xdb7b4546, //         x1099
  VertexColour1: 0x7493d450, // x648
  map1: 0x2003d7e6, //         x213
  Uvset1: 0x49f76806, //       x213
  diffuseUVs: 0x6ca4e3cc, //   x135
  smokeUVs: 0x0641512d, //      x76
  cellUV: 0xe476fcba, //        x75
  map2: 0xb90a865c, //          x48
  Smoke: 0x77783981, //         x43
  Diffuse_uv: 0xe0ade624, //    x39
  Uv3: 0xac7c75d0, //           x33
  diffuseUV: 0xa2762127, //     x30
} as const;

/**
 * Vertex stream *semantics*, derived from the id — not from its name.
 *
 * Everything that is not position, normal, tangent or a colour is a texture
 * coordinate set, so classification is by exclusion and does not depend on
 * having recovered a name for the id.
 */
export const enum StreamKind {
  Position,
  Normal,
  Tangent,
  Colour,
  TexCoord,
  Unknown,
}

const NON_UV = new Map<number, StreamKind>([
  [Stride.position, StreamKind.Position],
  [Stride.normal, StreamKind.Normal],
  [Stride.tangent, StreamKind.Tangent],
  [Stride.VertexColour1, StreamKind.Colour],
  [0x2206cab2, StreamKind.Colour], // VertexColour
  [0xed9a85ea, StreamKind.Colour], // VertexColour2
]);

/**
 * What a vertex stream is for.
 *
 * `type` is the stride's element encoding, which distinguishes a coordinate
 * pair (35/34) from a packed 4-byte colour (68/67/66). An id we have never seen
 * before still classifies correctly from that alone.
 */
export function streamKind(id: number, type: number): StreamKind {
  const known = NON_UV.get(id);
  if (known !== undefined) return known;
  if (type === 35 || type === 34) return StreamKind.TexCoord;
  return StreamKind.Unknown;
}

/**
 * The engine's own name hash.
 *
 * Every id in these formats is CRC32 of the authored name with the RCS
 * parameters -- polynomial 0x04c11db7, init 0xffffffff, no final XOR. Verified
 * against the `rcshash` tool for both material paths and sampler names
 * (jd_simplespecular.rcsmaterial -> 0x5e3edd36, Texture1 -> 0x3bdc0403).
 *
 * Note these are NOT the defaults of `crc32()`, which uses init 0 and a final
 * XOR -- calling it without these arguments silently produces ids that match
 * nothing.
 */
export function rcsHash(name: string): number {
  return crc32(name, 0x04c11db7, 0xffffffff, 0);
}
