// Layout per Microsoft's DDS reference:
// https://learn.microsoft.com/windows/win32/direct3ddds/dx-graphics-dds-pguide
//
// Everything is little-endian. The 128-byte header is: magic, then a
// 124-byte DDS_HEADER whose DDS_PIXELFORMAT starts at byte 76; a "DX10"
// FourCC adds a 20-byte DDS_HEADER_DXT10 after it. Pixel data follows.

import { BufferRange } from "@core/utils/range";
import { Mipmap, Mipmaps } from "@core/utils/mipmaps";
import { DXT1, DXT3, DXT5 } from "@core/utils/dxt";

const MAGIC = 0x20534444; // "DDS "
const DDSD_MIPMAPCOUNT = 0x20000;
const DDPF_ALPHAPIXELS = 0x1;
const DDPF_FOURCC = 0x4;
const DDPF_RGB = 0x40;
const DDPF_LUMINANCE = 0x20000;
const DDSCAPS2_CUBEMAP = 0x200;
const DXGI_FORMAT_R32G32B32A32_FLOAT = 2;

const fourCC = (s: string) => s.charCodeAt(0) | (s.charCodeAt(1) << 8) | (s.charCodeAt(2) << 16) | (s.charCodeAt(3) << 24);
const FOURCC_DXT1 = fourCC("DXT1");
const FOURCC_DXT3 = fourCC("DXT3");
const FOURCC_DXT5 = fourCC("DXT5");
const FOURCC_DX10 = fourCC("DX10");
/** D3DFMT_A32B32G32R32F, stored as a bare number in the FourCC field. */
const D3DFMT_A32B32G32R32F = 116;

/** How a masked channel is unpacked: value = ((px >> shift) & max) / max. */
type Channel = { shift: number; max: number } | null;

function channel(mask: number): Channel {
  if (!mask) return null;
  let shift = 0;
  while (((mask >>> shift) & 1) === 0) shift++;
  const bits = 32 - Math.clz32(mask >>> shift);
  return { shift, max: (1 << bits) - 1 };
}

/**
 * A .dds texture, decoded to the same mip chain the other formats produce.
 *
 * The previous loader parsed image descriptors and then exported an empty
 * list, so every .dds -- all 74 in the sample set -- decoded to nothing. This
 * one decodes what those files actually contain: DXT1/3/5 block chains, the
 * masked uncompressed formats (the crowd impostor UV banks are 16-bit
 * luminance + alpha), and 32-bit float RGBA (the impostor clamp/offset banks,
 * FourCC 116 or a DX10 header). Float data is exported clamped to 8-bit,
 * which is what the viewer can show; a consumer wanting the HDR values would
 * need a float mipmap type that does not exist yet.
 */
export class DDS {
  range = new BufferRange();
  width = 0;
  height = 0;
  mipmapCount = 1;
  format = "";
  mipmaps: Mipmaps = [];

  static load(buffer: ArrayBuffer): DDS {
    const ret = new DDS();
    ret.range = new BufferRange(buffer);
    ret.range.le = true;
    const h = ret.range;

    if (h.getUint32(0) !== MAGIC) throw new Error("not a DDS file (bad magic)");
    const flags = h.getUint32(8);
    ret.height = h.getUint32(12);
    ret.width = h.getUint32(16);
    ret.mipmapCount = flags & DDSD_MIPMAPCOUNT ? Math.max(1, h.getUint32(28)) : 1;

    // DDS_PIXELFORMAT at byte 76.
    const pfFlags = h.getUint32(80);
    const pfFourCC = h.getUint32(84);
    const bitCount = h.getUint32(88);
    const masks = [h.getUint32(92), h.getUint32(96), h.getUint32(100), h.getUint32(104)];
    const caps2 = h.getUint32(112);
    if (caps2 & DDSCAPS2_CUBEMAP) throw new Error("DDS cube maps are not supported");

    let dataOffset = 128;
    let width = ret.width;
    let height = ret.height;

    /** Walk the chain with a per-level (width, height) -> data length. */
    const walk = (type: Mipmap["type"], size: (w: number, hh: number) => number, convert?: (raw: Uint8Array, w: number, hh: number) => Uint8Array) => {
      for (let i = 0; i < ret.mipmapCount; i++) {
        const length = size(width, height);
        if (dataOffset + length > h.size) break; // truncated file: keep what fits
        const raw = h.getUint8Array(dataOffset, length);
        ret.mipmaps.push({ type, width, height, data: convert ? convert(raw, width, height) : raw });
        dataOffset += length;
        width = Math.max(1, Math.floor(width / 2));
        height = Math.max(1, Math.floor(height / 2));
      }
    };

    if (pfFlags & DDPF_FOURCC) {
      let fmt = pfFourCC;
      if (pfFourCC === FOURCC_DX10) {
        const dxgi = h.getUint32(128);
        dataOffset += 20;
        if (dxgi !== DXGI_FORMAT_R32G32B32A32_FLOAT) throw new Error(`unsupported DX10 format ${dxgi}`);
        fmt = D3DFMT_A32B32G32R32F;
      }
      switch (fmt) {
        case FOURCC_DXT1:
          ret.format = "DXT1";
          walk("DXT1", DXT1.size);
          break;
        case FOURCC_DXT3:
          ret.format = "DXT3";
          walk("DXT3", DXT3.size);
          break;
        case FOURCC_DXT5:
          ret.format = "DXT5";
          walk("DXT5", DXT5.size);
          break;
        case D3DFMT_A32B32G32R32F:
          ret.format = "RGBA32F";
          walk("RGBA", (w, hh) => w * hh * 16, (raw, w, hh) => {
            const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
            const out = new Uint8Array(w * hh * 4);
            for (let p = 0; p < w * hh; p++) {
              for (let c = 0; c < 4; c++) {
                const v = view.getFloat32((p * 4 + c) * 4, true);
                out[p * 4 + c] = Math.max(0, Math.min(255, Math.round(v * 255)));
              }
            }
            return out;
          });
          break;
        default: {
          const s = String.fromCharCode(fmt & 0xff, (fmt >> 8) & 0xff, (fmt >> 16) & 0xff, (fmt >> 24) & 0xff);
          throw new Error(`unsupported DDS FourCC ${JSON.stringify(s)} (${fmt})`);
        }
      }
    } else if (pfFlags & (DDPF_RGB | DDPF_LUMINANCE)) {
      // Uncompressed, described by bit masks. Rows are taken as tightly packed
      // at bitCount bits per pixel, which is how every sample writes them.
      const bytes = bitCount / 8;
      if (![1, 2, 3, 4].includes(bytes)) throw new Error(`unsupported DDS bit count ${bitCount}`);
      const luminance = (pfFlags & DDPF_LUMINANCE) !== 0;
      const r = channel(masks[0]);
      const g = luminance ? r : channel(masks[1]);
      const b = luminance ? r : channel(masks[2]);
      const a = pfFlags & DDPF_ALPHAPIXELS ? channel(masks[3]) : null;
      ret.format = luminance ? `L${bitCount}` : `RGB${bitCount}`;
      const unpack = (px: number, ch: Channel) => (ch ? Math.round((((px >>> ch.shift) & ch.max) * 255) / ch.max) : 0);
      walk("RGBA", (w, hh) => w * hh * bytes, (raw, w, hh) => {
        const out = new Uint8Array(w * hh * 4);
        for (let p = 0; p < w * hh; p++) {
          let px = 0;
          for (let k = 0; k < bytes; k++) px |= raw[p * bytes + k] << (8 * k);
          px >>>= 0;
          out[p * 4 + 0] = unpack(px, r);
          out[p * 4 + 1] = unpack(px, g);
          out[p * 4 + 2] = unpack(px, b);
          out[p * 4 + 3] = a ? unpack(px, a) : 255;
        }
        return out;
      });
    } else {
      throw new Error(`unsupported DDS pixel format flags 0x${pfFlags.toString(16)}`);
    }

    return ret;
  }

  export(): Mipmaps {
    return this.mipmaps;
  }
}
