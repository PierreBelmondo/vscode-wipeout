// All values and structures referenced from:
// http://msdn.microsoft.com/en-us/library/bb943991.aspx/
//
// DX10 Cubemap support based on
// https://github.com/dariomanesku/cmft/issues/7#issuecomment-69516844
// https://msdn.microsoft.com/en-us/library/windows/desktop/bb943983(v=vs.85).aspx
// https://github.com/playcanvas/engine/blob/master/src/resources/resources_texture.js

import { BufferRange } from "../range";
import { DXT5 } from "../utils/dxt";
import { Textures } from "../utils/image";

export type Image = {
  offset: number;
  length: number;
  width: number;
  height: number;
};

export class DDS {
  private static fourCCToInt32(value: string): number {
    return value.charCodeAt(0) + (value.charCodeAt(1) << 8) + (value.charCodeAt(2) << 16) + (value.charCodeAt(3) << 24);
  }
  
  private static int32ToFourCC(value: number): string {
    return String.fromCharCode(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
  }

  static readonly MAGIC = 0x20534444;
  static readonly DDSD_MIPMAPCOUNT = 0x20000;
  static readonly DDPF_FOURCC = 0x4;

  static readonly FOURCC_DXT1 = DDS.fourCCToInt32("DXT1");
  static readonly FOURCC_DXT3 = DDS.fourCCToInt32("DXT3");
  static readonly FOURCC_DXT5 = DDS.fourCCToInt32("DXT5");
  static readonly FOURCC_DX10 = DDS.fourCCToInt32("DX10");
  static readonly FOURCC_FP32F = 116; // DXGI_FORMAT_R32G32B32A32_FLOAT

  static readonly DDSCAPS2_CUBEMAP = 0x200;
  static readonly D3D10_RESOURCE_DIMENSION_TEXTURE2D = 3;
  static readonly DXGI_FORMAT_R32G32B32A32_FLOAT = 2;

  // The header length in 32 bit ints
  static readonly headerLengthInt = 31;

  // Offsets into the header array
  static readonly off_magic = 0 * 4;
  static readonly off_size = 1 * 4;
  static readonly off_flags = 2 * 4;
  static readonly off_height = 3 * 4;
  static readonly off_width = 4 * 4;
  static readonly off_mipmapCount = 7 * 4;
  static readonly off_pfFlags = 20 * 4;
  static readonly off_pfFourCC = 21 * 4;
  static readonly off_caps2 = 28 * 4;

  range = new BufferRange();
  format = "DXT1";
  flags = DDS.DDPF_FOURCC;
  cubemap = false;
  images = [] as Image[];

  static async load(buffer: ArrayBuffer): Promise<DDS> {
    const ret = new DDS();
    ret.range = new BufferRange(buffer);
    const rangeHeader = ret.range.slice(0, 128);

    return new Promise<DDS>((resolve, reject) => {
      const magic = rangeHeader.getUint32(DDS.off_magic);
      if (magic !== DDS.MAGIC) {
        reject(new Error("Invalid magic number in DDS header"));
      }

      ret.flags = rangeHeader.getUint32(DDS.off_flags);
      if (!(ret.flags & DDS.DDPF_FOURCC)) {
        reject(new Error("Unsupported format, must contain a FourCC code"));
      }

      let blockBytes = 8;
      let format;
      let fourCC = rangeHeader.getUint32(DDS.off_pfFourCC);
      switch (fourCC) {
        case DDS.FOURCC_DXT1:
          blockBytes = 8;
          format = "DXT1";
          break;
        case DDS.FOURCC_DXT3:
          blockBytes = 16;
          format = "DXT3";
          break;
        case DDS.FOURCC_DXT5:
          blockBytes = 16;
          format = "DXT5";
          break;
        case DDS.FOURCC_FP32F:
          format = "RGBA32F";
          break;
        case DDS.FOURCC_DX10:
          let dx10Range = ret.range.slice(128, 128 + 20);
          format = dx10Range.getUint32(0 * 4);
          let resourceDimension = dx10Range.getUint32(1 * 4);
          let miscFlag = dx10Range.getUint32(2 * 4);
          let arraySize = dx10Range.getUint32(3 * 4);
          let miscFlags2 = dx10Range.getUint32(4 * 4);
          if (resourceDimension === DDS.D3D10_RESOURCE_DIMENSION_TEXTURE2D && format === DDS.DXGI_FORMAT_R32G32B32A32_FLOAT) {
            format = "RGBA32F";
          } else {
            reject(new Error("Unsupported DX10 texture format " + format));
          }
          break;
        default:
          reject(new Error("Unsupported FourCC code: " + DDS.int32ToFourCC(fourCC)));
          return;
      }

      let mipmapCount = 1;
      if (ret.flags & DDS.DDSD_MIPMAPCOUNT) {
        mipmapCount = rangeHeader.getUint32(DDS.off_mipmapCount);
        mipmapCount = Math.max(1, mipmapCount);
      }

      let cubemap = false;
      let caps2 = rangeHeader.getUint32(DDS.off_caps2);
      if (caps2 & DDS.DDSCAPS2_CUBEMAP) {
        cubemap = true;
      }

      let width = rangeHeader.getUint32(DDS.off_width);
      let height = rangeHeader.getUint32(DDS.off_height);
      let dataOffset = rangeHeader.getUint32(DDS.off_size) + 4;
      let texWidth = width;
      let texHeight = height;
      let dataLength;

      if (fourCC === DDS.FOURCC_DX10) dataOffset += 20;

      if (cubemap) {
        for (let f = 0; f < 6; f++) {
          if (format !== "rgba32f") {
            reject(new Error("Only RGBA32f cubemaps are supported"));
          }
          let bpp = (4 * 32) / 8;

          width = texWidth;
          height = texHeight;

          // cubemap should have all mipmap levels defined
          // Math.log2(width) + 1
          let requiredMipLevels = Math.log(width) / Math.log(2) + 1;

          for (let i = 0; i < requiredMipLevels; i++) {
            dataLength = width * height * bpp;
            ret.images.push({
              offset: dataOffset,
              length: dataLength,
              width,
              height,
            });
            // Reuse data from the previous level if we are beyond mipmapCount
            // This is hack for CMFT not publishing full mipmap chain https://github.com/dariomanesku/cmft/issues/10
            if (i < mipmapCount) {
              dataOffset += dataLength;
            }
            width = Math.floor(width / 2);
            height = Math.floor(height / 2);
          }
        }
      } else {
        for (let i = 0; i < mipmapCount; i++) {
          dataLength = (((Math.max(4, width) / 4) * Math.max(4, height)) / 4) * blockBytes;

          ret.images.push({
            offset: dataOffset,
            length: dataLength,
            width,
            height,
          });
          dataOffset += dataLength;
          width = Math.floor(width / 2);
          height = Math.floor(height / 2);
        }
      }

      resolve(ret);
    });
  }

  /*
  async getImage(index: number): Promise<HTMLImageElement> {
    const image = this.images[index];
    const blocks = this.range.getArrayBuffer(image.offset, image.length);
    const rgba = DXT5.decompress(image.width, image.height, blocks);
    return createImageElement(image.width, image.height, rgba);
  }
  */

  export(): Textures {
    return [];
  }
}
