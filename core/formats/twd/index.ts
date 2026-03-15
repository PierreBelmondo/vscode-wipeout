/**
 * PS2 TWD (Target World Data) file parser.
 *
 * TWD files store PS2-native geometry data; they are always paired with a
 * .vex file of the same base name.  The VEX file describes the scene graph,
 * textures, materials and vertex format (vtxdef/stride); the TWD provides
 * the actual vertex data as pre-built PS2 VU1/GIF display lists.
 *
 * File layout:
 *   [Header]               8 bytes  — version(u32) + entry_count(u32)
 *   [Entry table × count]  count×16 bytes  — hash(u32) + offset(u32)
 *                                              + buffer_size(u32) + data_size(u32)
 *   [padding to 128-byte boundary]
 *   [data blocks]          one per entry at entry.offset, entry.data_size bytes
 *
 * Each data block is a raw PS2 DMA/VU1 packet.  The block payload is opaque
 * without the game's VU1 microprogram — the vertex data within is in PS2 GS
 * screen-space (pre-projected), not world-space 3D coordinates.
 *
 * The paired .vex file on PSP contains world-space vertex data inline;
 * the PS2 .vex has the same scene graph but with empty stride sections
 * (filled with 0x7f), relying on the TWD for actual geometry.
 *
 * Block header (bytes 0–3):
 *   byte[3] is a block type marker:
 *     0x12 = geometry
 *     0x20 = zone/collision
 *
 * Linking: each entry has a hash field intended to match a VEX MESH node.
 * The hash algorithm is not yet identified.
 *
 * Reverse engineering progress: ~30%
 *   Header + entry table: fully parsed.
 *   Block type marker (byte[3]): decoded (0x12=geometry, 0x20=zone/collision).
 *   Block payload format: opaque PS2 VU1 display list, not yet decoded.
 *   VEX→TWD hash linking: not yet established.
 */

import { BufferRange } from "@core/utils/range";

export const TWD_VERSION = 1;

export const enum TwdBlockType {
  GEOMETRY  = 0x12,
  COLLISION = 0x20,
}

// ---------------------------------------------------------------------------
// Entry + top-level file
// ---------------------------------------------------------------------------

export class TwdEntry {
  range      = new BufferRange();
  /** Hash used to match this block to a VEX scene-graph node (algorithm unknown). */
  shapeHash  = 0;
  /** Byte offset of the data block within the TWD file. */
  offset     = 0;
  /** VU1 buffer allocation size in bytes (worst-case capacity, not data size). */
  bufferSize = 0;
  /** Actual byte count of the data block. */
  dataSize   = 0;
  /** Raw block bytes. */
  data       = new BufferRange();

  /** Block type identifier from byte[3] of the 4-byte block header. */
  get blockType(): number {
    return this.data.size >= 4 ? this.data.getUint8(3) : 0;
  }

  /** True when byte[3] = 0x12 (geometry block). */
  get isGeometry(): boolean {
    return this.blockType === TwdBlockType.GEOMETRY;
  }

  /** True when byte[3] = 0x20 (zone/collision block). */
  get isCollision(): boolean {
    return this.blockType === TwdBlockType.COLLISION;
  }

  static load(range: BufferRange, fileRange: BufferRange): TwdEntry {
    const ret      = new TwdEntry();
    ret.range      = range.slice(0, 16);
    ret.shapeHash  = range.getUint32(0);
    ret.offset     = range.getUint32(4);
    ret.bufferSize = range.getUint32(8);
    ret.dataSize   = range.getUint32(12);
    ret.data       = fileRange.slice(ret.offset, ret.offset + ret.dataSize);
    return ret;
  }
}

export class Twd {
  headerRange = new BufferRange();
  tableRange  = new BufferRange();
  fileRange   = new BufferRange();
  version = 0;
  entries: TwdEntry[] = [];

  /** Returns the entry whose shapeHash matches, or undefined. */
  findByHash(hash: number): TwdEntry | undefined {
    return this.entries.find(e => e.shapeHash === hash);
  }

  static canLoad(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 8) return false;
    const dv = new DataView(buffer);
    const version = dv.getUint32(0, true);
    const count   = dv.getUint32(4, true);
    if (version !== TWD_VERSION) return false;
    if (count === 0 || count > 65536) return false;
    const tableEnd = 8 + count * 16;
    return tableEnd <= buffer.byteLength;
  }

  static load(buffer: ArrayBuffer): Twd {
    const twd  = new Twd();
    const file = new BufferRange(buffer);

    twd.fileRange   = file;
    twd.version     = file.getUint32(0);
    const count     = file.getUint32(4);
    twd.headerRange = file.slice(0, 8);
    twd.tableRange  = file.slice(8, 8 + count * 16);

    for (let i = 0; i < count; i++) {
      const entryRange = twd.tableRange.slice(i * 16, i * 16 + 16);
      twd.entries.push(TwdEntry.load(entryRange, file));
    }

    return twd;
  }
}
