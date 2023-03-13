import { BufferRange } from "./range";

/*
class BitReader {
  private _buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this._buffer = buffer;
  }

  getBit(offset: number): boolean {
    const p8 = Math.floor(offset / 8);
    const u8 = this._buffer[p8];
    return !!((u8 >>> (7 - (offset % 8))) & 0b1);
  }

  getBits(offset: number, count: number): boolean[] {
    // not optimized
    let bits: boolean[] = [];
    for (let i = 0; i < count; i++) bits.push(this.getBit(offset + i));
    return bits;
  }

  getUint(offset: number, size: number) {
    const bits = this.getBits(offset, size);
    return bits.reduce((r, v) => (r << 1) + (v ? 1 : 0), 0);
  }
}

const FACTORS = [
  [0, 21, 43, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 9, 18, 27, 37, 46, 55, 64, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64],
];

// BC6H, BC7
//
// Reference(s):
// - https://web.archive.org/web/20181126035446/https://www.khronos.org/registry/OpenGL/extensions/ARB/ARB_texture_compression_bptc.txt
// - https://web.archive.org/web/20181126035538/https://docs.microsoft.com/en-us/windows/desktop/direct3d11/bc6h-format
//
const P2 = [
  //  3210     0000000000   1111111111   2222222222   3333333333
  0xcccc, // 0, 0, 1, 1,  0, 0, 1, 1,  0, 0, 1, 1,  0, 0, 1, 1
  0x8888, // 0, 0, 0, 1,  0, 0, 0, 1,  0, 0, 0, 1,  0, 0, 0, 1
  0xeeee, // 0, 1, 1, 1,  0, 1, 1, 1,  0, 1, 1, 1,  0, 1, 1, 1
  0xecc8, // 0, 0, 0, 1,  0, 0, 1, 1,  0, 0, 1, 1,  0, 1, 1, 1
  0xc880, // 0, 0, 0, 0,  0, 0, 0, 1,  0, 0, 0, 1,  0, 0, 1, 1
  0xfeec, // 0, 0, 1, 1,  0, 1, 1, 1,  0, 1, 1, 1,  1, 1, 1, 1
  0xfec8, // 0, 0, 0, 1,  0, 0, 1, 1,  0, 1, 1, 1,  1, 1, 1, 1
  0xec80, // 0, 0, 0, 0,  0, 0, 0, 1,  0, 0, 1, 1,  0, 1, 1, 1
  0xc800, // 0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 1,  0, 0, 1, 1
  0xffec, // 0, 0, 1, 1,  0, 1, 1, 1,  1, 1, 1, 1,  1, 1, 1, 1
  0xfe80, // 0, 0, 0, 0,  0, 0, 0, 1,  0, 1, 1, 1,  1, 1, 1, 1
  0xe800, // 0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 1,  0, 1, 1, 1
  0xffe8, // 0, 0, 0, 1,  0, 1, 1, 1,  1, 1, 1, 1,  1, 1, 1, 1
  0xff00, // 0, 0, 0, 0,  0, 0, 0, 0,  1, 1, 1, 1,  1, 1, 1, 1
  0xfff0, // 0, 0, 0, 0,  1, 1, 1, 1,  1, 1, 1, 1,  1, 1, 1, 1
  0xf000, // 0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  1, 1, 1, 1
  0xf710, // 0, 0, 0, 0,  1, 0, 0, 0,  1, 1, 1, 0,  1, 1, 1, 1
  0x008e, // 0, 1, 1, 1,  0, 0, 0, 1,  0, 0, 0, 0,  0, 0, 0, 0
  0x7100, // 0, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  1, 1, 1, 0
  0x08ce, // 0, 1, 1, 1,  0, 0, 1, 1,  0, 0, 0, 1,  0, 0, 0, 0
  0x008c, // 0, 0, 1, 1,  0, 0, 0, 1,  0, 0, 0, 0,  0, 0, 0, 0
  0x7310, // 0, 0, 0, 0,  1, 0, 0, 0,  1, 1, 0, 0,  1, 1, 1, 0
  0x3100, // 0, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  1, 1, 0, 0
  0x8cce, // 0, 1, 1, 1,  0, 0, 1, 1,  0, 0, 1, 1,  0, 0, 0, 1
  0x088c, // 0, 0, 1, 1,  0, 0, 0, 1,  0, 0, 0, 1,  0, 0, 0, 0
  0x3110, // 0, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 1, 0, 0
  0x6666, // 0, 1, 1, 0,  0, 1, 1, 0,  0, 1, 1, 0,  0, 1, 1, 0
  0x366c, // 0, 0, 1, 1,  0, 1, 1, 0,  0, 1, 1, 0,  1, 1, 0, 0
  0x17e8, // 0, 0, 0, 1,  0, 1, 1, 1,  1, 1, 1, 0,  1, 0, 0, 0
  0x0ff0, // 0, 0, 0, 0,  1, 1, 1, 1,  1, 1, 1, 1,  0, 0, 0, 0
  0x718e, // 0, 1, 1, 1,  0, 0, 0, 1,  1, 0, 0, 0,  1, 1, 1, 0
  0x399c, // 0, 0, 1, 1,  1, 0, 0, 1,  1, 0, 0, 1,  1, 1, 0, 0
  0xaaaa, // 0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1
  0xf0f0, // 0, 0, 0, 0,  1, 1, 1, 1,  0, 0, 0, 0,  1, 1, 1, 1
  0x5a5a, // 0, 1, 0, 1,  1, 0, 1, 0,  0, 1, 0, 1,  1, 0, 1, 0
  0x33cc, // 0, 0, 1, 1,  0, 0, 1, 1,  1, 1, 0, 0,  1, 1, 0, 0
  0x3c3c, // 0, 0, 1, 1,  1, 1, 0, 0,  0, 0, 1, 1,  1, 1, 0, 0
  0x55aa, // 0, 1, 0, 1,  0, 1, 0, 1,  1, 0, 1, 0,  1, 0, 1, 0
  0x9696, // 0, 1, 1, 0,  1, 0, 0, 1,  0, 1, 1, 0,  1, 0, 0, 1
  0xa55a, // 0, 1, 0, 1,  1, 0, 1, 0,  1, 0, 1, 0,  0, 1, 0, 1
  0x73ce, // 0, 1, 1, 1,  0, 0, 1, 1,  1, 1, 0, 0,  1, 1, 1, 0
  0x13c8, // 0, 0, 0, 1,  0, 0, 1, 1,  1, 1, 0, 0,  1, 0, 0, 0
  0x324c, // 0, 0, 1, 1,  0, 0, 1, 0,  0, 1, 0, 0,  1, 1, 0, 0
  0x3bdc, // 0, 0, 1, 1,  1, 0, 1, 1,  1, 1, 0, 1,  1, 1, 0, 0
  0x6996, // 0, 1, 1, 0,  1, 0, 0, 1,  1, 0, 0, 1,  0, 1, 1, 0
  0xc33c, // 0, 0, 1, 1,  1, 1, 0, 0,  1, 1, 0, 0,  0, 0, 1, 1
  0x9966, // 0, 1, 1, 0,  0, 1, 1, 0,  1, 0, 0, 1,  1, 0, 0, 1
  0x0660, // 0, 0, 0, 0,  0, 1, 1, 0,  0, 1, 1, 0,  0, 0, 0, 0
  0x0272, // 0, 1, 0, 0,  1, 1, 1, 0,  0, 1, 0, 0,  0, 0, 0, 0
  0x04e4, // 0, 0, 1, 0,  0, 1, 1, 1,  0, 0, 1, 0,  0, 0, 0, 0
  0x4e40, // 0, 0, 0, 0,  0, 0, 1, 0,  0, 1, 1, 1,  0, 0, 1, 0
  0x2720, // 0, 0, 0, 0,  0, 1, 0, 0,  1, 1, 1, 0,  0, 1, 0, 0
  0xc936, // 0, 1, 1, 0,  1, 1, 0, 0,  1, 0, 0, 1,  0, 0, 1, 1
  0x936c, // 0, 0, 1, 1,  0, 1, 1, 0,  1, 1, 0, 0,  1, 0, 0, 1
  0x39c6, // 0, 1, 1, 0,  0, 0, 1, 1,  1, 0, 0, 1,  1, 1, 0, 0
  0x639c, // 0, 0, 1, 1,  1, 0, 0, 1,  1, 1, 0, 0,  0, 1, 1, 0
  0x9336, // 0, 1, 1, 0,  1, 1, 0, 0,  1, 1, 0, 0,  1, 0, 0, 1
  0x9cc6, // 0, 1, 1, 0,  0, 0, 1, 1,  0, 0, 1, 1,  1, 0, 0, 1
  0x817e, // 0, 1, 1, 1,  1, 1, 1, 0,  1, 0, 0, 0,  0, 0, 0, 1
  0xe718, // 0, 0, 0, 1,  1, 0, 0, 0,  1, 1, 1, 0,  0, 1, 1, 1
  0xccf0, // 0, 0, 0, 0,  1, 1, 1, 1,  0, 0, 1, 1,  0, 0, 1, 1
  0x0fcc, // 0, 0, 1, 1,  0, 0, 1, 1,  1, 1, 1, 1,  0, 0, 0, 0
  0x7744, // 0, 0, 1, 0,  0, 0, 1, 0,  1, 1, 1, 0,  1, 1, 1, 0
  0xee22, // 0, 1, 0, 0,  0, 1, 0, 0,  0, 1, 1, 1,  0, 1, 1, 1
];

export class BC7 {
  static readonly BLOCK_SIZE = 16;

  static readonly MODE_INFO = [
    {
      // 0
      numSubsets: 3,
      partitionBits: 4,
      rotationBits: 0,
      indexSelectionBits: 0,
      colorBits: 4,
      alphaBits: 0,
      endpointPBits: 1,
      sharedPBits: 0,
      indexBits: [3, 0],
    },
    {
      // 1
      numSubsets: 2,
      partitionBits: 6,
      rotationBits: 0,
      indexSelectionBits: 0,
      colorBits: 6,
      alphaBits: 0,
      endpointPBits: 0,
      sharedPBits: 1,
      indexBits: [3, 0],
    },
    {
      // 2
      numSubsets: 3,
      partitionBits: 6,
      rotationBits: 0,
      indexSelectionBits: 0,
      colorBits: 5,
      alphaBits: 0,
      endpointPBits: 0,
      sharedPBits: 0,
      indexBits: [2, 0],
    },
    {
      // 3

      numSubsets: 2,
      partitionBits: 6,
      rotationBits: 0,
      indexSelectionBits: 0,
      colorBits: 7,
      alphaBits: 0,
      endpointPBits: 1,
      sharedPBits: 0,
      indexBits: [2, 0],
    },
    {
      // 4

      numSubsets: 1,
      partitionBits: 0,
      rotationBits: 2,
      indexSelectionBits: 1,
      colorBits: 5,
      alphaBits: 6,
      endpointPBits: 0,
      sharedPBits: 0,
      indexBits: [2, 3],
    },
    {
      // 5
      numSubsets: 1,
      partitionBits: 0,
      rotationBits: 2,
      indexSelectionBits: 0,
      colorBits: 7,
      alphaBits: 8,
      endpointPBits: 0,
      sharedPBits: 0,
      indexBits: [2, 2],
    },
    {
      // 6
      numSubsets: 1,
      partitionBits: 0,
      rotationBits: 0,
      indexSelectionBits: 0,
      colorBits: 7,
      alphaBits: 7,
      endpointPBits: 1,
      sharedPBits: 0,
      indexBits: [4, 0],
    },
    {
      // 7
      numSubsets: 2,
      partitionBits: 6,
      rotationBits: 0,
      indexSelectionBits: 0,
      colorBits: 5,
      alphaBits: 5,
      endpointPBits: 1,
      sharedPBits: 0,
      indexBits: [2, 0],
    },
  ];

  static size(width: number, height: number): number {
    const w = Math.max(4, width) / 4;
    const h = Math.max(4, height) / 4;
    return w * h * BC7.BLOCK_SIZE;
  }

  static expand_quantized(v: number, bits: number): number {
    v = v << (8 - bits);
    return v | (v >>> bits);
  }

  static decompressBlock(x: number, y: number, width: number, range: BufferRange, image: Uint8ClampedArray) {
    function writeImage(yy: number, xx: number, r: number, g: number, b: number, a: number) {
      const idx = (y + yy) * width + (x + xx);
      image[idx * 4 + 0] = r;
      image[idx * 4 + 1] = g;
      image[idx * 4 + 2] = b;
      image[idx * 4 + 3] = a;
    }

    //debugger;
    const bit = new BitReader(range.getUint8Array(0, 16));

    let bitn = 0;

    let mode = 0;
    for (; bitn < 8 && !bit.getBit(bitn++); mode++) {}

    if (bitn == 8) {
      for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) writeImage(yy, xx, 0, 0, 0, 0);
      return;
    }
    
    const mi = BC7.MODE_INFO[mode];
    const modePBits = 0 != mi.endpointPBits ? mi.endpointPBits : mi.sharedPBits;

    const partitionSetIdx = bit.getUint(bitn, mi.partitionBits);
    bitn += mi.partitionBits;

    const rotationMode = bit.getUint(bitn, mi.rotationBits);
    bitn += mi.rotationBits;

    const indexSelectionMode = bit.getUint(bitn, mi.indexSelectionBits);
    bitn += mi.indexSelectionBits;

    const epR = [0, 0, 0, 0, 0, 0];
    for (let ii = 0; ii < mi.numSubsets; ++ii) {
      epR[ii * 2 + 0] = bit.getUint(bitn, mi.colorBits) << modePBits;
      bitn += mi.colorBits;
      epR[ii * 2 + 1] = bit.getUint(bitn, mi.colorBits) << modePBits;
      bitn += mi.colorBits;
    }

    const epG = [0, 0, 0, 0, 0, 0];
    for (let ii = 0; ii < mi.numSubsets; ++ii) {
      epG[ii * 2 + 0] = bit.getUint(bitn, mi.colorBits) << modePBits;
      bitn += mi.colorBits;
      epG[ii * 2 + 1] = bit.getUint(bitn, mi.colorBits) << modePBits;
      bitn += mi.colorBits;
    }

    const epB = [0, 0, 0, 0, 0, 0];
    for (let ii = 0; ii < mi.numSubsets; ++ii) {
      epB[ii * 2 + 0] = bit.getUint(bitn, mi.colorBits) << modePBits;
      bitn += mi.colorBits;
      epB[ii * 2 + 1] = bit.getUint(bitn, mi.colorBits) << modePBits;
      bitn += mi.colorBits;
    }

    const epA = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    if (mi.alphaBits) {
      for (let ii = 0; ii < mi.numSubsets; ++ii) {
        epA[ii * 2 + 0] = bit.getUint(bitn, mi.alphaBits) << modePBits;
        bitn += mi.alphaBits;
        epA[ii * 2 + 1] = bit.getUint(bitn, mi.alphaBits) << modePBits;
        bitn += mi.alphaBits;
      }
    }

    if (0 != modePBits) {
      for (let ii = 0; ii < mi.numSubsets; ++ii) {
        const pda = bit.getUint(bitn, modePBits);
        bitn += modePBits;

        let pdb = pda;
        if (mi.sharedPBits == 0) {
          pdb = bit.getUint(bitn, modePBits);
          bitn += modePBits;
        }

        epR[ii * 2 + 0] |= pda;
        epR[ii * 2 + 1] |= pdb;
        epG[ii * 2 + 0] |= pda;
        epG[ii * 2 + 1] |= pdb;
        epB[ii * 2 + 0] |= pda;
        epB[ii * 2 + 1] |= pdb;
        epA[ii * 2 + 0] |= pda;
        epA[ii * 2 + 1] |= pdb;
      }
    }

    let colorBits = mi.colorBits + modePBits;

    for (let ii = 0; ii < mi.numSubsets; ++ii) {
      epR[ii * 2 + 0] = BC7.expand_quantized(epR[ii * 2 + 0], colorBits);
      epR[ii * 2 + 1] = BC7.expand_quantized(epR[ii * 2 + 1], colorBits);
      epG[ii * 2 + 0] = BC7.expand_quantized(epG[ii * 2 + 0], colorBits);
      epG[ii * 2 + 1] = BC7.expand_quantized(epG[ii * 2 + 1], colorBits);
      epB[ii * 2 + 0] = BC7.expand_quantized(epB[ii * 2 + 0], colorBits);
      epB[ii * 2 + 1] = BC7.expand_quantized(epB[ii * 2 + 1], colorBits);
    }

    if (mi.alphaBits) {
      let alphaBits = mi.alphaBits + modePBits;

      for (let ii = 0; ii < mi.numSubsets; ++ii) {
        epA[ii * 2 + 0] = BC7.expand_quantized(epA[ii * 2 + 0], alphaBits);
        epA[ii * 2 + 1] = BC7.expand_quantized(epA[ii * 2 + 1], alphaBits);
      }
    }

    let hasIndexBits1 = 0 != mi.indexBits[1];

    const f0 = FACTORS[mi.indexBits[0] - 2];
    const factors = [f0, hasIndexBits1 ? FACTORS[mi.indexBits[1] - 2] : f0];

    const offset = [0, mi.numSubsets * (16 * mi.indexBits[0] - 1)];

    for (let yy = 0; yy < 4; ++yy) {
      for (let xx = 0; xx < 4; ++xx) {
        let idx = yy * 4 + xx;

        let subsetIndex = 0;
        let indexAnchor = 0;
        switch (mi.numSubsets) {
          case 2:
            subsetIndex = (P2[partitionSetIdx] >>> idx) & 1;
            indexAnchor = 0 != subsetIndex ? P2[partitionSetIdx] : 0;
            break;

          case 3:
            subsetIndex = (P2[partitionSetIdx] >>> (2 * idx)) & 3;
            indexAnchor = 0 != subsetIndex ? P2[subsetIndex - 1][partitionSetIdx] : 0;
            break;

          default:
            break;
        }

        let anchor = idx == indexAnchor ? 1 : 0;
        const num = [mi.indexBits[0] - anchor, hasIndexBits1 ? mi.indexBits[1] - anchor : 0];

        const i0 = bit.getUint(bitn + offset[0], num[0]);
        const index = [i0, hasIndexBits1 ? bit.getUint(bitn + offset[1], num[1]) : i0];

        offset[0] += num[0];
        offset[1] += num[1];

        let fc = factors[indexSelectionMode][index[indexSelectionMode]];
        let fa = factors[indexSelectionMode ^ 1][index[indexSelectionMode ^ 1]];

        let fca = 64 - fc;
        let fcb = fc;
        let faa = 64 - fa;
        let fab = fa;

        subsetIndex *= 2;
        let rr = (epR[subsetIndex] * fca + epR[subsetIndex + 1] * fcb + 32) >>> 6;
        let gg = (epG[subsetIndex] * fca + epG[subsetIndex + 1] * fcb + 32) >>> 6;
        let bb = (epB[subsetIndex] * fca + epB[subsetIndex + 1] * fcb + 32) >>> 6;
        let aa = (epA[subsetIndex] * faa + epA[subsetIndex + 1] * fab + 32) >>> 6;

        switch (rotationMode) {
          case 1:
            [aa, rr] = [rr, aa];
            break;
          case 2:
            [aa, gg] = [gg, aa];
            break;
          case 3:
            [aa, bb] = [bb, aa];
            break;
          default:
            break;
        }
        
        //writeImage(yy, xx, rr, gg, bb, aa);
        writeImage(yy, xx, mi.colorBits * 20, mi.colorBits * 20, mi.colorBits * 20, 0xFF);
      }
    }
  }

  static decompress(width: number, height: number, blocks: ArrayBuffer): Uint8ClampedArray {
    let blockCountX = width / 4;
    let blockCountY = height / 4;

    const image = new Uint8ClampedArray(width * height * 4);

    let range = new BufferRange(blocks);
    for (let j = 0; j < blockCountY; j++) {
      for (let i = 0; i < blockCountX; i++) {
        DXT1.decompressBlock(i * 4, j * 4, width, range, image);
        range = range.slice(BC7.BLOCK_SIZE);
      }
    }

    return image;
  }
}
*/

const actual_bits_count = [
  [4, 6, 5, 7, 5, 7, 7, 5] /* RGBA  */,
  [0, 0, 0, 0, 6, 8, 7, 5] /* Alpha */,
];

const partition_sets = [
  [
    /* Partition table for 2-subset BPTC */
    [
      [128, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 129],
    ] /*  0 */,
    [
      [128, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 129],
    ] /*  1 */,
    [
      [128, 1, 1, 1],
      [0, 1, 1, 1],
      [0, 1, 1, 1],
      [0, 1, 1, 129],
    ] /*  2 */,
    [
      [128, 0, 0, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 1, 1, 129],
    ] /*  3 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 1, 129],
    ] /*  4 */,
    [
      [128, 0, 1, 1],
      [0, 1, 1, 1],
      [0, 1, 1, 1],
      [1, 1, 1, 129],
    ] /*  5 */,
    [
      [128, 0, 0, 1],
      [0, 0, 1, 1],
      [0, 1, 1, 1],
      [1, 1, 1, 129],
    ] /*  6 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 1],
      [0, 1, 1, 129],
    ] /*  7 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 129],
    ] /*  8 */,
    [
      [128, 0, 1, 1],
      [0, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 129],
    ] /*  9 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 1, 1, 1],
      [1, 1, 1, 129],
    ] /* 10 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 1, 1, 129],
    ] /* 11 */,
    [
      [128, 0, 0, 1],
      [0, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 129],
    ] /* 12 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [1, 1, 1, 129],
    ] /* 13 */,
    [
      [128, 0, 0, 0],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 129],
    ] /* 14 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 129],
    ] /* 15 */,
    [
      [128, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 1, 1, 129],
    ] /* 16 */,
    [
      [128, 1, 129, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ] /* 17 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [129, 0, 0, 0],
      [1, 1, 1, 0],
    ] /* 18 */,
    [
      [128, 1, 129, 1],
      [0, 0, 1, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ] /* 19 */,
    [
      [128, 0, 129, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ] /* 20 */,
    [
      [128, 0, 0, 0],
      [1, 0, 0, 0],
      [129, 1, 0, 0],
      [1, 1, 1, 0],
    ] /* 21 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [129, 0, 0, 0],
      [1, 1, 0, 0],
    ] /* 22 */,
    [
      [128, 1, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 0, 129],
    ] /* 23 */,
    [
      [128, 0, 129, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 0],
    ] /* 24 */,
    [
      [128, 0, 0, 0],
      [1, 0, 0, 0],
      [129, 0, 0, 0],
      [1, 1, 0, 0],
    ] /* 25 */,
    [
      [128, 1, 129, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
    ] /* 26 */,
    [
      [128, 0, 129, 1],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
    ] /* 27 */,
    [
      [128, 0, 0, 1],
      [0, 1, 1, 1],
      [129, 1, 1, 0],
      [1, 0, 0, 0],
    ] /* 28 */,
    [
      [128, 0, 0, 0],
      [1, 1, 1, 1],
      [129, 1, 1, 1],
      [0, 0, 0, 0],
    ] /* 29 */,
    [
      [128, 1, 129, 1],
      [0, 0, 0, 1],
      [1, 0, 0, 0],
      [1, 1, 1, 0],
    ] /* 30 */,
    [
      [128, 0, 129, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 0, 0],
    ] /* 31 */,
    [
      [128, 1, 0, 1],
      [0, 1, 0, 1],
      [0, 1, 0, 1],
      [0, 1, 0, 129],
    ] /* 32 */,
    [
      [128, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [1, 1, 1, 129],
    ] /* 33 */,
    [
      [128, 1, 0, 1],
      [1, 0, 129, 0],
      [0, 1, 0, 1],
      [1, 0, 1, 0],
    ] /* 34 */,
    [
      [128, 0, 1, 1],
      [0, 0, 1, 1],
      [129, 1, 0, 0],
      [1, 1, 0, 0],
    ] /* 35 */,
    [
      [128, 0, 129, 1],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
      [1, 1, 0, 0],
    ] /* 36 */,
    [
      [128, 1, 0, 1],
      [0, 1, 0, 1],
      [129, 0, 1, 0],
      [1, 0, 1, 0],
    ] /* 37 */,
    [
      [128, 1, 1, 0],
      [1, 0, 0, 1],
      [0, 1, 1, 0],
      [1, 0, 0, 129],
    ] /* 38 */,
    [
      [128, 1, 0, 1],
      [1, 0, 1, 0],
      [1, 0, 1, 0],
      [0, 1, 0, 129],
    ] /* 39 */,
    [
      [128, 1, 129, 1],
      [0, 0, 1, 1],
      [1, 1, 0, 0],
      [1, 1, 1, 0],
    ] /* 40 */,
    [
      [128, 0, 0, 1],
      [0, 0, 1, 1],
      [129, 1, 0, 0],
      [1, 0, 0, 0],
    ] /* 41 */,
    [
      [128, 0, 129, 1],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [1, 1, 0, 0],
    ] /* 42 */,
    [
      [128, 0, 129, 1],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
      [1, 1, 0, 0],
    ] /* 43 */,
    [
      [128, 1, 129, 0],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [0, 1, 1, 0],
    ] /* 44 */,
    [
      [128, 0, 1, 1],
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 1, 129],
    ] /* 45 */,
    [
      [128, 1, 1, 0],
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [1, 0, 0, 129],
    ] /* 46 */,
    [
      [128, 0, 0, 0],
      [0, 1, 129, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ] /* 47 */,
    [
      [128, 1, 0, 0],
      [1, 1, 129, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ] /* 48 */,
    [
      [128, 0, 129, 0],
      [0, 1, 1, 1],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ] /* 49 */,
    [
      [128, 0, 0, 0],
      [0, 0, 129, 0],
      [0, 1, 1, 1],
      [0, 0, 1, 0],
    ] /* 50 */,
    [
      [128, 0, 0, 0],
      [0, 1, 0, 0],
      [129, 1, 1, 0],
      [0, 1, 0, 0],
    ] /* 51 */,
    [
      [128, 1, 1, 0],
      [1, 1, 0, 0],
      [1, 0, 0, 1],
      [0, 0, 1, 129],
    ] /* 52 */,
    [
      [128, 0, 1, 1],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [1, 0, 0, 129],
    ] /* 53 */,
    [
      [128, 1, 129, 0],
      [0, 0, 1, 1],
      [1, 0, 0, 1],
      [1, 1, 0, 0],
    ] /* 54 */,
    [
      [128, 0, 129, 1],
      [1, 0, 0, 1],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
    ] /* 55 */,
    [
      [128, 1, 1, 0],
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [1, 0, 0, 129],
    ] /* 56 */,
    [
      [128, 1, 1, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [1, 0, 0, 129],
    ] /* 57 */,
    [
      [128, 1, 1, 1],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 129],
    ] /* 58 */,
    [
      [128, 0, 0, 1],
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 1, 1, 129],
    ] /* 59 */,
    [
      [128, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 1, 129],
    ] /* 60 */,
    [
      [128, 0, 129, 1],
      [0, 0, 1, 1],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ] /* 61 */,
    [
      [128, 0, 129, 0],
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [1, 1, 1, 0],
    ] /* 62 */,
    [
      [128, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 1],
      [0, 1, 1, 129],
    ] /* 63 */,
  ],
  [
    /* Partition table for 3-subset BPTC */
    [
      [128, 0, 1, 129],
      [0, 0, 1, 1],
      [0, 2, 2, 1],
      [2, 2, 2, 130],
    ] /*  0 */,
    [
      [128, 0, 0, 129],
      [0, 0, 1, 1],
      [130, 2, 1, 1],
      [2, 2, 2, 1],
    ] /*  1 */,
    [
      [128, 0, 0, 0],
      [2, 0, 0, 1],
      [130, 2, 1, 1],
      [2, 2, 1, 129],
    ] /*  2 */,
    [
      [128, 2, 2, 130],
      [0, 0, 2, 2],
      [0, 0, 1, 1],
      [0, 1, 1, 129],
    ] /*  3 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [129, 1, 2, 2],
      [1, 1, 2, 130],
    ] /*  4 */,
    [
      [128, 0, 1, 129],
      [0, 0, 1, 1],
      [0, 0, 2, 2],
      [0, 0, 2, 130],
    ] /*  5 */,
    [
      [128, 0, 2, 130],
      [0, 0, 2, 2],
      [1, 1, 1, 1],
      [1, 1, 1, 129],
    ] /*  6 */,
    [
      [128, 0, 1, 1],
      [0, 0, 1, 1],
      [130, 2, 1, 1],
      [2, 2, 1, 129],
    ] /*  7 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [129, 1, 1, 1],
      [2, 2, 2, 130],
    ] /*  8 */,
    [
      [128, 0, 0, 0],
      [1, 1, 1, 1],
      [129, 1, 1, 1],
      [2, 2, 2, 130],
    ] /*  9 */,
    [
      [128, 0, 0, 0],
      [1, 1, 129, 1],
      [2, 2, 2, 2],
      [2, 2, 2, 130],
    ] /* 10 */,
    [
      [128, 0, 1, 2],
      [0, 0, 129, 2],
      [0, 0, 1, 2],
      [0, 0, 1, 130],
    ] /* 11 */,
    [
      [128, 1, 1, 2],
      [0, 1, 129, 2],
      [0, 1, 1, 2],
      [0, 1, 1, 130],
    ] /* 12 */,
    [
      [128, 1, 2, 2],
      [0, 129, 2, 2],
      [0, 1, 2, 2],
      [0, 1, 2, 130],
    ] /* 13 */,
    [
      [128, 0, 1, 129],
      [0, 1, 1, 2],
      [1, 1, 2, 2],
      [1, 2, 2, 130],
    ] /* 14 */,
    [
      [128, 0, 1, 129],
      [2, 0, 0, 1],
      [130, 2, 0, 0],
      [2, 2, 2, 0],
    ] /* 15 */,
    [
      [128, 0, 0, 129],
      [0, 0, 1, 1],
      [0, 1, 1, 2],
      [1, 1, 2, 130],
    ] /* 16 */,
    [
      [128, 1, 1, 129],
      [0, 0, 1, 1],
      [130, 0, 0, 1],
      [2, 2, 0, 0],
    ] /* 17 */,
    [
      [128, 0, 0, 0],
      [1, 1, 2, 2],
      [129, 1, 2, 2],
      [1, 1, 2, 130],
    ] /* 18 */,
    [
      [128, 0, 2, 130],
      [0, 0, 2, 2],
      [0, 0, 2, 2],
      [1, 1, 1, 129],
    ] /* 19 */,
    [
      [128, 1, 1, 129],
      [0, 1, 1, 1],
      [0, 2, 2, 2],
      [0, 2, 2, 130],
    ] /* 20 */,
    [
      [128, 0, 0, 129],
      [0, 0, 0, 1],
      [130, 2, 2, 1],
      [2, 2, 2, 1],
    ] /* 21 */,
    [
      [128, 0, 0, 0],
      [0, 0, 129, 1],
      [0, 1, 2, 2],
      [0, 1, 2, 130],
    ] /* 22 */,
    [
      [128, 0, 0, 0],
      [1, 1, 0, 0],
      [130, 2, 129, 0],
      [2, 2, 1, 0],
    ] /* 23 */,
    [
      [128, 1, 2, 130],
      [0, 129, 2, 2],
      [0, 0, 1, 1],
      [0, 0, 0, 0],
    ] /* 24 */,
    [
      [128, 0, 1, 2],
      [0, 0, 1, 2],
      [129, 1, 2, 2],
      [2, 2, 2, 130],
    ] /* 25 */,
    [
      [128, 1, 1, 0],
      [1, 2, 130, 1],
      [129, 2, 2, 1],
      [0, 1, 1, 0],
    ] /* 26 */,
    [
      [128, 0, 0, 0],
      [0, 1, 129, 0],
      [1, 2, 130, 1],
      [1, 2, 2, 1],
    ] /* 27 */,
    [
      [128, 0, 2, 2],
      [1, 1, 0, 2],
      [129, 1, 0, 2],
      [0, 0, 2, 130],
    ] /* 28 */,
    [
      [128, 1, 1, 0],
      [0, 129, 1, 0],
      [2, 0, 0, 2],
      [2, 2, 2, 130],
    ] /* 29 */,
    [
      [128, 0, 1, 1],
      [0, 1, 2, 2],
      [0, 1, 130, 2],
      [0, 0, 1, 129],
    ] /* 30 */,
    [
      [128, 0, 0, 0],
      [2, 0, 0, 0],
      [130, 2, 1, 1],
      [2, 2, 2, 129],
    ] /* 31 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 2],
      [129, 1, 2, 2],
      [1, 2, 2, 130],
    ] /* 32 */,
    [
      [128, 2, 2, 130],
      [0, 0, 2, 2],
      [0, 0, 1, 2],
      [0, 0, 1, 129],
    ] /* 33 */,
    [
      [128, 0, 1, 129],
      [0, 0, 1, 2],
      [0, 0, 2, 2],
      [0, 2, 2, 130],
    ] /* 34 */,
    [
      [128, 1, 2, 0],
      [0, 129, 2, 0],
      [0, 1, 130, 0],
      [0, 1, 2, 0],
    ] /* 35 */,
    [
      [128, 0, 0, 0],
      [1, 1, 129, 1],
      [2, 2, 130, 2],
      [0, 0, 0, 0],
    ] /* 36 */,
    [
      [128, 1, 2, 0],
      [1, 2, 0, 1],
      [130, 0, 129, 2],
      [0, 1, 2, 0],
    ] /* 37 */,
    [
      [128, 1, 2, 0],
      [2, 0, 1, 2],
      [129, 130, 0, 1],
      [0, 1, 2, 0],
    ] /* 38 */,
    [
      [128, 0, 1, 1],
      [2, 2, 0, 0],
      [1, 1, 130, 2],
      [0, 0, 1, 129],
    ] /* 39 */,
    [
      [128, 0, 1, 1],
      [1, 1, 130, 2],
      [2, 2, 0, 0],
      [0, 0, 1, 129],
    ] /* 40 */,
    [
      [128, 1, 0, 129],
      [0, 1, 0, 1],
      [2, 2, 2, 2],
      [2, 2, 2, 130],
    ] /* 41 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [130, 1, 2, 1],
      [2, 1, 2, 129],
    ] /* 42 */,
    [
      [128, 0, 2, 2],
      [1, 129, 2, 2],
      [0, 0, 2, 2],
      [1, 1, 2, 130],
    ] /* 43 */,
    [
      [128, 0, 2, 130],
      [0, 0, 1, 1],
      [0, 0, 2, 2],
      [0, 0, 1, 129],
    ] /* 44 */,
    [
      [128, 2, 2, 0],
      [1, 2, 130, 1],
      [0, 2, 2, 0],
      [1, 2, 2, 129],
    ] /* 45 */,
    [
      [128, 1, 0, 1],
      [2, 2, 130, 2],
      [2, 2, 2, 2],
      [0, 1, 0, 129],
    ] /* 46 */,
    [
      [128, 0, 0, 0],
      [2, 1, 2, 1],
      [130, 1, 2, 1],
      [2, 1, 2, 129],
    ] /* 47 */,
    [
      [128, 1, 0, 129],
      [0, 1, 0, 1],
      [0, 1, 0, 1],
      [2, 2, 2, 130],
    ] /* 48 */,
    [
      [128, 2, 2, 130],
      [0, 1, 1, 1],
      [0, 2, 2, 2],
      [0, 1, 1, 129],
    ] /* 49 */,
    [
      [128, 0, 0, 2],
      [1, 129, 1, 2],
      [0, 0, 0, 2],
      [1, 1, 1, 130],
    ] /* 50 */,
    [
      [128, 0, 0, 0],
      [2, 129, 1, 2],
      [2, 1, 1, 2],
      [2, 1, 1, 130],
    ] /* 51 */,
    [
      [128, 2, 2, 2],
      [0, 129, 1, 1],
      [0, 1, 1, 1],
      [0, 2, 2, 130],
    ] /* 52 */,
    [
      [128, 0, 0, 2],
      [1, 1, 1, 2],
      [129, 1, 1, 2],
      [0, 0, 0, 130],
    ] /* 53 */,
    [
      [128, 1, 1, 0],
      [0, 129, 1, 0],
      [0, 1, 1, 0],
      [2, 2, 2, 130],
    ] /* 54 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 1, 129, 2],
      [2, 1, 1, 130],
    ] /* 55 */,
    [
      [128, 1, 1, 0],
      [0, 129, 1, 0],
      [2, 2, 2, 2],
      [2, 2, 2, 130],
    ] /* 56 */,
    [
      [128, 0, 2, 2],
      [0, 0, 1, 1],
      [0, 0, 129, 1],
      [0, 0, 2, 130],
    ] /* 57 */,
    [
      [128, 0, 2, 2],
      [1, 1, 2, 2],
      [129, 1, 2, 2],
      [0, 0, 2, 130],
    ] /* 58 */,
    [
      [128, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 129, 1, 130],
    ] /* 59 */,
    [
      [128, 0, 0, 130],
      [0, 0, 0, 1],
      [0, 0, 0, 2],
      [0, 0, 0, 129],
    ] /* 60 */,
    [
      [128, 2, 2, 2],
      [1, 2, 2, 2],
      [0, 2, 2, 2],
      [129, 2, 2, 130],
    ] /* 61 */,
    [
      [128, 1, 0, 129],
      [2, 2, 2, 2],
      [2, 2, 2, 2],
      [2, 2, 2, 130],
    ] /* 62 */,
    [
      [128, 1, 1, 129],
      [2, 0, 1, 1],
      [130, 2, 0, 1],
      [2, 2, 2, 0],
    ] /* 63 */,
  ],
];

const aWeight2 = [0, 21, 43, 64];
const aWeight3 = [0, 9, 18, 27, 37, 46, 55, 64];
const aWeight4 = [0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64];

/* There are 64 possible partition sets for a two-region tile.
    Each 4x4 block represents a single shape.
    Here also every fix-up index has MSB bit set. */

const sModeHasPBits = 203; /* 0b11001011 */

class BitReader {
  private _buffer: Uint8Array;
  private _offset: number;

  constructor(buffer: Uint8Array) {
    this._buffer = buffer;
    this._offset = 0;
  }

  getBit(): boolean {
    const p8 = Math.floor(this._offset / 8);
    const u8 = this._buffer[p8];
    const ret = !!((u8 >>> (7 - (this._offset % 8))) & 0b1);
    this._offset++;
    return ret;
  }

  getBits(count: number): boolean[] {
    // not optimized
    let bits: boolean[] = [];
    for (let i = 0; i < count; i++) bits.push(this.getBit());
    return bits;
  }

  getUint(size: number) {
    const bits = this.getBits(size);
    return bits.reduce((r, v) => (r << 1) + (v ? 1 : 0), 0);
  }
}

export class BC7 {
  static readonly BLOCK_SIZE = 16;

  static size(width: number, height: number): number {
    const w = Math.max(4, width) / 4;
    const h = Math.max(4, height) / 4;
    return w * h * BC7.BLOCK_SIZE;
  }

  static decompressBlock(x: number, y: number, width: number, range: BufferRange, image: Uint8ClampedArray) {
    function writeImage(yy: number, xx: number, r: number, g: number, b: number, a: number) {
      const idx = (y + yy) * width + (x + xx);
      image[idx * 4 + 0] = r;
      image[idx * 4 + 1] = g;
      image[idx * 4 + 2] = b;
      image[idx * 4 + 3] = a;
    }

    const bit = new BitReader(range.getUint8Array(0, 16));

    let mode = 0;
    for (; mode < 8 && !bit.getBit(); ++mode);

    /* unexpected mode, clear the block (transparent black) */
    if (mode >= 8) {
      for (let i = 0; i < 4; ++i) {
        for (let j = 0; j < 4; ++j) {
          writeImage(j, i, 0, 0, 0, 0);
        }
      }
      return;
    }

    let numPartitions = 1;
    let partition = 0;
    if (mode == 0 || mode == 1 || mode == 2 || mode == 3 || mode == 7) {
      numPartitions = mode == 0 || mode == 2 ? 3 : 2;
      partition = bit.getUint(mode == 0 ? 4 : 6);
    }

    let numEndpoints = numPartitions * 2;

    let rotation = 0;
    let indexSelectionBit = 0;
    if (mode == 4 || mode == 5) {
      rotation = bit.getUint(2);
      if (mode == 4) {
        indexSelectionBit = bit.getUint(1);
      }
    }

    let endpoints = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    /* Extract endpoints */
    /* RGB */
    for (let i = 0; i < 3; ++i) {
      for (let j = 0; j < numEndpoints; ++j) {
        endpoints[j][i] = bit.getUint(actual_bits_count[0][mode]);
      }
    }
    /* Alpha (if any) */
    if (actual_bits_count[1][mode] > 0) {
      for (let j = 0; j < numEndpoints; ++j) {
        endpoints[j][3] = bit.getUint(actual_bits_count[1][mode]);
      }
    }

    /* Fully decode endpoints */
    /* First handle modes that have P-bits */
    if (mode == 0 || mode == 1 || mode == 3 || mode == 6 || mode == 7) {
      for (let i = 0; i < numEndpoints; ++i) {
        /* component-wise left-shift */
        for (let j = 0; j < 4; ++j) {
          endpoints[i][j] <<= 1;
        }
      }

      /* if P-bit is shared */
      if (mode == 1) {
        const i = bit.getUint(1);
        const j = bit.getUint(1);

        /* rgb component-wise insert pbits */
        for (let k = 0; k < 3; ++k) {
          endpoints[0][k] |= i;
          endpoints[1][k] |= i;
          endpoints[2][k] |= j;
          endpoints[3][k] |= j;
        }
      } else if (sModeHasPBits & (1 << mode)) {
        /* unique P-bit per endpoint */
        for (let i = 0; i < numEndpoints; ++i) {
          let j = bit.getUint(1);
          for (let k = 0; k < 4; ++k) {
            endpoints[i][k] |= j;
          }
        }
      }
    }

    for (let i = 0; i < numEndpoints; ++i) {
      /* get color components precision including pbit */
      let j = actual_bits_count[0][mode] + ((sModeHasPBits >>> mode) & 1);

      for (let k = 0; k < 3; ++k) {
        /* left shift endpoint components so that their MSB lies in bit 7 */
        endpoints[i][k] = endpoints[i][k] << (8 - j);
        /* Replicate each component's MSB into the LSBs revealed by the left-shift operation above */
        endpoints[i][k] = endpoints[i][k] | (endpoints[i][k] >>> j);
      }

      /* get alpha component precision including pbit */
      j = actual_bits_count[1][mode] + ((sModeHasPBits >>> mode) & 1);

      /* left shift endpoint components so that their MSB lies in bit 7 */
      endpoints[i][3] = endpoints[i][3] << (8 - j);
      /* Replicate each component's MSB into the LSBs revealed by the left-shift operation above */
      endpoints[i][3] = endpoints[i][3] | (endpoints[i][3] >>> j);
    }

    /* If this mode does not explicitly define the alpha component */
    /* set alpha equal to 1.0 */
    if (!actual_bits_count[1][mode]) {
      for (let j = 0; j < numEndpoints; ++j) {
        endpoints[j][3] = 0xff;
      }
    }

    /* Determine weights tables */
    let indexBits = mode == 0 || mode == 1 ? 3 : mode == 6 ? 4 : 2;
    let indexBits2 = mode == 4 ? 3 : mode == 5 ? 2 : 0;
    let weights = indexBits == 2 ? aWeight2 : indexBits == 3 ? aWeight3 : aWeight4;
    let weights2 = indexBits2 == 2 ? aWeight2 : aWeight3;

    /* Quite inconvenient that indices aren't interleaved so we have to make 2 passes here */
    /* Pass #1: collecting color indices */
    let indices = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    let partitionSet = 0;

    for (let i = 0; i < 4; ++i) {
      for (let j = 0; j < 4; ++j) {
        partitionSet = numPartitions == 1 ? (i | j ? 0 : 128) : partition_sets[numPartitions - 2][partition][i][j];

        indexBits = mode == 0 || mode == 1 ? 3 : mode == 6 ? 4 : 2;
        /* fix-up index is specified with one less bit */
        /* The fix-up index for subset 0 is always index 0 */
        if (partitionSet & 0x80) {
          indexBits--;
        }

        indices[i][j] = bit.getUint(indexBits);
      }
    }

    const bcdec__interpolate = (a: number, b: number, weights: number[], index: number) => {
      return (a * (64 - weights[index]) + b * weights[index] + 32) >>> 6;
    };

    /* Pass #2: reading alpha indices (if any) and interpolating & rotating */
    for (let i = 0; i < 4; ++i) {
      for (let j = 0; j < 4; ++j) {
        partitionSet = numPartitions == 1 ? (i | j ? 0 : 128) : partition_sets[numPartitions - 2][partition][i][j];
        partitionSet &= 0x03;

        const index = indices[i][j];
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        if (!indexBits2) {
          r = bcdec__interpolate(endpoints[partitionSet * 2][0], endpoints[partitionSet * 2 + 1][0], weights, index);
          g = bcdec__interpolate(endpoints[partitionSet * 2][1], endpoints[partitionSet * 2 + 1][1], weights, index);
          b = bcdec__interpolate(endpoints[partitionSet * 2][2], endpoints[partitionSet * 2 + 1][2], weights, index);
          a = bcdec__interpolate(endpoints[partitionSet * 2][3], endpoints[partitionSet * 2 + 1][3], weights, index);
        } else {
          const index2 = bit.getUint(i | j ? indexBits2 : indexBits2 - 1);
          /* The index value for interpolating color comes from the secondary index bits for the texel
                 if the mode has an index selection bit and its value is one, and from the primary index bits otherwise.
                 The alpha index comes from the secondary index bits if the block has a secondary index and
                 the block either doesn’t have an index selection bit or that bit is zero, and from the primary index bits otherwise. */
          if (!indexSelectionBit) {
            r = bcdec__interpolate(endpoints[partitionSet * 2][0], endpoints[partitionSet * 2 + 1][0], weights, index);
            g = bcdec__interpolate(endpoints[partitionSet * 2][1], endpoints[partitionSet * 2 + 1][1], weights, index);
            b = bcdec__interpolate(endpoints[partitionSet * 2][2], endpoints[partitionSet * 2 + 1][2], weights, index);
            a = bcdec__interpolate(endpoints[partitionSet * 2][3], endpoints[partitionSet * 2 + 1][3], weights2, index2);
          } else {
            r = bcdec__interpolate(endpoints[partitionSet * 2][0], endpoints[partitionSet * 2 + 1][0], weights2, index2);
            g = bcdec__interpolate(endpoints[partitionSet * 2][1], endpoints[partitionSet * 2 + 1][1], weights2, index2);
            b = bcdec__interpolate(endpoints[partitionSet * 2][2], endpoints[partitionSet * 2 + 1][2], weights2, index2);
            a = bcdec__interpolate(endpoints[partitionSet * 2][3], endpoints[partitionSet * 2 + 1][3], weights, index);
          }
        }

        switch (rotation) {
          case 1:
            /* 01 – Block format is Scalar(R) Vector(AGB) - swap A and R */
            [a, r] = [r, a];
            break;
          case 2:
            /* 10 – Block format is Scalar(G) Vector(RAB) - swap A and G */
            [a, g] = [g, a];
            break;
          case 3:
            /* 11 - Block format is Scalar(B) Vector(RGA) - swap A and B */
            [a, b] = [b, a];
            break;
        }

        writeImage(j, i, r, g, b, a);
      }
    }
  }

  static decompress(width: number, height: number, blocks: ArrayBuffer): Uint8ClampedArray {
    let blockCountX = width / 4;
    let blockCountY = height / 4;

    const image = new Uint8ClampedArray(width * height * 4);

    let range = new BufferRange(blocks);
    for (let j = 0; j < blockCountY; j++) {
      for (let i = 0; i < blockCountX; i++) {
        BC7.decompressBlock(i * 4, j * 4, width, range, image);
        range = range.slice(BC7.BLOCK_SIZE);
      }
    }

    return image;
  }
}
