import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { AABB } from "../primitive/aabb";
import { GU } from "@core/utils/pspgu";
import { packMeshData, GU_TYPE_INT8, GU_TYPE_INT16, GU_TYPE_FLOAT32, type MeshData, type GUComponentMeta, type RawVertexData } from "../primitive/mesh";
export type { MeshData, GUComponentMeta };  // re-exported for VEXXLoader

// Reverse engineering progress: 60%
// Header: type/meshCount/reserved/AABB known; length1/length2 purpose partially understood;
// bytes[12-13] (unknown u16) and chunk info block's 2nd float not identified.
// Link chunks: all four fields (unknown3, maybe_uv, maybe_quat1/2) uncertain.
// Chunk info block: scaling confirmed; second float, padding, and 4-float tail partially understood.
// Material record: renderFlags/textureId well-known; renderFlags2/blendMode partially known.
export class VexxNodeMesh extends VexxNode {
  info = new VexxNodeMeshHeader();
  materials: VexxNodeMeshMaterial[] = [];
  chunks: VexxNodeMeshChunk[] = [];

  externalId: number = 0;
  chunkLinks: VexxNodeMeshLinkChunk[] = [];

  constructor(type = Vexx4NodeType.MESH) {
    super(type);
  }

  override load(range: BufferRange): void {
    this.info = VexxNodeMeshHeader.load(range);
    const dataRange = range.slice(this.info.size);

    // External nodes have no inline geometry: their chunk area is a stub whose vtxdef
    // field is 0.  Inline nodes always have vtxdef != 0.
    const chunkStart = this.info.chunkStart;
    const isExternalNode = chunkStart === 0 || range.slice(chunkStart).getUint16(10) === 0;

    if (isExternalNode) {
      this.externalId = dataRange.getUint32(0);

      let chunkLinksRange = dataRange.slice(48);
      while (chunkLinksRange.size > 64) {
        const chunkLink = VexxNodeMeshLinkChunk.load(chunkLinksRange);
        this.chunkLinks.push(chunkLink);
        chunkLinksRange = chunkLinksRange.slice(chunkLink.size);
      }
    } else {
      let materialsRange = dataRange.clone();
      for (let i = 0; i < this.info.meshCount; i++) {
        const material = VexxNodeMeshMaterial.load(materialsRange);
        this.materials.push(material);
        materialsRange = materialsRange.slice(material.size);
      }

      // chunkStart is guaranteed non-zero (checked in isExternalNode above)
      let chunksRange = range.slice(chunkStart);
      while (chunksRange.size > 64) {
        // vtxdef=0 means end-of-data (padding or external link stub) — stop silently.
        if (chunksRange.getUint16(10) === 0) break;

        const chunk = VexxNodeMeshChunk.load(chunksRange, this.typeInfo.version);

        if (chunk.parseError) {
          this.parseErrors.push(chunk.parseError);
          break;
        }

        if (chunk.header.id >= this.materials.length) {
          // If no valid chunks have been loaded yet this is a real error (iterator is misaligned).
          // Otherwise we've run past the end of geometry into trailing non-chunk data; stop silently.
          if (this.chunks.length === 0) {
            this.parseErrors.push(`chunk id=${chunk.header.id} out of range (${this.materials.length} materials) @0x${chunksRange.begin.toString(16)}`);
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

  get isExternal(): boolean {
    return this.externalId > 0;
  }
}

export class VexxNodeMeshHeader {
  range = new BufferRange();
  type = 0;
  meshCount = 0;
  length1 = 0;
  length2 = 0;
  unknown = 0;
  reserved1 = 0;
  reserved2 = 0;
  aabb = new AABB();

  static load(range: BufferRange): VexxNodeMeshHeader {
    const ret = new VexxNodeMeshHeader();
    ret.range = range.slice(0, 16 + 32);
    ret.type = ret.range.getUint16(0);
    ret.meshCount = ret.range.getUint16(2);
    ret.length1 = ret.range.getUint32(4);
    ret.length2 = ret.range.getUint32(8);
    ret.unknown = ret.range.getUint16(12);
    ret.reserved1 = ret.range.getUint8(14);
    ret.reserved2 = ret.range.getUint8(15);
    const aabbRange = ret.range.slice(16, 16 + 32);
    ret.aabb = AABB.loadFromFloat32(aabbRange);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }

  get chunkStart(): number {
    if (this.length2) return this.length2;
    return this.length1;
  }
}

class VexxNodeMeshLinkChunk {
  range = new BufferRange();
  unknown3 = 0.0;
  maybe_uv = { x: 0, y: 0 };
  maybe_quat1 = { x: 0, y: 0, z: 0, w: 0 };
  maybe_quat2 = { x: 0, y: 0, z: 0, w: 0 };

  static load(range: BufferRange): VexxNodeMeshLinkChunk {
    const ret = new VexxNodeMeshLinkChunk();
    ret.range = range.slice(0, 64);
    ret.unknown3 = range.getFloat32(12);
    ret.maybe_uv = {
      x: ret.range.getFloat32(16),
      y: ret.range.getFloat32(20),
    };
    ret.maybe_quat1 = {
      x : ret.range.getInt16(24), 
      y : ret.range.getInt16(26), 
      z : ret.range.getInt16(28), 
      w : ret.range.getInt16(30), 
    }
    ret.maybe_quat2 = {
      x: ret.range.getInt16(48),
      y: ret.range.getInt16(52),
      z: ret.range.getInt16(56),
      w: ret.range.getInt16(60),
    };
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

// VexxNodeMeshMaterial — 20 bytes
//
// Reverse-engineered from 5 426 materials across 3 581 PSP Pure/Pulse + PS2 files.
// Bit meanings confirmed by correlating renderFlags values with texture filenames —
// artists encoded the intended render mode in the filename suffix (e.g. "_ADD.tga",
// "_GLOW.tga", "_KEY.tga", "_shinemap.tga", "_BLEND.tga").
//
// bytes  0-1  renderFlags   uint16  bitmask — confirmed bit meanings:
//
//   bit  0 (0x0001) — standard base flag; set on almost all opaque materials
//   bit  1 (0x0002) — blending active; always set together with bit 8 or bit 9
//   bit  2 (0x0004) — purpose unclear; present on skybox and some GLOW+BLEND materials
//   bit  3 (0x0008) — purpose unclear; present on skybox, "dark" unlit track, fade-in mats
//   bit  4 (0x0010) — animated / dynamic; set on scrolling UV (sea), flickering glow,
//                     and particle boost effects
//   bit  7 (0x0080) — GLOW / emissive  (confirmed: all *_GLOW.tga use this bit)
//   bit  8 (0x0100) — alpha blend  src=SRC_ALPHA  dst=1-SRC_ALPHA
//                     (confirmed: *_BLEND.tga and HUD overlay materials)
//   bit  9 (0x0200) — additive blend  src=1  dst=1
//                     (confirmed: all *_ADD.tga — weapons, shields, boost)
//   bit 11 (0x0800) — alpha test / keyed transparency
//                     (confirmed: all *_KEY.tga — ship wrecks, railings, fences)
//   bit 13 (0x2000) — specular / shinemap pass
//                     (confirmed: all *_shinemap.tga — shiny metal, trophies, weapons)
//
//   Common flag combinations with confirmed meanings:
//     0x0001  opaque textured                    (27%)
//     0x000d  skybox face         bits 0+2+3     (23%)
//     0x0801  alpha test          bits 0+11      (14%)
//     0x0212  additive blend      bits 1+4+9     ( 9%)
//     0x2001  shinemap pass       bits 0+13      ( 6%)
//     0x0081  static glow         bits 0+7       ( 4%)
//     0x0091  animated glow       bits 0+4+7     ( 3%)
//     0x0202  additive blend      bits 1+9       ( 1%)
//     0x0292  additive + glow     bits 1+4+7+9   ( 2%)
//     0x0186  alpha blend + glow  bits 1+2+7+8   ( 0.4%)
//
// bytes  2-3  renderFlags2  uint16  secondary flags; 94.8% = 0x0000, 4.9% = 0x0002.
//                           Observed only on shinemap materials (renderFlags bit 13).
//                           Possible meaning: second UV set, or shinemap blend weight.
//
// bytes  4-7  textureId     uint32  index into the VEXX texture table (bytes 6-7 always 0).
//
// bytes  8-9  blendMode     uint16  blend/effect selector; 92.6% = 0.
//                           14 distinct non-zero values; purpose not yet confirmed.
//
// bytes 10-19 (padding)     Always 0x00 across all known files.
export class VexxNodeMeshMaterial {
  range = new BufferRange();
  renderFlags = 0;   // bytes 0-1
  renderFlags2 = 0;  // bytes 2-3
  textureId = 0;     // bytes 4-7
  blendMode = 0;     // bytes 8-9

  static load(range: BufferRange): VexxNodeMeshMaterial {
    const ret = new VexxNodeMeshMaterial();
    ret.range = range.slice(0, 20);
    ret.renderFlags  = ret.range.getUint16(0);
    ret.renderFlags2 = ret.range.getUint16(2);
    ret.textureId    = ret.range.getUint32(4);
    ret.blendMode    = ret.range.getUint16(8);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

class StrideView {
  private range: BufferRange;
  private strideSize: number;
  private info: ReturnType<typeof GU.strideInfo>;
  private scaling: number;
  readonly length: number;

  constructor(range: BufferRange, strideSize: number, info: ReturnType<typeof GU.strideInfo>, scaling: number, length: number) {
    this.range = range;
    this.strideSize = strideSize;
    this.info = info;
    this.scaling = scaling;
    this.length = length;
  }

  toRawVertexData(): RawVertexData {
    const { range, strideSize, info, scaling, length: n } = this;

    // ── Positions (always decoded to float32) ──────────────────────────────
    const positions = new Float32Array(n * 3);
    const valid     = new Uint8Array(n);
    let validCount  = 0;

    const vs = info.vertex.size;
    const vo = info.vertex.offset;
    if (vs === 2) {
      // i16: decode and check for strip-restart sentinels (±32767).
      const scale = scaling / 32767.0;
      for (let i = 0; i < n; i++) {
        const base = i * strideSize + vo;
        const rx = range.getInt16(base);
        const ry = range.getInt16(base + 2);
        const rz = range.getInt16(base + 4);
        if (rx === 32767 || rx === -32768 || ry === 32767 || ry === -32768 || rz === 32767 || rz === -32768) continue;
        const p = i * 3;
        positions[p] = rx * scale; positions[p + 1] = ry * scale; positions[p + 2] = rz * scale;
        valid[i] = 1; validCount++;
      }
    } else if (vs === 1) {
      // i8: shift to unsigned [0,255].
      for (let i = 0; i < n; i++) {
        const base = i * strideSize + vo;
        const p = i * 3;
        positions[p] = range.getInt8(base) + 128;
        positions[p + 1] = range.getInt8(base + 1) + 128;
        positions[p + 2] = range.getInt8(base + 2) + 128;
        valid[i] = 1; validCount++;
      }
    } else if (vs === 3) {
      for (let i = 0; i < n; i++) {
        const base = i * strideSize + vo;
        const p = i * 3;
        positions[p] = range.getFloat32(base); positions[p + 1] = range.getFloat32(base + 4); positions[p + 2] = range.getFloat32(base + 8);
        valid[i] = 1; validCount++;
      }
    }

    // ── Normals ────────────────────────────────────────────────────────────
    let normals:    RawVertexData['normals']    = null;
    let normalMeta: RawVertexData['normalMeta'] = null;
    const ns = info.normal.size;
    if (ns > 0) {
      const no = info.normal.offset;
      normalMeta = {
        type:       ns === 1 ? GU_TYPE_INT8 : ns === 2 ? GU_TYPE_INT16 : GU_TYPE_FLOAT32,
        itemSize:   3,
        normalized: ns < 3,
      };
      if (ns === 1) {
        normals = range.getStridedInt8Array(no, strideSize, 3, n);
      } else if (ns === 2) {
        normals = range.getStridedInt16Array(no, strideSize, 3, n);
      } else {
        normals = range.getStridedFloat32Array(no, strideSize, 3, n);
      }
    }

    // ── UVs ────────────────────────────────────────────────────────────────
    let uvs:    RawVertexData['uvs']    = null;
    let uvMeta: RawVertexData['uvMeta'] = null;
    const ts = info.texture.size;
    if (ts > 0) {
      const to = info.texture.offset;
      uvMeta = {
        type:       ts === 1 ? GU_TYPE_INT8 : ts === 2 ? GU_TYPE_INT16 : GU_TYPE_FLOAT32,
        itemSize:   2,
        normalized: ts < 3,
      };
      if (ts === 1) {
        uvs = range.getStridedInt8Array(to, strideSize, 2, n);
      } else if (ts === 2) {
        uvs = range.getStridedInt16Array(to, strideSize, 2, n);
      } else {
        uvs = range.getStridedFloat32Array(to, strideSize, 2, n);
      }
    }

    return { positions, normals, normalMeta, uvs, uvMeta, valid, validCount };
  }
}

class VexxNodeMeshChunkHeader {
  range = new BufferRange();
  version = 4;

  signature = 0;
  id = 0;
  _unknown1 = 0;
  strideCount1 = 0;
  strideCount2 = 0;
  primitiveType = 0 as GU.PrimitiveType;
  _unknown2 = 0;
  vtxdef = 0;
  size1 = 0;
  size2 = 0;

  static load(range: BufferRange, version: number) {
    const ret = new VexxNodeMeshChunkHeader();
    ret.range = range.slice(0, 16);
    ret.version = version;

    ret.signature = range.getUint16(0);
    ret.id = range.getUint8(2);
    ret._unknown1 = range.getUint8(3);
    ret.strideCount1 = range.getUint16(4);
    ret.strideCount2 = range.getUint16(6);
    ret.primitiveType = range.getUint8(8) as GU.PrimitiveType;
    ret._unknown2 = range.getUint8(9);
    ret.vtxdef = range.getUint16(10);
    ret.size1 = range.getUint16(12);
    ret.size2 = range.getUint16(14);
    return ret;
  }

  get size() {
    return this.range.size;
  }

  // PSP GU v4 (Pure) uses 4-byte aligned vertex strides.
  // v6 (Pulse) uses byte-packed (unaligned) strides — set by the chunk loader based on version.
  strideAlign: number = 4;

  get strideInfo() {
    return GU.strideInfo(this.vtxdef);
  }

  get strideSize() {
    return GU.strideSize(this.vtxdef, this.strideAlign);
  }
}

class VexxNodeMeshChunk {
  header = new VexxNodeMeshChunkHeader();
  range = new BufferRange();
  scaling = 1.0;
  unknown = 1.0;
  floats: number[] = [];
  aabb = new AABB();
  strides: StrideView = new StrideView(new BufferRange(), 0, GU.strideInfo(0), 1.0, 0);
  strides2: StrideView = new StrideView(new BufferRange(), 0, GU.strideInfo(0), 1.0, 0);
  parseError: string | null = null;

  get size() {
    return this.range.size;
  }

  toMeshData(): MeshData {
    return packMeshData(
      this.strides.toRawVertexData(),
      null,
      this.header.primitiveType === GU.PrimitiveType.TRIANGLE_STRIP,
    );
  }

  static load(range: BufferRange, version: number): VexxNodeMeshChunk {
    const ret = new VexxNodeMeshChunk();

    ret.header = VexxNodeMeshChunkHeader.load(range, version);


    if (ret.header.vtxdef == 0) {
      ret.parseError = `vtxdef = 0 @0x${range.begin.toString(16)}`;
      return ret;
    }

    const computeSize = (ss: number) => {
      // Expected layout: header (16) + info block (48) + section1 (16-byte aligned) + section2 (16-byte aligned).
      // Section 2 must begin on a 16-byte boundary relative to the chunk start (PSP GU DMA alignment).
      let s = ret.header.size + 16 * 3;
      s += ret.header.strideCount1 * ss;
      s += s % 16 === 0 ? 0 : 16 - (s % 16);  // align section-2 start to 16 bytes
      s += ret.header.strideCount2 * ss;
      s += s % 16 === 0 ? 0 : 16 - (s % 16);  // final alignment
      return s;
    };

    // When size1 == 0 but strides are declared, the chunk omits the explicit data-size field
    // (seen in explosion_hemisphere2.vex: primitiveType = 0x3f, a non-standard value).
    // Fall back to computeSize so the iterator advances correctly past the stride data.
    const declaredEnd =
      ret.header.size1 === 0 && (ret.header.strideCount1 > 0 || ret.header.strideCount2 > 0)
        ? computeSize(ret.header.strideSize)
        : ret.header.size + 16 * 3 + ret.header.size1;
    ret.range = range.slice(0, declaredEnd);

    // v6 (Pulse) mostly uses byte-packed strides (align=1), but some vtxdefs
    // still need 4-byte alignment.  Pick the alignment whose computeSize matches
    // the declared chunk range exactly; fall back to align=1 if neither matches.
    if (version >= 6) {
      // v6 (Pulse) aligns strides to the maximum component size in the vertex format,
      // rather than always using 4-byte alignment like v4 (Pure).
      const si = ret.header.strideInfo;
      const maxComp = Math.max(si.texture.size, si.color.size, si.normal.size, si.vertex.size);
      ret.header.strideAlign = maxComp > 1 ? maxComp : 1;
    }

    let size = computeSize(ret.header.strideSize);

    if (size > ret.range.size) {
      ret.parseError =
        `size mismatch @0x${ret.range.begin.toString(16)}` +
        ` computed=${size} declared=${ret.range.size}` +
        ` (vtxdef=0x${ret.header.vtxdef.toString(16)}` +
        ` ss=${ret.header.strideSize} c1=${ret.header.strideCount1} c2=${ret.header.strideCount2}` +
        ` size1=${ret.header.size1} size2=${ret.header.size2})`;
      return ret;
    }
    // If size < ret.range.size the stride data fits within the declared chunk; proceed.
    // PS2 chunks carry extra trailing data (shadow/DMA buffer) beyond the stride section —
    // ret.range keeps size1 for correct iterator advance while loadData() only reads c1*ss bytes.
    ret.loadData();

    return ret;
  }

  loadData() {
    const strideInfo = this.header.strideInfo;

    // Load infos
    const infoRange = this.range.slice(this.header.size);
    if (strideInfo.vertex.size == 2) {
      this.scaling = infoRange.getFloat32(0);
      this.unknown = infoRange.getFloat32(4);
      this.aabb = AABB.loadFromInt16(infoRange.slice(8, 24));
      const s = this.scaling / 32767.0;
      this.aabb.min[0] *= s; this.aabb.min[1] *= s; this.aabb.min[2] *= s;
      this.aabb.max[0] *= s; this.aabb.max[1] *= s; this.aabb.max[2] *= s;
      for (let i = 0; i < 8; i++) this.floats.push(infoRange.getUint8(24 + i)); // padding ?
      for (let i = 0; i < 4; i++) this.floats.push(infoRange.getFloat32(32 + i * 4));
    } else {
      for (let i = 0; i < 16 * 3; i++) this.floats.push(infoRange.getUint8(i));
    }

    // Build lazy StrideViews — no decoding happens here.
    const strideSize = this.header.strideSize;

    const stridesRange = infoRange.slice(16 * 3);
    this.strides = new StrideView(stridesRange, strideSize, strideInfo, this.scaling, this.header.strideCount1);

    // Section 2 starts at the next 16-byte boundary after section 1.
    const sec1End = this.header.size + 16 * 3 + this.header.strideCount1 * strideSize;
    const pad = sec1End % 16 === 0 ? 0 : 16 - (sec1End % 16);
    const stridesRange2 = stridesRange.slice(this.header.strideCount1 * strideSize + pad);
    this.strides2 = new StrideView(stridesRange2, strideSize, strideInfo, this.scaling, this.header.strideCount2);
  }
}
