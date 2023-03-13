declare module "*.wasm";

declare function fetch(uri: string): Promise<Response>;

declare type WebAssemblyInstantiatedSource = {
  module: Module;
  instance: Instance;
};

declare namespace WebAssembly {
  interface ResultObject {
    module: Module;
    instance: Instance;
  }

  function validate(bytes: BufferSource): boolean;

  function compile(bytes: BufferSource): Promise<Module>;

  //function instantiate(bytes: BufferSource, importObject?: object): Promise<WebAssemblyInstantiatedSource>;
  function instantiate(moduleObject: Module, importObject?: object): Promise<Instance>;

  function compileStreaming(source: Response | Promise<Response>): Promise<Module>;

  function instantiateStreaming(source: Response | Promise<Response>, importObject?: object): Promise<ResultObject>;

  type ImportExportKind = "function" | "table" | "memory" | "global";

  type ModuleExportDescriptor = {
    name: string;
    kind: ImportExportKind;
    // Note: Other fields such as signature may be added in the future.
  };

  type ModuleImportDescriptor = {
    module: string;
    name: string;
    kind: ImportExportKind;
  };

  class Module {
    constructor(bytes: BufferSource);
    static exports(moduleObject: Module): sequence<ModuleExportDescriptor>;
    static imports(moduleObject: Module): sequence<ModuleImportDescriptor>;
    static customSections(moduleObject: Module, sectionName: DOMString): sequence<ArrayBuffer>;
  }

  interface Instance {
    constructor(module: Module, importObject?: object);
    get exports(): any /* objects */;
  }

  type MemoryDescriptor = {
    initial: number;
    maximum?: number;
    shared?: boolean;
  };

  class Memory {
    constructor(memoryDescriptor: MemoryDescriptor);
    grow(delta: number);
    get buffer(): ArrayBuffer | SharedArrayBuffer;
  }

  type TableKind = "externref" | "anyfunc";

  type TableDescriptor = {
    element: TableKind;
    initial: number;
    maximum?: number;
  };

  class Table {
    constructor(descriptor: TableDescriptor, value?: any);
    grow(delta: number, value?: any): number;
    get(index: number): number;
    set(index: number, value?: number);
    get length(): number;
  }

  type ValueType = "i32" | "i64" | "f32" | "f64" | "v128" | "externref" | "anyfunc";

  type GlobalDescriptor = {
    value: ValueType
    mutable: boolean = false;
  };

  class Global {
    constructor(descriptor: GlobalDescriptor, v?: any);
    valueOf(): any;
    get value(): any;
    set value(value: any): any;
  }
}
