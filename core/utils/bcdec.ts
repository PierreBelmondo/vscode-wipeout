import { WASM } from "./wasm";
import binary from "@core/wasm/bcdec.wasm";

export class BC7 {
  static readonly BLOCK_SIZE = 16;

  static size(width: number, height: number): number {
    const w = Math.max(4, width) / 4;
    const h = Math.max(4, height) / 4;
    return w * h * BC7.BLOCK_SIZE;
  }

  static async decompress(width: number, height: number, blocks: ArrayBuffer): Promise<Uint8ClampedArray> {
    const a = new Date().getTime();

    const wasm = new WASM(true);
    await wasm.compile(binary);
    const instance = await wasm.instance();
    const uncompressed = instance.allocateUint8Array(width * height * 4);
    const compressed = instance.allocateUint8Array(blocks.byteLength);
    compressed.setFromArrayBuffer(blocks);
    const bcdec_bc7_full = instance.object.exports.bcdec_bc7_full as Function;
    bcdec_bc7_full(compressed.byteOffset, uncompressed.byteOffset, width, height);

    const b = new Date().getTime();
    console.log("One thread: " + (b - a));

    return uncompressed.getUint8ClampedArray();
  }
}
