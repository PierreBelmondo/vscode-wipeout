import { BufferRange } from "../../../core/range";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";
import { AABB } from "../primitive/aabb";
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

      if (chunk.header.id >= this.meshInfo.meshes.length) {
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
      const textureId = this.meshInfo.meshes[chunkHeader.id].textureId;
      const flatChunk = chunk.export(textureId);
      ret.chunks.push(flatChunk);
    }
    return ret;
  }
}

type MeshInfo = {
  range: BufferRange;
  textureId: number;
};

class VexxNodeMeshInfo {
  range = new BufferRange();
  type = 0;
  meshCount = 0;
  length = 0;
  aabb = new AABB();
  meshes: MeshInfo[] = [];

  static load(range: BufferRange): VexxNodeMeshInfo {
    const ret = new VexxNodeMeshInfo();
    ret.type = range.getUint16(0);
    ret.meshCount = range.getUint16(2);
    ret.length = range.getUint16(4);
    if (ret.length == 0) ret.length = range.getUint32(8);
    ret.range = range.slice(0, ret.length);

    if (ret.length == 0) {
      console.error("Failed to load shape info");
      return ret;
    }

    range = ret.range;

    const dataRange = range.slice(16);
    ret.aabb = AABB.loadFromFloat32(dataRange);
    for (let i = 0; i < ret.meshCount; i++) {
      const meshRange = dataRange.slice(32 + i * 20, 32 + (i + 1) * 20);
      const meshinfo = { range: meshRange, textureId: meshRange.getUint32(4) };
      ret.meshes.push(meshinfo);
    }

    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

// See https://github.com/pspdev/pspsdk/blob/master/src/gu/pspgu.h

enum PrimitiveType {
  POINTS = 0,
  LINES = 1,
  LINE_STRIP = 2,
  TRIANGLES = 3,
  TRIANGLE_STRIP = 4,
  TRIANGLE_FAN = 5,
  SPRITES = 6,
}

type VertexInfo = {
  type: number;
  size: number;
  offset: number;
  padding: number;
  count: number;
};

type StideInfo = {
  texture: VertexInfo;
  color: VertexInfo;
  normal: VertexInfo;
  vertex: VertexInfo;
  /*
  weight: VertexInfo;
  index: VertexInfo;
  */
};

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
  signature = 0;
  _unknown1 = 0;
  _unknown2 = 0;
  id = 0;
  strideAlign = 4;
  strideCount = 0;
  strideCount2 = 0;
  primitiveType = 0 as PrimitiveType;
  vtxdef = 0;
  size1 = 0;
  size2 = 0;

  get size() {
    return this.range.size;
  }

  static load(range: BufferRange, version: number) {
    const ret = new VexxNodeMeshChunkHeader();
    ret.range = range.slice(0, 16);

    ret.strideAlign = version == 4 ? 4 : 1;
    ret.signature = range.getUint16(0);
    ret.id = range.getUint8(2);
    ret._unknown1 = range.getUint8(3);
    ret.strideCount = range.getUint16(4);
    ret.strideCount2 = range.getUint16(6);
    ret.primitiveType = range.getUint8(8);
    ret._unknown2 = range.getUint8(9);
    ret.vtxdef = range.getUint16(10);
    ret.size1 = range.getUint16(12);
    ret.size2 = range.getUint16(14);
    return ret;
  }

  /**
   * C CC CCC   BBB   BB BB BA AA AAA AA
   * 0 .. 000 . 000 . 00 00 00 00 000 00
   * |    |     |     |  |  |  |  |   +-- texture
   * |    |     |     |  |  |  |  +------ color
   * |    |     |     |  |  |  +--------- normal
   * |    |     |     |  |  +------------ vertex
   * |    |     |     |  +--------------- weigth
   * |    |     |     +------------------ index
   * |    |     +------------------------ weights(n)
   * |    +------------------------------ vertex(n)
   * +----------------------------------- transform
   */
  get strideInfo(): StideInfo {
    const textureBits = (this.vtxdef & (0x3 << 0)) >> 0;
    const texture = {
      padding: 0,
      type: textureBits,
      size: textureBits == 0 ? 0 : textureBits == 3 ? 4 : textureBits,
      offset: 0,
      count: 2,
    };
    const textureEnd = texture.offset + texture.size * texture.count;

    const colorBits = (this.vtxdef & (0x7 << 2)) >> 2;
    const colorSize = colorBits == 0 ? 0 : colorBits == 7 ? 4 : 2;
    let colorPadding = 0;
    if (colorSize > 1) colorPadding = textureEnd % colorSize == 0 ? 0 : colorSize - (textureEnd % colorSize);
    const color = {
      padding: colorPadding,
      type: colorBits,
      size: colorSize,
      offset: textureEnd + colorPadding,
      count: 1,
    };
    const colorEnd = color.offset + color.size * color.count;

    const normalBits = (this.vtxdef & (0x3 << 5)) >> 5;
    const normalSize = normalBits == 0 ? 0 : normalBits == 3 ? 4 : normalBits;
    let normalPadding = 0;
    if (normalSize > 1) normalPadding = colorEnd % normalSize == 0 ? 0 : normalSize - (colorEnd % normalSize);
    const normal = {
      padding: normalPadding,
      type: normalBits,
      size: normalSize,
      offset: colorEnd + normalPadding,
      count: 3,
    };
    const normalEnd = normal.offset + normal.size * normal.count;

    const vertexBits = (this.vtxdef & (0x3 << 7)) >> 7;
    const vertexSize = vertexBits == 0 ? 0 : vertexBits == 3 ? 4 : vertexBits;
    const vertexCount = (this.vtxdef & (0x7 << 18)) >> 18;
    let vertexPadding = 0;
    if (vertexSize > 1) vertexPadding = normalEnd % vertexSize == 0 ? 0 : vertexSize - (normalEnd % vertexSize);
    const vertex = {
      padding: vertexPadding,
      type: vertexBits,
      size: vertexSize,
      offset: normalEnd + vertexPadding,
      count: vertexCount != 0 ? vertexCount : vertexSize == 0 ? 0 : 3,
    };
    const vertexEnd = vertex.offset + vertex.size * vertex.count;

    /*
    const weightBits = (this.vtxdef & (0x3 << 9)) >> 9;
    const weightSize = weightBits == 0 ? 0 : weightBits == 3 ? 4 : weightBits;
    const weightsCount = (this.vtxdef & (0x7 << 14)) >> 14;
    let weigthPadding = 0;
    if (weightSize > 1) weigthPadding = vertexEnd % weightSize == 0 ? 0 : weightSize - (vertexEnd % weightSize);
    const weight = {
      padding: weigthPadding,
      type: weightBits,
      size: weightSize,
      offset: vertexEnd + weigthPadding,
      count: weightsCount,
    };
    const weightEnd = weight.offset + weight.size * weight.count;

    const indexBits = (this.vtxdef & (0x3 << 11)) >> 11;
    const indexSize = indexBits == 0 ? 0 : indexBits == 3 ? 4 : indexBits;
    let indexPadding = 0;
    if (indexSize > 1) indexPadding = weightEnd % indexSize == 0 ? 0 : weightSize - (weightEnd % indexSize);
    const index = {
      padding: indexPadding,
      type: indexBits,
      size: indexSize,
      offset: weightEnd + indexPadding,
      count: 1,
    };
    */
    return { texture, color, normal, vertex /*, weight, index*/ };
  }

  get strideSize(): number {
    const strideInfo = this.strideInfo;
    let size = strideInfo.vertex.offset + strideInfo.vertex.size * strideInfo.vertex.count;
    //let size = this.strideInfo.index.offset + this.strideInfo.index.size * this.strideInfo.index.count;
    if (this.strideAlign > 1) size += size % this.strideAlign == 0 ? 0 : this.strideAlign - (size % this.strideAlign);
    return size;
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
    size += ret.header.strideCount * ret.header.strideSize;
    size += ret.header.strideCount2 * ret.header.strideSize;
    size += size % 16 == 0 ? 0 : 16 - (size % 16);
    ret.range = range.slice(0, size);

    const expectedSize = ret.header.size + 16 * 3 + ret.header.size1;
    if (size != expectedSize) {
      console.warn(`Cannot load mesh chunk @0x${ret.range.begin.toString(16)} because sizes differ ${size} != ${expectedSize}`);
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
    this.strides = this.loadStrides(stridesRange, this.header.strideCount);

    // Load strides in second section
    const offset = infoRange.size + stridesRange.size;
    const pad = offset % 16 == 0 ? 0 : 16 - (offset % 16);
    const stridesRange2 = stridesRange.slice(this.header.strideCount * this.header.strideSize + pad);
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
