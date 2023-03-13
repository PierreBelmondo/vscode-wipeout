// Copyrights libgnm
// https://gitgud.io/glue_sniffer_420/libgnm/-/blob/master/gnm/types.h

import { BufferRange } from "@core/utils/range";

export enum SurfaceFormat {
  SURFMT_INVALID = 0x0,
  SURFMT_8 = 0x1,
  SURFMT_16 = 0x2,
  SURFMT_8_8 = 0x3,
  SURFMT_32 = 0x4,
  SURFMT_16_16 = 0x5,
  SURFMT_10_11_11 = 0x6,
  SURFMT_11_11_10 = 0x7,
  SURFMT_10_10_10_2 = 0x8,
  SURFMT_2_10_10_10 = 0x9,
  SURFMT_8_8_8_8 = 0xa,
  SURFMT_32_32 = 0xb,
  SURFMT_16_16_16_16 = 0xc,
  SURFMT_32_32_32 = 0xd,
  SURFMT_32_32_32_32 = 0xe,
  SURFMT_5_6_5 = 0x10,
  SURFMT_1_5_5_5 = 0x11,
  SURFMT_5_5_5_1 = 0x12,
  SURFMT_4_4_4_4 = 0x13,
  SURFMT_8_24 = 0x14,
  SURFMT_24_8 = 0x15,
  SURFMT_X24_8_32 = 0x16,
  SURFMT_GB_GR = 0x20,
  SURFMT_BG_RG = 0x21,
  SURFMT_5_9_9_9 = 0x22,
  SURFMT_BC1 = 0x23,
  SURFMT_BC2 = 0x24,
  SURFMT_BC3 = 0x25,
  SURFMT_BC4 = 0x26,
  SURFMT_BC5 = 0x27,
  SURFMT_BC6 = 0x28,
  SURFMT_BC7 = 0x29,
  SURFMT_FMASK8_S2_F1 = 0x2c,
  SURFMT_FMASK8_S4_F1 = 0x2d,
  SURFMT_FMASK8_S8_F1 = 0x2e,
  SURFMT_FMASK8_S2_F2 = 0x2f,
  SURFMT_FMASK8_S4_F2 = 0x30,
  SURFMT_FMASK8_S4_F4 = 0x31,
  SURFMT_FMASK16_S16_F1 = 0x32,
  SURFMT_FMASK16_S8_F2 = 0x33,
  SURFMT_FMASK32_S16_F2 = 0x34,
  SURFMT_FMASK32_S8_F4 = 0x35,
  SURFMT_FMASK32_S8_F8 = 0x36,
  SURFMT_FMASK64_S16_F4 = 0x37,
  SURFMT_FMASK64_S16_F8 = 0x38,
  SURFMT_4_4 = 0x39,
  SURFMT_6_5_5 = 0x3a,
  SURFMT_1 = 0x3b,
  SURFMT_1_REVERSED = 0x3c,
}

enum GnmTextureType {
  TEXTURE_1D = 0x8,
  TEXTURE_2D = 0x9,
  TEXTURE_3D = 0xa,
  TEXTURE_CUBEMAP = 0xb,
  TEXTURE_1D_ARRAY = 0xc,
  TEXTURE_2D_ARRAY = 0xd,
  TEXTURE_2D_MSAA = 0xe,
  TEXTURE_2D_ARRAY_MSAA = 0xf,
}

export class GNMTexture {
  range = new BufferRange();

  registers = [0, 0, 0, 0, 0, 0, 0, 0];

  static load(range: BufferRange): GNMTexture {
    const ret = new GNMTexture();
    ret.range = range.slice(0, 0x20);
    ret.range.le = true;

    for (let i = 0; i < 8; i++) ret.registers[i] = ret.range.getUint32(i * 4);
    return ret;
  }

  // base address (register 0: 32 bits).
  get baseaddress() {
    // 256 byte aligned, also use for fmask-ptr
    // TODO: get extra bits from register 1?
    return this.registers[0];
  }

  /* register 1
    // NOTE: in the CI ISA, the 32-40 bits of this resource are also for the
    // base address, but this seems to be reused by GNM (or when processing
    // a GNF) for something else
    uint32_t baseaddresshi_unk : 6;
    uint32_t baseaddresshi_unk2 : 2;
  */

  // minlod (register 1: 12 bits [8-19])
  get minlod(): number {
    return (this.registers[1] >> 8) & ((1 << 12) - 1);
  }

  // dataFormat (register 1: 6 bits [20-25])
  get dataFormat(): SurfaceFormat {
    return (this.registers[1] >> 20) & ((1 << 6) - 1);
  }

  // numFormat (register 1: 4 bits [26-29])
  get numFormat(): number {
    return (this.registers[1] >> 26) & ((1 << 4) - 1);
  }

  // mType0 (register 1: 1 bit [30])
  get mType0(): boolean {
    // memory type, controls cache behavior
    return !!((this.registers[1] >> 30) & 1);
  }

  // mType1 (register 1: 1 bit [27])
  get mType1(): boolean {
    // memory type, controls cache behavior
    return !!(this.registers[1] >> 31);
  }

  // channelType (register 1: 4 bits [26-29])
  get channelType(): number {
    return (this.registers[1] >> 26) & ((1 << 4) - 1);
  }

  // width (register 2: 14 bits [0-13])
  get width(): number {
    return ((this.registers[2] >> 0) & ((1 << 14) - 1)) + 1;
  }

  // height (register 2: 14 bits [14-27])
  get height(): number {
    return ((this.registers[2] >> 14) & ((1 << 14) - 1)) + 1;
  }

  // perfmod (register 2: 3 bits [28-30])
  get perfmod(): number {
    return (this.registers[2] >> 28) & ((1 << 3) - 1);
  }

  // interlaced (register 2: 1 bit [31])
  get interlaced(): boolean {
    return !!(this.registers[2] >> 31);
  }

  // dstselx (register 3: 3 bits [0-2])
  get dstselx(): number {
    return (this.registers[3] >> 0) & ((1 << 3) - 1);
  }

  // dstsely (register 3: 3 bits [3-5])
  get dstsely(): number {
    return (this.registers[3] >> 3) & ((1 << 3) - 1);
  }

  // dstselz (register 3: 3 bits [6-8])
  get dstselz(): number {
    return (this.registers[3] >> 6) & ((1 << 3) - 1);
  }

  // dstselw (register 3: 3 bits [9-11])
  get dstselw(): number {
    return (this.registers[3] >> 9) & ((1 << 3) - 1);
  }

  // baselevel (register 3: 4 bits [12-15])
  get baselevel(): number {
    return (this.registers[3] >> 12) & ((1 << 4) - 1);
  }

  // lastlevel (register 3: 4 bits [16-19])
  // last mip level, or number of fragments/samples for MSAA
  get lastlevel(): number {
    return (this.registers[3] >> 16) & ((1 << 4) - 1);
  }

  // tilingindex (register 3: 5 bits [20-24])
  get tilingindex(): number {
    return (this.registers[3] >> 20) & ((1 << 5) - 1);
  }

  // pow2pad (register 3: 1 bits [25])
  get pow2pad(): boolean {
    return !!((this.registers[1] >> 25) & 1);
  }

  // mtype2 (register 3: 1 bits [26])
  get mtype2(): boolean {
    return !!((this.registers[1] >> 26) & 1);
  }

  // atc (register 3: 1 bits [27])
  get atc(): boolean {
    return !!((this.registers[1] >> 27) & 1);
  }

  // tilingindex (register 3: 4 bits [28-31])
  get type(): GnmTextureType {
    return (this.registers[3] >> 28) & ((1 << 4) - 1);
  }

  // depth (register 4: 13 bits [0-12])
  get depth(): number {
    return ((this.registers[4] >> 0) & ((1 << 13) - 1)) + 1;
  }

  // pitch (register 4: 14 bits [13-27])
  get pitch(): number {
    return ((this.registers[4] >> 13) & ((1 << 14) - 1)) + 1;
  }

  /* register 5
    uint32_t basearray : 13;
    uint32_t lastarray : 13;
    uint32_t _unused2 : 6;
    */

  /* register 6
    uint32_t minlodwarn : 12;     // 0
    uint32_t counterbankid : 8;   // 12
    */

  // lodhdwcnten (register 6: 1 bits [20])
  get lodhdwcnten(): boolean {
    return !!((this.registers[6] >> 20) & 1);
  }

  // compressionen (register 6: 1 bits [21])
  get compressionen(): boolean {
    return !!((this.registers[6] >> 21) & 1);
  }

  // alphaisonmsb (register 6: 1 bits [22])
  get alphaisonmsb(): boolean {
    return !!((this.registers[6] >> 22) & 1);
  }

  // colortransform (register 6: 1 bits [23])
  get colortransform(): boolean {
    return !!((this.registers[6] >> 23) & 1);
  }

  // alttilemode (register 6: 1 bits [24])
  get alttilemode(): boolean {
    return !!((this.registers[6] >> 24) & 1);
  }

  // metadata address (register 7: 32 bits)
  get metadata(): number {
    return this.registers[7];
  }
}
