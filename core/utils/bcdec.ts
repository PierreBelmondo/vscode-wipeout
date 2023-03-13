import { WASM } from "./wasm";
//import binary from "../wasm/test.wasm";
import binary from "@core/wasm/bcdec.wasm";

export class BC7 {
  static readonly BLOCK_SIZE = 16;

  static size(width: number, height: number): number {
    const w = Math.max(4, width) / 4;
    const h = Math.max(4, height) / 4;
    return w * h * BC7.BLOCK_SIZE;
  }

  static async decompress(width: number, height: number, blocks: ArrayBuffer): Promise<Uint8ClampedArray> {
    /*
    if (crossOriginIsolated) {
      console.log("crossOriginIsolated");
      return this.decompressMulti(width, height, blocks);
    }
    */

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

  //static async decompressMulti(width: number, height: number, blocks: ArrayBuffer): Promise<Uint8ClampedArray> {
  //  const a = ((new Date()).getTime()); //
  //  const wasm = new WASM(true);
  //  await wasm.compile(binary);
  //  const instance = await wasm.instance();
  //  const uncompressed = instance.allocateUint8Array(width * height * 4);
  //  const compressed = instance.allocateUint8Array(blocks.byteLength);
  //  compressed.setFromArrayBuffer(blocks);  //
  //  function inlineWorker() {
  //    const self = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (globalThis.self));  //
  //    function print_num(n) {
  //      console.log("Your number is " + n);
  //      return 123;
  //    }
  //    self.onmessage = async function (msg:any) {
  //      switch (msg.data.action) {
  //        case "run":
  //          const module = msg.data.module;
  //          const compressed = msg.data.args.compressed;
  //          const uncompressed = msg.data.args.uncompressed;
  //          const width = msg.data.args.width;
  //          const height = msg.data.args.height;
  //          const stack_pointer = msg.data.stack_pointer;
  //          const index = msg.data.index;
  //          const total = msg.data.total;
  //          const importObject = {
  //            env: {
  //              memory: msg.data.memory,
  //              print_num,
  //            },
  //          };
  //          const instance = await WebAssembly.instantiate(module, importObject);
  //          instance.exports.__stack_pointer.value = stack_pointer;
  //          instance.exports.bcdec_bc7_worker(compressed, uncompressed, width, height, index, total);
  //          self.postMessage(true);
  //          break;
  //      }
  //    };
  //  } //
  //  const code = `(${inlineWorker.toString().trim()})()`;
  //  const blob = new Blob([code], { type: "application/javascript; charset=utf-8" });
  //  const objectURL = URL.createObjectURL(blob);
  //  console.log(objectURL); //
  //  async function createWorker(index: number, total: number): Promise<void> {
  //    return new Promise<void>(function (resolve, reject) {
  //      const worker = new Worker(objectURL);
  //      worker.onmessage = () => {
  //        resolve();
  //      };
  //      worker.onerror = reject;
  //      worker.onerror = function (event) {
  //        reject(event.error);
  //      };
  //      worker.postMessage({
  //        action: "run",
  //        module: wasm.module,
  //        memory: wasm.memory,
  //        stack_pointer: (index + 1) * 4096,
  //        index,
  //        total,
  //        args: {
  //          compressed: compressed.byteOffset,
  //          uncompressed: uncompressed.byteOffset,
  //          width,
  //          height,
  //        },
  //      });
  //    });
  //  } //
  //  const threads = navigator.hardwareConcurrency;
  //  const promises = [] as Promise<void>[];
  //  for (let i = 0; i < threads; i++) {
  //    const promise = createWorker(i, threads);
  //    promises.push(promise);
  //  } //
  //  await Promise.all(promises);  //
  //  const b = ((new Date()).getTime());
  //  console.log("12 thread: " + (b - a)); //
  //  return uncompressed.getUint8ClampedArray();
  //}
}
