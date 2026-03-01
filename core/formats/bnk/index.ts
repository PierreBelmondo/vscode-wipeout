import { BufferRange } from "@core/utils/range";

// Sony SCREAM sound bank format (.bnk)
// Used in WipEout Fusion (PS2) and other Sony-platform games.
// Inspired by https://github.com/vgmstream/vgmstream/blob/master/src/meta/bnk_sony.c
//
// File layout:
//   BnkHeader        (0x18 bytes)
//   SBlk section     (at sblk_offset, sblk_size bytes)
//     - SBlk header
//     - Table1: sound/cue entries   (n_sounds × 0x0c)
//     - Table2: grain entries       (n_grains × 0x08)
//     - Table3: wave entries        (n_waves  × 0x18)
//     - Table4: name entries        (n_sounds × 0x6c)
//   Audio data       (at data_offset, PS-ADPCM interleaved)
//
// Hierarchy:
//   Sound → one or more Grains (grain types: 0x01=wave, 0x15=silence, 0x16=jump,
//                               0x1a=randomize, 0x22=group, 0x2b=unknown)
//   Wave Grain → Wave entry (SPU audio address + size + loop info)

export class BnkHeader {
  range = new BufferRange();

  version = 0;
  parts = 0;
  sblk_offset = 0;
  sblk_size = 0;
  data_offset = 0;
  data_size = 0;

  static readonly SIZE = 0x18;

  static load(range: BufferRange): BnkHeader {
    const ret = new BnkHeader();
    ret.range = range.slice(0, BnkHeader.SIZE);
    ret.version     = ret.range.getUint32(0x00);
    ret.parts       = ret.range.getUint32(0x04);
    ret.sblk_offset = ret.range.getUint32(0x08);
    ret.sblk_size   = ret.range.getUint32(0x0c);
    ret.data_offset = ret.range.getUint32(0x10);
    ret.data_size   = ret.range.getUint32(0x14);
    return ret;
  }

  get sblkRange(): BufferRange {
    return this.range.reset(this.sblk_offset, this.sblk_offset + this.sblk_size);
  }

  get dataRange(): BufferRange {
    return this.range.reset(this.data_offset, this.data_offset + this.data_size);
  }
}

export class BnkSBlk {
  range = new BufferRange();

  magic = "";
  version = 0;

  // Counts
  n_sounds = 0;   // table1 entries (cues/sounds)
  n_grains = 0;   // table2 entries (grain chain per sound)
  n_streams = 0;  // number of simultaneous streams (not wave count)

  // Table offsets relative to the start of the SBlk range
  table1_offset = 0;
  table2_offset = 0;
  table3_offset = 0;
  table4_offset = 0;

  // SBlk-level audio metadata (v3+)
  spu_base_addr = 0;  // SPU RAM base address for this bank's audio data (+0x24)
  ram_size = 0;       // size of audio data in SPU RAM (+0x28 or +0x2c)

  static load(range: BufferRange): BnkSBlk {
    const ret = new BnkSBlk();
    ret.range = range.clone();
    ret.magic   = ret.range.slice(0, 4).getString();
    ret.version = ret.range.getUint32(0x04);

    switch (ret.version) {
      case 0x01: // Ratchet & Clank (PS2)
        ret.n_sounds = ret.range.getUint16(0x16);
        ret.n_grains = ret.range.getUint16(0x18);
        ret.n_streams = ret.range.getUint16(0x1a);
        ret.table1_offset = ret.range.getUint16(0x1c);
        ret.table2_offset = ret.range.getUint16(0x20);
        ret.table3_offset = ret.table2_offset;
        ret.table4_offset = 0;
        break;

      case 0x03: // WipEout Fusion (PS2), Yu-Gi-Oh! GX (PS2)
      case 0x04: // test banks
      case 0x05: // Ratchet & Clank (PS3)
      case 0x08: // PlayStation Home Arcade (Vita)
      case 0x09: // Puyo Puyo Tetris (PS4)
        ret.n_sounds = ret.range.getUint16(0x16);
        ret.n_grains = ret.range.getUint16(0x18);
        ret.n_streams = ret.range.getUint16(0x1a);
        ret.table1_offset = ret.range.getUint16(0x1c);
        ret.table2_offset = ret.range.getUint16(0x20);
        ret.spu_base_addr = ret.range.getUint32(0x24);
        ret.ram_size      = ret.range.getUint32(0x28);
        ret.table3_offset = ret.range.getUint32(0x34);
        ret.table4_offset = ret.range.getUint32(0x38);
        break;

      case 0x0d: // Polara (Vita), Crypt of the Necrodancer (Vita)
      case 0x0e: // Yakuza 6 Puyo Puyo (PS4)
        ret.table1_offset = ret.range.getUint32(0x18);
        ret.table2_offset = ret.range.getUint32(0x1c);
        ret.table3_offset = ret.range.getUint32(0x2c);
        ret.table4_offset = ret.range.getUint32(0x30);
        ret.n_sounds  = ret.range.getUint16(0x38);
        ret.n_grains  = ret.range.getUint16(0x3a);
        ret.n_streams = ret.range.getUint16(0x3c);
        break;

      default:
        console.warn(`BnkSBlk: unknown version 0x${ret.version.toString(16)}`);
        break;
    }

    return ret;
  }

  /** Range of table1 (sound/cue entries) relative to start of SBlk buffer */
  get table1Range(): BufferRange {
    return this.range.slice(this.table1_offset);
  }

  /** Range of table2 (grain chain entries) relative to start of SBlk buffer */
  get table2Range(): BufferRange {
    return this.range.slice(this.table2_offset);
  }

  /** Range of table3 (wave/stream entries) relative to start of SBlk buffer */
  get table3Range(): BufferRange {
    return this.range.slice(this.table3_offset);
  }

  /** Range of table4 (name entries) relative to start of SBlk buffer */
  get table4Range(): BufferRange {
    return this.range.slice(this.table4_offset);
  }
}

// Grain types used in Table2
export const GRAIN_TYPE_WAVE      = 0x01;
export const GRAIN_TYPE_SILENCE   = 0x15;
export const GRAIN_TYPE_JUMP      = 0x16;
export const GRAIN_TYPE_RANDOMIZE = 0x1a;
export const GRAIN_TYPE_GROUP     = 0x22;

export class BnkGrain {
  range = new BufferRange();

  // Byte layout: [wave_offset_lo][wave_offset_hi][?][grain_type]
  grain_type = 0;
  wave_offset = 0;  // byte offset from table3 start (stride 0x18); only valid when grain_type == GRAIN_TYPE_WAVE
  extra = 0;        // grain_type-specific extra value (e.g. jump target, loop count)

  static readonly SIZE = 0x08;

  static load(range: BufferRange): BnkGrain {
    const ret = new BnkGrain();
    ret.range = range.slice(0, BnkGrain.SIZE);
    ret.wave_offset = ret.range.getUint16(0x00);  // LE: bytes [0][1]
    // byte [2] is padding/unknown
    ret.grain_type  = ret.range.getUint8(0x03);
    ret.extra       = ret.range.getUint32(0x04);
    return ret;
  }

  get isWave(): boolean {
    return this.grain_type === GRAIN_TYPE_WAVE;
  }
}

export class BnkWave {
  range = new BufferRange();

  // +0x00: u32 — internal pitch/id value (SCREAM-internal identifier, possibly a hash or note encoding)
  // +0x04: u32 — unknown/reserved (always 0 in observed files)
  // +0x08: u8  — unknown (always 0)
  // +0x09: u8  — loop mode (0 = no loop, non-zero = loop)
  // +0x0a: u8  — volume  (0–255, 255 = max)
  // +0x0b: u8  — pan     (0–255, 128 = center)
  // +0x0c: u32 — SPU RAM buffer size hint (low 16 bits) | channel count/flags (high 16 bits)
  // +0x10: u32 — byte offset of audio data within the bank's data section (spu_addr at runtime)
  // +0x14: u32 — size of audio data in bytes (PS-ADPCM: must be multiple of 0x10)

  pitch_id = 0;
  loop_mode = 0;
  volume = 0;
  pan = 0;
  spu_buffer_size = 0;
  spu_addr = 0;
  data_size = 0;

  static readonly SIZE = 0x18;

  static load(range: BufferRange): BnkWave {
    const ret = new BnkWave();
    ret.range = range.slice(0, BnkWave.SIZE);
    ret.pitch_id        = ret.range.getUint32(0x00);
    // +0x04: reserved
    ret.loop_mode       = ret.range.getUint8(0x09);
    ret.volume          = ret.range.getUint8(0x0a);
    ret.pan             = ret.range.getUint8(0x0b);
    ret.spu_buffer_size = ret.range.getUint32(0x0c);
    ret.spu_addr        = ret.range.getUint32(0x10);
    ret.data_size       = ret.range.getUint32(0x14);
    return ret;
  }

  get isLoop(): boolean {
    return this.loop_mode !== 0;
  }

  /** Byte offset of this wave's audio data within the bank's data section.
   *  The spu_addr field stores the data section offset directly (it equals the
   *  SPU RAM load address at runtime, but no base subtraction is required here). */
  get dataOffset(): number {
    return this.spu_addr;
  }

  /** Number of PS-ADPCM samples (28 per 16-byte block) */
  get sampleCount(): number {
    return (this.data_size / 16) * 28;
  }
}

// Table1: sound/cue entry
// Layout (v3/v4/v5): [u32 id/hash][u32 flags][u16 grain_table_offset_in_table2]…
export class BnkSound {
  range = new BufferRange();

  id = 0;
  flags = 0;
  grain_table_offset = 0;  // byte offset into Table2 for this sound's grain chain

  static readonly SIZE = 0x0c;

  static load(range: BufferRange): BnkSound {
    const ret = new BnkSound();
    ret.range = range.slice(0, BnkSound.SIZE);
    ret.id    = ret.range.getUint32(0x00);
    ret.flags = ret.range.getUint32(0x04);
    ret.grain_table_offset = ret.range.getUint16(0x08);
    return ret;
  }
}

// Table4: name entry (0x6c bytes, one per n_sounds entry)
// First entry is the bank-level entry (bank name + global sound ID list).
// Layout:
//   +0x00 (8 bytes)  : null-terminated bank/sound name (padded)
//   +0x08 (4 bytes)  : entry-level info / count / id
//   +0x0c (4 bytes)  : reserved
//   +0x10 onwards    : additional name continuation / id lists
// NOTE: Name strings can span across the 0x6c-byte slot boundaries — the table4
//       region is essentially a flat variable-length string table with fixed-size
//       entries interleaved. Parse by searching for null-terminated strings.
export class BnkNameEntry {
  range = new BufferRange();

  name = "";
  info = 0;   // first u32 after the name (section id, sound count, or similar)

  static readonly SIZE = 0x6c;

  static load(range: BufferRange): BnkNameEntry {
    const ret = new BnkNameEntry();
    ret.range = range.slice(0, BnkNameEntry.SIZE);
    ret.name = ret.range.slice(0, 8).getString();
    ret.info = ret.range.getUint32(0x08);
    return ret;
  }
}

export class Bnk {
  range = new BufferRange();

  header = new BnkHeader();
  sblk   = new BnkSBlk();

  sounds: BnkSound[] = [];
  // Waves indexed sequentially (for export); also accessible by table3 byte offset via waveAtOffset()
  waves: BnkWave[] = [];
  // Grains are inlined per-sound; access via grainAt()

  /** Maps table3 byte offset → wave index in this.waves[] */
  private _waveOffsetToIdx = new Map<number, number>();

  static load(buffer: ArrayBuffer): Bnk {
    const ret = new Bnk();
    ret.range = new BufferRange(buffer);

    ret.header = BnkHeader.load(ret.range);
    ret.sblk   = BnkSBlk.load(ret.header.sblkRange);

    // Load sounds (Table1)
    const t1 = ret.sblk.table1Range;
    for (let i = 0; i < ret.sblk.n_sounds; i++) {
      ret.sounds.push(BnkSound.load(t1.slice(i * BnkSound.SIZE)));
    }

    // Load waves (Table3) by scanning grain table for all type=0x01 offsets.
    // Table3 is a heterogeneous flat buffer: type=0x01 (wave) entries are 0x18 bytes
    // each, while type=0x05 (special/stream) entries are 0x20 bytes each; they are
    // interleaved at arbitrary positions.  Each grain's wave_offset is a direct byte
    // offset into table3 pointing to the correct entry — we use that mapping directly
    // rather than assuming a uniform stride.
    const t2 = ret.sblk.table2Range;
    const t3 = ret.sblk.table3Range;
    const waveOffsets: number[] = [];
    for (let i = 0; i < ret.sblk.n_grains; i++) {
      const g = BnkGrain.load(t2.slice(i * BnkGrain.SIZE));
      if (g.grain_type === GRAIN_TYPE_WAVE && !ret._waveOffsetToIdx.has(g.wave_offset)) {
        ret._waveOffsetToIdx.set(g.wave_offset, ret.waves.length);
        waveOffsets.push(g.wave_offset);
        ret.waves.push(BnkWave.load(t3.slice(g.wave_offset)));
      }
    }

    // Sort waves[] by their table3 offset so the array is in file order
    const pairs = waveOffsets.map((off, i) => ({ off, wave: ret.waves[i] }));
    pairs.sort((a, b) => a.off - b.off);
    ret.waves = pairs.map(p => p.wave);
    ret._waveOffsetToIdx.clear();
    pairs.forEach((p, i) => ret._waveOffsetToIdx.set(p.off, i));

    return ret;
  }

  /** Get the grain at a byte offset within Table2 */
  grainAt(byteOffset: number): BnkGrain {
    return BnkGrain.load(this.sblk.table2Range.slice(byteOffset));
  }

  /** Get all grains for a given sound by following the grain chain from Table2 */
  grainsForSound(sound: BnkSound): BnkGrain[] {
    const grains: BnkGrain[] = [];
    let offset = sound.grain_table_offset;
    // Collect grains up to a reasonable limit; stop at non-chain grain types
    for (let guard = 0; guard < 64; guard++) {
      const grain = this.grainAt(offset);
      grains.push(grain);
      // Only RANDOMIZE (0x1a) and GROUP (0x22) grains chain to further grains via extra
      // Simple wave/silence/jump grains terminate the chain for this sound
      if (grain.grain_type !== GRAIN_TYPE_RANDOMIZE && grain.grain_type !== GRAIN_TYPE_GROUP) break;
      offset += BnkGrain.SIZE;
    }
    return grains;
  }

  /** Get the wave entry that a wave grain references */
  waveForGrain(grain: BnkGrain): BnkWave | undefined {
    if (!grain.isWave) return undefined;
    return this.waves[this._waveOffsetToIdx.get(grain.wave_offset) ?? -1];
  }

  /** Index of the wave entry that a wave grain references (for display) */
  waveIndexForGrain(grain: BnkGrain): number {
    if (!grain.isWave) return -1;
    return this._waveOffsetToIdx.get(grain.wave_offset) ?? -1;
  }

  /** Get the audio data range for a wave */
  audioRange(wave: BnkWave): BufferRange {
    const offset = wave.dataOffset;
    return this.header.dataRange.slice(offset, offset + wave.data_size);
  }
}
