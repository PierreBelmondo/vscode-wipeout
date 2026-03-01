import { Mipmap } from "@core/utils/mipmaps";
import { BufferRange } from "@core/utils/range";

// PSP/PS2 files are little-endian, PS3 is big-endian.
// Raw file bytes are always 01 46 4E 54; first byte 0x01 = LE, 0x54 ('T') = BE.

export class FNTGlyph {
  codepoint = 0;
  texWidth = 0;
  texHeight = 0;
  texX1 = 0;
  texX2 = 0;
  texY1 = 0;
  texY2 = 0;
  pixelWidth = 0;
  advanceX = 0;

  static readonly SIZE = 18;

  static load(range: BufferRange, offset: number): FNTGlyph {
    const ret = new FNTGlyph();
    ret.codepoint = range.getUint16(offset + 0);
    ret.texWidth = range.getUint8(offset + 2);
    ret.texHeight = range.getUint8(offset + 3);
    ret.texX1 = range.getUint16(offset + 4);
    ret.texX2 = range.getUint16(offset + 6);
    ret.texY1 = range.getUint16(offset + 8);
    ret.texY2 = range.getUint16(offset + 10);
    ret.pixelWidth = range.getUint8(offset + 12);
    ret.advanceX = range.getInt8(offset + 13);
    return ret;
  }
}

class FNTImageHeader {
  width = 0;
  height = 0;
  swizzle = false;

  static readonly SIZE = 0x80;

  static load(range: BufferRange, offset: number): FNTImageHeader {
    const ret = new FNTImageHeader();
    ret.width = range.getUint16(offset + 0);
    ret.height = range.getUint16(offset + 2);
    // byte 6: swizzle flag (1 = PSP swizzled, 0 = linear)
    ret.swizzle = range.getUint8(offset + 6) === 1;
    return ret;
  }
}

class FNTHeader {
  magic = 0;
  glyphs = 0;
  charsetOffset = 0;
  glyphOffsetsOffset = 0;
  fontHeight = 0;
  imageOffset = 0;

  static readonly SIZE = 0x40;

  static load(range: BufferRange): FNTHeader {
    const ret = new FNTHeader();
    ret.magic = range.getUint32(0);
    ret.glyphs = range.getUint32(4);
    ret.charsetOffset = range.getUint32(8);
    ret.glyphOffsetsOffset = range.getUint32(12);
    ret.fontHeight = range.getUint32(16);
    ret.imageOffset = range.getUint32(24);
    return ret;
  }
}

// PSP swizzle unswizzle for 4bpp (Gray4) data.
// http://homebrew.pixelbath.com/wiki/PSP_texture_swizzling
// Data is stored in 16-byte-wide x 8-row tiles.
function unswizzleGray4(swizzled: Uint8Array, width: number): Uint8Array {
  const blockW = 16; // bytes
  const blockH = 8;  // rows
  const rowStride = width >> 1; // bytes per row
  const blocksPerRow = rowStride / blockW;
  const output = new Uint8Array(swizzled.length);

  for (let b = 0; b < swizzled.length / (blockW * blockH); b++) {
    const blockCol = b % blocksPerRow;
    const blockRow = (b / blocksPerRow) | 0;
    for (let row = 0; row < blockH; row++) {
      const srcOff = b * blockW * blockH + row * blockW;
      const dstOff = (blockRow * blockH + row) * rowStride + blockCol * blockW;
      output.set(swizzled.subarray(srcOff, srcOff + blockW), dstOff);
    }
  }

  return output;
}

export class FNT {
  range = new BufferRange();
  header = new FNTHeader();
  glyphs: FNTGlyph[] = [];
  charset: number[] = [];
  imageHeader: FNTImageHeader | null = null;
  mipmap: Mipmap | null = null;

  // PS2 stores the image in a companion .pct file; in that case imageOffset
  // equals the file size and the image fields above remain null.
  get hasEmbeddedImage(): boolean {
    return this.header.imageOffset < this.range.size;
  }

  static async load(buffer: ArrayBuffer) {
    const ret = new FNT();
    ret.range = new BufferRange(buffer);

    // Detect endianness from first byte: 0x01 = LE (PSP/PS2), 0x54 ('T') = BE (PS3)
    const firstByte = ret.range.getUint8(0);
    ret.range.le = firstByte === 0x01;

    ret.header = FNTHeader.load(ret.range);

    // Parse charset (array of u16 codepoints, null-terminated in some variants)
    const charsetOff = ret.header.charsetOffset;
    for (let i = 0; i < ret.header.glyphs; i++) {
      const cp = ret.range.getUint16(charsetOff + i * 2);
      if (cp === 0) break;
      ret.charset.push(cp);
    }

    // Parse glyph offset table, then load each glyph entry.
    // Some variants null-terminate the charset and use a garbage sentinel as the
    // last glyph offset; skip any entry whose offset is out of range.
    const glyphOffsetsOff = ret.header.glyphOffsetsOffset;
    for (let i = 0; i < ret.header.glyphs; i++) {
      if (ret.charset[i] === 0) break;
      const glyphOff = ret.range.getUint32(glyphOffsetsOff + i * 4);
      if (glyphOff + FNTGlyph.SIZE > ret.range.size) break;
      ret.glyphs.push(FNTGlyph.load(ret.range, glyphOff));
    }

    // Parse embedded image (absent on PS2 where the image lives in a .pct file)
    if (ret.hasEmbeddedImage) {
      const imgHdrOff = ret.header.imageOffset;
      ret.imageHeader = FNTImageHeader.load(ret.range, imgHdrOff);

      const { width, height, swizzle } = ret.imageHeader;
      const imgDataOff = imgHdrOff + FNTImageHeader.SIZE;
      const imgDataSize = (width * height) / 2;
      let data = ret.range.getUint8Array(imgDataOff, imgDataSize);

      if (swizzle) {
        data = unswizzleGray4(data, width);
      }

      ret.mipmap = { type: "Gray4", width, height, data };
    }

    return ret;
  }
}
