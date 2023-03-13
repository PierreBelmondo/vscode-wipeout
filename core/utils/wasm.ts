function print_num(n: number) {
  console.log("Your number is " + n);
  return 123;
}

export class WASM {
  memory: WebAssembly.Memory;
  module?: WebAssembly.Module;

  constructor(sharedMemory: boolean = false) {
    this.memory = new WebAssembly.Memory({ initial: 16, maximum: 8192, shared: sharedMemory });
  }

  async compile(uri: string) {
    const response = await fetch(uri);
    const bytes = await response.arrayBuffer();
    this.module = await WebAssembly.compile(bytes);
  }

  async instance(stack_pointer=0) {
    if (this.module === undefined) throw "Cannot instanciate module before compilation";
    const importObject = {
      env: {
        memory: this.memory,
        print_num,
      },
    };
    if (stack_pointer) {
      const global = new WebAssembly.Global({mutable: true, value: "i32"})
      global.value = stack_pointer;
      importObject.env["__stack_pointer"] = global;
    }
    const object = await WebAssembly.instantiate(this.module, importObject);
    return new WASMInstance(this.memory, this.module, object);
  }
}

export class WASMInstance {
  memory: WebAssembly.Memory;
  module: WebAssembly.Module;
  object: WebAssembly.Instance;

  private _sbrk: number = 0;
  private _pages: number = 0;

  constructor(memory: WebAssembly.Memory, module: WebAssembly.Module, object: WebAssembly.Instance) {
    this.memory = memory;
    this.module = module;
    this.object = object;

    this._sbrk = object.exports.__heap_base.value;
    this._pages = 0;
  }

  allocateUint8Array(byteLength: number): WASMArray {
    console.log(`[WASM] Allocating ${byteLength} bytes`)
    const byteOffset = this._sbrk;
    this._sbrk += byteLength;
    const pages = Math.ceil(this._sbrk / 65536);
    this.memory.grow(pages - this._pages);
    this._pages = pages;
    return new WASMArray(this.memory, byteOffset, byteLength);
  }
}

export class WASMArray {
  memory: WebAssembly.Memory;
  byteOffset: number;
  byteLength: number;

  constructor(memory: WebAssembly.Memory, byteOffset: number, byteLength: number) {
    this.memory = memory;
    this.byteOffset = byteOffset;
    this.byteLength = byteLength;
  }

  setFromArrayBuffer(blocks: ArrayBuffer) {
    const array = this.getUint8Array();
    array.set(new Uint8Array(blocks));
  }

  getUint8Array(): Uint8ClampedArray {
    return new Uint8ClampedArray(this.memory.buffer, this.byteOffset, this.byteLength);
  }

  getUint8ClampedArray(): Uint8ClampedArray {
    return new Uint8ClampedArray(this.memory.buffer, this.byteOffset, this.byteLength);
  }
}
