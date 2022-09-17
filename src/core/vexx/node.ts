import { BufferRange } from "../range";
import { Flat } from "./flat";
import { Vexx4NodeType as Vexx4NodeType } from "./v4/type";
import { Vexx6NodeType } from "./v6/type";

export class VexxNodeHeader {
  range = new BufferRange();

  type: Vexx4NodeType | Vexx6NodeType | number;
  headerLength = 16;
  _unknown1 = 0;
  dataLength = 0;
  childrenCount = 0;
  name = "";
  _unknown2 = 0;

  constructor(type = Vexx4NodeType.WORLD) {
    this.type = type;
  }

  get size(): number {
    return this.range.size;
  }

  dataRange(range: BufferRange) {
    return range.slice(this.size, this.size + this.dataLength);
  }

  static load(range: BufferRange) {
    const ret = new VexxNodeHeader();
    ret.type = range.getUint32(0);
    ret.headerLength = range.getUint16(4);
    ret._unknown1 = range.getUint16(6);
    ret.dataLength = range.getUint32(8);
    ret.childrenCount = range.getUint16(12);
    ret._unknown2 = range.getUint16(14);
    ret.range = range.slice(0, ret.headerLength);
    ret.name = ret.range.slice(16, ret._unknown1).getString();
    return ret;
  }

  dump(): any {
    return {
      type: this.type,
      name: this.name,
      headerLength: this.headerLength,
      dataLength: this.dataLength,
      childrenCount: this.childrenCount,
    };
  }
}

export type VexxNodeType = Vexx4NodeType | Vexx6NodeType;

type VexxNodePrototype = { new (): VexxNode };

type VexxNodeTypeInfo = {
  version: number;
  type: VexxNodeType;
  name: string;
  prototype: VexxNodePrototype;
};

export abstract class Node {
  abstract readonly name: string;
  abstract readonly children: Node[];

  get path(): string {
    let root = "";
    if (this.parent) root = this.parent.path;
    return root + "/" + this.name;
  }

  get parent(): Node | null {
    return null;
  }
}

export class VexxNode extends Node {
  static prototypes4 = new Map<Vexx4NodeType, VexxNodeTypeInfo>();
  static prototypes6 = new Map<Vexx6NodeType, VexxNodeTypeInfo>();

  range = new BufferRange();

  typeInfo: VexxNodeTypeInfo = {
    version: 4,
    type: 0,
    name: "?",
    prototype: VexxNode,
  };
  header = new VexxNodeHeader();
  children: VexxNode[] = [];

  constructor(type = Vexx4NodeType._UNKNOWN) {
    super();
    this.header = new VexxNodeHeader(type);
  }

  get name(): string {
    return this.header.name;
  }

  static registerV4(type: Vexx4NodeType, prototype: VexxNodePrototype) {
    const name = Vexx4NodeType[type];
    VexxNode.prototypes4.set(type, { version: 4, type, name, prototype });
  }

  static registerV6(type: Vexx6NodeType, prototype: VexxNodePrototype) {
    const name = Vexx6NodeType[type];
    VexxNode.prototypes6.set(type, { version: 6, type, name, prototype });
  }

  static load(range: BufferRange, version: number): VexxNode {
    const header = VexxNodeHeader.load(range);

    let typeInfo: VexxNodeTypeInfo | undefined;

    const type = header.type;

    switch (version) {
      case 4:
        typeInfo = this.prototypes4.get(type);
        break;
      case 6:
        typeInfo = this.prototypes6.get(type);
        break;
      default:
        console.warn("Unknown version", version);
        break;
    }

    if (typeInfo === undefined) {
      console.warn("Unknown VexxNode type", type);
      const instance = new VexxNode();
      instance.typeInfo = {
        version,
        type,
        name: "0x" + type.toString(16).toUpperCase(),
        prototype: VexxNode,
      };
      instance.header = header;
      instance.range = range.slice(
        0,
        instance.header.size + instance.header.dataLength
      );
      instance.load(instance.dataRange);
      return instance;
    }

    const instance = new typeInfo.prototype();
    instance.typeInfo = typeInfo;
    instance.header = header;
    instance.range = range.slice(
      0,
      instance.header.size + instance.header.dataLength
    );
    instance.load(instance.dataRange);
    return instance;
  }

  load(range: BufferRange): void {
    // implement in subclass
  }

  buffer(): ArrayBuffer {
    return this.range.buffer;
  }

  data(): ArrayBuffer {
    return this.dataRange.buffer;
  }

  get typeName(): string {
    return this.typeInfo.name;
  }

  get size(): number {
    return this.range.size;
  }

  get sizeWithChildren(): number {
    let size = this.size;
    for (const child of this.children) size += child.sizeWithChildren;
    return size;
  }

  get dataRange(): BufferRange {
    return this.header.dataRange(this.range);
  }

  private dumpChildren(): any[] {
    const ret = [] as any[];
    for (const child of this.children) ret.push(child.dump());
    return ret;
  }

  forEach(callback: (node: VexxNode) => void) {
    for (const child of this.children) {
      callback(child);
      child.forEach(callback);
    }
  }

  dump(): any {
    const ret = { header: this.header.dump() } as any;
    if (this.children.length > 0) ret["children"] = this.dumpChildren();
    return ret;
  }

  export(): Flat.Node {
    return {
      type: this.typeName,
      name: this.name,
      children: this.exportChildren(),
    };
  }

  exportChildren(): Flat.Node[] {
    const ret: Flat.Node[] = [];
    for (const child of this.children) ret.push(child.export());
    return ret;
  }
}
