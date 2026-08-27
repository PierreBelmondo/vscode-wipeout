import { BufferRange } from "@core/utils/range";
import { DXT1, DXT3, DXT5 } from "@core/utils/dxt";
import { Mipmaps } from "@core/utils/mipmaps";

enum CellGcmTexture {
  B8 = 0x81,
  A1R5G5B5 = 0x82,
  A4R4G4B4 = 0x83,
  R5G6B5 = 0x84,
  A8R8G8B8 = 0x85,
  COMPRESSED_DXT1 = 0x86,
  COMPRESSED_DXT23 = 0x87,
  COMPRESSED_DXT45 = 0x88,
  G8B8 = 0x8b,
  COMPRESSED_B8R8_G8R8 = 0x8d,
  COMPRESSED_R8B8_R8G8 = 0x8e,
  R6G5B5 = 0x8f,
  DEPTH24_D8 = 0x90,
  DEPTH24_D8_FLOAT = 0x91,
  DEPTH16 = 0x92,
  DEPTH16_FLOAT = 0x93,
  X16 = 0x94,
  Y16_X16 = 0x95,
  R5G5B5A1 = 0x97,
  COMPRESSED_HILO8 = 0x98,
  COMPRESSED_HILO_S8 = 0x99,
  W16_Z16_Y16_X16_FLOAT = 0x9a,
  W32_Z32_Y32_X32_FLOAT = 0x9b,
  X32_FLOAT = 0x9c,
  D1R5G5B5 = 0x9d,
  D8R8G8B8 = 0x9e,
  Y16_X16_FLOAT = 0x9f,
}

class GTFHeader {
  range = new BufferRange();

  version = 0x01050000;
  allocated_size = 0;
  unknown2 = 0;
  unknown3 = 0;
  unknown4 = 0;
  data_size = 0;
  flags = 0;
  unknown7 = 0;
  width = 0;
  height = 0;
  unknown9 = 0;

  static load(range: BufferRange): GTFHeader {
    const ret = new GTFHeader();
    ret.range = range.slice(0, 0x80);
    ret.version = ret.range.getUint32(0);
    ret.allocated_size = ret.range.getUint32(4);
    ret.unknown2 = ret.range.getUint32(8);
    ret.unknown3 = ret.range.getUint32(12);
    ret.unknown4 = ret.range.getUint32(16);
    ret.data_size = ret.range.getUint32(20);
    ret.flags = ret.range.getUint32(24);
    ret.unknown7 = ret.range.getUint32(28);
    ret.width = ret.range.getUint16(32);
    ret.height = ret.range.getUint16(34);
    ret.unknown9 = ret.range.getUint32(38);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }

  get data(): BufferRange {
    return this.range.reset(this.size, this.size + this.data_size);
  }

  get format(): CellGcmTexture {
    return ((this.flags >> 24) & 0x9f) as CellGcmTexture;
  }

  get formatName(): string {
    return "CELL_GCM_TEXTURE_" + CellGcmTexture[this.format];
  }

  get isDXT(): boolean {
    return this.flags == CellGcmTexture.COMPRESSED_DXT1 || this.flags == CellGcmTexture.COMPRESSED_DXT23 || this.flags == CellGcmTexture.COMPRESSED_DXT45;
  }

  get normalized(): boolean {
    return ((this.flags >> 24) & 0x40) == 0;
  }

  get swizzle(): boolean {
    return !this.isDXT && ((this.flags >> 24) & 0x20) == 0;
  }

  get isPowerOf2(): boolean {
    return !this.isDXT && ((this.flags >> 24) & 0x20) == 0;
  }

  get mipmaps(): number {
    return (this.flags & 0x00ff0000) >> 16;
  }

  get isCube(): boolean {
    return (this.flags & 0x000000ff) != 0;
  }
}

export class GTF {
  range = new BufferRange();
  header = new GTFHeader();
  mipmaps: Mipmaps = [];

  /**
   * The six faces of a cube texture, +X -X +Y -Y +Z -Z, each with its own mip
   * chain. Empty for ordinary 2D textures.
   *
   * A cube stores its faces one after another in the data block, so the plain
   * `mipmaps` list above only ever describes the first face; sampling that as a
   * 2D texture is what left environment skyboxes black.
   */
  faces: Mipmaps[] = [];

  get isCube(): boolean {
    return this.header.isCube;
  }

  static load(buffer: ArrayBuffer): GTF {
    const ret = new GTF();
    ret.range = new BufferRange(buffer);
    ret.range.le = false;

    ret.header = GTFHeader.load(ret.range);

    switch (ret.header.format) {
      case CellGcmTexture.B8:
      case CellGcmTexture.A1R5G5B5:
      case CellGcmTexture.A4R4G4B4:
      case CellGcmTexture.R5G6B5:
        console.warn(`Format ${ret.header.formatName} is not implemented`);
        break;
      case CellGcmTexture.A8R8G8B8:
        console.log("Loading A8R8G8B8 data...");
        ret.loadA8R8G8B8();
        break;
      case CellGcmTexture.COMPRESSED_DXT1:
        console.log("Loading COMPRESSED_DXT1 data...");
        ret.loadCompressedDXT1();
        break;
      case CellGcmTexture.COMPRESSED_DXT23:
        console.log("Loading COMPRESSED_DXT23 data...");
        ret.loadCompressedDXT23();
        break;
      case CellGcmTexture.COMPRESSED_DXT45:
        console.log("Loading COMPRESSED_DXT45 data...");
        ret.loadCompressedDXT45();
        break;
      case CellGcmTexture.G8B8:
      case CellGcmTexture.COMPRESSED_B8R8_G8R8:
      case CellGcmTexture.COMPRESSED_R8B8_R8G8:
      case CellGcmTexture.R6G5B5:
      case CellGcmTexture.DEPTH24_D8:
      case CellGcmTexture.DEPTH24_D8_FLOAT:
      case CellGcmTexture.DEPTH16:
      case CellGcmTexture.DEPTH16_FLOAT:
      case CellGcmTexture.X16:
      case CellGcmTexture.Y16_X16:
      case CellGcmTexture.R5G5B5A1:
      case CellGcmTexture.COMPRESSED_HILO8:
      case CellGcmTexture.COMPRESSED_HILO_S8:
      case CellGcmTexture.W16_Z16_Y16_X16_FLOAT:
      case CellGcmTexture.W32_Z32_Y32_X32_FLOAT:
      case CellGcmTexture.X32_FLOAT:
      case CellGcmTexture.D1R5G5B5:
      case CellGcmTexture.D8R8G8B8:
      case CellGcmTexture.Y16_X16_FLOAT:
        console.warn(`Format ${ret.header.formatName} is not implemented`);
        break;
      default:
        console.error(`Unexpected format ${ret.header.format}`);
        break;
    }

    ret.splitCubeFaces();

    return ret;
  }

  /**
   * A cube's data block holds six consecutive faces. The format loaders read a
   * single face's worth of mips, so re-read the remaining five here.
   */
  private splitCubeFaces() {
    if (!this.header.isCube) return;
    if (this.mipmaps.length === 0) return;

    const faceSize = this.mipmaps.reduce((total, mipmap) => total + mipmap.data.length, 0);
    // Each face's mip chain starts on a 128-byte boundary, so a face whose
    // mips do not sum to a multiple of 128 is followed by padding. Slicing by
    // the raw size read every face after the first up to 360 bytes early --
    // a shifted DXT block stream, which scrolls the face's content sideways a
    // little more per face. 12_sol_2's sky measures exactly this: faceSize
    // 2,796,216 = 56 bytes past a boundary, 72 bytes of pad per face, and the
    // file's data block is 5 x 72 = 360 bytes larger than 6 x faceSize (the
    // last face needs no pad). Seam error against the GL cube adjacency drops
    // from 30 to the texture's own noise floor with the stride corrected.
    const faceStride = Math.ceil(faceSize / 128) * 128;
    if (faceSize === 0 || this.header.data.size < faceStride * 5 + faceSize) return;

    const dataRange = this.header.data;
    for (let face = 0; face < 6; face++) {
      const base = face * faceStride;
      let offset = 0;
      const chain: Mipmaps = [];
      for (const mipmap of this.mipmaps) {
        const data = dataRange.getUint8Array(base + offset, mipmap.data.length);
        chain.push({ type: mipmap.type, width: mipmap.width, height: mipmap.height, data });
        offset += mipmap.data.length;
      }
      this.faces.push(chain);
    }
  }

  loadA8R8G8B8() {
    const dataRange = this.header.data;
    this.mipmaps = [];

    let width = this.header.width;
    let height = this.header.height;
    let dataOffset = 0;
    for (let i = 0; i < this.header.mipmaps; i++) {
      const dataLength = width * height * 4;
      const data = dataRange.getUint8Array(dataOffset, dataOffset + dataLength);
      this.mipmaps.push({ type: "ARGB", width, height, data });
      width = Math.floor(width / 2);
      height = Math.floor(height / 2);
      dataOffset += dataLength;
    }
  }

  loadCompressedDXT1() {
    const dataRange = this.header.data;
    this.mipmaps = [];

    let width = this.header.width;
    let height = this.header.height;
    let dataOffset = 0;
    for (let i = 0; i < this.header.mipmaps; i++) {
      const dataLength = DXT1.size(width, height);
      const data = dataRange.getUint8Array(dataOffset, dataLength);
      this.mipmaps.push({ type: "DXT1", width, height, data });
      width = Math.floor(width / 2);
      height = Math.floor(height / 2);
      dataOffset += dataLength;
    }
  }

  loadCompressedDXT23() {
    const dataRange = this.header.data;
    this.mipmaps = [];

    let width = this.header.width;
    let height = this.header.height;
    let dataOffset = 0;
    for (let i = 0; i < this.header.mipmaps; i++) {
      const dataLength = DXT3.size(width, height);
      const data = dataRange.getUint8Array(dataOffset, dataLength);
      this.mipmaps.push({ type: "DXT3", width, height, data });
      width = width / 2;
      height = height / 2;
      dataOffset += dataLength;
    }
  }

  loadCompressedDXT45() {
    const dataRange = this.header.data;
    this.mipmaps = [];

    let width = this.header.width;
    let height = this.header.height;
    let dataOffset = 0;
    for (let i = 0; i < this.header.mipmaps; i++) {
      const dataLength = DXT5.size(width, height);
      const data = dataRange.getUint8Array(dataOffset, dataLength);
      this.mipmaps.push({ type: "DXT5", width, height, data });
      width = width / 2;
      height = height / 2;
      dataOffset += dataLength;
    }
  }

  export(): Mipmaps {
    return this.mipmaps;
  }
}
