import { BufferRange } from "../range";
import { vec3, vec4, mat4 } from "gl-matrix";
import { Material, Object, RGBA, Scene, UV, Vertex } from "./types";

class RcsmodelMeshInfo {
  range = new BufferRange();
  count = 0;
  type = 22;

  static load(range: BufferRange): RcsmodelMeshInfo {
    let ret = new RcsmodelMeshInfo();
    ret.range = range.clone();
    ret.count = ret.range.getUint8(0);
    ret.type = ret.range.getUint8(1);
    return ret;
  }
}

class RcsmodelObjectHeader {
  range = new BufferRange();
  id = 0;
  type = 0;
  end_offet = 0;
  position = { x: 0, y: 0, z: 0 } as Vertex;
  scale = { x: 1.0, y: 1.0, z: 1.0 } as Vertex;

  static load(range: BufferRange): RcsmodelObjectHeader {
    let ret = new RcsmodelObjectHeader();
    ret.range = range.slice(0, 80);

    ret.id = ret.range.getUint32(0);
    ret.type = ret.range.getUint8(6);
    ret.end_offet = ret.range.getUint32(24);

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

class RcsmodelObject {
  range = new BufferRange();
  header = new RcsmodelObjectHeader();
  mesh = null as null | RcsmodelMesh1 | RcsmodelMesh5;

  static load(range: BufferRange): RcsmodelObject {
    let ret = new RcsmodelObject();
    ret.range = range.clone();
    ret.header = RcsmodelObjectHeader.load(ret.range);
    ret.range.end = ret.header.end_offet;

    switch (ret.header.type) {
      case 1:
        ret.mesh = RcsmodelMesh1.load(ret.range.slice(80));
        break;
      case 5:
        ret.mesh = RcsmodelMesh5.load(ret.range.slice(80));
        break;
      default:
        console.warn(`unexpect object type ${ret.header.type}`);
        break;
    }

    return ret;
  }

  export(): Object {
    const object: Object = {
      type: "group",
      position: this.header.position,
      scale: this.header.scale,
      objects: [],
    };

    if (this.mesh !== null) {
      const obj = this.mesh.export();
      object.objects.push(obj);
    }

    return object;
  }
}

class RcsmodelMesh1 {
  range = new BufferRange();

  vbo_count = 0;
  vbo_offset = 0;
  ibo_count = 0;
  ibo_offset = 0;

  vbo = new RcsmodelVBO();
  ibo = new RcsmodelIBO();

  static load(range: BufferRange): RcsmodelMesh1 {
    let ret = new RcsmodelMesh1();
    ret.range = range.clone();

    ret.vbo_count = ret.range.getUint32(0);
    ret.vbo_offset = ret.range.getUint32(4);
    ret.ibo_count = ret.range.getUint32(8);
    ret.ibo_offset = ret.range.getUint32(12);

    ret.vbo_count = Math.round((ret.range.end - ret.vbo_offset) / 10);

    ret.ibo = RcsmodelIBO.load(ret.getVertexIndexRange(), ret.ibo_count);
    ret.vbo = RcsmodelVBO.load(ret.getVertexBufferRange(), 10, ret.vbo_count);

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

  export(): Object {
    return {
      type: "mesh",
      indices: this.ibo.indices,
      vertices: this.vbo.vertices,
      uvs: [],
    };
  }
}

class RcsmodelMesh5 {
  range = new BufferRange();

  info_offset = 0;
  info = new RcsmodelMeshInfo();
  extra_offet = 0;

  submesh_count = 0;
  submesh_offset = 0;
  submeshes = [] as RcsmodelSubmesh[];

  static load(range: BufferRange): RcsmodelMesh5 {
    let ret = new RcsmodelMesh5();
    ret.range = range.clone();

    ret.submesh_count = ret.range.getUint32(0);
    ret.submesh_offset = ret.range.getUint32(4);
    ret.info_offset = ret.range.getUint32(8);
    ret.extra_offet = ret.range.getUint32(12);

    const tmpRange = ret.range.reset(ret.info_offset);
    ret.info = RcsmodelMeshInfo.load(tmpRange);

    let subrange = ret.range.reset(ret.submesh_offset);
    for (let i = 0; i < ret.submesh_count; i++) {
      const submesh = RcsmodelSubmesh.load(subrange, ret.info.type);
      ret.submeshes.push(submesh);
      subrange = subrange.slice(8 * 16);
    }

    return ret;
  }

  export(): Object {
    const objects = [] as Object[];
    for (const submesh of this.submeshes) {
      const mesh = submesh.export();
      objects.push(mesh);
    }
    return {
      type: "group",
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1.0, y: 1.0, z: 1.0 },
      objects,
    };
  }
}

class RcsmodelSubmesh {
  range = new BufferRange();
  vbo_count = 0;
  ibo_count = 0;
  ibo_offset = 0;
  vbo_offset = 0;

  vbo = new RcsmodelVBO();
  ibo = new RcsmodelIBO();

  static load(range: BufferRange, type: number): RcsmodelSubmesh {
    let ret = new RcsmodelSubmesh();
    ret.range = range.slice(0, 8 * 16);
    ret.vbo_count = ret.range.getUint16(8);
    ret.ibo_count = ret.range.getUint16(10);
    ret.ibo_offset = ret.range.getUint32(16);
    ret.vbo_offset = ret.range.getUint32(24);

    ret.ibo = RcsmodelIBO.load(ret.getVertexIndexRange(), ret.ibo_count);
    ret.vbo = RcsmodelVBO.load(ret.getVertexBufferRange(), type, ret.vbo_count);

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

  export(): Object {
    return {
      type: "mesh",
      indices: this.ibo.indices,
      vertices: this.vbo.vertices,
      uvs: this.vbo.uv,
    };
  }
}

class RcsmodelVBO {
  range = new BufferRange();
  vertices = [] as Vertex[];
  normals = [] as Vertex[];
  rgba = [] as RGBA[];
  uv = [] as UV[];

  static load(range: BufferRange, size: number, count: number): RcsmodelVBO {
    let ret = new RcsmodelVBO();
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

class RcsmodelIBO {
  range = new BufferRange();
  indices = [] as number[];
  max = 0;

  static load(range: BufferRange, count: number): RcsmodelIBO {
    let ret = new RcsmodelIBO();
    ret.range = range.slice(0, range.size - (range.size % 6));
    for (let i = 0; i < count; i++) {
      const index = ret.range.getUint16(i * 2);
      ret.max = Math.max(ret.max, index);
      ret.indices.push(index);
    }
    return ret;
  }
}

class RcsmodelMesh {
  object = new RcsmodelObject();
  vbos = [] as RcsmodelVBO[];
  ibos = [] as RcsmodelIBO[];
  matrix = mat4.create();

  glPrepare() {
    this.matrix = mat4.create();
    mat4.translate(this.matrix, this.matrix, this.position);
    mat4.scale(this.matrix, this.matrix, this.scale);

    for (let i = 0; i < this.ibos.length; i++) {
      const ibo = this.ibos[i];
      const vbo = this.vbos[i];

      const [r, g, b] = [100 * Math.random() + 127, 255, 255];

      const positions = new Int16Array(vbo.vertices.length * 3);
      const colors = new Uint8Array(vbo.vertices.length * 3);
      for (let i = 0; i < vbo.vertices.length; i++) {
        positions[i * 3 + 0] = vbo.vertices[i].x;
        positions[i * 3 + 1] = vbo.vertices[i].y;
        positions[i * 3 + 2] = vbo.vertices[i].z;
        if (vbo.rgba.length > 0) {
          colors[i * 3 + 0] = vbo.rgba[i].r;
          colors[i * 3 + 1] = vbo.rgba[i].g;
          colors[i * 3 + 2] = vbo.rgba[i].b;
        } else {
          colors[i * 3 + 0] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
      }

      const indices = new Uint16Array(ibo.indices);

      /*
      const source: MeshSource = {
        mode: TRIANGLES,
        positions,
        colors,
        indices,
      };
      */

      if (vbo.uv.length > 0) {
        const uvs = new Float32Array(vbo.vertices.length * 2);
        for (let i = 0; i < vbo.vertices.length; i++) {
          uvs[i * 2 + 0] = vbo.uv[i].u;
          uvs[i * 2 + 1] = vbo.uv[i].v;
        }
        //source.uvs = uvs;
      }

      /*
      if (vbo.uv.length > 0) {
        const positions = new Int16Array(vbo.vertices.length * 3);
        for (let i = 0; i < vbo.vertices.length; i++) {
          positions[i * 3 + 0] = vbo.uv[i].u * 1000;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = vbo.uv[i].v * 1000;
          colors[i * 3 + 0] = 255;
          colors[i * 3 + 1] = 0;
          colors[i * 3 + 2] = 0;
        }
        const source: MeshSource = {
          mode: engine.gl.TRIANGLES,
          positions,
          colors,
          indices,
        };
        const mesh = new Mesh(engine.gl);
        mesh.load(source);
        this.meshes.push(mesh);
      }
      */

      if (vbo.normals.length > 0) {
        const positions = new Int16Array(vbo.vertices.length * 3 * 2);
        const colors = new Uint8Array(vbo.vertices.length * 3 * 2);
        for (let i = 0; i < vbo.vertices.length; i++) {
          positions[i * 6 + 0] = vbo.vertices[i].x;
          positions[i * 6 + 1] = vbo.vertices[i].y;
          positions[i * 6 + 2] = vbo.vertices[i].z;
          positions[i * 6 + 3] = vbo.vertices[i].x + vbo.normals[i].x;
          positions[i * 6 + 4] = vbo.vertices[i].y + vbo.normals[i].y;
          positions[i * 6 + 5] = vbo.vertices[i].z + vbo.normals[i].z;
          colors[i * 6 + 0] = 150;
          colors[i * 6 + 1] = 0;
          colors[i * 6 + 2] = 0;
          colors[i * 6 + 3] = 255;
          colors[i * 6 + 4] = 0;
          colors[i * 6 + 5] = 0;
        }

        /*
        const source: MeshSource = {
          mode:LINES,
          positions,
          colors,
        };
        */

        /*
        const mesh = new Mesh();
        mesh.load(source);
        this.meshes.push(mesh);
        */
      }
    }
  }

  get position(): vec3 {
    return vec3.fromValues(
      this.object.header.position.x,
      this.object.header.position.y,
      this.object.header.position.z
    );
  }

  get scale(): vec3 {
    return vec3.fromValues(
      this.object.header.scale.x,
      this.object.header.scale.y,
      this.object.header.scale.z
    );
  }
}

class RcsmodelHeader {
  range = new BufferRange();
  mesh_table_count = 0;
  mesh_table_offset = 0;
  rotation = [] as vec4[];

  static load(range: BufferRange): RcsmodelHeader {
    let ret = new RcsmodelHeader();
    ret.range = range.slice(0, 64);
    ret.mesh_table_count = ret.range.getUint32(28);
    ret.mesh_table_offset = ret.range.getUint32(32);
    for (let i = 0; i < ret.mesh_table_count; i++) {
      const x = ret.range.getFloat32(64 + i * 16 + 0);
      const y = ret.range.getFloat32(64 + i * 16 + 4);
      const z = ret.range.getFloat32(64 + i * 16 + 8);
      const w = ret.range.getFloat32(64 + i * 16 + 12);
      const v = vec4.fromValues(x, y, z, w);
      ret.rotation.push(v);
    }
    return ret;
  }

  getObjectTable(): RcsmodelOffsetTable {
    const range = this.range
      .reset()
      .slice(this.mesh_table_offset, this.mesh_table_offset + 64);
    return RcsmodelOffsetTable.load(range, this.mesh_table_count);
  }
}

class RcsmodelOffsetTable {
  range = new BufferRange();
  offsets = [] as number[];

  static load(range: BufferRange, count: number): RcsmodelOffsetTable {
    let ret = new RcsmodelOffsetTable();
    ret.range = range.slice(0, count * 4);
    for (let i = 0; i < count; i++) {
      const offset = ret.range.getUint32(i * 4);
      ret.offsets.push(offset);
    }
    return ret;
  }
}

export class Rcsmodel {
  range = new BufferRange();

  header = new RcsmodelHeader();
  objects_table = new RcsmodelOffsetTable();
  objects = [] as RcsmodelObject[];

  static load(buffer: ArrayBuffer): Rcsmodel {
    let ret = new Rcsmodel();
    ret.range = new BufferRange(buffer);
    ret.range.le = false;

    ret.header = RcsmodelHeader.load(ret.range);
    ret.objects_table = ret.header.getObjectTable();
    for (const offset of ret.objects_table.offsets) {
      const range = ret.range.slice(offset);
      const object = RcsmodelObject.load(range);
      ret.objects.push(object);
    }

    return ret;
  }

  export(): Scene {
    const materials = [] as Material[];

    const objects = [] as Object[];
    for (const object of this.objects) {
      const mesh = object.export();
      objects.push(mesh);
    }

    return {
      materials,
      objects,
    };
  }
}
