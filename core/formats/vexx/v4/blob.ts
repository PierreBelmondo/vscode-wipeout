import { BufferRange } from "@core/utils/range";
import type { Mipmaps } from "@core/utils/mipmaps";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

// Reverse engineering progress: 90%
//
// BLOB nodes contain an inline paletted texture (CLUT + swizzled pixel data).
// Used for runtime-projected effects such as caustics, underwater masks, and
// shadow/lightmaps.  Each BLOB sits under a TRANSFORM that positions it in
// the scene (e.g. below the water surface for caustic projection).
//
// Layout (little-endian):
//   +0x00  u32     payload_size  (total_size − 0x20)
//   +0x04  u8[12]  padding (zeros)
//   +0x10  u16     width
//   +0x12  u16     height
//   +0x14  u8      bpp           (4 or 8)
//   +0x15  u8      unknown       (always 0)
//   +0x16  u8      mipmap_count
//   +0x17  u8      unknown       (always 3)
//   +0x18  u8[8]   padding (zeros)
//   +0x20  CLUT    palette       (16×RGBA for 4bpp, 256×RGBA for 8bpp)
//   +pal   u8[]    pixel data    (PSP-swizzled, blockSize-aligned mipmaps)
//   tail   char[32] filename     (null-padded, e.g. "Data\Tex\choppy.mip")
//
// Known blob filenames:  choppy.mip (caustic), watersun.mip, circle.mip
export class VexxNodeBlob extends VexxNode {
  width = 0;
  height = 0;
  bpp = 4;
  mipmapCount = 0;
  filename = "";
  mipmaps: Mipmaps = [];

  constructor() {
    super(Vexx4NodeType.BLOB);
  }

  override load(range: BufferRange): void {
    this.width = range.getUint16(0x10);
    this.height = range.getUint16(0x12);
    this.bpp = range.getUint8(0x14);
    this.mipmapCount = range.getUint8(0x16);

    const paletteEntries = this.bpp === 8 ? 256 : 16;
    const paletteOffset = 0x20;
    const paletteSize = paletteEntries * 4;
    const paletteRange = range.slice(paletteOffset, paletteOffset + paletteSize);

    // blockSize mirrors VexxNodeTexture: cmapSize=64 → blockSize=32,
    // cmapSize=1024 → blockSize=16.
    const blockSize = paletteSize === 64 ? 32 : 16;

    // Read filename from the last 32 bytes
    const filenameOffset = range.size - 32;
    this.filename = range.slice(filenameOffset).getString();

    let pixelOffset = paletteOffset + paletteSize;
    let w = this.width;
    let h = this.height;

    for (let m = 0; m < this.mipmapCount; m++) {
      const memwidth = Math.max(blockSize, w);
      const memsize = (memwidth * h * this.bpp) / 8;
      const pixelRange = range.slice(pixelOffset, pixelOffset + memsize);

      const blockReal = Math.min(w, blockSize);
      const size = w * h;
      const rgba = new Uint8ClampedArray(size * 4);
      const blocks = size / blockReal;

      for (let i = 0; i < blocks; i++) {
        const blockOffset = (i * blockSize * this.bpp) / 8;
        const indices = pixelRange.slice(blockOffset, blockOffset + (blockReal * this.bpp) / 8);
        for (let j = 0; j < blockReal; j++) {
          let index: number;
          if (this.bpp === 4) {
            index = indices.getUint8(j >>> 1);
            index = j % 2 === 0 ? index & 0x0f : index >>> 4;
          } else {
            index = indices.getUint8(j);
          }
          const pixel = j + i * blockReal;
          rgba[pixel * 4 + 0] = paletteRange.getUint8(index * 4 + 0);
          rgba[pixel * 4 + 1] = paletteRange.getUint8(index * 4 + 1);
          rgba[pixel * 4 + 2] = paletteRange.getUint8(index * 4 + 2);
          rgba[pixel * 4 + 3] = paletteRange.getUint8(index * 4 + 3);
        }
      }

      // PSP swizzle unscramble (same as VexxNodeTexture)
      if (w > blockReal) {
        const ch = 8;
        const cw = blockSize;
        const cs = ch * cw;
        const tmp = new Uint8ClampedArray(size * 4);
        for (let ci = 0; ci < size / cs; ci++) {
          const chunk = rgba.slice(cs * 4 * ci, cs * 4 * (ci + 1));
          for (let l = 0; l < ch; l++) {
            let k = 0;
            k += (ci % (w / cw)) * cw;
            k += Math.floor(ci / (w / cw)) * ch * w;
            k += l * w;
            for (let c = 0; c < cw; c++) {
              const idx = c + k;
              const src = c + l * cw;
              tmp[idx * 4 + 0] = chunk[src * 4 + 0];
              tmp[idx * 4 + 1] = chunk[src * 4 + 1];
              tmp[idx * 4 + 2] = chunk[src * 4 + 2];
              tmp[idx * 4 + 3] = chunk[src * 4 + 3];
            }
          }
        }
        this.mipmaps.push({ type: "RGBA", width: w, height: h, data: tmp });
      } else {
        this.mipmaps.push({ type: "RGBA", width: w, height: h, data: rgba });
      }

      pixelOffset += memsize;
      w = Math.max(1, w >>> 1);
      h = Math.max(1, h >>> 1);
    }
  }
}
