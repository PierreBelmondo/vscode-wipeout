import { BufferRange } from "@core/utils/range";
import { Mipmap } from "@core/utils/mipmaps";

// PS2 PCT texture format.
// A wrapper around a PS2 GIF/GS DMA packet stream, used for billboard and
// font textures in WipEout Pulse (PS2) and WipEout Fusion (PS2).
//
// File layout:
//   [0x00] 13-byte custom header
//     byte 0: dimension tag = (log2(width) << 4) | log2(height)
//     byte 2: flags — bit 6 (0x40) set = image is stored top-to-bottom;
//                     bit 6 clear = image is stored bottom-to-top (flip Y on decode)
//     bytes 4-5: height (LE u16)
//     bytes 6-7: width  (LE u16)
//   [0x8d] GIF A+D packet stream (16-byte blocks)
//     Each image transfer = 3 setup blocks + IMAGE tag + raw pixel data:
//       Block n+0: GS reg 0x51 (TRXPOS) — dest blit position
//       Block n+1: GS reg 0x52 (TRXREG) — transfer rectangle (rrw, rrh)
//       Block n+2: GS reg 0x53 (TRXDIR) — transfer direction
//       Block n+3: GIF IMAGE tag         — NLOOP = data size in 16-byte units
//       ... raw pixel data (NLOOP * 16 bytes)
//     Transfer 0: pixel indices (8bpp or 4bpp)
//     Transfer 1: CLUT palette (RGBA32, PS2 alpha range 0–128 where 0x80 = opaque)
//
// For 8bpp textures: 256-entry CLUT (1024 bytes), block-pair swizzle applied.
//   Pixel data is stored in PS2 PSMT8 swizzled layout and must be unswizzled.
// For 4bpp textures: 16-entry CLUT (64 bytes), no swizzle.
//
// PS2 alpha conversion: out_alpha = clamp(ps2_alpha * 2, 255)

const GIF_STREAM_OFFSET = 0x8d;
const GIF_BLOCK_SIZE = 16;

const GS_TRXPOS = 0x51;
const GS_TRXREG = 0x52;
const GS_TRXDIR = 0x53;

interface PCTTransfer {
  dataOffset: number;
  dataSize: number;
}

// Reorder 8bpp CLUT: PS2 swaps block pairs so entries [8..15] and [16..23]
// are exchanged (and similarly for each group of 32).
function unswizzleClut8(clut: Uint8Array): Uint8Array {
  const out = new Uint8Array(clut.length);
  for (let i = 0; i < 256; i++) {
    let src = i;
    if ((i & 0x18) === 0x08) src = i + 8;
    else if ((i & 0x18) === 0x10) src = i - 8;
    out[i * 4 + 0] = clut[src * 4 + 0];
    out[i * 4 + 1] = clut[src * 4 + 1];
    out[i * 4 + 2] = clut[src * 4 + 2];
    out[i * 4 + 3] = clut[src * 4 + 3];
  }
  return out;
}

// Unswizzle 8bpp pixel indices from PS2 PSMT8 GS memory layout.
// Ported from the 4bpp unswizzle algorithm by Dageron / L33TMasterJacob.
// Source: https://gist.github.com/Fireboyd78/1546f5c86ebce52ce05e7837c697dc72
function unswizzle8(pixels: Uint8Array, width: number, height: number): Uint8Array {
  const InterlaceMatrix = [0x00, 0x10, 0x02, 0x12, 0x11, 0x01, 0x13, 0x03];
  const Matrix = [0, 1, -1, 0];
  const TileMatrix = [4, -4];
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oddRow = (y & 1) !== 0;
      const num1 = (y >> 2) & 1;
      const num2 = (x >> 2) & 1;
      const num3 = y & 3;
      let num4 = (x >> 2) & 3;
      if (oddRow) num4 += 4;
      const num5 = (x * 4) & 15;
      const num6 = ((x >> 4) * 32);
      const num7 = (oddRow ? y - 1 : y) * width;
      const xx = x + num1 * TileMatrix[num2];
      const yy = y + Matrix[num3];
      const i = InterlaceMatrix[num4] + num5 + num6 + num7;
      const j = yy * width + xx;
      if (i >= 0 && i < pixels.length && j >= 0 && j < out.length)
        out[j] = pixels[i];
    }
  }
  return out;
}

// Flip image vertically in-place.
function flipY(rgba: Uint8Array, width: number, height: number): void {
  const rowBytes = width * 4;
  const tmp = new Uint8Array(rowBytes);
  for (let y = 0; y < height >> 1; y++) {
    const a = y * rowBytes;
    const b = (height - 1 - y) * rowBytes;
    tmp.set(rgba.subarray(a, a + rowBytes));
    rgba.copyWithin(a, b, b + rowBytes);
    rgba.set(tmp, b);
  }
}

function decodeIndexed(pixels: Uint8Array, clut: Uint8Array, count: number): Uint8Array {
  const rgba = new Uint8Array(count * 4);
  for (let i = 0; i < count; i++) {
    const idx = pixels[i];
    rgba[i * 4 + 0] = clut[idx * 4 + 0];
    rgba[i * 4 + 1] = clut[idx * 4 + 1];
    rgba[i * 4 + 2] = clut[idx * 4 + 2];
    // PS2 alpha: 0–128, 0x80 = fully opaque. Scale to 0–255.
    rgba[i * 4 + 3] = Math.min(clut[idx * 4 + 3] * 2, 255);
  }
  return rgba;
}

function decode4bpp(packed: Uint8Array, clut: Uint8Array, count: number): Uint8Array {
  const rgba = new Uint8Array(count * 4);
  for (let i = 0; i < count; i++) {
    const byte = packed[i >> 1];
    const idx = (i & 1) === 0 ? (byte & 0x0f) : (byte >> 4);
    rgba[i * 4 + 0] = clut[idx * 4 + 0];
    rgba[i * 4 + 1] = clut[idx * 4 + 1];
    rgba[i * 4 + 2] = clut[idx * 4 + 2];
    rgba[i * 4 + 3] = Math.min(clut[idx * 4 + 3] * 2, 255);
  }
  return rgba;
}

export class PCT {
  width = 0;
  height = 0;
  mipmap: Mipmap | null = null;

  static load(buffer: ArrayBuffer): PCT {
    const ret = new PCT();
    const range = new BufferRange(buffer);

    // bytes 4-5 = height, bytes 6-7 = width (swapped vs intuition)
    ret.height = range.getUint16(4);
    ret.width = range.getUint16(6);
    // byte 2 bit 6: set = top-to-bottom, clear = bottom-to-top (flip Y needed)
    const flipVertical = (range.getUint8(2) & 0x40) === 0;

    const transfers = PCT.parseTransfers(range);
    if (transfers.length < 2) return ret;

    const pixTransfer = transfers[0];
    const clutTransfer = transfers[1];

    const pixelCount = ret.width * ret.height;
    const is4bpp = pixTransfer.dataSize * 2 === pixelCount;
    const is8bpp = pixTransfer.dataSize === pixelCount;

    const clutRaw = range.getUint8Array(clutTransfer.dataOffset, clutTransfer.dataSize);
    const pixData = range.getUint8Array(pixTransfer.dataOffset, pixTransfer.dataSize);

    let rgba: Uint8Array;

    if (is4bpp) {
      // 16-entry CLUT, no swizzle needed
      rgba = decode4bpp(pixData, clutRaw, pixelCount);
    } else if (is8bpp) {
      // 256-entry CLUT with block-pair swizzle; pixel data needs PSMT8 unswizzle
      const clut = unswizzleClut8(clutRaw);
      rgba = decodeIndexed(unswizzle8(pixData, ret.width, ret.height), clut, pixelCount);
    } else {
      return ret;
    }

    if (flipVertical) flipY(rgba, ret.width, ret.height);

    ret.mipmap = { type: "RGBA", width: ret.width, height: ret.height, data: rgba };
    return ret;
  }

  private static parseTransfers(range: BufferRange): PCTTransfer[] {
    const transfers: PCTTransfer[] = [];
    let offset = GIF_STREAM_OFFSET;

    while (offset + GIF_BLOCK_SIZE * 4 <= range.size) {
      // GIF A+D block structure: 8-byte data + 1-byte register addr + 7 bytes padding
      const addr0 = range.getUint8(offset + 8);
      const addr1 = range.getUint8(offset + GIF_BLOCK_SIZE + 8);
      const addr2 = range.getUint8(offset + GIF_BLOCK_SIZE * 2 + 8);

      if (addr0 !== GS_TRXPOS || addr1 !== GS_TRXREG || addr2 !== GS_TRXDIR) break;

      // GIF IMAGE tag: NLOOP at bits [14:0]
      const gifTagLo = range.getUint32(offset + GIF_BLOCK_SIZE * 3);
      const nloop = gifTagLo & 0x7fff;
      const dataOffset = offset + GIF_BLOCK_SIZE * 4;
      const dataSize = nloop * GIF_BLOCK_SIZE;

      if (dataOffset + dataSize > range.size) break;

      transfers.push({ dataOffset, dataSize });
      offset = dataOffset + dataSize;
    }

    return transfers;
  }
}
