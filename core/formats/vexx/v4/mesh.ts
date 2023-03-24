import { BufferRange } from "@core/utils/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { AABB } from "../primitive/aabb";
import { GU } from "@core/utils/pspgu";

export class VexxNodeMesh extends VexxNode {
  info = new VexxNodeMeshHeader();
  materials: VexxNodeMeshMaterial[] = [];
  chunks: VexxNodeMeshChunk[] = [];

  externalId: number = 0;
  chunkLinks: VexxNodeMeshLinkChunk[] = [];

  constructor(type = Vexx4NodeType.MESH) {
    super(type);
  }

  override load(range: BufferRange): void {
    this.info = VexxNodeMeshHeader.load(range);
    const dataRange = range.slice(this.info.size);
    if (this.info.reserved == 0xff00) {
      this.externalId = dataRange.getUint32(0);

      let chunkLinksRange = dataRange.slice(48);
      while (chunkLinksRange.size > 64) {
        const chunkLink = VexxNodeMeshLinkChunk.load(chunkLinksRange);
        this.chunkLinks.push(chunkLink);
        chunkLinksRange = chunkLinksRange.slice(chunkLink.size);
      }
    } else {
      let materialsRange = dataRange.clone();
      for (let i = 0; i < this.info.meshCount; i++) {
        const material = VexxNodeMeshMaterial.load(materialsRange);
        this.materials.push(material);
        materialsRange = materialsRange.slice(material.size);
      }

      const chunkStart = this.info.chunkStart;
      if (chunkStart == 0) {
        console.error("Failed to load shape info");
        return;
      }

      let chunksRange = range.slice(chunkStart);
      while (chunksRange.size > 64) {
        const chunk = VexxNodeMeshChunk.load(chunksRange, this.typeInfo.version);

        if (chunk.header.id >= this.materials.length) {
          console.warn(`Cannot add chunk with id ${chunk.header.id}`);
          break;
        }

        this.chunks.push(chunk);
        chunksRange = chunksRange.slice(chunk.size);

        if (this.chunks.length > 100) {
          console.error("Mesh loading chunks triggered a failsafe");
          break; // fail-safe
        }
      }
    }
  }

  get isExternal(): boolean {
    return this.externalId > 0;
  }
}

class VexxNodeMeshHeader {
  range = new BufferRange();
  type = 0;
  meshCount = 0;
  length1 = 0;
  length2 = 0;
  unknown = 0;
  reserved = 0;
  aabb = new AABB();

  static load(range: BufferRange): VexxNodeMeshHeader {
    const ret = new VexxNodeMeshHeader();
    ret.range = range.slice(0, 16 + 32);
    ret.type = ret.range.getUint16(0);
    ret.meshCount = ret.range.getUint16(2);
    ret.length1 = ret.range.getUint32(4);
    ret.length2 = ret.range.getUint32(8);
    ret.unknown = ret.range.getUint16(12);
    ret.reserved = ret.range.getUint16(14);
    const aabbRange = ret.range.slice(16, 16 + 32);
    ret.aabb = AABB.loadFromFloat32(aabbRange);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }

  get chunkStart(): number {
    if (this.length2) return this.length2;
    return this.length1;
  }
}

class VexxNodeMeshLinkChunk {
  range = new BufferRange();
  unknown3 = 0.0;
  maybe_uv = { x: 0, y: 0 };
  maybe_quat1 = { x: 0, y: 0, z: 0, w: 0 };
  maybe_quat2 = { x: 0, y: 0, z: 0, w: 0 };

  static load(range: BufferRange): VexxNodeMeshLinkChunk {
    const ret = new VexxNodeMeshLinkChunk();
    ret.range = range.slice(0, 64);
    ret.unknown3 = range.getFloat32(12);
    ret.maybe_uv = {
      x: ret.range.getFloat32(16),
      y: ret.range.getFloat32(20),
    };
    ret.maybe_quat1 = {
      x : ret.range.getInt16(24), 
      y : ret.range.getInt16(26), 
      z : ret.range.getInt16(28), 
      w : ret.range.getInt16(30), 
    }
    ret.maybe_quat2 = {
      x: ret.range.getInt16(48),
      y: ret.range.getInt16(52),
      z: ret.range.getInt16(56),
      w: ret.range.getInt16(60),
    };
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

class VexxNodeMeshMaterial {
  range = new BufferRange();
  textureId = 0;

  static load(range: BufferRange): VexxNodeMeshMaterial {
    const ret = new VexxNodeMeshMaterial();
    ret.range = range.slice(0, 20);
    ret.textureId = ret.range.getUint32(4);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

type Vertex3 = {
  x: number;
  y: number;
  z: number;
};

type UV = {
  u: number;
  v: number;
};

type Stride = {
  uv?: UV;
  color?: number;
  normal?: Vertex3;
  vertex?: Vertex3;
};

class VexxNodeMeshChunkHeader {
  range = new BufferRange();
  version = 4;

  signature = 0;
  _unknown1 = 0;
  _unknown2 = 0;
  id = 0;
  strideCount1 = 0;
  strideCount2 = 0;
  primitiveType = 0 as GU.PrimitiveType;
  vtxdef = 0;
  size1 = 0;
  size2 = 0;

  static load(range: BufferRange, version: number) {
    const ret = new VexxNodeMeshChunkHeader();
    ret.range = range.slice(0, 16);

    ret.version = version;
    ret.signature = range.getUint16(0);
    ret.id = range.getUint8(2);
    ret._unknown1 = range.getUint8(3);
    ret.strideCount1 = range.getUint16(4);
    ret.strideCount2 = range.getUint16(6);
    ret.primitiveType = range.getUint8(8);
    ret._unknown2 = range.getUint8(9);
    ret.vtxdef = range.getUint16(10);
    ret.size1 = range.getUint16(12);
    ret.size2 = range.getUint16(14);
    return ret;
  }

  get size() {
    return this.range.size;
  }

  get strideAlign(): number {
    return this.version == 4 ? 4 : 1;
  }

  get strideInfo() {
    return GU.strideInfo(this.vtxdef);
  }

  get strideSize() {
    return GU.strideSize(this.vtxdef, this.strideAlign);
  }
}

class VexxNodeMeshChunk {
  header = new VexxNodeMeshChunkHeader();
  range = new BufferRange();
  scaling = 1.0;
  unknown = 1.0;
  floats: number[] = [];
  aabb = new AABB();
  strides: Stride[] = [];
  strides2: Stride[] = [];

  get size() {
    return this.range.size;
  }

  static load(range: BufferRange, version: number): VexxNodeMeshChunk {
    const ret = new VexxNodeMeshChunk();

    ret.header = VexxNodeMeshChunkHeader.load(range, version);
    if (ret.header.vtxdef == 0) {
      console.warn(`Cannot load mesh chunk @0x${ret.range.begin.toString(16)} because vtxdef = 0`);
      return ret;
    }

    ret.range = range.slice(0, ret.header.size + 16 * 3 + ret.header.size1);

    let size = 0;
    size += ret.header.size;
    size += 16 * 3;
    size += ret.header.strideCount1 * ret.header.strideSize;
    size += ret.header.strideCount2 * ret.header.strideSize;
    size += size % 16 == 0 ? 0 : 16 - (size % 16);

    if (size != ret.range.size) {
      console.warn(`Cannot load mesh chunk @0x${ret.range.begin.toString(16)} because sizes differ ${size} != ${ret.range.size}`);
      console.warn(ret.header.vtxdef, ret.header.strideInfo);
      ret.range = range.slice(0, ret.header.size1);
      return ret;
    }
    ret.loadData();

    return ret;
  }

  loadData() {
    const strideInfo = this.header.strideInfo;

    // Load infos
    const infoRange = this.range.slice(this.header.size);
    if (strideInfo.vertex.size == 2) {
      this.scaling = infoRange.getFloat32(0);
      this.unknown = infoRange.getFloat32(4);
      this.aabb = AABB.loadFromInt16(infoRange.slice(8, 24));
      for (let i = 0; i < 8; i++) this.floats.push(infoRange.getUint8(24 + i)); // padding ?
      for (let i = 0; i < 4; i++) this.floats.push(infoRange.getFloat32(32 + i * 4));
    } else {
      for (let i = 0; i < 16 * 3; i++) this.floats.push(infoRange.getUint8(i));
    }

    // Load strides in first section
    const stridesRange = infoRange.slice(16 * 3);
    this.strides = this.loadStrides(stridesRange, this.header.strideCount1);

    // Load strides in second section
    const offset = infoRange.size + stridesRange.size;
    const pad = offset % 16 == 0 ? 0 : 16 - (offset % 16);
    const stridesRange2 = stridesRange.slice(this.header.strideCount1 * this.header.strideSize + pad);
    this.strides2 = this.loadStrides(stridesRange2, this.header.strideCount2);
  }

  loadStrides(range: BufferRange, count: number): Stride[] {
    const strideInfo = this.header.strideInfo;
    const strideSize = this.header.strideSize;
    const strides: Stride[] = [];

    const textureGet = (range: BufferRange, index: number, offset: number) => {
      switch (strideInfo.texture.size) {
        case 1:
          return range.getInt8(index * strideSize + strideInfo.texture.offset + strideInfo.texture.size * offset) + 128;
        case 2:
          return range.getInt16(index * strideSize + strideInfo.texture.offset + strideInfo.texture.size * offset) + 32768;
        case 4:
          return range.getFloat32(index * strideSize + strideInfo.texture.offset + strideInfo.texture.size * offset);
      }
      return 0;
    };

    const colorGet = (range: BufferRange, index: number, offset: number) => {
      switch (strideInfo.color.size) {
        case 1:
          return range.getUint16(index * strideSize + strideInfo.color.offset + strideInfo.color.size * offset);
        case 2:
          return range.getUint32(index * strideSize + strideInfo.color.offset + strideInfo.color.size * offset);
      }
      return 0;
    };

    const normalGet = (range: BufferRange, index: number, offset: number) => {
      switch (strideInfo.normal.size) {
        case 1:
          return range.getInt8(index * strideSize + strideInfo.normal.offset + strideInfo.normal.size * offset);
        case 2:
          return range.getInt16(index * strideSize + strideInfo.normal.offset + strideInfo.normal.size * offset);
        case 4:
          return range.getFloat32(index * strideSize + strideInfo.normal.offset + strideInfo.normal.size * offset);
      }
      return 0;
    };

    const vertexGet = (range: BufferRange, index: number, offset: number) => {
      switch (strideInfo.vertex.size) {
        case 1:
          return range.getInt8(index * strideSize + strideInfo.vertex.offset + strideInfo.vertex.size * offset) + 128;
        case 2:
          return (range.getInt16(index * strideSize + strideInfo.vertex.offset + strideInfo.vertex.size * offset) * this.scaling) / 32767.0;
        case 4:
          return range.getFloat32(index * strideSize + strideInfo.vertex.offset + strideInfo.vertex.size * offset);
      }
      return 0;
    };

    for (let i = 0; i < count; i++) {
      const stride: Stride = {};
      if (strideInfo.texture.size > 0)
        stride.uv = {
          u: textureGet(range, i, 0),
          v: textureGet(range, i, 1),
        };
      if (strideInfo.color.size > 0) stride.color = colorGet(range, i, 0);
      if (strideInfo.normal.size > 0)
        stride.normal = {
          x: normalGet(range, i, 0),
          y: normalGet(range, i, 1),
          z: normalGet(range, i, 2),
        };
      if (strideInfo.vertex.size > 0)
        stride.vertex = {
          x: vertexGet(range, i, 0),
          y: vertexGet(range, i, 1),
          z: vertexGet(range, i, 2),
        };
      strides.push(stride);
    }
    return strides;
  }
}
