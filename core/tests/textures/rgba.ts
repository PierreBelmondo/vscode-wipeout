/**
 * One decoded mip level -> flat RGBA8, the currency the golden files hash.
 *
 * Mirrors what the viewer uploads (webviews/threeView/utils.ts): DXT through
 * the shared decompressors, ARGB swizzled to RGBA, RGBA verbatim. A format
 * this cannot convert throws, so an unsupported golden entry fails loudly
 * instead of hashing garbage.
 */
import { Mipmap } from "@core/utils/mipmaps";
import { DXT1, DXT3, DXT5 } from "@core/utils/dxt";

function toArrayBuffer(data: Uint8Array | Uint8ClampedArray): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

export function mipToRGBA(mip: Mipmap): Uint8ClampedArray {
  switch (mip.type) {
    case "DXT1":
      return DXT1.decompress(mip.width, mip.height, toArrayBuffer(mip.data));
    case "DXT3":
      return DXT3.decompress(mip.width, mip.height, toArrayBuffer(mip.data));
    case "DXT5":
      return DXT5.decompress(mip.width, mip.height, toArrayBuffer(mip.data));
    case "RGBA":
      return new Uint8ClampedArray(mip.data);
    case "ARGB": {
      const rgba = new Uint8ClampedArray(mip.data.length);
      for (let i = 0; i < mip.data.length / 4; i++) {
        rgba[i * 4 + 0] = mip.data[i * 4 + 1];
        rgba[i * 4 + 1] = mip.data[i * 4 + 2];
        rgba[i * 4 + 2] = mip.data[i * 4 + 3];
        rgba[i * 4 + 3] = mip.data[i * 4 + 0];
      }
      return rgba;
    }
    default:
      throw new Error(`no RGBA conversion for mip type ${mip.type}`);
  }
}
