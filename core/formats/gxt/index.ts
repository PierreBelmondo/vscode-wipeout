/**
 * PSVita GXT texture container parser.
 *
 * File layout:
 *   [0x00–0x1f]  GXT header (magic, version, texture count, data offset, sizes, palette counts)
 *   [0x20–...]   Per-texture info entries (0x20 bytes each)
 *   [dataOffset] Raw texture data
 *
 * Supported formats:
 *   0x83000000  PVRTCII 4BPP (dominant in WipEout 2048)
 *   0x0C000000  U8U8U8U8 (RGBA32, uncompressed)
 *   0x85000000  UBC1 / DXT1 / BC1
 *   0x87000000  UBC3 / DXT5 / BC3
 */

import { BufferRange } from "@core/utils/range";
import type { Mipmaps } from "@core/utils/mipmaps";
import { PVRTC2 } from "@core/utils/pvrtc2";

/* SceGxmTextureBaseFormat constants */
const FMT_U8U8U8U8   = 0x0C000000;
const FMT_PVRTII4BPP = 0x83000000;
const FMT_UBC1       = 0x85000000;
const FMT_UBC3       = 0x87000000;

/* ── Inline BC1/BC3 decompression (DataView-based, no BufferRange) ── */

function decompressBC1(width: number, height: number, data: ArrayBuffer): Uint8ClampedArray {
  const view = new DataView(data);
  const bw = Math.max(1, Math.ceil(width / 4));
  const bh = Math.max(1, Math.ceil(height / 4));
  const image = new Uint8ClampedArray(width * height * 4);
  let pos = 0;

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const c0 = view.getUint16(pos, true);
      const c1 = view.getUint16(pos + 2, true);
      const bits = view.getUint32(pos + 4, true);
      pos += 8;

      const r0 = (c0 >> 11) & 0x1f, g0 = (c0 >> 5) & 0x3f, b0 = c0 & 0x1f;
      const r1 = (c1 >> 11) & 0x1f, g1 = (c1 >> 5) & 0x3f, b1 = c1 & 0x1f;

      const palette = new Uint8Array(16); // 4 colours × RGBA
      palette[0] = (r0 << 3) | (r0 >> 2); palette[1] = (g0 << 2) | (g0 >> 4); palette[2] = (b0 << 3) | (b0 >> 2); palette[3] = 255;
      palette[4] = (r1 << 3) | (r1 >> 2); palette[5] = (g1 << 2) | (g1 >> 4); palette[6] = (b1 << 3) | (b1 >> 2); palette[7] = 255;

      if (c0 > c1) {
        palette[8]  = (2 * palette[0] + palette[4] + 1) / 3; palette[9]  = (2 * palette[1] + palette[5] + 1) / 3; palette[10] = (2 * palette[2] + palette[6] + 1) / 3; palette[11] = 255;
        palette[12] = (palette[0] + 2 * palette[4] + 1) / 3; palette[13] = (palette[1] + 2 * palette[5] + 1) / 3; palette[14] = (palette[2] + 2 * palette[6] + 1) / 3; palette[15] = 255;
      } else {
        palette[8]  = (palette[0] + palette[4]) >> 1; palette[9]  = (palette[1] + palette[5]) >> 1; palette[10] = (palette[2] + palette[6]) >> 1; palette[11] = 255;
        palette[12] = 0; palette[13] = 0; palette[14] = 0; palette[15] = 0;
      }

      for (let py = 0; py < 4; py++) {
        for (let px = 0; px < 4; px++) {
          const x = bx * 4 + px, y = by * 4 + py;
          if (x >= width || y >= height) continue;
          const idx = (bits >> (2 * (py * 4 + px))) & 3;
          const dst = (y * width + x) * 4;
          image[dst]     = palette[idx * 4];
          image[dst + 1] = palette[idx * 4 + 1];
          image[dst + 2] = palette[idx * 4 + 2];
          image[dst + 3] = palette[idx * 4 + 3];
        }
      }
    }
  }
  return image;
}

function decompressBC3(width: number, height: number, data: ArrayBuffer): Uint8ClampedArray {
  const view = new DataView(data);
  const bw = Math.max(1, Math.ceil(width / 4));
  const bh = Math.max(1, Math.ceil(height / 4));
  const image = new Uint8ClampedArray(width * height * 4);
  let pos = 0;

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      // Alpha block (8 bytes)
      const a0 = view.getUint8(pos);
      const a1 = view.getUint8(pos + 1);
      // 48-bit alpha index (6 bytes, little-endian)
      const aLo = view.getUint32(pos + 2, true);
      const aHi = view.getUint16(pos + 6, true);
      pos += 8;

      // Build alpha palette
      const alphas = new Uint8Array(8);
      alphas[0] = a0; alphas[1] = a1;
      if (a0 > a1) {
        alphas[2] = (6 * a0 + 1 * a1 + 3) / 7;
        alphas[3] = (5 * a0 + 2 * a1 + 3) / 7;
        alphas[4] = (4 * a0 + 3 * a1 + 3) / 7;
        alphas[5] = (3 * a0 + 4 * a1 + 3) / 7;
        alphas[6] = (2 * a0 + 5 * a1 + 3) / 7;
        alphas[7] = (1 * a0 + 6 * a1 + 3) / 7;
      } else {
        alphas[2] = (4 * a0 + 1 * a1 + 2) / 5;
        alphas[3] = (3 * a0 + 2 * a1 + 2) / 5;
        alphas[4] = (2 * a0 + 3 * a1 + 2) / 5;
        alphas[5] = (1 * a0 + 4 * a1 + 2) / 5;
        alphas[6] = 0;
        alphas[7] = 255;
      }

      // Colour block (8 bytes) — same as BC1
      const c0 = view.getUint16(pos, true);
      const c1 = view.getUint16(pos + 2, true);
      const bits = view.getUint32(pos + 4, true);
      pos += 8;

      const r0 = (c0 >> 11) & 0x1f, g0 = (c0 >> 5) & 0x3f, b0 = c0 & 0x1f;
      const r1 = (c1 >> 11) & 0x1f, g1 = (c1 >> 5) & 0x3f, b1 = c1 & 0x1f;

      const palette = new Uint8Array(12); // 4 colours × RGB (alpha handled separately)
      palette[0] = (r0 << 3) | (r0 >> 2); palette[1] = (g0 << 2) | (g0 >> 4); palette[2] = (b0 << 3) | (b0 >> 2);
      palette[3] = (r1 << 3) | (r1 >> 2); palette[4] = (g1 << 2) | (g1 >> 4); palette[5] = (b1 << 3) | (b1 >> 2);
      palette[6] = (2 * palette[0] + palette[3] + 1) / 3; palette[7] = (2 * palette[1] + palette[4] + 1) / 3; palette[8] = (2 * palette[2] + palette[5] + 1) / 3;
      palette[9] = (palette[0] + 2 * palette[3] + 1) / 3; palette[10] = (palette[1] + 2 * palette[4] + 1) / 3; palette[11] = (palette[2] + 2 * palette[5] + 1) / 3;

      for (let py = 0; py < 4; py++) {
        for (let px = 0; px < 4; px++) {
          const x = bx * 4 + px, y = by * 4 + py;
          if (x >= width || y >= height) continue;
          const texelIdx = py * 4 + px;

          // Colour index (2 bits from colour block)
          const cIdx = (bits >> (2 * texelIdx)) & 3;

          // Alpha index (3 bits from alpha block)
          const aBit = texelIdx * 3;
          let aIdx: number;
          if (aBit < 32) {
            aIdx = (aLo >> aBit) & 7;
          } else {
            aIdx = (aHi >> (aBit - 32)) & 7;
          }

          const dst = (y * width + x) * 4;
          image[dst]     = palette[cIdx * 3];
          image[dst + 1] = palette[cIdx * 3 + 1];
          image[dst + 2] = palette[cIdx * 3 + 2];
          image[dst + 3] = alphas[aIdx];
        }
      }
    }
  }
  return image;
}

export class GXTTextureInfo {
  dataOffset   = 0;
  dataSize     = 0;
  paletteIndex = -1;
  flags        = 0;
  type         = 0;  // SceGxmTextureType
  format       = 0;  // SceGxmTextureBaseFormat
  width        = 0;
  height       = 0;
  mipCount     = 0;

  static readonly SIZE = 0x20;

  static load(range: BufferRange, offset: number): GXTTextureInfo {
    const ret = new GXTTextureInfo();
    ret.dataOffset   = range.getUint32(offset + 0x00);
    ret.dataSize     = range.getUint32(offset + 0x04);
    ret.paletteIndex = range.getInt32(offset + 0x08);
    ret.flags        = range.getUint32(offset + 0x0c);
    ret.type         = range.getUint32(offset + 0x10);
    ret.format       = range.getUint32(offset + 0x14);
    ret.width        = range.getUint16(offset + 0x18);
    ret.height       = range.getUint16(offset + 0x1a);
    ret.mipCount     = range.getUint8(offset + 0x1c);
    return ret;
  }
}

export class GXT {
  textures: GXTTextureInfo[] = [];
  mipmaps: Mipmaps = [];

  static load(buffer: ArrayBuffer): GXT {
    const ret = new GXT();
    const range = new BufferRange(buffer);

    // Validate magic "GXT\0"
    const magic = range.getUint32(0x00);
    if (magic !== 0x00545847) {
      console.warn(`GXT: bad magic 0x${magic.toString(16)}, size=${buffer.byteLength}`);
      return ret;
    }

    // Header
    const numTextures = range.getUint32(0x08);

    // Parse texture info entries
    for (let i = 0; i < numTextures; i++) {
      ret.textures.push(GXTTextureInfo.load(range, 0x20 + i * GXTTextureInfo.SIZE));
    }

    // Decode first texture (primary use case)
    if (ret.textures.length > 0) {
      ret.mipmaps = GXT.decodeTexture(range, ret.textures[0]);
    }

    return ret;
  }

  private static decodeTexture(range: BufferRange, info: GXTTextureInfo): Mipmaps {
    const mipmaps: Mipmaps = [];
    let offset = info.dataOffset;
    let w = info.width;
    let h = info.height;

    for (let mip = 0; mip < info.mipCount; mip++) {
      const mipSize = GXT.compressedSize(info.format, w, h);
      const mipData = range.getArrayBuffer(offset, mipSize);

      let rgba: Uint8ClampedArray;
      switch (info.format) {
        case FMT_PVRTII4BPP:
          rgba = PVRTC2.decompress(w, h, mipData, info.type === 0x00000000);
          break;
        case FMT_U8U8U8U8:
          rgba = new Uint8ClampedArray(mipData);
          break;
        case FMT_UBC1:
          rgba = decompressBC1(w, h, mipData);
          break;
        case FMT_UBC3:
          rgba = decompressBC3(w, h, mipData);
          break;
        default:
          console.warn(`GXT: unsupported format 0x${info.format.toString(16)}`);
          return mipmaps;
      }

      mipmaps.push({ type: "RGBA", width: w, height: h, data: rgba });
      offset += mipSize;
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }

    return mipmaps;
  }

  /** Compute compressed data size for a single mip level. */
  private static compressedSize(format: number, w: number, h: number): number {
    switch (format) {
      case FMT_PVRTII4BPP: {
        // 4 bits per pixel, minimum block size 4×4
        const bw = Math.max(1, Math.ceil(w / 4));
        const bh = Math.max(1, Math.ceil(h / 4));
        return bw * bh * 8; // 8 bytes per 4×4 block
      }
      case FMT_UBC1: {
        const bw = Math.max(1, Math.ceil(w / 4));
        const bh = Math.max(1, Math.ceil(h / 4));
        return bw * bh * 8;
      }
      case FMT_UBC3: {
        const bw = Math.max(1, Math.ceil(w / 4));
        const bh = Math.max(1, Math.ceil(h / 4));
        return bw * bh * 16;
      }
      case FMT_U8U8U8U8:
        return w * h * 4;
      default:
        return w * h * 4; // fallback
    }
  }
}
