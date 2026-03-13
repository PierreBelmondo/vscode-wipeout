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
 *   0x0C000000  U8U8U8U8 ABGR (RGBA32 uncompressed, default swizzle)
 *   0x0C001000  U8U8U8U8 ARGB (RGBA32 uncompressed, ARGB swizzle — UI textures)
 *   0x85000000  UBC1 / DXT1 / BC1
 *   0x86000000  UBC2 / DXT3 / BC2 (explicit 4-bit alpha — font/UI textures)
 *   0x87000000  UBC3 / DXT5 / BC3
 *   0x98001000  U8U8U8 RGB (RGB888 uncompressed — splash screens)
 *
 * Texture type field (SceGxmTextureType):
 *   0x00000000  SCE_GXM_TEXTURE_SWIZZLED — BCn blocks stored in Morton (Z-order) layout
 *   0x60000000  SCE_GXM_TEXTURE_LINEAR   — blocks in raster scan order
 */

import { BufferRange } from "@core/utils/range";
import type { Mipmaps } from "@core/utils/mipmaps";
import { PVRTC2 } from "@core/utils/pvrtc2";

/* SceGxmTextureBaseFormat + swizzle constants */
const FMT_U8U8U8U8_ABGR = 0x0C000000; // default swizzle: stored [A,B,G,R]
const FMT_U8U8U8U8_ARGB = 0x0C001000; // ARGB swizzle:   stored [A,R,G,B]
const FMT_PVRTII4BPP    = 0x83000000;
const FMT_UBC1          = 0x85000000;
const FMT_UBC2          = 0x86000000; // DXT3: explicit 4-bit alpha + BC1 colour
const FMT_UBC3          = 0x87000000;
const FMT_U8U8U8        = 0x98001000; // RGB888: stored [R,G,B], no alpha

/* ── Morton (Z-order) de-swizzle for block-compressed formats ── */

/**
 * Interleave bits of x and y to produce a Morton code (Z-order curve index).
 * Used to map swizzled block storage order → raster order.
 */
function mortonIndex(x: number, y: number): number {
  // PSVita GXM uses Y in even bit positions, X in odd — opposite of the common convention.
  let z = 0;
  for (let i = 0; i < 16; i++) {
    z |= ((y >> i) & 1) << (2 * i);
    z |= ((x >> i) & 1) << (2 * i + 1);
  }
  return z;
}

/**
 * Re-order a swizzled (Morton) BCn data buffer into raster-scan block order.
 * blockSize is 8 (BC1) or 16 (BC2/BC3).
 *
 * The PSVita stores all valid blocks of the (bw × bh) rectangle sorted by their
 * Morton index — i.e. storage slot i holds the block whose Morton rank among all
 * valid blocks is i.  We build that sorted mapping once, then scatter.
 */
function deswizzleBCn(width: number, height: number, data: ArrayBuffer, blockSize: number): ArrayBuffer {
  const bw = Math.max(1, Math.ceil(width / 4));
  const bh = Math.max(1, Math.ceil(height / 4));

  // Build list of all (bx,by) pairs sorted by Morton index
  const pairs: [number, number][] = [];
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++)
      pairs.push([bx, by]);
  pairs.sort((a, b) => mortonIndex(a[0], a[1]) - mortonIndex(b[0], b[1]));

  const src = new Uint8Array(data);
  const dst = new Uint8Array(bw * bh * blockSize);
  for (let i = 0; i < pairs.length; i++) {
    const [bx, by] = pairs[i];
    const rasterIdx = by * bw + bx;
    dst.set(src.subarray(i * blockSize, (i + 1) * blockSize), rasterIdx * blockSize);
  }
  return dst.buffer;
}

/* ── Inline BC1/BC2/BC3 decompression (DataView-based, no BufferRange) ── */

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

function decompressBC2(width: number, height: number, data: ArrayBuffer): Uint8ClampedArray {
  const view = new DataView(data);
  const bw = Math.max(1, Math.ceil(width / 4));
  const bh = Math.max(1, Math.ceil(height / 4));
  const image = new Uint8ClampedArray(width * height * 4);
  let pos = 0;

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      // Alpha block: 16×4-bit explicit alpha values packed into 8 bytes (LE)
      const aLo = view.getUint32(pos, true);
      const aHi = view.getUint32(pos + 4, true);
      pos += 8;

      // Colour block (same as BC1 without punch-through)
      const c0 = view.getUint16(pos, true);
      const c1 = view.getUint16(pos + 2, true);
      const bits = view.getUint32(pos + 4, true);
      pos += 8;

      const r0 = (c0 >> 11) & 0x1f, g0 = (c0 >> 5) & 0x3f, b0 = c0 & 0x1f;
      const r1 = (c1 >> 11) & 0x1f, g1 = (c1 >> 5) & 0x3f, b1 = c1 & 0x1f;

      const palette = new Uint8Array(12);
      palette[0] = (r0 << 3) | (r0 >> 2); palette[1] = (g0 << 2) | (g0 >> 4); palette[2] = (b0 << 3) | (b0 >> 2);
      palette[3] = (r1 << 3) | (r1 >> 2); palette[4] = (g1 << 2) | (g1 >> 4); palette[5] = (b1 << 3) | (b1 >> 2);
      palette[6] = (2 * palette[0] + palette[3] + 1) / 3; palette[7] = (2 * palette[1] + palette[4] + 1) / 3; palette[8] = (2 * palette[2] + palette[5] + 1) / 3;
      palette[9] = (palette[0] + 2 * palette[3] + 1) / 3; palette[10] = (palette[1] + 2 * palette[4] + 1) / 3; palette[11] = (palette[2] + 2 * palette[5] + 1) / 3;

      for (let py = 0; py < 4; py++) {
        for (let px = 0; px < 4; px++) {
          const x = bx * 4 + px, y = by * 4 + py;
          if (x >= width || y >= height) continue;
          const texelIdx = py * 4 + px;

          // 4-bit alpha: two texels per byte
          const aBit = texelIdx * 4;
          const aRaw = aBit < 32 ? (aLo >> aBit) & 0xf : (aHi >> (aBit - 32)) & 0xf;
          const alpha = (aRaw << 4) | aRaw; // expand 4-bit to 8-bit

          const cIdx = (bits >> (2 * texelIdx)) & 3;
          const dst = (y * width + x) * 4;
          image[dst]     = palette[cIdx * 3];
          image[dst + 1] = palette[cIdx * 3 + 1];
          image[dst + 2] = palette[cIdx * 3 + 2];
          image[dst + 3] = alpha;
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
        case FMT_U8U8U8U8_ABGR: {
          // stored [A,B,G,R] → output [R,G,B,A]
          const src = new Uint8Array(mipData);
          rgba = new Uint8ClampedArray(src.length);
          for (let i = 0; i < src.length; i += 4) {
            rgba[i] = src[i + 3]; rgba[i + 1] = src[i + 2];
            rgba[i + 2] = src[i + 1]; rgba[i + 3] = src[i];
          }
          break;
        }
        case FMT_U8U8U8U8_ARGB: {
          // stored [A,R,G,B] → output [R,G,B,A]
          const src = new Uint8Array(mipData);
          rgba = new Uint8ClampedArray(src.length);
          for (let i = 0; i < src.length; i += 4) {
            rgba[i] = src[i + 1]; rgba[i + 1] = src[i + 2];
            rgba[i + 2] = src[i + 3]; rgba[i + 3] = src[i];
          }
          break;
        }
        case FMT_UBC1: {
          const blocks = info.type === 0x00000000 ? deswizzleBCn(w, h, mipData, 8) : mipData;
          rgba = decompressBC1(w, h, blocks);
          break;
        }
        case FMT_UBC2: {
          const blocks = info.type === 0x00000000 ? deswizzleBCn(w, h, mipData, 16) : mipData;
          rgba = decompressBC2(w, h, blocks);
          break;
        }
        case FMT_UBC3: {
          const blocks = info.type === 0x00000000 ? deswizzleBCn(w, h, mipData, 16) : mipData;
          rgba = decompressBC3(w, h, blocks);
          break;
        }
        case FMT_U8U8U8: {
          // stored [R,G,B] → output [R,G,B,255]
          const src = new Uint8Array(mipData);
          rgba = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < w * h; i++) {
            rgba[i * 4]     = src[i * 3];
            rgba[i * 4 + 1] = src[i * 3 + 1];
            rgba[i * 4 + 2] = src[i * 3 + 2];
            rgba[i * 4 + 3] = 255;
          }
          break;
        }
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
      case FMT_UBC2:
      case FMT_UBC3: {
        const bw = Math.max(1, Math.ceil(w / 4));
        const bh = Math.max(1, Math.ceil(h / 4));
        return bw * bh * 16;
      }
      case FMT_U8U8U8U8_ABGR:
      case FMT_U8U8U8U8_ARGB:
        return w * h * 4;
      case FMT_U8U8U8:
        return w * h * 3;
      default:
        return w * h * 4; // fallback
    }
  }
}
