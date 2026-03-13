import { VexxNodeTexture } from "../v4/texture";
import { Vexx3NodeType } from "./type";

// Reverse engineering progress: 50%
// Header layout identical to v4 (width/height/bpp/mipmaps/format/id/cmapSize/dataSize/name).
// Difference: sub-blockSize mip levels are NOT padded to blockSize — memwidth = width.
export class VexxNodeTextureV3 extends VexxNodeTexture {
  constructor() {
    super();
    this.header.type = Vexx3NodeType.TEXTURE;
  }

  override loadTexture() {
    this.mipmaps = [];

    const blockSize = this.cmapRange.size == 64 ? 32 : 16;
    const bpp = this.properties.bpp == 4 ? 4 : 8;

    let width = this.properties.width;
    let height = this.properties.height;
    let offset = 0;

    for (let i = 0; i < this.properties.mipmaps; i++) {
      // v3 does not pad sub-blockSize mip levels: memwidth = width, and the
      // effective block stride passed to loadMipmap must match (min(blockSize, width)).
      const effectiveBlock = Math.min(blockSize, width);
      const memwidth = Math.max(effectiveBlock, width);
      const memsize = Math.floor((memwidth * height * bpp) / 8);
      if (offset + memsize > this.dataRange.size) break;
      const mipmapRange = this.dataRange.slice(offset, offset + memsize);
      this.loadMipmap(mipmapRange, width, height, effectiveBlock, bpp);
      offset += memsize;
      width /= 2;
      height /= 2;
    }
  }
}
