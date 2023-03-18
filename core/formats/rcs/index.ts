import { BufferRange } from "@core/utils/range";
import { GTF } from "@core/formats/gtf";
import { vec4 } from "gl-matrix";

export class RcsModelMatrix {
  range = new BufferRange();

  numbers = [] as number[];

  static load(range: BufferRange): RcsModelMatrix {
    let ret = new RcsModelMatrix();
    ret.range = range.slice(0, 64);
    for (let i = 0; i < 16; i++) ret.numbers.push(ret.range.getFloat32(i * 4));
    return ret;
  }
}

export class RcsModelObjectUnknown {
  range = new BufferRange();

  static load(range: BufferRange): RcsModelObjectUnknown {
    const ret = new RcsModelObjectUnknown();
    ret.range = range.slice(0, 16);
    return ret;
  }
}

class RcsModelObjectHeader {
  range = new BufferRange();
  id = 0;
  unknown1 = 0;
  type = 0;
  type2 = 0;
  matrix_offset = 0;
  unknown4 = 0;
  unknown5 = 0;
  unknown6 = 0;
  offset_unknown = 0;
  unknown7 = 0;
  material_id = 0;
  unknown8 = 0;
  ffffffff = 0xffffffff;
  OOOOOOOO = 0x00000000;
  position = [0, 0, 0, 0];
  scale = [1, 1, 1, 1];

  static load(range: BufferRange): RcsModelObjectHeader {
    let ret = new RcsModelObjectHeader();
    ret.range = range.slice(0, 80);

    ret.id = ret.range.getUint32(0);
    ret.unknown1 = ret.range.getUint16(4);
    ret.type = ret.range.getUint8(6);
    ret.type2 = ret.range.getUint8(7);
    ret.matrix_offset = ret.range.getUint32(8);
    ret.unknown4 = ret.range.getUint32(12);
    ret.unknown5 = ret.range.getUint32(16);
    ret.unknown6 = ret.range.getUint32(20);
    ret.offset_unknown = ret.range.getUint32(24);
    ret.unknown7 = ret.range.getUint32(28);
    ret.material_id = ret.range.getUint32(32);
    ret.unknown8 = ret.range.getUint32(36);
    ret.ffffffff = ret.range.getUint32(40);
    ret.OOOOOOOO = ret.range.getUint32(44);
    ret.position = [ret.range.getFloat32(48), ret.range.getFloat32(52), ret.range.getFloat32(56), ret.range.getFloat32(60)];
    ret.scale = [
      ret.range.getFloat32(64),
      ret.range.getFloat32(68),
      ret.range.getFloat32(72),
      ret.range.getFloat32(76),
    ];

    return ret;
  }

  getUnknown(): RcsModelObjectUnknown {
    const range = this.range.reset(this.offset_unknown);
    return RcsModelObjectUnknown.load(range);
  }

  getMatrix(): RcsModelMatrix {
    const beg = this.matrix_offset;
    const end = this.matrix_offset + 64;
    const range = this.range.reset().slice(beg, end);
    return RcsModelMatrix.load(range);
  }
}

export class RcsModelObject {
  range = new BufferRange();

  header = new RcsModelObjectHeader();
  mesh = null as null | RcsModelMesh1 | RcsModelMesh5;
  matrix = new RcsModelMatrix();
  //unknown = new RcsModelObjectUnknown();

  static load(range: BufferRange): RcsModelObject {
    let ret = new RcsModelObject();
    ret.range = range.slice(0, 80);
    ret.header = RcsModelObjectHeader.load(ret.range);
    ret.range.end = ret.header.offset_unknown;

    switch (ret.header.type) {
      case 1:
        ret.mesh = RcsModelMesh1.load(range.slice(80));
        break;
      case 5:
        ret.mesh = RcsModelMesh5.load(range.slice(80));
        break;
      default:
        console.warn(`unexpect object type ${ret.header.type}`);
        break;
    }

    //ret.unknown = ret.header.getUnknown();
    ret.matrix = ret.header.getMatrix();
    return ret;
  }
}

type StrideInfo = {
  id: number;
  align: number;
  type: number;
  offset: number;
};

export class RcsModelMeshInfo {
  range = new BufferRange();
  count = 0;
  align = 0;
  strides = [] as StrideInfo[];

  static load(range: BufferRange): RcsModelMeshInfo {
    let ret = new RcsModelMeshInfo();
    ret.range = range.slice(0, 144);
    ret.count = ret.range.getUint8(0);
    ret.align = ret.range.getUint8(1);
    for (let i = 0; i < ret.count; i++) {
      const info = {
        id: ret.range.getUint32(4 + 8 * i + 0),
        align: ret.range.getUint8(4 + 8 * i + 5),
        type: ret.range.getUint8(4 + 8 * i + 6),
        offset: ret.range.getUint8(4 + 8 * i + 7),
      };
      ret.strides.push(info);
    }
    return ret;
  }
}

export class RcsModelMesh1 {
  range = new BufferRange();

  info_offset = 0;
  vbo_offset = 0;
  ibo_count = 0;
  ibo_offset = 0;

  info = new RcsModelMeshInfo();
  vbo = new RcsModelVBO();
  ibo = new RcsModelIBO();

  static load(range: BufferRange): RcsModelMesh1 {
    let ret = new RcsModelMesh1();
    ret.range = range.slice(0, 16);
    ret.info_offset = ret.range.getUint32(0);
    ret.vbo_offset = ret.range.getUint32(4);
    ret.ibo_count = ret.range.getUint32(8);
    ret.ibo_offset = ret.range.getUint32(12);

    ret.info = RcsModelMeshInfo.load(ret.getMeshInfoRange());
    ret.ibo = RcsModelIBO.load(ret.getVertexIndexRange(), ret.ibo_count);
    ret.vbo = RcsModelVBO.load(ret.getVertexBufferRange(), ret.info, ret.ibo.max + 1);
    return ret;
  }

  getMeshInfoRange(): BufferRange {
    return this.range.reset(this.info_offset);
  }

  getVertexIndexRange(): BufferRange {
    const beg = this.ibo_offset;
    const end = this.ibo_offset + this.ibo_count * 2;
    return this.range.reset(beg, end);
  }

  getVertexBufferRange(): BufferRange {
    const beg = this.vbo_offset;
    const end = this.vbo_offset + this.info.count * this.info.align;
    return this.range.reset(beg, end);
  }
}

export class RcsModelMesh5 {
  range = new BufferRange();

  info_offset = 0;
  info = new RcsModelMeshInfo();
  extra_offet = 0;

  submesh_count = 0;
  submesh_offset = 0;
  submeshes = [] as RcsModelSubmesh[];

  static load(range: BufferRange): RcsModelMesh5 {
    let ret = new RcsModelMesh5();
    ret.range = range.slice(0, 16);
    ret.submesh_count = ret.range.getUint32(0);
    ret.submesh_offset = ret.range.getUint32(4);
    ret.info_offset = ret.range.getUint32(8);
    ret.extra_offet = ret.range.getUint32(12);

    ret.info = RcsModelMeshInfo.load(ret.getMeshInfoRange());

    let subrange = ret.range.reset(ret.submesh_offset);
    for (let i = 0; i < ret.submesh_count; i++) {
      const submesh = RcsModelSubmesh.load(subrange, ret.info);
      ret.submeshes.push(submesh);
      subrange = subrange.slice(8 * 16);
    }

    return ret;
  }

  getMeshInfoRange(): BufferRange {
    return this.range.reset(this.info_offset);
  }
}

export class RcsModelSubmesh {
  range = new BufferRange();
  vbo_count = 0;
  ibo_count = 0;
  ibo_offset = 0;
  vbo_offset = 0;

  vbo = new RcsModelVBO();
  ibo = new RcsModelIBO();

  static load(range: BufferRange, info: RcsModelMeshInfo): RcsModelSubmesh {
    let ret = new RcsModelSubmesh();
    ret.range = range.slice(0, 8 * 16);
    ret.vbo_count = ret.range.getUint16(8);
    ret.ibo_count = ret.range.getUint16(10);
    ret.ibo_offset = ret.range.getUint32(16);
    ret.vbo_offset = ret.range.getUint32(24);

    ret.ibo = RcsModelIBO.load(ret.getVertexIndexRange(), ret.ibo_count);
    ret.vbo = RcsModelVBO.load(ret.getVertexBufferRange(), info, ret.vbo_count);

    return ret;
  }

  getVertexBufferRange(): BufferRange {
    const beg = this.vbo_offset;
    const end = this.ibo_offset;
    return this.range.reset(beg, end);
  }

  getVertexIndexRange(): BufferRange {
    const beg = this.ibo_offset;
    const end = this.ibo_offset + this.ibo_count * 2;
    return this.range.reset(beg, end);
  }
}

export class RcsModelVBO {
  range = new BufferRange();
  vertices = [] as number[];
  normals = [] as number[];
  rgba = [] as number[];
  uv = [] as number[];

  static load(range: BufferRange, info: RcsModelMeshInfo, count: number): RcsModelVBO {
    let ret = new RcsModelVBO();
    ret.range = range.slice(0, count * info.align);

    for (let i = 0; i < count; i++) {
      const offset = i * info.align;
      for (const stride of info.strides) {
        if (stride.type == 0x16) {
          const u = ret.range.getUint32(offset + stride.offset + 0); // 11 11 10
          const x = ((u >> 21) & ((1 << 11) - 1)) / 1024.0;
          const y = ((u >> 10) & ((1 << 11) - 1)) / 1024.0;
          const z = ((u >> 0) & ((1 << 10) - 1)) / 512.0;
          ret.normals.push(x, y, z);
        }
        if (stride.type == 0x22) {
          /*
          const r = ret.range.getFloat16(offset + stride.offset + 0);
          const g = ret.range.getFloat16(offset + stride.offset + 2);
          const b = ret.range.getFloat16(offset + stride.offset + 4);
          const a = ret.range.getFloat16(offset + stride.offset + 6);
          ret.rgba.push(r, g, b, a);
          */
        }
        if (stride.type == 0x23) {
          const u = ret.range.getFloat16(offset + stride.offset + 0);
          const v = ret.range.getFloat16(offset + stride.offset + 2);
          ret.uv.push(u, v);
        }
        if (stride.type == 0x35) {
          const x = ret.range.getInt16(offset + stride.offset + 0);
          const y = ret.range.getInt16(offset + stride.offset + 2);
          const z = ret.range.getInt16(offset + stride.offset + 4);
          ret.vertices.push(x, y, z);
        }
        if (stride.type == 0x42) {
          // 16 bytes ???
          const r = ret.range.getFloat32(offset + stride.offset + 0);
          const g = ret.range.getFloat32(offset + stride.offset + 4);
          const b = ret.range.getFloat32(offset + stride.offset + 8);
          const a = ret.range.getFloat32(offset + stride.offset + 12);
          ret.rgba.push(r, g, b, a);
        }
        if (stride.type == 0x43) {
          const r = ret.range.getUint8(offset + stride.offset + 0);
          const g = ret.range.getUint8(offset + stride.offset + 1);
          const b = ret.range.getUint8(offset + stride.offset + 2);
          const a = ret.range.getUint8(offset + stride.offset + 3);
          //ret.rgba.push(r, g, b, a);
        }
        /*
        if (stride.type == 0x44) {
          /*
          const r = ret.range.getUint8(offset + stride.offset + 0) / 255.0;
          const g = ret.range.getUint8(offset + stride.offset + 1) / 255.0;
          const b = ret.range.getUint8(offset + stride.offset + 2) / 255.0;
          const a = ret.range.getUint8(offset + stride.offset + 3) / 255.0;
          ret.rgba.push(r, g, b, a);
          */
      }
    }
    return ret;
  }
}

export class RcsModelIBO {
  range = new BufferRange();
  indices = [] as number[];
  max = 0;

  static load(range: BufferRange, count: number): RcsModelIBO {
    let ret = new RcsModelIBO();
    ret.range = range.slice(0, range.size - (range.size % 6));
    for (let i = 0; i < count; i++) {
      const index = ret.range.getUint16(i * 2);
      ret.max = Math.max(ret.max, index);
      ret.indices.push(index);
    }
    return ret;
  }
}

export class RcsModelTexture {
  range = new BufferRange();
  gtf?: GTF;

  id = 0;
  type = 0;
  offset_filename = 0;
  filename = "";

  static load(range: BufferRange): RcsModelTexture {
    const ret = new RcsModelTexture();
    ret.range = range.slice(0, 32);
    ret.id = ret.range.getUint32(0);
    ret.type = ret.range.getUint32(4);
    ret.offset_filename = ret.range.getUint32(24);

    if (ret.offset_filename == 0) ret.filename = "";
    else {
      ret.filename = ret.range.reset().getCString(ret.offset_filename);
      if (!ret.filename.startsWith("data/")) ret.filename = "";
    }
    return ret;
  }

  get size(): number {
    return this.range.size;
  }
}

export class RcsModelMaterialUnknown {
  range = new BufferRange();

  unknown1: number;
  unknown2: number;

  static load(range: BufferRange): RcsModelMaterialUnknown {
    const ret = new RcsModelMaterialUnknown();
    ret.range = range.slice(0, 32);
    ret.unknown1 = ret.range.getFloat32(0);
    ret.unknown2 = ret.range.getUint32(16);
    return ret;
  }
}

export class RcsModelMaterial {
  range = new BufferRange();

  id = 0;
  offset_filename = 0;
  textures_count = 0;
  textures_offset = 0;
  unknown_offset = 0;

  textures: RcsModelTexture[] = [];
  unknown: RcsModelMaterialUnknown = new RcsModelMaterialUnknown();

  static load(range: BufferRange): RcsModelMaterial {
    const ret = new RcsModelMaterial();
    ret.range = range.slice(0, 64);
    ret.id = ret.range.getUint32(0);
    ret.offset_filename = ret.range.getUint32(4);
    ret.textures_count = ret.range.getUint32(48);
    ret.textures_offset = ret.range.getUint32(52);
    ret.unknown_offset = ret.range.getUint32(56);

    let textureRange = ret.range.reset(ret.textures_offset);
    for (let i = 0; i < ret.textures_count; i++) {
      const texture = RcsModelTexture.load(textureRange);
      ret.textures.push(texture);
      textureRange = textureRange.slice(texture.size);
    }

    const unknownRange = ret.range.reset().slice(ret.unknown_offset);
    ret.unknown = RcsModelMaterialUnknown.load(unknownRange);

    return ret;
  }

  get filename(): string {
    return this.range.reset().getCString(this.offset_filename);
  }
}

class RcsModelLookupTable {
  range = new BufferRange();

  values: number[] = [];

  static load(range: BufferRange): RcsModelLookupTable {
    let ret = new RcsModelLookupTable();
    const size = range.getUint32(0);
    let end = 4 + 4 * size;
    ret.range = range.slice(0, end);
    const padding = ret.range.end % 16 == 0 ? 0 : 16 - (ret.range.end % 16);
    ret.range.end += padding;
    // TODO: range padding ?
    for (let i = 0; i < size; i++) {
      const value = range.getUint32(4 + i * 4);
      ret.values.push(value);
    }
    return ret;
  }
}

class RcsModelObjectUnknownTable {
  range = new BufferRange();
  values: vec4[] = [];

  static load(range: BufferRange, count: number): RcsModelObjectUnknownTable {
    let ret = new RcsModelObjectUnknownTable();
    ret.range = range.slice(0, count * 16);
    for (let i = 0; i < count; i++) {
      const x = ret.range.getFloat32(16 * i + 0);
      const y = ret.range.getFloat32(16 * i + 4);
      const z = ret.range.getFloat32(16 * i + 8);
      const w = ret.range.getFloat32(16 * i + 12);
      const v = vec4.fromValues(x, y, z, w);
      ret.values.push(v);
    }
    return ret;
  }
}

class RcsModelHeader {
  range = new BufferRange();

  lookup_table_offset = 0;

  object_unknown_table_offset = 0;
  object_table_count = 0;
  object_table_offset = 0;

  material_table_count = 0;
  material_table_offset = 0;
  rotation = [] as vec4[];

  static load(range: BufferRange): RcsModelHeader {
    let ret = new RcsModelHeader();
    ret.range = range.slice(0, 64);
    ret.lookup_table_offset = ret.range.getUint32(4);
    ret.object_table_count = ret.range.getUint32(28);
    ret.object_table_offset = ret.range.getUint32(32);
    ret.object_unknown_table_offset = ret.range.getUint32(36);
    ret.material_table_count = ret.range.getUint32(44);
    ret.material_table_offset = ret.range.getUint32(48);
    return ret;
  }

  getObjectUnknownTable(): RcsModelObjectUnknownTable {
    const range = this.range.reset().slice(this.object_unknown_table_offset);
    return RcsModelObjectUnknownTable.load(range, this.object_table_count);
  }

  getLookupTable(): RcsModelLookupTable {
    const range = this.range.reset().slice(this.lookup_table_offset);
    const lookupTable = RcsModelLookupTable.load(range);
    return lookupTable;
  }

  getObjectTable(): RcsModelOffsetTable {
    const range = this.range.reset().slice(this.object_table_offset, this.object_table_offset + 64);
    return RcsModelOffsetTable.load(range, this.object_table_count);
  }

  getMaterialTable(): RcsModelOffsetTable {
    const range = this.range.reset().slice(this.material_table_offset, this.material_table_offset + 64);
    return RcsModelOffsetTable.load(range, this.material_table_count);
  }
}

class RcsModelOffsetTable {
  range = new BufferRange();
  offsets = [] as number[];

  static load(range: BufferRange, count: number): RcsModelOffsetTable {
    let ret = new RcsModelOffsetTable();
    ret.range = range.slice(0, count * 4);
    for (let i = 0; i < count; i++) {
      const offset = ret.range.getUint32(i * 4);
      ret.offsets.push(offset);
    }
    return ret;
  }
}

export class RcsModel {
  range = new BufferRange();

  header = new RcsModelHeader();
  lookup_table = new RcsModelLookupTable();
  objects_table = new RcsModelOffsetTable();
  objects = [] as RcsModelObject[];
  materials_table = new RcsModelOffsetTable();
  materials = [] as RcsModelMaterial[];
  object_unknown_table: RcsModelObjectUnknownTable;

  static load(buffer: ArrayBuffer): RcsModel {
    let ret = new RcsModel();
    ret.range = new BufferRange(buffer);
    ret.range.le = false;

    ret.header = RcsModelHeader.load(ret.range);
    ret.lookup_table = ret.header.getLookupTable();
    ret.object_unknown_table = ret.header.getObjectUnknownTable();

    ret.objects_table = ret.header.getObjectTable();
    for (const offset of ret.objects_table.offsets) {
      const range = ret.range.slice(offset);
      const object = RcsModelObject.load(range);
      ret.objects.push(object);
    }

    ret.materials_table = ret.header.getMaterialTable();
    for (const offset of ret.materials_table.offsets) {
      const range = ret.range.slice(offset);
      const material = RcsModelMaterial.load(range);
      ret.materials.push(material);
    }

    return ret;
  }
}
