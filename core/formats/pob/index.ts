import { Mipmap } from "@core/utils/mipmaps";
import { BufferRange } from "@core/utils/range";
import { GE } from "@core/utils/pspge";

// .POB — "Particle OBject", the particle-system format used by Studio Liverpool
// from WipEout Fusion (PS2) through WipEout 2048 (Vita).
//
// Loaded by ParticleSystem_Importer.cpp via the path template `Data\Psys\%s.POB`.
// See README.md in this directory for the full format notes and open questions.
//
// Magic is a FourCC written in native byte order, so it doubles as an
// endianness marker: PSP/PS2/Vita write "SYSP" (LE), PS3 writes "PSYS" (BE).

const MAGIC_LE = 0x50535953; // "SYSP" read as a LE u32
const MAGIC_BE = 0x50535953; // "PSYS" read as a BE u32

/** Sentinel stored in the offset table for an unused slot. */
export const POB_NULL_OFFSET = 0xffffffff;

/**
 * One variable-length chunk of the payload, delimited by consecutive entries in
 * the header offset table. The final block runs to end-of-file.
 *
 * Block *contents* are not decoded yet — see README.md. What is known: blocks
 * around 1148-1290 bytes carry emitter parameters and often an embedded source
 * texture path; 4/12/20/36-byte blocks are small auxiliary records; the trailing
 * block is typically bulk texel data.
 */
export class POBBlock {
  index = 0;
  offset = 0;
  size = 0;
  range = new BufferRange();

  /**
   * Interpret the block as a run of RGBA8 entries. Many blocks are colour /
   * alpha-over-lifetime ramps stored as tightly packed RGBA quads.
   */
  asRGBA(): Uint8Array {
    return new Uint8Array(this.range.getArrayBuffer(0, this.size - (this.size % 4)));
  }

  /**
   * Every animation path in the block.
   *
   * A path is the engine's `PsysPath`, a fixed 0xE0-byte record built by
   * `PsysPath_Init` (boot.bin 0x00145398) and finalised by
   * `PsysPath_ComputeSlopes` (0x00145408):
   *
   * ```c
   * struct PsysPath {           // 0xE0 bytes
   *     u32   unknown00;
   *     u32   interpolation;    // 0, 2 or 3 -- see POBPathInterpolation
   *     u32   keyCount;
   *     f32   minValue;         // +0x0c  what key value 0 means
   *     f32   maxValue;         // +0x10  what key value 1 means
   *     struct { f32 time; f32 value; } keys[keyCount];   // +0x14
   *     f32   slopes[keyCount - 1];                       // +0x9c
   *     f32   range;            // +0xdc, == maxValue - minValue
   * };
   * ```
   *
   * `PsysPath_ComputeSlopes` writes the terminator `1e7f` (0x4B189680) at
   * `+0x14 + keyCount * 8`, which is what makes a path findable, and derives
   * each slope as `(v[i+1] - v[i]) * range / (t[i+1] - t[i])` -- the `range`
   * factor is what shows `+0x0c`/`+0x10` to be a VALUE range rather than a time
   * span: keys are normalised on both axes (times and values are 0..1 across
   * the whole corpus), and the curve is mapped onto `[minValue, maxValue]`.
   *
   * `WO_MINE_EXPLO`'s first path reads `[4.0 .. 18.0]` with values rising 0 to
   * 1 -- an explosion growing from 4 to 18 units over its life.
   *
   * Emitters hold five of these, 0xE0 apart (at +0x4d8, +0x5b8, +0x698, +0x778,
   * +0x858 of the 0xC90-byte emitter record).
   */
  animationPaths(): POBAnimationPath[] {
    const paths: POBAnimationPath[] = [];
    for (let offset = 0; offset + 4 <= this.size; offset += 4) {
      if (this.range.getUint32(offset) !== POB_PATH_TERMINATOR) continue;

      // The terminator sits at +0x14 + keyCount*8, and keyCount is stored at
      // +0x08 of the same record -- so the only consistent start is the one
      // whose count field agrees with its own distance from the terminator.
      let start = -1;
      let keyCount = 0;
      for (let count = 1; count <= MAX_PATH_KEYS; count++) {
        const candidate = offset - 0x14 - count * 8;
        if (candidate < 0) break;
        if (this.range.getUint32(candidate + 8) === count) {
          start = candidate;
          keyCount = count;
          break;
        }
      }
      if (start < 0) continue;

      const keys: POBAnimationKey[] = [];
      for (let key = 0; key < keyCount; key++) {
        keys.push({
          time: this.range.getFloat32(start + 0x14 + key * 8),
          value: this.range.getFloat32(start + 0x18 + key * 8),
        });
      }
      paths.push({
        offset: start,
        interpolation: this.range.getUint32(start + 4) as POBPathInterpolation,
        minValue: this.range.getFloat32(start + 0x0c),
        maxValue: this.range.getFloat32(start + 0x10),
        keys,
      });
    }
    return paths;
  }
}

/**
 * How a path interpolates between its keys.
 *
 * `Psys_SpawnParticle` (boot.bin 0x001433b4) switches on this field at
 * `PsysPath + 0x04`: value 3 takes a call into a helper, the others take inline
 * branches. Only 0, 2 and 3 occur across the corpus (3808 / 5049 / 952 of 9809
 * paths), and `PsysPath_Init` defaults it to 2.
 *
 * Which curve each selects is not identified, so every path is sampled linearly
 * rather than guessing.
 */
export enum POBPathInterpolation {
  MODE_0 = 0,
  /** The constructor default. */
  MODE_2 = 2,
  /** Handled by a dedicated helper in the spawn path. */
  MODE_3 = 3,
}

/**
 * One key of an animation path. Both axes are normalised 0..1: `time` over the
 * particle's lifetime, `value` over the path's `[minValue, maxValue]`.
 */
export type POBAnimationKey = { time: number; value: number };

/** A curve driving one emitter property over the particle lifetime. */
export type POBAnimationPath = {
  offset: number;
  /** How the curve interpolates between keys. */
  interpolation: POBPathInterpolation;
  /** What a key value of 0 means. */
  minValue: number;
  /** What a key value of 1 means. */
  maxValue: number;
  keys: POBAnimationKey[];
};

/** Keys a `PsysPath` can hold before its 0xE0 record would overflow. */
const MAX_PATH_KEYS = 0x11;

/** Size of one `PsysPath` record, and the stride between an emitter's paths. */
export const POB_PATH_SIZE = 0xe0;

/** Paths per emitter: PsysDef_CreateEmitter initialises exactly five. */
export const POB_PATHS_PER_EMITTER = 5;

/**
 * What each of an emitter's five path slots drives.
 *
 * The engine addresses the slots positionally and the file names none of them,
 * so these are read off the value ranges the corpus uses (1925 five-path
 * emitters):
 *
 * - `SIZE` -- small positives, never negative; the constructor's default range
 *   is 0..3. WO_MINE_EXPLO's is `[4 .. 18]`, an explosion growing over its life.
 * - `ALPHA` -- `0..255` in 1031 of 1925 emitters, i.e. 8-bit opacity, and the
 *   constructor defaults it to 0..255.
 * - `SLOT2` -- the only slot that goes negative (314 emitters), so a signed
 *   quantity; velocity or a drift direction. Not identified.
 * - `SLOT3`, `SLOT4` -- overwhelmingly `0..1`, so normalised factors. Not
 *   identified.
 */
export enum POBPathSlot {
  SIZE = 0,
  ALPHA = 1,
  SLOT2 = 2,
  SLOT3 = 3,
  SLOT4 = 4,
}

/**
 * One emitter's animation paths: a run of `PsysPath` records laid end to end.
 *
 * The engine's emitter record is 0xC90 bytes with five paths at +0x4d8, +0x5b8,
 * +0x698, +0x778 and +0x858 -- consecutive, 0xE0 apart. Grouping the paths a
 * file contains by that stride recovers the emitters: 1925 of 2105 runs across
 * the corpus are exactly five long.
 *
 * Slots are positional; see `POBPathSlot` for what each drives.
 */
export type POBEmitter = {
  offset: number;
  paths: POBAnimationPath[];
  /**
   * Emitter parameters, read from the record's undecoded head.
   *
   * `PsysDef_CreateEmitter` (boot.bin 0x001495d4) names these by initialising
   * them, and the corpus clusters on its defaults. Only the four below are
   * identified; the rest of the head, and the whole tail, are still grey.
   */
  params: POBEmitterParams;
};

/** The emitter parameters identified so far. See `POBEmitter.params`. */
export type POBEmitterParams = {
  /** Particles emitted per second. 50 for WO_RAIN, 100 for WO_SNOW, ~0 for a burst. */
  emissionRate: number;
  /** Emission cone half-angle, radians. Zero in 60% of emitters; pi/2 is the common value. */
  coneAngle: number;
  /** Lifetime or particle count -- exactly 30.0 for every explosion, but not resolved. */
  lifetimeOrCount: number;
  /** Downward acceleration. Defaults to -0.1. */
  gravity: number;
  /**
   * 256 RGBA entries: the colour and alpha a particle takes across its life.
   * All-0xFF (opaque white) where the emitter never set one.
   */
  gradient: Uint8Array;
  /** Sprite-sheet columns. 1 when the sheet is a single frame. */
  gridColumns: number;
  /** Sprite-sheet rows. 1 when the sheet is a single frame. */
  gridRows: number;
};

/** Offsets of the identified parameters within the 0xC90 emitter record. */
const EMITTER_PARAM_OFFSETS = { emissionRate: 0x34, coneAngle: 0x50, lifetimeOrCount: 0x58, gravity: 0x74 };

/**
 * Frame grid of the emitter's sprite sheet, packed `(rows << 16) | cols`.
 *
 * Many sheets are animation grids rather than single sprites, and a particle
 * picks one cell. `PsysDef_CreateEmitter`'s helper seeds this with `0x00010001`
 * -- a 1x1 grid, i.e. the whole sheet -- and the corpus holds 1x1, 2x2, 4x4,
 * 4x8 and 8x8, which divide their sheets into square cells: WO_TRACK_ROCK_DEBRIS
 * is 64x64 with a 4x4 grid, giving the 16x16 debris frames the sheet visibly
 * contains.
 *
 * The texture descriptor sits just after it at `+0x9ac` in 451 of 504 cases,
 * which is what ties a grid to the sheet it describes.
 */
const EMITTER_GRID_OFFSET = 0x9a0;

/**
 * The 256-entry RGBA gradient every emitter tints its particles with, and its
 * size in bytes.
 *
 * `PsysDef_CreateEmitter`'s helper clears exactly this span with
 * `memset(record + 0xc4, 0xff, 0x400)` -- opaque white -- and it ends right
 * where the texture handle at `+0x4c4` begins. 1797 of 1925 emitters carry a
 * smooth ramp here; the rest are left at the all-0xFF default.
 */
const EMITTER_GRADIENT_OFFSET = 0xc4;
const EMITTER_GRADIENT_SIZE = 0x400;

/** Where an emitter's five paths begin within its record. */
const EMITTER_PATHS_OFFSET = 0x4d8;

/**
 * Per-slot runtime state, one 16-byte group per path, right after the paths.
 *
 * `PsysDef_CreateEmitter`'s helper writes five of these at `+0x950`, `+0x960`,
 * `+0x970`, `+0x980` and `+0x990` -- a seeded float, then `3`, `1.0` and `0`.
 * 7500 of 9625 groups in the corpus still hold those defaults.
 */
const EMITTER_SLOT_STATE_OFFSET = 0x950;

/** Closes an animation path. Reads as the float 1e7. */
export const POB_PATH_TERMINATOR = 0x4b189680;

/**
 * An embedded palettised sprite sheet.
 *
 * Descriptor layout (24 bytes read from `offset`, native endianness):
 * ```
 * +0x0C  uint16  width
 * +0x0E  uint16  height
 * +0x10  uint8   bitsPerPixel   (4 = 16-colour, 8 = 256-colour)
 * +0x11  uint8   unknown        (3 or 4; a size class -- 3 for 32px, 4 for 64/128px)
 * +0x12  uint8   flags          (bit 0 = texels are GE-swizzled)
 * +0x14  uint32  clutSize       (bytes: 64 when bpp=4, 1024 when bpp=8)
 * +0x18  uint32  unknown        (stale/unused pointer; see README)
 * +0x1C  uint32  dataPtr        (texels at dataPtr + 0x20 + payloadHeader)
 * +0x20  uint32  clutPtr        (CLUT at clutPtr + 0x20 + payloadHeader)
 * ```
 *
 * `dataPtr` and `clutPtr` are **payload-relative**: the game relocates them by
 * adding the payload base (`POBHeader.size`), which the importer does for every
 * entry named in the header's offset table. See `POB.payloadBase`.
 * The CLUT is RGBA8888 and the texels immediately follow it. Texel data may be
 * **GE-swizzled** (`GE.unswizzle`), selected per texture by **bit 0 of the flags
 * byte at `+0x12`** -- the same bit the game feeds to the GE's TMODE command.
 *
 * Pure leaves that byte uninitialised (0xBB filler, so the bit reads set) and
 * every one of its 341 sheets is swizzled. Pulse writes it: 113 of its 273
 * sheets carry an explicit 0x00 and really are stored linear. Applying the flag
 * agrees with the empirical layout in 341/341 Pure and 263/273 Pulse sheets.
 */
export class POBTexture {
  /** File offset of the descriptor itself. */
  offset = 0;
  width = 0;
  height = 0;
  /** 4 or 8. */
  bitsPerPixel = 0;
  /** True when the texels are stored in the GE's swizzled layout. */
  swizzled = true;
  /** Absolute file offset of the texels, after relocation. */
  dataOffset = 0;
  /** Absolute file offset of the CLUT, after relocation. */
  clutOffset = 0;
  /** CLUT size in bytes: 64 when bpp is 4, 1024 when 8. */
  clutSize = 0;
  range = new BufferRange();

  /** Bytes per row of indexed texel data. */
  get stride(): number {
    return this.bitsPerPixel === 4 ? this.width >> 1 : this.width;
  }

  get colors(): number {
    return this.clutSize >> 2;
  }

  /** Expand the indexed data through the CLUT into a straight RGBA8 buffer. */
  toMipmap(): Mipmap {
    const { width, height, stride, bitsPerPixel } = this;
    const clut = new Uint8Array(this.range.getArrayBuffer(this.clutOffset, this.clutSize));
    // A swizzled run is a whole number of 16x8 blocks, so it can be longer
    // than stride*height when the dimensions do not divide evenly. Read the
    // full block run, clamped to what the file actually holds.
    const blockBytes = this.swizzled ? GE.swizzledSize(stride, height) : stride * height;
    const available = this.range.size - this.dataOffset;
    const raw = new Uint8Array(this.range.getArrayBuffer(this.dataOffset, Math.min(blockBytes, available)));
    const px = this.swizzled ? GE.unswizzle(raw, stride, height) : raw;
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let index: number;
        if (bitsPerPixel === 4) {
          const byte = px[y * stride + (x >> 1)];
          index = x % 2 === 0 ? byte & 0x0f : byte >> 4;
        } else {
          index = px[y * stride + x];
        }
        data.set(clut.subarray(index * 4, index * 4 + 4), (y * width + x) * 4);
      }
    }

    return { type: "RGBA", width, height, data };
  }

  /**
   * Validate and read a descriptor at `offset`, or return null. The checks are
   * strict enough to scan the whole file for descriptors without false hits:
   * power-of-two dimensions, a bpp-consistent CLUT size, and the CLUT sitting
   * immediately before the texels with everything inside the file.
   */
  static tryLoad(range: BufferRange, offset: number, payloadBase: number): POBTexture | null {
    if (offset + 0x24 > range.size) return null;

    const width = range.getUint16(offset + 0x0c);
    const height = range.getUint16(offset + 0x0e);
    const bitsPerPixel = range.getUint8(offset + 0x10);
    const clutSize = range.getUint32(offset + 0x14);
    const dataPtr = range.getUint32(offset + 0x1c);
    const clutPtr = range.getUint32(offset + 0x20);

    if (bitsPerPixel !== 4 && bitsPerPixel !== 8) return null;
    if (width <= 0 || height <= 0 || width > 1024 || height > 1024) return null;
    if (width & (width - 1)) return null;
    if (height & (height - 1)) return null;
    if (clutSize !== (bitsPerPixel === 4 ? 16 : 256) * 4) return null;
    // The CLUT is immediately followed by the texel data.
    if (clutPtr + clutSize !== dataPtr) return null;

    const ret = new POBTexture();
    ret.offset = offset;
    ret.width = width;
    ret.height = height;
    ret.bitsPerPixel = bitsPerPixel;
    ret.swizzled = (range.getUint8(offset + 0x12) & 1) !== 0;
    ret.clutSize = clutSize;
    ret.range = range;
    // Payload-relative, like every pointer the offset table relocates.
    ret.clutOffset = clutPtr + payloadBase;
    ret.dataOffset = dataPtr + payloadBase;

    if (ret.dataOffset + ret.stride * height > range.size) return null;
    return ret;
  }
}

export class POBHeader {
  /** "SYSP" (LE targets) or "PSYS" (BE / PS3). */
  magic = 0;
  /** Payload size: always exactly `fileSize - headerSize`. */
  dataSize = 0;
  /** Number of slots in the offset table. Always a multiple of 4. */
  offsetCount = 0;
  /** Always 1 across all known files. Presumed version. */
  version = 0;
  /** Always 1 across all known files. Purpose unknown. */
  unknown0C = 0;
  /** Absolute file offsets; unused trailing slots hold POB_NULL_OFFSET. */
  offsets: number[] = [];

  /** Byte offset of the name string, immediately after the offset table. */
  /**
   * Where the payload starts, and the base every pointer inside it is relative
   * to. The importer relocates each location named in the offset table by
   * adding this (`*(u32*)(payload + entry) += payload`), so a `dataPtr` or
   * `clutPtr` read from the file must have it added too.
   *
   * The system name sits here as well, immediately before the payload.
   */
  get payloadBase(): number {
    return 0x10 + 4 * this.offsetCount;
  }

  get nameOffset(): number {
    return this.payloadBase;
  }

  /** Verified against all 632 known files: fileSize - dataSize === this. */
  get size(): number {
    return 0x10 + 4 * this.offsetCount + 16;
  }

  static load(range: BufferRange): POBHeader {
    const ret = new POBHeader();
    ret.magic = range.getUint32(0);
    ret.dataSize = range.getUint32(4);
    ret.offsetCount = range.getUint16(8);
    ret.version = range.getUint16(10);
    ret.unknown0C = range.getUint32(12);
    for (let i = 0; i < ret.offsetCount; i++) {
      ret.offsets.push(range.getUint32(0x10 + i * 4));
    }
    return ret;
  }
}

export class POB {
  range = new BufferRange();
  header = new POBHeader();
  /** System name, e.g. "WO_MINE_EXPLO". Matches the filename in every sample. */
  name = "";
  blocks: POBBlock[] = [];
  /**
   * Embedded sprite sheets, in file order. Present on PSP builds (and three PS2
   * files); PS3 and Vita builds reference textures externally instead.
   */
  textures: POBTexture[] = [];

  /** True for PS3 (WipEout HD / Fury), false for PSP / PS2 / Vita. */
  get bigEndian(): boolean {
    return !this.range.le;
  }

  /**
   * The offset table with its POB_NULL_OFFSET padding slots removed.
   *
   * Entries are **payload-relative**: each names the location of a pointer that
   * the game relocates by adding `POBHeader.payloadBase`. Verified on every
   * file that embeds a texture -- the descriptor's clutPtr field is a
   * relocation target under this reading in 276 of 276 files, and under an
   * absolute reading in none.
   */
  get usedOffsets(): number[] {
    return this.header.offsets.filter((o) => o !== POB_NULL_OFFSET);
  }

  /**
   * Emitters, recovered by grouping animation paths on the 0xE0 stride.
   *
   * A run of five is one emitter's full path array; shorter runs are emitters
   * whose trailing paths hold no keys, so no terminator marks them.
   */
  get emitters(): POBEmitter[] {
    const out: POBEmitter[] = [];
    for (const block of this.blocks) {
      const paths = block.animationPaths().sort((a, b) => a.offset - b.offset);
      let i = 0;
      while (i < paths.length) {
        let j = i;
        while (j + 1 < paths.length && paths[j + 1].offset - paths[j].offset === POB_PATH_SIZE) j++;
        const offset = block.offset + paths[i].offset;
        const record = offset - EMITTER_PATHS_OFFSET;
        const read = (at: number) => (record >= 0 && record + at + 4 <= this.range.size ? this.range.getFloat32(record + at) : 0);

        // Only a complete emitter has its record where we think it is: on a
        // partial run the paths start elsewhere, and every grid read that way
        // is nonsense (0 of 161 are a plausible power-of-two pair, against
        // 1500 of 1925 complete ones). Fall back to the whole sheet.
        const grid = { gridColumns: 1, gridRows: 1 };
        if (paths.length - i === POB_PATHS_PER_EMITTER && record >= 0 && record + EMITTER_GRID_OFFSET + 4 <= this.range.size) {
          const packed = this.range.getUint32(record + EMITTER_GRID_OFFSET);
          const columns = packed & 0xffff;
          const rows = (packed >>> 16) & 0xffff;
          const isCell = (n: number) => n > 0 && n <= 32 && (n & (n - 1)) === 0;
          if (isCell(columns) && isCell(rows)) {
            grid.gridColumns = columns;
            grid.gridRows = rows;
          }
        }
        out.push({
          offset,
          paths: paths.slice(i, j + 1),
          params: {
            emissionRate: read(EMITTER_PARAM_OFFSETS.emissionRate),
            coneAngle: read(EMITTER_PARAM_OFFSETS.coneAngle),
            lifetimeOrCount: read(EMITTER_PARAM_OFFSETS.lifetimeOrCount),
            gravity: read(EMITTER_PARAM_OFFSETS.gravity),
            gradient:
              record >= 0 && record + EMITTER_GRADIENT_OFFSET + EMITTER_GRADIENT_SIZE <= this.range.size
                ? new Uint8Array(this.range.getArrayBuffer(record + EMITTER_GRADIENT_OFFSET, EMITTER_GRADIENT_SIZE))
                : new Uint8Array(EMITTER_GRADIENT_SIZE).fill(0xff),
            ...grid,
          },
        });
        i = j + 1;
      }
    }
    return out;
  }

  /**
   * Source-asset paths left in the data by the exporter, e.g.
   * `Z:\Art_Resources\Psys\Tex\WO_PSP\JohnJunk\snow128x64x4.tga`.
   * Useful for identifying which texture an emitter draws with, and the sheet
   * dimensions are usually encoded in the filename.
   */
  get texturePaths(): string[] {
    const bytes = new Uint8Array(this.range.getArrayBuffer(0, this.range.size));
    const out: string[] = [];
    for (let i = 0; i + 2 < bytes.length; i++) {
      // Look for a drive-letter path: [A-Za-z] ':' '\'
      const c = bytes[i];
      const isAlpha = (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
      if (!isAlpha || bytes[i + 1] !== 0x3a || bytes[i + 2] !== 0x5c) continue;
      let end = i;
      const limit = Math.min(bytes.length, i + 256);
      while (end < limit && bytes[end] >= 0x20 && bytes[end] < 0x7f) end++;
      const s = String.fromCharCode(...bytes.subarray(i, end));
      if (s.length > 6) out.push(s);
      i = end;
    }
    return out;
  }

  static load(buffer: ArrayBuffer): POB {
    const ret = new POB();
    ret.range = new BufferRange(buffer);

    // Detect endianness from the magic: raw bytes "SYSP" = LE, "PSYS" = BE.
    ret.range.le = true;
    if (ret.range.getUint32(0) !== MAGIC_LE) {
      ret.range.le = false;
      if (ret.range.getUint32(0) !== MAGIC_BE) {
        throw new Error("Not a POB file: bad magic");
      }
    }

    ret.header = POBHeader.load(ret.range);
    ret.name = ret.range.getCString(ret.header.nameOffset);

    const payloadBase = ret.header.payloadBase;

    // The offset table is a relocation table, not a block index -- but its
    // entries are sorted, so consecutive ones still bracket usable spans of
    // payload. That is all "blocks" are: a convenient way to walk the file,
    // not a structure the format defines.
    const offsets = ret.usedOffsets;
    for (let i = 0; i < offsets.length; i++) {
      const block = new POBBlock();
      block.index = i;
      block.offset = payloadBase + offsets[i];
      const end = i + 1 < offsets.length ? payloadBase + offsets[i + 1] : ret.range.size;
      block.size = end - block.offset;
      block.range = ret.range.slice(block.offset, block.offset + block.size);
      ret.blocks.push(block);
    }

    // Descriptors are not block-aligned -- they sit near the end of the emitter
    // records -- so scan the whole file. POBTexture.tryLoad is strict enough
    // that this produces no false positives across the sample corpus.
    // Descriptors are scanned for, so several offsets can validate against the
    // same payload -- 101 of 718 hits across the corpus were a second reading
    // of a sheet already found. Keep the first: a payload is one sheet.
    const claimed = new Set<number>();
    for (let offset = 0; offset + 0x24 <= ret.range.size; offset += 4) {
      const texture = POBTexture.tryLoad(ret.range, offset, payloadBase);
      if (!texture || claimed.has(texture.clutOffset)) continue;
      claimed.add(texture.clutOffset);
      ret.textures.push(texture);
    }

    return ret;
  }

}
