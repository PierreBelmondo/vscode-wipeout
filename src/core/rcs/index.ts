import { BufferRange } from "../range";
import { vec3, vec4, mat4 } from "gl-matrix";
import { Material, Mesh, Object, RGBA, Scene, Texture, UV, Vertex } from "./types";
import { GTF } from "../gtf";
import { Flat } from "../vexx/flat";

class RcsModelMeshInfo {
  range = new BufferRange();
  count = 0;
  type = 22;

  static load(range: BufferRange): RcsModelMeshInfo {
    let ret = new RcsModelMeshInfo();
    ret.range = range.clone();
    ret.count = ret.range.getUint8(0);
    ret.type = ret.range.getUint8(1);
    return ret;
  }
}

class RcsModelObjectHeader {
  range = new BufferRange();
  id = 0;
  type = 0;
  end_offet = 0;
  position = { x: 0, y: 0, z: 0 } as Vertex;
  scale = { x: 1.0, y: 1.0, z: 1.0 } as Vertex;
  material_id = 0;

  static load(range: BufferRange): RcsModelObjectHeader {
    let ret = new RcsModelObjectHeader();
    ret.range = range.slice(0, 80);

    ret.id = ret.range.getUint32(0);
    console.log(`Loading mesh ${ret.id.toString(16)}`);
    ret.type = ret.range.getUint8(6);
    ret.end_offet = ret.range.getUint32(24);
    ret.material_id = ret.range.getUint32(32);

    ret.position.x = ret.range.getFloat32(48);
    ret.position.y = ret.range.getFloat32(52);
    ret.position.z = ret.range.getFloat32(56);
    //ret.position.w = ret.range.getFloat32(60);

    // Since OpenGL/WebGL2 interprets signed 16-bit integers as normalized,
    // We must account for this in the scale
    // .00007812500000000000 = 2.56 / 32768
    ret.scale.x = ret.range.getFloat32(64) * 32768.0;
    ret.scale.y = ret.range.getFloat32(68) * 32768.0;
    ret.scale.z = ret.range.getFloat32(72) * 32768.0;
    //ret.scale.w = ret.range.getFloat32(76) * 32768.0;

    return ret;
  }
}

class RcsModelObject {
  range = new BufferRange();
  header = new RcsModelObjectHeader();
  mesh = null as null | RcsModelMesh1 | RcsModelMesh5;

  static load(range: BufferRange): RcsModelObject {
    let ret = new RcsModelObject();
    ret.range = range.clone();
    ret.header = RcsModelObjectHeader.load(ret.range);
    ret.range.end = ret.header.end_offet;

    switch (ret.header.type) {
      case 1:
        ret.mesh = RcsModelMesh1.load(ret.range.slice(80));
        break;
      case 5:
        ret.mesh = RcsModelMesh5.load(ret.range.slice(80));
        break;
      default:
        console.warn(`unexpect object type ${ret.header.type}`);
        break;
    }

    return ret;
  }

  export(): Object {
    const object: Object = {
      position: this.header.position,
      scale: this.header.scale,
      material_id: this.header.material_id,
      meshes: [],
    };

    if (this.mesh !== null) {
      const obj = this.mesh.export();
      if (Array.isArray(obj)) object.meshes = object.meshes.concat(obj);
      else object.meshes.push(obj);
    }

    return object;
  }
}

class RcsModelMesh1 {
  range = new BufferRange();

  vbo_count = 0;
  vbo_offset = 0;
  ibo_count = 0;
  ibo_offset = 0;

  vbo = new RcsModelVBO();
  ibo = new RcsModelIBO();

  static load(range: BufferRange): RcsModelMesh1 {
    let ret = new RcsModelMesh1();
    ret.range = range.clone();

    ret.vbo_count = ret.range.getUint32(0);
    ret.vbo_offset = ret.range.getUint32(4);
    ret.ibo_count = ret.range.getUint32(8);
    ret.ibo_offset = ret.range.getUint32(12);

    ret.vbo_count = Math.round((ret.range.end - ret.vbo_offset) / 10);

    ret.ibo = RcsModelIBO.load(ret.getVertexIndexRange(), ret.ibo_count);
    ret.vbo = RcsModelVBO.load(ret.getVertexBufferRange(), 10, ret.vbo_count);

    return ret;
  }

  getVertexBufferRange(): BufferRange {
    const beg = this.vbo_offset;
    const end = this.vbo_offset + this.vbo_count * 10;
    return this.range.reset().slice(beg, end);
  }

  getVertexIndexRange(): BufferRange {
    const beg = this.ibo_offset;
    const end = this.ibo_offset + this.ibo_offset * 2;
    return this.range.reset().slice(beg, end);
  }

  export(): Mesh {
    return {
      indices: this.ibo.indices,
      vertices: this.vbo.vertices,
      uvs: [],
    };
  }
}

class RcsModelMesh5 {
  range = new BufferRange();

  info_offset = 0;
  info = new RcsModelMeshInfo();
  extra_offet = 0;

  submesh_count = 0;
  submesh_offset = 0;
  submeshes = [] as RcsModelSubmesh[];

  static load(range: BufferRange): RcsModelMesh5 {
    let ret = new RcsModelMesh5();
    ret.range = range.clone();

    ret.submesh_count = ret.range.getUint32(0);
    ret.submesh_offset = ret.range.getUint32(4);
    ret.info_offset = ret.range.getUint32(8);
    ret.extra_offet = ret.range.getUint32(12);

    const tmpRange = ret.range.reset(ret.info_offset);
    ret.info = RcsModelMeshInfo.load(tmpRange);

    let subrange = ret.range.reset(ret.submesh_offset);
    for (let i = 0; i < ret.submesh_count; i++) {
      const submesh = RcsModelSubmesh.load(subrange, ret.info.type);
      ret.submeshes.push(submesh);
      subrange = subrange.slice(8 * 16);
    }

    return ret;
  }

  export(): Mesh[] {
    const objects = [] as Mesh[];
    for (const submesh of this.submeshes) {
      const mesh = submesh.export();
      objects.push(mesh);
    }
    return objects;
  }
}

class RcsModelSubmesh {
  range = new BufferRange();
  vbo_count = 0;
  ibo_count = 0;
  ibo_offset = 0;
  vbo_offset = 0;

  vbo = new RcsModelVBO();
  ibo = new RcsModelIBO();

  static load(range: BufferRange, type: number): RcsModelSubmesh {
    let ret = new RcsModelSubmesh();
    ret.range = range.slice(0, 8 * 16);
    ret.vbo_count = ret.range.getUint16(8);
    ret.ibo_count = ret.range.getUint16(10);
    ret.ibo_offset = ret.range.getUint32(16);
    ret.vbo_offset = ret.range.getUint32(24);

    ret.ibo = RcsModelIBO.load(ret.getVertexIndexRange(), ret.ibo_count);
    ret.vbo = RcsModelVBO.load(ret.getVertexBufferRange(), type, ret.vbo_count);

    return ret;
  }

  getVertexBufferRange(): BufferRange {
    const beg = this.vbo_offset;
    const end = this.ibo_offset;
    return this.range.reset().slice(beg, end);
  }

  getVertexIndexRange(): BufferRange {
    const beg = this.ibo_offset;
    const end = this.ibo_offset + this.ibo_offset * 2;
    return this.range.reset().slice(beg, end);
  }

  export(): Mesh {
    return {
      indices: this.ibo.indices,
      vertices: this.vbo.vertices,
      uvs: this.vbo.uv,
    };
  }
}

class RcsModelVBO {
  range = new BufferRange();
  vertices = [] as Vertex[];
  normals = [] as Vertex[];
  rgba = [] as RGBA[];
  uv = [] as UV[];

  static load(range: BufferRange, size: number, count: number): RcsModelVBO {
    let ret = new RcsModelVBO();
    ret.range = range.slice(0, count * size);

    for (let i = 0; i < count; i++) {
      const offset = i * size;

      const vertex = {
        x: ret.range.getInt16(offset + 0),
        y: ret.range.getInt16(offset + 2),
        z: ret.range.getInt16(offset + 4),
      };
      ret.vertices.push(vertex);

      if (size == 10) {
        const uv = {
          u: ret.range.getFloat16(offset + 6),
          v: ret.range.getFloat16(offset + 8),
        };
        ret.uv.push(uv);
      } else if (size == 18) {
        const uv = {
          u: ret.range.getFloat16(offset + 14),
          v: ret.range.getFloat16(offset + 16),
        };
        ret.uv.push(uv);
      } else if (size == 22) {
        const uv = {
          u: ret.range.getFloat16(offset + 18),
          v: ret.range.getFloat16(offset + 20),
        };
        ret.uv.push(uv);
      }
    }
    return ret;
  }
}

class RcsModelIBO {
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

class RcsModelTexture {
  range = new BufferRange();
  gtf?: GTF;

  id = 0;
  type = 0;
  offset_filename = 0;

  static load(range: BufferRange): RcsModelTexture {
    const ret = new RcsModelTexture();
    ret.range = range.slice(0, 32);
    ret.id = ret.range.getUint32(0);
    ret.type = ret.range.getUint32(4);
    ret.offset_filename = ret.range.getUint32(24);
    return ret;
  }

  get size(): number {
    return this.range.size;
  }

  get filename(): string {
    return this.range.reset().getCString(this.offset_filename);
  }

  export(): Texture {
    return {
      id: this.id,
      filename: this.filename,
      mipmaps: !this.gtf ? [] : this.gtf.export(),
    };
  }
}

class RcsModelMaterial {
  range = new BufferRange();

  id = 0;
  offset_filename = 0;
  textures_count = 0;
  textures_offset = 0;
  textures: RcsModelTexture[] = [];

  static load(range: BufferRange): RcsModelMaterial {
    const ret = new RcsModelMaterial();
    ret.range = range.clone();
    ret.id = ret.range.getUint32(0);
    ret.offset_filename = ret.range.getUint32(4);
    ret.textures_count = ret.range.getUint32(48);
    ret.textures_offset = ret.range.getUint32(52);

    let textureRange = ret.range.reset(ret.textures_offset);
    for (let i = 0; i < ret.textures_count; i++) {
      const texture = RcsModelTexture.load(textureRange);
      ret.textures.push(texture);
      textureRange = textureRange.slice(texture.size);
    }

    return ret;
  }

  get filename(): string {
    return this.range.reset().getCString(this.offset_filename);
  }

  export(): Material {
    let textures: Texture[] = [];
    for (const texture of this.textures) textures.push(texture.export());

    return {
      id: this.id,
      filename: this.filename,
      textures,
    };
  }
}

class RcsModelHeader {
  range = new BufferRange();
  object_table_count = 0;
  object_table_offset = 0;
  material_table_count = 0;
  material_table_offset = 0;
  rotation = [] as vec4[];

  static load(range: BufferRange): RcsModelHeader {
    let ret = new RcsModelHeader();
    ret.range = range.slice(0, 64);
    ret.object_table_count = ret.range.getUint32(28);
    ret.object_table_offset = ret.range.getUint32(32);
    ret.material_table_count = ret.range.getUint32(44);
    ret.material_table_offset = ret.range.getUint32(48);
    for (let i = 0; i < ret.object_table_count; i++) {
      const x = ret.range.getFloat32(64 + i * 16 + 0);
      const y = ret.range.getFloat32(64 + i * 16 + 4);
      const z = ret.range.getFloat32(64 + i * 16 + 8);
      const w = ret.range.getFloat32(64 + i * 16 + 12);
      const v = vec4.fromValues(x, y, z, w);
      ret.rotation.push(v);
    }
    return ret;
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
  objects_table = new RcsModelOffsetTable();
  objects = [] as RcsModelObject[];
  materials_table = new RcsModelOffsetTable();
  materials = [] as RcsModelMaterial[];

  static load(buffer: ArrayBuffer): RcsModel {
    let ret = new RcsModel();
    ret.range = new BufferRange(buffer);
    ret.range.le = false;

    ret.header = RcsModelHeader.load(ret.range);
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

    console.log(ret);
    return ret;
  }

  export(): Scene {
    const materials = [] as Material[];
    for (const rcsmaterial of this.materials) {
      const material = rcsmaterial.export();
      materials.push(material);
    }

    const objects = [] as Object[];
    for (const rcsobject of this.objects) {
      const object = rcsobject.export();
      objects.push(object);
    }

    return {
      materials,
      objects,
    };
  }
}
