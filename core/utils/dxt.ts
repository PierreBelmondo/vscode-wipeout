import { BufferRange } from "./range";

function packRGBA(r: number, g: number, b: number, a: number): number {
  return (r << 24) | (g << 16) | (b << 8) | a;
}

export class DXT1 {
  static readonly BLOCK_SIZE = 8;

  static size(width: number, height: number): number {
    const w = Math.max(4, width) / 4;
    const h = Math.max(4, height) / 4;
    return w * h * DXT1.BLOCK_SIZE;
  }

  static decompress(width: number, height: number, blocks: ArrayBuffer): Uint8ClampedArray {
    let blockCountX = width / 4;
    let blockCountY = height / 4;

    const image = new Uint8ClampedArray(width * height * 4);

    let range = new BufferRange(blocks);
    for (let j = 0; j < blockCountY; j++) {
      for (let i = 0; i < blockCountX; i++) {
        DXT1.decompressBlock(i * 4, j * 4, width, range, image);
        range = range.slice(DXT1.BLOCK_SIZE);
      }
    }

    return image;
  }

  static decompressBlock(x: number, y: number, width: number, range: BufferRange, image: Uint8ClampedArray) {
    const color0 = range.getUint16(0);
    const color1 = range.getUint16[2];
    const colorCodes = range.getUint32(4);

    const r0 = (color0 & 0b1111100000000000) >>> 8;
    const g0 = (color0 & 0b0000011111100000) >>> 3;
    const b0 = (color0 & 0b0000000000011111) << 3;
    const r1 = (color1 & 0b1111100000000000) >>> 8;
    const g1 = (color1 & 0b0000011111100000) >>> 3;
    const b1 = (color1 & 0b0000000000011111) << 3;

    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const b = 4 * j + i;
        let colorCode = (colorCodes >>> (2 * b)) & 0b011;

        let color = { r: 0, g: 0, b: 0, a: 0 };
        if (color0 > color1) {
          switch (colorCode) {
            case 0:
              color = { r: r0, g: g0, b: b0, a: 255 };
              break;
            case 1:
              color = { r: r1, g: g1, b: b1, a: 255 };
              break;
            case 2:
              color = { r: (2 * r0 + r1) / 3, g: (2 * g0 + g1) / 3, b: (2 * b0 + b1) / 3, a: 255 };
              break;
            case 3:
              color = { r: (r0 + 2 * r1) / 3, g: (g0 + 2 * g1) / 3, b: (b0 + 2 * b1) / 3, a: 255 };
              break;
          }
        } else {
          switch (colorCode) {
            case 0:
              color = { r: r0, g: g0, b: b0, a: 255 };
              break;
            case 1:
              color = { r: r1, g: g1, b: b1, a: 255 };
              break;
            case 2:
              color = { r: (r0 + r1) / 2, g: (g0 + g1) / 2, b: (b0 + b1) / 2, a: 255 };
              break;
            case 3:
              color = { r: 0, g: 0, b: 0, a: 255 };
              break;
          }
        }

        const idx = (y + j) * width + (x + i);
        image[idx * 4 + 0] = color.r;
        image[idx * 4 + 1] = color.g;
        image[idx * 4 + 2] = color.b;
        image[idx * 4 + 3] = color.a;
      }
    }
  }
}

export class DXT3 {
  static readonly BLOCK_SIZE = 16;

  static size(width: number, height: number): number {
    const w = Math.max(4, width) / 4;
    const h = Math.max(4, height) / 4;
    return w * h * DXT3.BLOCK_SIZE;
  }

  static decompress(width: number, height: number, blocks: ArrayBuffer): Uint8ClampedArray {
    let blockCountX = width / 4;
    let blockCountY = height / 4;

    const image = new Uint8ClampedArray(width * height * 4);

    let range = new BufferRange(blocks);
    for (let j = 0; j < blockCountY; j++) {
      for (let i = 0; i < blockCountX; i++) {
        DXT3.decompressBlock(i * 4, j * 4, width, range, image);
        range = range.slice(DXT3.BLOCK_SIZE);
      }
    }

    return image;
  }

  static decompressBlock(x: number, y: number, width: number, range: BufferRange, image: Uint8ClampedArray) {
    const alphaData = range.getUint8Array(0, 8)
    const color0 = range.getUint16(8);
    const color1 = range.getUint16[10];
    const colorCodes = range.getUint32(12);

    const r0 = (color0 & 0b1111100000000000) >>> 8;
    const g0 = (color0 & 0b0000011111100000) >>> 3;
    const b0 = (color0 & 0b0000000000011111) << 3;
    const r1 = (color1 & 0b1111100000000000) >>> 8;
    const g1 = (color1 & 0b0000011111100000) >>> 3;
    const b1 = (color1 & 0b0000000000011111) << 3;

    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const b = 4 * j + i;
        let colorCode = (colorCodes >>> (2 * b)) & 0b011;

        let alpha = alphaData[Math.floor(b / 2)];
        if (b % 2) alpha >>>= 4;
        alpha &= 0b1111;
        
        let color = { r: 0, g: 0, b: 0, a: 0 };
        switch (colorCode) {
          case 0:
            color = { r: r0, g: g0, b: b0, a: alpha };
            break;
          case 1:
            color = { r: r1, g: g1, b: b1, a: alpha };
            break;
          case 2:
            color = { r: (2 * r0 + r1) / 3, g: (2 * g0 + g1) / 3, b: (2 * b0 + b1) / 3, a: alpha };
            break;
          case 3:
            color = { r: (r0 + 2 * r1) / 3, g: (g0 + 2 * g1) / 3, b: (b0 + 2 * b1) / 3, a: alpha };
            break;
        }

        const idx = (y + j) * width + (x + i);
        image[idx * 4 + 0] = color.r;
        image[idx * 4 + 1] = color.g;
        image[idx * 4 + 2] = color.b;
        image[idx * 4 + 3] = color.a;
      }
    }
  }
}

export class DXT5 {
  static readonly BLOCK_SIZE = 16;

  static size(width: number, height: number): number {
    const w = Math.max(4, width) / 4;
    const h = Math.max(4, height) / 4;
    return w * h * DXT5.BLOCK_SIZE;
  }

  static decompress(width: number, height: number, blocks: ArrayBuffer): Uint8ClampedArray {
    let blockCountX = width / 4;
    let blockCountY = height / 4;

    const image = new Uint8ClampedArray(width * height * 4);

    let range = new BufferRange(blocks);
    for (let y = 0; y < blockCountY; y++) {
      for (let x = 0; x < blockCountX; x++) {
        DXT5.decompressBlock(x * 4, y * 4, width, range, image);
        range = range.slice(DXT5.BLOCK_SIZE);
      }
    }

    return image;
  }

  static decompressBlock(x: number, y: number, width: number, range: BufferRange, image: Uint8ClampedArray) {
    const alpha0 = range.getUint8(0);
    const alpha1 = range.getUint8(1);
    const alphaCodes = range.getUint48(2);

    const color0 = range.getUint16(8);
    const color1 = range.getUint16(10);
    const colorCodes = range.getUint32(12);

    const r0 = (color0 & 0b1111100000000000) >>> 8;
    const g0 = (color0 & 0b0000011111100000) >>> 3;
    const b0 = (color0 & 0b0000000000011111) << 3;
    const r1 = (color1 & 0b1111100000000000) >>> 8;
    const g1 = (color1 & 0b0000011111100000) >>> 3;
    const b1 = (color1 & 0b0000000000011111) << 3;

    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const b = 4 * j + i;
        let colorCode = (colorCodes >>> (2 * b)) & 0b011;
        let alphaCode = (alphaCodes >>> (3 * b)) & 0b111;

        let alpha = 0;
        if (colorCode == 0) {
          alpha = alpha0;
        } else if (colorCode == 1) {
          alpha = alpha1;
        } else {
          if (alpha0 > alpha1) {
            alpha = ((8 - alphaCode) * alpha0 + (alphaCode - 1) * alpha1) / 7;
          } else {
            if (alphaCode == 6) alpha = 0;
            else if (alphaCode == 7) alpha = 255;
            else alpha = ((6 - alphaCode) * alpha0 + (alphaCode - 1) * alpha1) / 5;
          }
        }

        let color = { r: 0, g: 0, b: 0, a: 0 };
        switch (colorCode) {
          case 0:
            color = { r: r0, g: g0, b: b0, a: alpha };
            break;
          case 1:
            color = { r: r1, g: g1, b: b1, a: alpha };
            break;
          case 2:
            color = { r: (2 * r0 + r1) / 3, g: (2 * g0 + g1) / 3, b: (2 * b0 + b1) / 3, a: alpha };
            break;
          case 3:
            color = { r: (r0 + 2 * r1) / 3, g: (g0 + 2 * g1) / 3, b: (b0 + 2 * b1) / 3, a: alpha };
            break;
        }

        const idx = (y + j) * width + (x + i);
        image[idx * 4 + 0] = color.r;
        image[idx * 4 + 1] = color.g;
        image[idx * 4 + 2] = color.b;
        image[idx * 4 + 3] = color.a;
      }
    }
  }
}
