/*
 * WipEout PSP WAD Utility -- List, extract and create WAD files
 * Copyright 2019, 2020, 2021 Thomas Perl <m@thp.io>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class BitView {
  private _buffer: Buffer;

  constructor(buffer: Buffer) {
    this._buffer = buffer;
  }

  getBit(offset: number): boolean {
    const p8 = Math.floor(offset / 8);
    const u8 = this._buffer.readUInt8(p8);
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

export namespace lzss {
  export function decompress(buffer: Buffer, expected_size: number = 0): Buffer {
    const ret: number[] = [];
    const view = new BitView(buffer);
    const lbb = new Uint8Array(0x2000);

    try {
      let lbb_index = 0;
      let offset = 0;
      while (offset < buffer.length * 32) {
        const b = view.getBit(offset);
        offset++;
        if (b) {
          const byte = view.getUint(offset, 8);
          offset += 8;
          ret.push(byte);
          lbb[lbb_index] = byte;
          lbb_index = (lbb_index + 1) % 0x2000;
        } else {
          const lbb_offset = view.getUint(offset, 13);
          offset += 13;
          const repetitions = 3 + view.getUint(offset, 4);
          offset += 4;
          for (let i = 0; i < repetitions; i++) {
            const byte = lbb[(lbb_offset - 1 + i) % 0x2000];
            ret.push(byte);
            lbb[lbb_index] = byte;
            lbb_index = (lbb_index + 1) % 0x2000;
          }
        }
      }
    } catch (e) {}

    if (expected_size && ret.length > expected_size) ret.length = expected_size;
    const array = new Uint8Array(ret);
    return Buffer.from(array);
  }
}
