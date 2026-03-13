/**
 * PS5 / PSVita rcsmodel parser — magic 0xCA5CADED ("CASCADED")
 *
 * Little-endian. Two sections:
 *   Section 1 (scene graph nodes, materials, transform matrices)
 *   Section 2 (raw geometry: index + vertex buffers)
 *
 * File layout (russian-doll structure):
 *   [RcsModelPS5Header]                    0x00–0x1f
 *     [RcsModelPS5SectionDef[]]            0x20–0x5f  (section_count × 0x20)
 *     [RcsModelPS5RelocTable]              0x60–data_offset
 *   [RcsModelPS5Data]                      data_offset–EOF
 *     [RcsModelPS5DataHeader]              +0x00–0x4f
 *     [RcsModelPS5SceneGraphSection]       section 1 (hash 0xe35e00df)
 *       materials[], geoMetas[]
 *     [RcsModelPS5GeometrySection]         section 2 (hash 0xe9f17935)
 *       shapes[], meshes[]
 *
 * Two sub-variants share the same magic (0xCA5CADED), distinguished by header[0x04]:
 *   PS5:    header[0x04] = 0x00000100  (256 lookup-table slots)
 *   PSVita: header[0x04] = 0x00000000
 *
 * PSVita vertex formats (stride in bytes, element order varies — use vtxdef):
 *   stride=20:  [f32×3 pos][i8×4 normal][f16×2 uv]                            (no colour)
 *   stride=24:  [f32×3 pos][i8×4 normal][f16×2 uv][u8×4 rgba]                 (variant A)
 *           or: [f32×3 pos][i8×4 normal][u8×4 rgba][f16×2 uv]                 (variant B)
 *   stride=28:  [f32×3 pos][i8×4 normal][i8×4 tangent][u8×4 rgba][f16×2 uv]
 *   stride=32:  [f32×3 pos][i8×4 normal][i8×4 tangent][f32 ???][u8×4 rgba][f16×2 uv]
 *   stride=40:  [f32×3 pos][i8×4 normal][i8×4 tangent][f16×2 uv][f32×4 extra] (no colour)
 *   stride=44:  [f32×3 pos][i8×4 normal][i8×4 tangent][f32 ???][f16×2 uv][f32×4 extra] (no colour)
 *   stride=52:  [f32×3 pos][i8×4 normal][i8×4 tangent][u8×4 rgba][f32×2 uv1][f32×2 uv2][f32×3 extra]
 *
 * PS5 vertex formats (stride in bytes):
 *   stride=20:  [f32×3 pos][i8×4 normal][f16×2 uv]                        (no colour)
 *   stride=24:  [f32×3 pos][i8×4 normal][u8×4 rgba][f16×2 uv]
 *   stride=28:  [f32×3 pos][i8×4 normal][i8×4 tangent][u8×4 rgba][f16×2 uv]
 */

import { BufferRange } from "@core/utils/range";

export const PS5_RCSMODEL_MAGIC = 0xca5caded;

/** Known section type hashes. */
const SECTION_HASH_SCENE_GRAPH = 0xe35e00df;
const SECTION_HASH_GEOMETRY    = 0xe9f17935;

/** Valid vertex strides (bytes). */
const VALID_STRIDES = new Set([16, 20, 24, 28, 32, 36, 40, 44, 52, 60]);

/** Vertex element name hashes — crc32(name, poly=0x04c11db7, init=0xffffffff, finalXor=0). */
const VTXELEM_POSITION       = 0xb9d31b0a; // "position"
const VTXELEM_NORMAL         = 0xde7a971b; // "normal"
const VTXELEM_TANGENT        = 0xdbe5f417; // "tangent"
const VTXELEM_VERTEX_COLOUR1 = 0x7493d450; // "VertexColour1"
const VTXELEM_UV1            = 0x427214fc; // "Uv1"
const VTXELEM_VERTEX_COLOUR2 = 0xed9a85ea; // "VertexColour2"
const VTXELEM_UV2            = 0xdb7b4546; // "Uv2"
const VTXELEM_UV_UNKNOWN     = 0x7a3f521c; // unknown name, UV element (f16×2/f32×2)

/**
 * Parsed vertex element from the vtxdef table.
 *
 * Element data formats (format field):
 *   0x39 (57)  = f32×3  (12 bytes) — position
 *   0x35 (53)  = i8×4   (4 bytes)  — normal
 *   0x45 (69)  = i8×4   (4 bytes)  — tangent
 *   0x44 (68)  = u8×4   (4 bytes)  — vertex colour
 *   0x28 (40)  = f16×2  (4 bytes)  — UV (half-float)
 *   0x29 (41)  = f32×2  (8 bytes)  — UV (full-float)
 *   0x48 (72)  = f32×1  (4 bytes)  — scalar
 *   0x49 (73)  = f32×4  (16 bytes) — extra data
 */
interface VtxElement {
  hash:   number; // element name hash (crc32)
  offset: number; // byte offset within vertex stride
  format: number; // data format code (see above)
  vtxStride: number; // vertex stride (same as VtxDef.stride)
  flags:  number;
}

/** Element data format codes. */
const VTXFMT_F32x3 = 0x39; // 12 bytes
const VTXFMT_I8x4  = 0x35; // 4 bytes (normal)
const VTXFMT_I8x4T = 0x45; // 4 bytes (tangent)
const VTXFMT_U8x4  = 0x44; // 4 bytes (colour)
const VTXFMT_F16x2 = 0x28; // 4 bytes (UV half-float)
const VTXFMT_F32x2 = 0x29; // 8 bytes (UV full-float)
const VTXFMT_F32x4 = 0x49; // 16 bytes

/**
 * Vertex format definition for a shape.
 *
 * Vtxdef table layout (sec1-relative, pointed to by sentinel+0x38 on Vita):
 *   +0x00: header u32 = (stride << 8) | mat_index
 *   +0x04: element 0 hash (u32)
 *   +0x08: element 0 descriptor (u32) = [flags(u8)][vtxStride(u8)][format(u8)][offset(u8)]
 *   +0x0c: element 1 hash (u32)
 *   +0x10: element 1 descriptor (u32)
 *   ...
 *   terminated by hash=0
 */
class VtxDef {
  stride   = 0;
  mat      = 0;
  elements: VtxElement[] = [];

  /** Find the byte offset of an element by its name hash, or -1 if absent. */
  offsetOf(hash: number): number {
    const el = this.elements.find(e => e.hash === hash);
    return el ? el.offset : -1;
  }

  /** Find an element by its name hash. */
  find(hash: number): VtxElement | undefined {
    return this.elements.find(e => e.hash === hash);
  }

  static load(sec1: BufferRange, offset: number): VtxDef | null {
    const header = sec1.getUint32(offset);
    const stride = (header >> 8) & 0xFF;
    const mat    = header & 0xFF;

    if (stride === 0 || stride > 128) return null;

    const ret = new VtxDef();
    ret.stride = stride;
    ret.mat    = mat;

    let off = offset + 4;
    while (off + 8 <= sec1.size) {
      const hash = sec1.getUint32(off);
      if (hash === 0) break;
      const desc = sec1.getUint32(off + 4);
      ret.elements.push({
        hash,
        offset:    (desc >> 24) & 0xFF,
        vtxStride: (desc >> 8) & 0xFF,
        format:    (desc >> 16) & 0xFF,
        flags:     desc & 0xFF,
      });
      off += 8;
    }

    // Reject if no position element found (likely garbage data)
    if (!ret.find(VTXELEM_POSITION)) return null;

    return ret;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// File header region: [0x00 – data_offset)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Section definition (0x20 bytes each, stored at header+0x20)
// ---------------------------------------------------------------------------

export class RcsModelPS5SectionDef {
  hash        = 0;
  size        = 0;
  field08     = 0;
  reloc_count = 0;

  static readonly SIZE = 0x20;

  static load(range: BufferRange, offset: number): RcsModelPS5SectionDef {
    const ret = new RcsModelPS5SectionDef();
    ret.hash        = range.getUint32(offset + 0x00);
    ret.size        = range.getUint32(offset + 0x04);
    ret.field08     = range.getUint32(offset + 0x08);
    ret.reloc_count = range.getUint32(offset + 0x0c);
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Relocation table — N × u64 entries between section defs and section data
// ---------------------------------------------------------------------------

export class RcsModelPS5RelocTable {
  entries: [lo: number, hi: number][] = [];
  range!: BufferRange;

  get count() { return this.entries.length; }

  static load(range: BufferRange, offset: number, count: number): RcsModelPS5RelocTable {
    const ret = new RcsModelPS5RelocTable();
    ret.range = range.slice(offset, offset + count * 8);
    for (let i = 0; i < count; i++) {
      const off = i * 8;
      ret.entries.push([ret.range.getUint32(off), ret.range.getUint32(off + 4)]);
    }
    return ret;
  }
}

// ---------------------------------------------------------------------------
// File header
// ---------------------------------------------------------------------------

export class RcsModelPS5Header {
  range!: BufferRange;
  magic               = 0;
  lookup_table_slots  = 0; // 256 on PS5, 0 on PSVita
  section_count       = 0; // 2
  data_offset         = 0; // absolute file offset of data region
  reloc_table_offset  = 0; // absolute file offset of relocation table (0x60)
  sections: RcsModelPS5SectionDef[] = [];
  relocTable!: RcsModelPS5RelocTable;

  get isVita() { return this.lookup_table_slots === 0; }

  static load(range: BufferRange): RcsModelPS5Header {
    const ret = new RcsModelPS5Header();
    ret.range               = range.slice(0, 0x20);
    ret.magic               = range.getUint32(0x00);
    ret.lookup_table_slots  = range.getUint32(0x04);
    ret.section_count       = range.getUint32(0x08);
    ret.data_offset         = range.getUint32(0x0c);
    ret.reloc_table_offset  = range.getUint32(0x10);

    for (let i = 0; i < ret.section_count; i++) {
      ret.sections.push(RcsModelPS5SectionDef.load(range, 0x20 + i * RcsModelPS5SectionDef.SIZE));
    }

    const totalReloc = ret.sections.reduce((sum, s) => sum + s.reloc_count, 0);
    ret.relocTable = RcsModelPS5RelocTable.load(range, ret.reloc_table_offset, totalReloc);

    return ret;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Data region: [data_offset – EOF)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Data header (first 0x50 bytes of data region)
// ---------------------------------------------------------------------------

export class RcsModelPS5DataHeader {
  range!: BufferRange;

  version              = 0; // +0x00  (0x51060001)
  field04              = 0; // +0x04
  field08              = 0; // +0x08  (0xFFFFFFFF)
  field0c              = 0; // +0x0c  (hash?)
  node_count_lo        = 0; // +0x10 u16
  node_count_hi        = 0; // +0x12 u16
  field14              = 0; // +0x14
  hash_table1_offset   = 0; // node hashes (node_count × u32)
  hash_table2_offset   = 0; // shape hashes (hash2_count × u32)
  transforms_offset    = 0; // transform matrices (node_count × 64 bytes)
  shape_count          = 0; // number of shape/geo nodes
  hash2_count          = 0; // entries in hash table 2
  shape_table_offset   = 0; // shape pointer table
  field30              = 0;
  field3c              = 0;
  material_count       = 0; // Vita: +0x44, PS5: +0x70
  material_table_offset = 0; // Vita: +0x48, PS5: +0x78

  // Parsed sub-structures
  node_hashes:  number[] = [];   // hash table 1
  shape_hashes: number[] = [];   // hash table 2
  transforms:   RcsModelPS5Matrix[] = [];
  shape_ptrs:   number[] = [];   // offsets to node entries

  static readonly SIZE_VITA = 0x50;
  static readonly SIZE_PS5  = 0x98;

  static load(range: BufferRange, isVita: boolean): RcsModelPS5DataHeader {
    const ret = new RcsModelPS5DataHeader();
    const hdrSize = isVita ? RcsModelPS5DataHeader.SIZE_VITA : RcsModelPS5DataHeader.SIZE_PS5;
    ret.range = range.slice(0, hdrSize);

    ret.version          = range.getUint32(0x00);
    ret.field04          = range.getUint32(0x04);
    ret.field08          = range.getUint32(0x08);
    ret.field0c          = range.getUint32(0x0c);
    ret.node_count_lo    = range.getUint16(0x10);
    ret.node_count_hi    = range.getUint16(0x12);
    ret.field14          = range.getUint32(0x14);

    if (isVita) {
      // Vita: 32-bit aligned fields
      ret.hash_table1_offset   = range.getUint32(0x18);
      ret.hash_table2_offset   = range.getUint32(0x1c);
      ret.transforms_offset    = range.getUint32(0x20);
      ret.shape_count          = range.getUint16(0x28);
      ret.hash2_count          = range.getUint16(0x2a);
      ret.shape_table_offset   = range.getUint32(0x2c);
      ret.field30              = range.getUint32(0x30);
      ret.field3c              = range.getUint32(0x3c);
      ret.material_count       = range.getUint32(0x44);
      ret.material_table_offset = range.getUint32(0x48);
    } else {
      // PS5: 64-bit aligned offset fields
      ret.hash_table1_offset   = range.getUint64(0x18)[0];
      ret.hash_table2_offset   = range.getUint64(0x20)[0];
      ret.transforms_offset    = range.getUint64(0x28)[0];
      ret.shape_count          = range.getUint16(0x38);
      ret.hash2_count          = range.getUint16(0x3a);
      ret.shape_table_offset   = range.getUint64(0x40)[0];
      ret.material_count       = range.getUint32(0x70);
      ret.material_table_offset = range.getUint64(0x78)[0];
    }

    // Parse hash table 1 (node hashes)
    const nodeCount = ret.node_count_lo;
    for (let i = 0; i < nodeCount; i++) {
      ret.node_hashes.push(range.getUint32(ret.hash_table1_offset + i * 4));
    }

    // Parse hash table 2 (shape hashes)
    if (ret.hash_table2_offset > 0) {
      for (let i = 0; i < ret.hash2_count; i++) {
        ret.shape_hashes.push(range.getUint32(ret.hash_table2_offset + i * 4));
      }
    }

    // Parse transform matrices
    for (let i = 0; i < nodeCount; i++) {
      ret.transforms.push(RcsModelPS5Matrix.load(range, ret.transforms_offset + i * 64));
    }

    // Parse shape pointer table
    const ptrStride = isVita ? 4 : 8; // PS5 uses u64-aligned pointers
    for (let i = 0; i < ret.shape_count; i++) {
      ret.shape_ptrs.push(range.getUint32(ret.shape_table_offset + i * ptrStride));
    }

    return ret;
  }
}

// ---------------------------------------------------------------------------
// Base data section — one contiguous section within the data region
// ---------------------------------------------------------------------------

export class RcsModelPS5DataSection {
  range!: BufferRange;
  hash = 0;

  static load(range: BufferRange, def: RcsModelPS5SectionDef, isVita: boolean, shapePtrs: number[] = []): RcsModelPS5DataSection {
    switch (def.hash) {
      case SECTION_HASH_SCENE_GRAPH:
        return RcsModelPS5SceneGraphSection.load(range, def, isVita, shapePtrs);
      case SECTION_HASH_GEOMETRY:
        return RcsModelPS5GeometrySection.load(range, def);
      default: {
        const ret = new RcsModelPS5DataSection();
        ret.range = range;
        ret.hash = def.hash;
        return ret;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Scene graph section (hash 0xe35e00df) — contains materials + geo block metas
// ---------------------------------------------------------------------------

export class RcsModelPS5SceneGraphSection extends RcsModelPS5DataSection {
  materials: RcsModelPS5Material[] = [];
  geoMetas: GeoMeta[] = [];

  static override load(range: BufferRange, def: RcsModelPS5SectionDef, isVita: boolean, shapePtrs: number[] = []): RcsModelPS5SceneGraphSection {
    const ret = new RcsModelPS5SceneGraphSection();
    ret.range = range;
    ret.hash = def.hash;
    ret.geoMetas = parseSceneGraph(range, isVita, shapePtrs);
    ret.materials = parseMaterials(range, isVita);
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Geometry section (hash 0xe9f17935) — raw IBO/VBO buffers
// ---------------------------------------------------------------------------

export class RcsModelPS5GeometrySection extends RcsModelPS5DataSection {
  shapes: RcsModelPS5ShapeNode[] = [];
  meshes: RcsModelPS5Mesh[] = [];

  static override load(range: BufferRange, def: RcsModelPS5SectionDef): RcsModelPS5GeometrySection {
    const ret = new RcsModelPS5GeometrySection();
    ret.range = range;
    ret.hash = def.hash;
    // Shapes/meshes are populated later once scene graph metas are available
    return ret;
  }

  parseGeometry(geoMetas: GeoMeta[], isVita: boolean) {
    console.log(`rcsmodel: parseGeometry geoMetas=${geoMetas.length} sec2Size=${this.range.size}`);
    buildGeometry(this, this.range, geoMetas, isVita);
    console.log(`rcsmodel: after buildGeometry shapes=${this.shapes.length} meshes=${this.meshes.length}`);
  }
}

// ---------------------------------------------------------------------------
// Data region — from data_offset to EOF, contains header + dispatched sections
// ---------------------------------------------------------------------------

export class RcsModelPS5Data {
  range!: BufferRange;
  header!: RcsModelPS5DataHeader;
  sections: RcsModelPS5DataSection[] = [];

  get sceneGraph(): RcsModelPS5SceneGraphSection | undefined {
    return this.sections.find((s): s is RcsModelPS5SceneGraphSection => s instanceof RcsModelPS5SceneGraphSection);
  }

  get geometry(): RcsModelPS5GeometrySection | undefined {
    return this.sections.find((s): s is RcsModelPS5GeometrySection => s instanceof RcsModelPS5GeometrySection);
  }

  static load(range: BufferRange, sectionDefs: RcsModelPS5SectionDef[], isVita: boolean): RcsModelPS5Data {
    const ret = new RcsModelPS5Data();
    ret.range  = range;
    ret.header = RcsModelPS5DataHeader.load(range, isVita);

    let off = 0;
    for (const def of sectionDefs) {
      const secRange = range.slice(off, off + def.size);
      ret.sections.push(RcsModelPS5DataSection.load(secRange, def, isVita, ret.header.shape_ptrs));
      off += def.size;
    }

    // Link geometry to scene graph metas
    const sg  = ret.sceneGraph;
    const geo = ret.geometry;
    if (sg && geo) {
      geo.parseGeometry(sg.geoMetas, isVita);
    }

    return ret;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Supporting types (used by sections)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// 4×4 transform matrix
// ---------------------------------------------------------------------------

export class RcsModelPS5Matrix {
  elements: number[] = [];

  static identity(): RcsModelPS5Matrix {
    const ret = new RcsModelPS5Matrix();
    ret.elements = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    return ret;
  }

  static load(range: BufferRange, absOff: number): RcsModelPS5Matrix {
    const ret = new RcsModelPS5Matrix();
    for (let i = 0; i < 16; i++) {
      ret.elements.push(range.getFloat32(absOff + i * 4));
    }
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Shape node
// ---------------------------------------------------------------------------

export class RcsModelPS5ShapeNode {
  name           = "";
  externalId     = 0;
  local_matrix   = RcsModelPS5Matrix.identity();
  parent_index   = -1;
  index_count    = 0;
  vert_count     = 0;
  submesh_count  = 0;
  ibo_sec2_off   = 0;
  material_index = -1;
}

// ---------------------------------------------------------------------------
// Material (PSVita)
// ---------------------------------------------------------------------------

export class RcsModelPS5Material {
  range!: BufferRange;
  hash            = 0;
  rcsmaterialPath = "";
  name            = "";
  texturePaths: string[] = [];

  /** Compatibility with RcsModelMaterial — same as hash */
  get id(): number { return this.hash; }

  /** Compatibility with RcsModelMaterial — rcsmaterial path */
  get filename(): string { return this.rcsmaterialPath; }

  /** Compatibility with RcsModelMaterial — texture list */
  get textures(): RcsModelPS5Texture[] {
    return this.texturePaths.map(p => new RcsModelPS5Texture(p));
  }

  static load(section: BufferRange, offset: number, isVita: boolean): RcsModelPS5Material {
    const ret = new RcsModelPS5Material();
    ret.range = section.slice(offset);

    if (isVita) {
      ret.hash = section.getUint32(offset + 0x00);
      ret.rcsmaterialPath = section.getCString(section.getUint32(offset + 0x04));
      ret.name = section.getCString(section.getUint32(offset + 0x18));
      const texCount = section.getUint32(offset + 0x30);
      const texListPtr = section.getUint32(offset + 0x34);
      for (let t = 0; t < texCount; t++) {
        const texEntry = texListPtr + t * 0x18;
        const pathPtr = section.getUint32(texEntry + 0x10);
        if (pathPtr > 0 && pathPtr < section.size) {
          const path = section.getCString(pathPtr);
          if (path.endsWith(".gxt")) ret.texturePaths.push(path);
        }
      }
    } else {
      // PS5: 64-bit aligned pointers
      ret.hash = section.getUint32(offset + 0x00);
      ret.rcsmaterialPath = section.getCString(section.getUint32(offset + 0x08));
      ret.name = section.getCString(section.getUint32(offset + 0x30));
      // Param entries (0x28 bytes each) — some hold texture refs, some material params
      const paramCount = section.getUint32(offset + 0x3c);
      const paramListPtr = section.getUint32(offset + 0x40);
      for (let t = 0; t < paramCount; t++) {
        const paramEntry = paramListPtr + t * 0x28;
        const pathPtr = section.getUint32(paramEntry);
        if (pathPtr > 0 && pathPtr < section.size) {
          const path = section.getCString(pathPtr);
          if (path.endsWith(".gnf")) ret.texturePaths.push(path);
        }
      }
    }

    return ret;
  }
}

// ---------------------------------------------------------------------------
// Texture ref (PS5/Vita) — compatibility wrapper matching RcsModelTexture
// ---------------------------------------------------------------------------

export class RcsModelPS5Texture {
  filename: string;
  constructor(filename: string) {
    this.filename = filename;
  }
}

// ---------------------------------------------------------------------------
// IBO / VBO / Mesh
// ---------------------------------------------------------------------------

export class RcsModelPS5IBO {
  indices: number[] = [];
}

export class RcsModelPS5VBO {
  positions: number[] = [];
  normals:   number[] = [];
  colors:    number[] = [];
  uvs:       number[] = [];
}

export class RcsModelPS5Mesh {
  ibo = new RcsModelPS5IBO();
  vbo = new RcsModelPS5VBO();
}

// ---------------------------------------------------------------------------
// Geo block metadata (extracted from scene graph, consumed by geometry)
// ---------------------------------------------------------------------------

interface GeoMeta {
  sentinel:       number;
  name:           string;
  externalId:     number;
  index_count:    number;
  vert_count:     number;
  submesh_count:  number;
  ibo_sec2_off:   number;
  vbo_sec2_off:   number;
  material_index: number;
  vtxdef:         VtxDef | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Top-level model
// ═══════════════════════════════════════════════════════════════════════════

export class RcsModelPS5 {
  header!: RcsModelPS5Header;
  data!: RcsModelPS5Data;
  parseErrors: string[] = [];

  /** Convenience: materials from the scene graph section. */
  get materials(): RcsModelPS5Material[] { return this.data.sceneGraph?.materials ?? []; }

  /** Convenience: shapes from the geometry section. */
  get shapes(): RcsModelPS5ShapeNode[] { return this.data.geometry?.shapes ?? []; }

  /** Convenience: meshes from the geometry section (parallel to shapes). */
  get meshes(): RcsModelPS5Mesh[] { return this.data.geometry?.meshes ?? []; }

  /** Convenience: all unique .gxt texture paths from materials. */
  get texturePaths(): string[] {
    const paths: string[] = [];
    for (const mat of this.materials) {
      for (const tp of mat.texturePaths) {
        if (!paths.includes(tp)) paths.push(tp);
      }
    }
    return paths;
  }

  static readonly MAGIC = PS5_RCSMODEL_MAGIC;

  static canLoad(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 4) return false;
    const view = new DataView(buffer);
    return view.getUint32(0, true) === PS5_RCSMODEL_MAGIC;
  }

  static load(buffer: ArrayBuffer): RcsModelPS5 {
    const ret   = new RcsModelPS5();
    const range = new BufferRange(buffer);

    ret.header = RcsModelPS5Header.load(range);

    const dataRange = range.slice(ret.header.data_offset);
    ret.data = RcsModelPS5Data.load(dataRange, ret.header.sections, ret.header.isVita);

    return ret;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Parsers (private helpers)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Material table parser
//
// Material node layout (sec1-relative):
//   +0x00: hash, +0x04: rcsmaterial_path_ptr, +0x18: name_ptr
//   +0x30: texture_count, +0x34: texture_list_ptr
// Texture entry (0x18 bytes): +0x10: gxt_path_ptr
// ---------------------------------------------------------------------------

function parseMaterials(sec1: BufferRange, isVita: boolean): RcsModelPS5Material[] {
  const matCount    = isVita ? sec1.getUint32(0x44) : sec1.getUint32(0x70);
  const matTableOff = isVita ? sec1.getUint32(0x48) : sec1.getUint32(0x78);
  const ptrStride   = isVita ? 4 : 8;
  const materials: RcsModelPS5Material[] = [];

  for (let i = 0; i < matCount; i++) {
    const matPtr = sec1.getUint32(matTableOff + i * ptrStride);
    materials.push(RcsModelPS5Material.load(sec1, matPtr, isVita));
  }

  return materials;
}

// ---------------------------------------------------------------------------
// Scene graph sentinel scanner
// ---------------------------------------------------------------------------

function parseSceneGraph(sec1: BufferRange, isVita: boolean, shapePtrs: number[]): GeoMeta[] {
  // Field offsets relative to sentinel for geometry data
  const F_IDX = isVita ? 0x10 : 0x18;
  const F_VRT = isVita ? 0x14 : 0x1c;
  const F_SUB = isVita ? 0x18 : 0x20;
  const F_IBO = isVita ? 0x20 : 0x28;
  const F_VBO = isVita ? 0x3c : 0x48;

  const NAME_OFF = isVita ? 0x2c : 0x48;

  const candidates: GeoMeta[] = [];

  for (const ptr of shapePtrs) {
    if (ptr + NAME_OFF >= sec1.size) continue;

    const externalId = sec1.getUint32(ptr + 0x04);
    const name = sec1.getCString(ptr + NAME_OFF);

    if (isVita) {
      // Vita: iterate the submesh pointer list at ptr+0x1c.
      // Each submesh record has: +0x00 material_index, +0x08 sentinel(0xFFFFFFFF 0x00000000),
      // then geometry fields at sentinel-relative offsets.
      const subListPtr = sec1.getUint32(ptr + 0x1c);
      if (subListPtr === 0 || subListPtr + 4 > sec1.size) continue;

      // Read submesh count from ptr+0x14
      const subCount = sec1.getUint32(ptr + 0x14);
      const maxSubs = (subCount > 0 && subCount < 256) ? subCount : 64;

      for (let si = 0; si < maxSubs; si++) {
        const subPtrAddr = subListPtr + si * 4;
        if (subPtrAddr + 4 > sec1.size) break;

        const subPtr = sec1.getUint32(subPtrAddr);
        if (subPtr === 0 || subPtr + 0x40 > sec1.size) break;
        // Stop if pointer looks invalid (not in sec1 range)
        if (subPtr < 0x100) break;

        // Verify sentinel at subPtr+0x08
        if (sec1.getUint32(subPtr + 0x08) !== 0xffffffff || sec1.getUint32(subPtr + 0x0c) !== 0x00000000) break;

        const sentinel = subPtr + 0x08;
        const matIdx = sec1.getUint32(subPtr);

        const index_count   = sec1.getUint32(sentinel + F_IDX);
        const vert_count    = sec1.getUint32(sentinel + F_VRT);
        const submesh_count = sec1.getUint32(sentinel + F_SUB);
        const ibo_sec2_off  = sec1.getUint32(sentinel + F_IBO);
        const vbo_sec2_off  = sec1.getUint32(sentinel + F_VBO);

        if (index_count === 0 || vert_count === 0) continue;

        let vtxdef: VtxDef | null = null;
        const vtxdefPtr = sec1.getUint32(sentinel + 0x38);
        if (vtxdefPtr > 0 && vtxdefPtr + 8 <= sec1.size) {
          vtxdef = VtxDef.load(sec1, vtxdefPtr);
        }

        candidates.push({
          sentinel, name: si === 0 ? name : `${name}[${si}]`, externalId,
          index_count, vert_count, submesh_count,
          ibo_sec2_off, vbo_sec2_off,
          material_index: matIdx < 0x10000 ? matIdx : -1,
          vtxdef,
        });
      }
    } else {
      // PS5: single sentinel scan (unchanged)
      let sentinel = -1;
      for (let off = ptr + NAME_OFF; off < sec1.size - 8; off += 4) {
        if (sec1.getUint32(off) === 0xffffffff && sec1.getUint32(off + 4) === 0x00000000) {
          sentinel = off;
          break;
        }
      }
      if (sentinel < 0) continue;

      const index_count   = sec1.getUint32(sentinel + F_IDX);
      const vert_count    = sec1.getUint32(sentinel + F_VRT);
      const submesh_count = sec1.getUint32(sentinel + F_SUB);
      const ibo_sec2_off  = sec1.getUint32(sentinel + F_IBO);
      const vbo_sec2_off  = sec1.getUint32(sentinel + F_VBO);

      if (index_count === 0 || vert_count === 0) continue;

      let matIdx = -1;
      if (sentinel >= 0x10) {
        const v = sec1.getUint32(sentinel - 0x10);
        if (v < 0x100) matIdx = v;
      }

      candidates.push({ sentinel, name, externalId, index_count, vert_count, submesh_count, ibo_sec2_off, vbo_sec2_off, material_index: matIdx, vtxdef: null });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Geometry builder — populates shapes[] and meshes[] on GeometrySection
// ---------------------------------------------------------------------------

function buildGeometry(
  geo: RcsModelPS5GeometrySection,
  sec2: BufferRange,
  candidates: GeoMeta[],
  isVita: boolean,
): void {
  candidates.sort((a, b) => a.ibo_sec2_off - b.ibo_sec2_off);

  for (let ci = 0; ci < candidates.length; ci++) {
    const c = candidates[ci];

    let vboSec2Off: number;
    if (c.vbo_sec2_off !== 0) {
      vboSec2Off = c.vbo_sec2_off;
    } else {
      const iboEnd = c.ibo_sec2_off + c.index_count * 2;
      vboSec2Off = (iboEnd + 3) & ~3;
    }

    // Derive stride — prefer vtxdef when available
    let stride = 0;

    if (c.vtxdef && c.vtxdef.stride > 0) {
      stride = c.vtxdef.stride;
    }

    // Fallback: adjacency
    if (stride === 0 && ci + 1 < candidates.length) {
      const nextIboOff = candidates[ci + 1].ibo_sec2_off;
      if (nextIboOff > vboSec2Off) {
        const derived = (nextIboOff - vboSec2Off) / c.vert_count;
        if (VALID_STRIDES.has(derived)) stride = derived;
      }
    }

    // Fallback: last shape
    if (stride === 0 && sec2.size > vboSec2Off) {
      const derived = (sec2.size - vboSec2Off) / c.vert_count;
      if (VALID_STRIDES.has(derived)) stride = derived;
    }

    // Fallback: normal-magnitude probe
    if (stride === 0) {
      for (const s of [28, 24, 40, 20, 32, 52]) {
        if (vboSec2Off + c.vert_count * s > sec2.size) continue;
        let good = 0;
        for (let pi = 0; pi < c.vert_count; pi++) {
          const nx = sec2.getInt8(vboSec2Off + pi * s + 12);
          const ny = sec2.getInt8(vboSec2Off + pi * s + 13);
          const nz = sec2.getInt8(vboSec2Off + pi * s + 14);
          const mag = Math.sqrt(nx * nx + ny * ny + nz * nz) / 127;
          if (mag > 0.5 && mag < 1.5) good++;
          else break;
        }
        if (good === c.vert_count) { stride = s; break; }
      }
    }

    if (stride === 0) {
      console.warn(`rcsmodel: skipped shape "${c.name}" — stride=0 (vtxdef=${!!c.vtxdef}, vbo=0x${vboSec2Off.toString(16)}, vrt=${c.vert_count}, sec2=${sec2.size})`);
      continue;
    }

    // Build IBO
    const ibo = new RcsModelPS5IBO();
    for (let i = 0; i < c.index_count; i++) {
      ibo.indices.push(sec2.getUint16(c.ibo_sec2_off + i * 2));
    }

    // Build VBO
    const vbo = new RcsModelPS5VBO();
    if (vboSec2Off + c.vert_count * stride > sec2.size) {
      console.warn(`rcsmodel: skipped shape "${c.name}" — VBO out of bounds (vbo=0x${vboSec2Off.toString(16)}, vrt=${c.vert_count}, stride=${stride}, need=${vboSec2Off + c.vert_count * stride}, sec2=${sec2.size})`);
      continue;
    }

    const shape          = new RcsModelPS5ShapeNode();
    shape.name           = c.name;
    shape.externalId     = c.externalId;
    shape.local_matrix   = RcsModelPS5Matrix.identity();
    shape.parent_index   = -1;
    shape.index_count    = c.index_count;
    shape.vert_count     = c.vert_count;
    shape.submesh_count  = c.submesh_count;
    shape.ibo_sec2_off   = c.ibo_sec2_off;
    shape.material_index = c.material_index;

    geo.shapes.push(shape);

    // Pre-resolve vtxdef element offsets outside the vertex loop
    const nrmEl = c.vtxdef?.find(VTXELEM_NORMAL) ?? null;
    const uvEl  = c.vtxdef ? (c.vtxdef.find(VTXELEM_UV1) ?? c.vtxdef.find(VTXELEM_UV2) ?? c.vtxdef.find(VTXELEM_UV_UNKNOWN)) : null;
    const colEl = c.vtxdef?.find(VTXELEM_VERTEX_COLOUR1) ?? null;

    for (let i = 0; i < c.vert_count; i++) {
      const base = vboSec2Off + i * stride;
      vbo.positions.push(
        sec2.getFloat32(base + 0x00),
        sec2.getFloat32(base + 0x04),
        sec2.getFloat32(base + 0x08),
      );

      const nrmOff = nrmEl ? nrmEl.offset : 0x0c;
      vbo.normals.push(
        sec2.getInt8(base + nrmOff) / 127,
        sec2.getInt8(base + nrmOff + 1) / 127,
        sec2.getInt8(base + nrmOff + 2) / 127,
      );

      if (isVita && c.vtxdef) {
        // vtxdef-driven parsing

        if (uvEl) {
          if (uvEl.format === VTXFMT_F32x2) {
            vbo.uvs.push(sec2.getFloat32(base + uvEl.offset), sec2.getFloat32(base + uvEl.offset + 4));
          } else {
            vbo.uvs.push(sec2.getFloat16(base + uvEl.offset), sec2.getFloat16(base + uvEl.offset + 2));
          }
        } else {
          vbo.uvs.push(0, 0);
        }

        if (colEl) {
          vbo.colors.push(
            sec2.getUint8(base + colEl.offset), sec2.getUint8(base + colEl.offset + 1),
            sec2.getUint8(base + colEl.offset + 2), sec2.getUint8(base + colEl.offset + 3),
          );
        } else {
          vbo.colors.push(255, 255, 255, 255);
        }
      } else if (isVita) {
        // Fallback for shapes without vtxdef (should not happen)
        if (stride === 20) {
          vbo.uvs.push(sec2.getFloat16(base + 0x10), sec2.getFloat16(base + 0x12));
          vbo.colors.push(255, 255, 255, 255);
        } else if (stride === 24) {
          vbo.uvs.push(sec2.getFloat16(base + 0x10), sec2.getFloat16(base + 0x12));
          vbo.colors.push(
            sec2.getUint8(base + 0x14), sec2.getUint8(base + 0x15),
            sec2.getUint8(base + 0x16), sec2.getUint8(base + 0x17),
          );
        } else {
          vbo.uvs.push(0, 0);
          vbo.colors.push(255, 255, 255, 255);
        }
      } else {
        // PS5
        const rgbaOff = stride >= 28 ? 0x14 : 0x10;
        const uvOff   = stride === 20 ? 0x10 : stride === 28 ? 0x18 : 0x14;
        if (stride >= 24) {
          vbo.colors.push(
            sec2.getUint8(base + rgbaOff + 0), sec2.getUint8(base + rgbaOff + 1),
            sec2.getUint8(base + rgbaOff + 2), sec2.getUint8(base + rgbaOff + 3),
          );
        } else {
          vbo.colors.push(255, 255, 255, 255);
        }
        vbo.uvs.push(sec2.getFloat16(base + uvOff), sec2.getFloat16(base + uvOff + 2));
      }
    }

    const mesh = new RcsModelPS5Mesh();
    mesh.ibo   = ibo;
    mesh.vbo   = vbo;
    geo.meshes.push(mesh);
  }

  if (geo.shapes.length < candidates.length) {
    console.warn(`rcsmodel: ${geo.shapes.length}/${candidates.length} shapes loaded (${candidates.length - geo.shapes.length} skipped)`);
  }
}
