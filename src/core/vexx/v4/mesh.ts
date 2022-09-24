import { BufferRange } from "../../../core/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { AABB } from "../primitive/aabb";
import { GU } from "../../utils/pspgu";
import { Flat } from "../flat";

export class VexxNodeMesh extends VexxNode {
  meshInfo = new VexxNodeMeshInfo();
  chunks: VexxNodeMeshChunk[] = [];

  constructor(type = Vexx4NodeType.MESH) {
    super(type);
  }

  override load(range: BufferRange): void {
    this.meshInfo = VexxNodeMeshInfo.load(range);

    let meshesRange = range.slice(this.meshInfo.size);
    while (meshesRange.size > 64) {
      const chunk = VexxNodeMeshChunk.load(meshesRange, this.typeInfo.version);

      if (chunk.header.id >= this.meshInfo.materials.length) {
        console.warn(`Cannot add chunk with id ${chunk.header.id}`);
        break;
      }

      this.chunks.push(chunk);
      meshesRange = meshesRange.slice(chunk.size);

      if (this.chunks.length > 100) {
        console.error("Mesh loading chunks triggered a failsafe");
        break; // fail-safe
      }
    }
  }

  override export(): Flat.Node {
    const ret: Flat.Node = {
      type: "MESH",
      name: this.name,
      aabb: this.meshInfo.aabb.export(),
      chunks: [],
    };
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const chunkHeader = chunk.header;
      const textureId = this.meshInfo.materials[chunkHeader.id].textureId;
      const flatChunk = chunk.export(textureId);
      ret.chunks.push(flatChunk);
    }
    return ret;
  }
}

type VexxNodeMeshMaterial = {
  range: BufferRange;
  textureId: number;
};

class VexxNodeMeshInfo {
  range = new BufferRange();
  type = 0;
  meshCount = 0;
  length1 = 0;
  length2 = 0;
  aabb = new AABB();
  materials: VexxNodeMeshMaterial[] = [];

  static load(range: BufferRange): VexxNodeMeshInfo {
    const ret = new VexxNodeMeshInfo();
    ret.type = range.getUint16(0);
    ret.meshCount = range.getUint16(2);
    ret.length1 = range.getUint32(4);
    ret.length2 = range.getUint32(8);
    ret.range = range.slice(0, ret.length1 + ret.length2);

    if (ret.length1 + ret.length2 == 0) {
      console.error("Failed to load shape info");
      return ret;
    }

    range = ret.range;

    const aabbRange = range.slice(16, 16 + 32);
    ret.aabb = AABB.loadFromFloat32(aabbRange);

    const dataRange = range.slice(48);
    for (let i = 0; i < ret.meshCount; i++) {
      const meshRange = dataRange.slice(i * 20, (i + 1) * 20);
      const meshinfo = { range: meshRange, textureId: meshRange.getUint32(4) };
      ret.materials.push(meshinfo);
    }

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

type Stride = {
  uv?: {
    u: number;
    v: number;
  };
  color?: number;
  normal?: Vertex3;
  vertex?: Vertex3;
  weight?: number;
  index?: number;
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

  get strideAlign():number {
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

    if (ret.header.vtxdef == 0) return ret;

    let size = 0;
    size += ret.header.size;
    size += 16 * 3;
    size += ret.header.strideCount1 * ret.header.strideSize;
    size += ret.header.strideCount2 * ret.header.strideSize;
    size += size % 16 == 0 ? 0 : 16 - (size % 16);
    ret.range = range.slice(0, size);

    const expectedSize = ret.header.size + 16 * 3 + ret.header.size1;
    if (size != expectedSize) {
      console.warn(`Cannot load mesh chunk @0x${ret.range.begin.toString(16)} because sizes differ ${size} != ${expectedSize}`);
      console.warn(ret.header.vtxdef, ret.header.strideInfo);
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
          return range.getInt8(index * strideSize + strideInfo.texture.offset + strideInfo.texture.size * offset);
        case 2:
          return range.getInt16(index * strideSize + strideInfo.texture.offset + strideInfo.texture.size * offset);
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

    /*
    const weightGet = (range: BufferRange, index: number, offset: number) => {
      switch (strideInfo.weight.size) {
        case 1:
          return range.getInt8(index * strideSize + strideInfo.weight.offset + strideInfo.weight.size * offset);
        case 2:
          return range.getInt16(index * strideSize + strideInfo.weight.offset + strideInfo.weight.size * offset);
        case 4:
          return range.getFloat32(index * strideSize + strideInfo.weight.offset + strideInfo.weight.size * offset);
      }
      return 0;
    };

    const indexGet = (range: BufferRange, index: number, offset: number) => {
      switch (strideInfo.index.size) {
        case 1:
          return range.getUint8(index * strideSize + strideInfo.index.offset + strideInfo.index.size * offset);
        case 2:
          return range.getUint16(index * strideSize + strideInfo.index.offset + strideInfo.index.size * offset);
      }
      return 0;
    };
    */

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
      /*
      if (strideInfo.weight.size > 0) stride.weight = weightGet(range, i, 0);
      if (strideInfo.index.size > 0) stride.index = indexGet(range, i, 0);
      */
      strides.push(stride);
    }
    return strides;
  }

  export(texture: number): Flat.MeshChunk {
    const primitiveType = (id: number) => {
      switch (id) {
        case 0:
          return "POINTS";
        case 1:
          return "LINES";
        case 2:
          return "LINE_STRIP";
        case 3:
          return "TRIANGLES";
        case 4:
          return "TRIANGLE_STRIP";
        case 5:
          return "TRIANGLE_FAN";
        case 6:
          return "SPRITES";
        default:
          return "UNKNOWN";
      }
    };

    const ret: Flat.MeshChunk = {
      texture,
      mode: primitiveType(this.header.primitiveType),
    };

    const strideInfo = this.header.strideInfo;
    const strides = this.strides;

    //if (this.strides2.length > 0)
    //  strides = this.strides2;

    if (strideInfo.texture.size > 0) {
      const uvs = strides
        .map((v) => v.uv as { u: number; v: number }) // force cast
        .reduce((r, v) => r.concat([v.u, v.v]), [] as number[]);
      if (strideInfo.texture.size == 1) {
        ret.uvs = {
          type: "Int8",
          size: 2,
          data: uvs,
          normalized: true,
        };
      } else if (strideInfo.texture.size == 2) {
        ret.uvs = {
          type: "Int16",
          size: 2,
          data: uvs,
          normalized: true,
        };
      } else if (strideInfo.texture.size == 4) {
        ret.uvs = {
          type: "Float32",
          size: 2,
          data: uvs,
          normalized: false,
        };
      }
    }

    if (strideInfo.normal.size > 0) {
      const normals = strides
        .map((v) => v.normal as Vertex3) // force cast
        .reduce((r, v) => r.concat([v.x, v.y, v.z]), [] as number[]);
      ret.normals = normals;
    }

    if (strideInfo.vertex.size > 0) {
      const positions = strides
        .map((v) => v.vertex as Vertex3) // force cast
        .reduce((r, v) => r.concat([v.x, v.y, v.z]), [] as number[]);
      if (strideInfo.vertex.size == 1) {
        ret.positions = positions;
      } else if (strideInfo.vertex.size == 2) {
        ret.positions = positions;
      } else {
        ret.positions = positions;
      }
    }

    if (strideInfo.color.size > 0) {
      const colors = strides.map((v) => v.color as number); // force cast
      ret.colors = new Uint8Array(colors);
    }

    return ret;
  }
}
