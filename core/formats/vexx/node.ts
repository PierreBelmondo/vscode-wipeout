import { mat4 } from "gl-matrix";
import { BufferRange } from "@core/utils/range";
import { Vexx3NodeType } from "./v3/type";
import { Vexx4NodeType as Vexx4NodeType } from "./v4/type";
import { Vexx6NodeType } from "./v6/type";

/**
 * How a property's value is stored, from the tag byte at the head of its entry.
 *
 * The importers read the value straight through a typed pointer, so the tag is
 * what tells a `1.0` float apart from an integer `1`.
 */
export enum VexxPropertyType {
  INT = 0,
  FLOAT = 1,
  STRING = 2,
}

/**
 * One named property attached to a node.
 *
 * The engine's node importers do not read their parameters from fixed offsets
 * in the node body -- they look them up by name in this list. `GridCamera_ImportNode`
 * (PSP Pure boot.bin @ 0x68740), for example, does a case-insensitive search for
 * "GridPosition", "Relative", "Delay" and "BlendStart" in turn, and falls back to
 * a hardcoded default for each one it does not find.
 */
export type VexxProperty = {
  name: string;
  type: VexxPropertyType;
  /** INT and FLOAT values. A STRING property leaves this 0. */
  value: number;
  /** STRING values. Empty for INT and FLOAT. */
  text: string;
};

export class VexxNodeHeader {
  range = new BufferRange();

  type: Vexx4NodeType | Vexx6NodeType | number;
  headerLength = 16;
  /** Offset of the property list, which is also where the name ends. */
  propertiesOffset = 0;
  dataLength = 0;
  childrenCount = 0;
  name = "";
  /** Bytes the property list occupies, terminator included; 0 when there is none. */
  propertiesLength = 0;
  properties: VexxProperty[] = [];

  constructor(type = Vexx4NodeType.WORLD) {
    this.type = type;
  }

  get size(): number {
    return this.range.size;
  }

  bodyRange(range: BufferRange) {
    return range.slice(this.size, this.size + this.dataLength);
  }

  /** A property by name, matched case-insensitively as the engine does. */
  property(name: string): VexxProperty | undefined {
    const wanted = name.toLowerCase();
    return this.properties.find((p) => p.name.toLowerCase() === wanted);
  }

  /**
   * Walk the node's named property list.
   *
   * Layout of one entry, mirroring the search loop the importers run:
   *
   *   +0x00 u8   value type (`VexxPropertyType`)
   *   +0x01 u8   offset of the value within the entry
   *   +0x02 u16  entry stride; 0 terminates the list
   *   +0x04 ..   NUL-terminated name, padded out to the value offset
   *   +valueOffset .. the value, running to the end of the entry
   */
  private static loadProperties(range: BufferRange, offset: number): VexxProperty[] {
    const properties: VexxProperty[] = [];
    while (offset + 4 <= range.size) {
      const stride = range.getUint16(offset + 2);
      if (stride === 0) break;
      const type = range.getUint8(offset) as VexxPropertyType;
      const valueOffset = range.getUint8(offset + 1);
      if (valueOffset < 4 || valueOffset > stride || offset + stride > range.size) break;
      const name = range.slice(offset + 4, offset + valueOffset).getString();
      const value = range.slice(offset + valueOffset, offset + stride);
      properties.push({
        name,
        type,
        value: type === VexxPropertyType.FLOAT ? value.getFloat32(0) : type === VexxPropertyType.INT ? value.getUint32(0) : 0,
        text: type === VexxPropertyType.STRING ? value.getString() : "",
      });
      offset += stride;
    }
    return properties;
  }

  static load(range: BufferRange) {
    const ret = new VexxNodeHeader();
    ret.type = range.getUint32(0);
    ret.headerLength = range.getUint16(4);
    ret.propertiesOffset = range.getUint16(6);
    ret.dataLength = range.getUint32(8);
    ret.childrenCount = range.getUint16(12);
    ret.propertiesLength = range.getUint16(14);
    ret.range = range.slice(0, ret.headerLength);
    ret.name = ret.range.slice(16, ret.propertiesOffset).getString();
    if (ret.propertiesLength > 0) ret.properties = VexxNodeHeader.loadProperties(ret.range, ret.propertiesOffset);
    return ret;
  }

  dump(): any {
    const ret = {
      type: this.type,
      name: this.name,
      headerLength: this.headerLength,
      dataLength: this.dataLength,
      childrenCount: this.childrenCount,
    } as any;
    if (this.properties.length > 0) {
      ret["properties"] = Object.fromEntries(
        this.properties.map((p) => [p.name, p.type === VexxPropertyType.STRING ? p.text : p.value])
      );
    }
    return ret;
  }
}

export type VexxNodeType = Vexx3NodeType | Vexx4NodeType | Vexx6NodeType;

type VexxNodePrototype = { new (): VexxNode };

type VexxNodeTypeInfo = {
  version: number;
  type: VexxNodeType;
  name: string;
  prototype: VexxNodePrototype;
};

export class VexxNode {
  static prototypes3 = new Map<Vexx3NodeType, VexxNodeTypeInfo>();
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
  parent?: VexxNode;

  /** Errors collected during load(); empty when parsing succeeded cleanly. */
  parseErrors: string[] = [];

  constructor(type: Vexx4NodeType | Vexx6NodeType | number = Vexx4NodeType._UNKNOWN) {
    this.header = new VexxNodeHeader(type);
  }

  get name(): string {
    return this.header.name;
  }

  get path(): string {
    let root = "";
    if (this.parent) root = this.parent.path;
    return root + "/" + this.name;
  }

  static registerV3(type: Vexx3NodeType, prototype: VexxNodePrototype) {
    const name = Vexx3NodeType[type];
    VexxNode.prototypes3.set(type, { version: 3, type, name, prototype });
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
      case 3:
        typeInfo = this.prototypes3.get(type);
        break;
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
      const instance = new VexxNode();
      instance.typeInfo = {
        version,
        type,
        name: "0x" + type.toString(16).toUpperCase(),
        prototype: VexxNode,
      };
      instance.header = header;
      instance.range = range.slice(0, instance.header.size + instance.header.dataLength);
      instance.parseErrors.push(`unknown node type 0x${type.toString(16).toUpperCase()}`);
      instance.load(instance.bodyRange);
      return instance;
    }

    const instance = new typeInfo.prototype();
    instance.typeInfo = typeInfo;
    instance.header = header;
    instance.range = range.slice(0, instance.header.size + instance.header.dataLength);
    instance.load(instance.bodyRange);
    return instance;
  }

  load(range: BufferRange): void {
    // implement in subclass
  }

  buffer(): ArrayBuffer {
    return this.range.buffer;
  }

  body(): ArrayBuffer {
    return this.bodyRange.buffer;
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

  get bodyRange(): BufferRange {
    return this.header.bodyRange(this.range);
  }

  private dumpChildren(): any[] {
    const ret = [] as any[];
    for (const child of this.children) ret.push(child.dump());
    return ret;
  }

  forEach(callback: (node: VexxNode) => void) {
    for (const child of this.children) {
      callback(child);
    }
  }

  traverse(callback: (node: VexxNode) => void) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  dump(): any {
    const ret = { header: this.header.dump() } as any;
    if (this.children.length > 0) ret["children"] = this.dumpChildren();
    return ret;
  }
}

export abstract class VexxNodeMatrix extends VexxNode {
  matrix = mat4.create();

  override load(data: BufferRange): void {
    if (data.size >= 64) this.matrix = data.getFloat32Array(0, 16);
  }
}
