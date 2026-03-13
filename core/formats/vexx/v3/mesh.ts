import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { VexxNodeMeshHeader, VexxNodeMeshMaterial } from "../v4/mesh";
import { packMeshData, GU_TYPE_INT8, GU_TYPE_FLOAT32, type MeshData, type RawVertexData } from "../primitive/mesh";
import { Vexx3NodeType } from "./type";
import { AABB } from "../primitive/aabb";
import { GU } from "@core/utils/pspgu";

// Reverse engineering progress: 80%
//
// V3 VEXX mesh format — used in PSP Pure billboard files (Maya export).
// Pre-dates the PSP GU chunk format used by V4/V6.
// Material records are the same 20-byte format as v4.
// All v3 geometry uses triangle strips with degenerate-vertex restarts.

// Flag bit that selects the wide (20-byte) stride format.
const V3_FLAG_WIDE = 0x0800;

const V3_STRIDE_NARROW = 12;
const V3_STRIDE_WIDE   = 20;
const V3_STRIDE_WIDE_C2 = 4;  // section-2 stride in wide-format chunks

// ── Node ────────────────────────────────────────────────────────────────────

// Matches the shape of VexxNodeMesh so that VEXXLoader.loadMesh() can handle v3 nodes.
export class Vexx3NodeMesh extends VexxNode {
  info = new VexxNodeMeshHeader();
  materials: VexxNodeMeshMaterial[] = [];
  chunks: Vexx3NodeMeshChunk[] = [];

  // v3 meshes are never external (reserved1=0xff is a v3 marker, not an external flag)
  readonly isExternal = false;

  constructor() {
    super(Vexx3NodeType.MESH);
  }

  override load(range: BufferRange): void {
    this.info = VexxNodeMeshHeader.load(range);

    /*
    if (this.info.type !== 0x1001 && this.info.type !== 0x3001) {
      this.parseErrors.push(`unexpected meshType=0x${this.info.type.toString(16)}`);
      return;
    }
      */

    const dataRange = range.slice(this.info.size);

    // Material records: 20 bytes each, starting right after the 48-byte header
    let matRange = dataRange.clone();
    for (let i = 0; i < this.info.meshCount; i++) {
      if (matRange.size < 20) {
        this.parseErrors.push(`material[${i}] truncated: need 20 bytes, have ${matRange.size}`);
        break;
      }
      const mat = VexxNodeMeshMaterial.load(matRange);
      this.materials.push(mat);
      matRange = matRange.slice(mat.size);
    }

    // Chunk(s) starting at chunkStart
    const chunkStart = this.info.chunkStart;
    if (chunkStart === 0 || chunkStart >= range.size) {
      this.parseErrors.push(`invalid chunkStart=${chunkStart}`);
      return;
    }

    let chunksRange = range.slice(chunkStart);
    while (chunksRange.size >= 32 && this.chunks.length < 100) {
      const sig = chunksRange.getUint16(0);
      if (sig !== 0x1001 && sig !== 0x3001) break;  // end of chunks

      const chunk = Vexx3NodeMeshChunk.load(chunksRange);

      if (chunk.parseError) {
        this.parseErrors.push(chunk.parseError);
        break;
      }

      if (chunk.header.id >= this.materials.length) {
        if (this.chunks.length === 0) {
          this.parseErrors.push(`chunk id=${chunk.header.id} out of range (${this.materials.length} materials)`);
        }
        break;
      }

      this.chunks.push(chunk);
      chunksRange = chunksRange.slice(chunk.size);

      if (this.chunks.length > 100) {
        this.parseErrors.push(`failsafe: >100 chunks loaded, aborting at @0x${chunksRange.begin.toString(16)}`);
        break; // fail-safe
      }
    }
  }
}

// ── Chunk header (32 bytes) ─────────────────────────────────────────────────
//
//   bytes  0-1   signature      0x1001 or 0x3001
//   byte   2     materialId     index into materials[]
//   byte   3     _unknown1
//   bytes  4-5   strideCount1   number of strides in section 1
//   bytes  6-7   strideCount2   number of strides in section 2
//   byte   8     primitiveType  0x21 = triangle-strip (prim=4, extra flags)
//   byte   9     _unknown2
//   bytes 10-11  flags         ≈ strideCount1 × stride_size (ratio >16 = wide, ≤16 = narrow)
//   bytes 12-15  scaling        f32 — vertex scale factor; decode: raw_i16 × scaling / 32767
//   bytes 16-23  aabb.min       i16×3 + pad(u16)
//   bytes 24-31  aabb.max       i16×3 + pad(u16)

export class Vexx3NodeMeshChunkHeader {
  range = new BufferRange();
  version = 3;

  signature = 0;
  id = 0;
  _unknown1 = 0;
  strideCount1 = 0;
  strideCount2 = 0;
  primitiveType = 4 as GU.PrimitiveType;  // TRIANGLE_STRIP
  _unknown2 = 0;
  flags = 0;
  scaling = 1.0;
  aabb = new AABB();

  static load(range: BufferRange): Vexx3NodeMeshChunkHeader {
    const ret = new Vexx3NodeMeshChunkHeader();
    ret.range        = range.slice(0, 32);

    ret.signature    = ret.range.getUint16(0);
    ret.id           = ret.range.getUint8(2);
    ret._unknown1    = ret.range.getUint8(3);
    ret.strideCount1 = ret.range.getUint16(4);
    ret.strideCount2 = ret.range.getUint16(6);
    ret.primitiveType = ret.range.getUint8(8) as GU.PrimitiveType;
    ret._unknown2    = ret.range.getUint8(9);
    ret.flags       = ret.range.getUint16(10);
    ret.scaling      = ret.range.getFloat32(12);
    ret.aabb         = AABB.loadFromInt16(ret.range.slice(16));
    const s = ret.scaling / 32767.0;
    ret.aabb.min[0] *= s; ret.aabb.min[1] *= s; ret.aabb.min[2] *= s;
    ret.aabb.max[0] *= s; ret.aabb.max[1] *= s; ret.aabb.max[2] *= s;
    return ret;
  }

  get size(): number { return this.range.size; }

  // primitiveType 0x23 = wide (20-byte stride), 0x21 = narrow (12-byte stride)
  get isWide(): boolean { return (this.primitiveType as number) === 0x23; }
}

// ── Mesh chunk ──────────────────────────────────────────────────────────────
//
// 32-byte chunk header includes a per-chunk i16 AABB (bytes 16-31).
// Two stride formats selected by flags/strideCount1 ratio (~12=narrow, ~20=wide):
//
// Narrow format (12 bytes, when flags & 0x0800 == 0):
//   Each stride: [uv u8×2][normal i8×3][pad 1][vertex i16×3]
//   Strip restarts: 0x7fff/0x8000 sentinel in vertex coordinates.
//
// Wide format (20 bytes, when flags & 0x0800 != 0):
//   Each stride: [uv.u f32][uv.v f32][normal i8×3][pad 1][vertex i16×3][unk i16]
//   c2 may contain the tail of the last stride (vertex may be truncated).

export class Vexx3NodeMeshChunk {
  range = new BufferRange();
  header = new Vexx3NodeMeshChunkHeader();
  strides: StrideView = new StrideView(new BufferRange(), 0, 1.0, V3_STRIDE_NARROW, 6, false);
  strides2: StrideView = new StrideView(new BufferRange(), 0, 1.0, V3_STRIDE_NARROW, 6, false);
  aabb = new AABB();
  parseError: string | null = null;

  get size(): number { return this.range.size; }

  toMeshData(): MeshData {
    const s2 = this.strides2.toRawVertexData();
    // V3 primitiveType byte (0x21, 0x23) does not map to GU primitive types.
    // All v3 geometry uses triangle strips with degenerate-vertex restarts.
    return packMeshData(
      this.strides.toRawVertexData(),
      s2.validCount > 0 ? s2 : null,
      true,
    );
  }

  static load(range: BufferRange): Vexx3NodeMeshChunk {
    const ret = new Vexx3NodeMeshChunk();
    ret.header = Vexx3NodeMeshChunkHeader.load(range);

    const hdr = ret.header;
    const wide    = hdr.isWide;
    const stride1 = wide ? V3_STRIDE_WIDE    : V3_STRIDE_NARROW;
    const stride2 = V3_STRIDE_WIDE_C2;  // always 4 bytes
    const voff    = wide ? 12 : 6;  // vertex i16×3 offset within each stride

    // flags encodes the total data size after the 32-byte header (including any alignment padding)
    const totalBytes = hdr.size + hdr.flags;

    if (totalBytes > range.size) {
      ret.parseError =
        `stride data overflow: need ${totalBytes} bytes, have ${range.size}` +
        ` (c1=${hdr.strideCount1} c2=${hdr.strideCount2})`;
      ret.range = range.slice(0, Math.min(totalBytes, range.size));
      return ret;
    }

    ret.range = range.slice(0, totalBytes);

    ret.aabb = hdr.aabb;

    // Stride data starts after the 32-byte header; flags includes padding,
    // but actual vertex data is c1*stride + c2*4 - 16 (c1/c2 counts include the 16-byte AABB now in header).
    const strideRange = ret.range.slice(hdr.size);
    const contiguousBytes = hdr.strideCount1 * stride1 + hdr.strideCount2 * stride2 - 16;
    const fullStrides = Math.floor(contiguousBytes / stride1);
    const remainder = contiguousBytes - fullStrides * stride1;
    const vertexCount = fullStrides + (wide && remainder >= voff + 6 ? 1 : 0);
    ret.strides  = new StrideView(strideRange, vertexCount, hdr.scaling, stride1, voff, wide);
    ret.strides2 = new StrideView(new BufferRange(), 0, hdr.scaling, stride2, stride2, wide);

    return ret;
  }
}

// ── Stride view ─────────────────────────────────────────────────────────────

class StrideView {
  range = new BufferRange();
  readonly length: number;
  private scaling: number;
  private stride: number;
  private voff: number;  // byte offset of the i16×3 vertex within a stride; ≥stride means no vertex
  private wide: boolean;

  constructor(range: BufferRange, length: number, scaling: number, stride: number, voff: number, wide: boolean) {
    this.range = range;
    this.length = length;
    this.scaling = scaling;
    this.stride = stride;
    this.voff = voff;
    this.wide = wide;
  }

  toRawVertexData(): RawVertexData {
    const { range, stride, voff, scaling, length: n } = this;

    const positions = new Float32Array(n * 3);
    const valid     = new Uint8Array(n);
    let validCount  = 0;

    // If voff is at or beyond stride size, this section carries no vertex data (wide c2).
    const hasVertex = voff < stride;
    if (hasVertex) {
      const scale = scaling / 32767.0;
      for (let i = 0; i < n; i++) {
        const base = i * stride;
        // Narrow format: 0x7fff/0x8000 sentinel in vertex coordinates marks restarts.
        let skip = false;
        if (!this.wide) {
          const rx = range.getInt16(base + voff);
          const ry = range.getInt16(base + voff + 2);
          const rz = range.getInt16(base + voff + 4);
          skip = rx === 32767 || rx === -32768 || ry === 32767 || ry === -32768 || rz === 32767 || rz === -32768;
        }
        if (skip) continue;
        const vbase = base + voff;
        const rx = range.getInt16(vbase);
        const ry = range.getInt16(vbase + 2);
        const rz = range.getInt16(vbase + 4);
        const p = i * 3;
        positions[p] = rx * scale; positions[p + 1] = ry * scale; positions[p + 2] = rz * scale;
        valid[i] = 1; validCount++;
      }
    }

    // Normals: wide at bytes 8–10, narrow at bytes 2–4.
    const hasNormals = hasVertex;
    const noff = this.wide ? 8 : 2;
    const normals = hasNormals ? range.getStridedInt8Array(noff, stride, 3, n) : null;
    const normalMeta = hasNormals ? { type: GU_TYPE_INT8 as typeof GU_TYPE_INT8, itemSize: 3, normalized: true } : null;

    // UVs: wide uses f32×2 at bytes 0–7, narrow uses u8×2 at bytes 0–1.
    let uvs:    RawVertexData['uvs']    = null;
    let uvMeta: RawVertexData['uvMeta'] = null;
    if (hasVertex && this.wide) {
      const f32uvs = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const base = i * stride;
        f32uvs[i * 2]     = range.getFloat32(base + 0);   // U
        f32uvs[i * 2 + 1] = range.getFloat32(base + 4);   // V
      }
      uvs    = f32uvs;
      uvMeta = { type: GU_TYPE_FLOAT32, itemSize: 2, normalized: false };
    } else if (hasVertex && !this.wide) {
      const f32uvs = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const base = i * stride;
        f32uvs[i * 2]     = range.getUint8(base + 0) / 128;  // U
        f32uvs[i * 2 + 1] = range.getUint8(base + 1) / 128;  // V
      }
      uvs    = f32uvs;
      uvMeta = { type: GU_TYPE_FLOAT32, itemSize: 2, normalized: false };
    }

    return { positions, normals, normalMeta, uvs, uvMeta, valid, validCount };
  }
}
