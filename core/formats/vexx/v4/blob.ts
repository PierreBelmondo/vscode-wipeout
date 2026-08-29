import { BufferRange } from "@core/utils/range";
import { GE } from "@core/utils/pspge";
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

      const size = w * h;
      // A row is padded out to blockSize pixels in memory, so a mip narrower
      // than one block still costs a whole block per row.
      const memWidthPx = Math.max(w, blockSize);
      const rowBytes = (memWidthPx * this.bpp) / 8;

      // Unswizzle the INDICES, before the palette turns them into pixels --
      // the shared GE.unswizzle, which leaves a row narrower than one block
      // untouched (the `w > blockReal` guard this replaces). BLOB carries no
      // swizzle flag of its own: its pixels are always stored swizzled.
      let indexBytes = pixelRange.getUint8Array(0, rowBytes * h);
      indexBytes = GE.unswizzle(indexBytes, rowBytes, h);

      const rgba = new Uint8ClampedArray(size * 4);
      for (let y = 0; y < h; y++) {
        const rowOffset = y * rowBytes;
        for (let x = 0; x < w; x++) {
          let index: number;
          if (this.bpp === 4) {
            index = indexBytes[rowOffset + (x >>> 1)];
            index = x % 2 === 0 ? index & 0x0f : index >>> 4;
          } else {
            index = indexBytes[rowOffset + x];
          }
          const pixel = x + y * w;
          rgba[pixel * 4 + 0] = paletteRange.getUint8(index * 4 + 0);
          rgba[pixel * 4 + 1] = paletteRange.getUint8(index * 4 + 1);
          rgba[pixel * 4 + 2] = paletteRange.getUint8(index * 4 + 2);
          rgba[pixel * 4 + 3] = paletteRange.getUint8(index * 4 + 3);
        }
      }

      this.mipmaps.push({ type: "RGBA", width: w, height: h, data: rgba });

      pixelOffset += memsize;
      w = Math.max(1, w >>> 1);
      h = Math.max(1, h >>> 1);
    }
  }
}
