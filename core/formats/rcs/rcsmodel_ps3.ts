import { BufferRange } from "@core/utils/range";
import { Stride } from "./ids";
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
  /**
   * Offset of the object's part table: one mesh pointer per material.
   *
   * A "mesh pointer" addresses the record 32 bytes into an object -- the same
   * place the object table's own entries reach through +32 -- so the fields it
   * names are material_id at +0, the 0xffffffff sentinel at +8, position at
   * +16, scale at +32 and the mesh header at +48.
   *
   * The first pointer is the mesh the object header already describes; the
   * rest are sibling parts of the same model, each with its own material and
   * placement. They are not levels of detail: their materials always differ
   * from the parent's, their bounding boxes overlap it, and their triangle
   * counts do not decrease. One building in 01_vineta_k is split into twelve
   * parts -- metal, concrete, brickwork, light strips -- with consecutive
   * material ids.
   */
  part_table_offset = 0;
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
    ret.part_table_offset = ret.range.getUint32(24);
    ret.unknown7 = ret.range.getUint32(28);
    ret.material_id = ret.range.getUint32(32);
    ret.unknown8 = ret.range.getUint32(36);
    ret.ffffffff = ret.range.getUint32(40);
    ret.OOOOOOOO = ret.range.getUint32(44);
    ret.position = [ret.range.getFloat32(48), ret.range.getFloat32(52), ret.range.getFloat32(56), ret.range.getFloat32(60)];
    ret.scale = [ret.range.getFloat32(64), ret.range.getFloat32(68), ret.range.getFloat32(72), ret.range.getFloat32(76)];

    return ret;
  }

  /**
   * The part table's mesh pointers, in file order.
   *
   * The table has no count: it runs to the end of the object's region, which
   * the next object header terminates. Most objects list a single mesh, but a
   * table can hold a dozen -- obj[667] of 01_vineta_k has 12.
   */
  getPartOffsets(): number[] {
    const range = this.range.reset();
    const offsets = [] as number[];
    for (let at = this.part_table_offset; at + 4 <= range.end; at += 4) {
      const pointer = range.getUint32(at);
      if (!RcsModelObjectHeader.isMeshPointer(range, pointer)) break;
      offsets.push(pointer);
    }
    return offsets;
  }

  /**
   * A mesh pointer addresses a record 32 bytes into an object, so the fields it
   * names are material_id at +0, the 0xffffffff sentinel at +8, position at
   * +16, scale at +32 and the mesh header at +48.
   */
  static isMeshPointer(range: BufferRange, pointer: number): boolean {
    if (pointer <= 0 || pointer + 64 > range.end) return false;
    if (range.getUint32(pointer + 8) !== 0xffffffff) return false;

    const submeshCount = range.getUint32(pointer + 48);
    const submeshOffset = range.getUint32(pointer + 52);
    if (submeshCount <= 0 || submeshCount >= 4096) return false;
    if (submeshOffset <= 0 || submeshOffset + 16 > range.end) return false;

    // Every submesh header is signed 0x83 and closes its first 16 bytes with a
    // 0xffffffff sentinel.
    return range.getUint32(submeshOffset) >>> 24 === 0x83 && range.getUint32(submeshOffset + 12) === 0xffffffff;
  }

  getMatrix(): RcsModelMatrix {
    const beg = this.matrix_offset;
    const end = this.matrix_offset + 64;
    const range = this.range.reset().slice(beg, end);
    return RcsModelMatrix.load(range);
  }
}

/**
 * One entry of an object's part table: a mesh with its own material.
 *
 * The pointer addresses a record 32 bytes into an object, so material_id sits
 * at +0, the sentinel at +8, position at +16, scale at +32 and the mesh header
 * at +48.
 */
export class RcsModelPart {
  range = new BufferRange();

  material_id = 0;
  position = [0, 0, 0, 0];
  scale = [1, 1, 1, 1];
  mesh = new RcsModelMesh5();

  static load(range: BufferRange, pointer: number): RcsModelPart {
    const ret = new RcsModelPart();
    ret.range = range.slice(pointer, pointer + 64);

    ret.material_id = ret.range.getUint32(0);
    ret.position = [ret.range.getFloat32(16), ret.range.getFloat32(20), ret.range.getFloat32(24), ret.range.getFloat32(28)];
    ret.scale = [ret.range.getFloat32(32), ret.range.getFloat32(36), ret.range.getFloat32(40), ret.range.getFloat32(44)];
    ret.mesh = RcsModelMesh5.load(range.reset(pointer + 48));

    return ret;
  }
}

export class RcsModelObject {
  range = new BufferRange();

  header = new RcsModelObjectHeader();
  mesh = null as null | RcsModelMesh1 | RcsModelMesh5;
  matrix = new RcsModelMatrix();

  /**
   * The object's further parts, past the one the header describes. Each
   * carries its own material and placement rather than inheriting the
   * object's.
   */
  parts = [] as RcsModelPart[];

  static load(range: BufferRange): RcsModelObject {
    let ret = new RcsModelObject();
    ret.range = range.slice(0, 80);
    ret.header = RcsModelObjectHeader.load(ret.range);
    ret.range.end = ret.header.part_table_offset;

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

    ret.matrix = ret.header.getMatrix();
    ret.loadParts(range);
    return ret;
  }

  /**
   * Load every mesh the part table lists past the first, which the object
   * header already describes. Each pointer names a record whose mesh header
   * sits at +48.
   */
  private loadParts(range: BufferRange) {
    const offsets = this.header.getPartOffsets();
    for (const pointer of offsets.slice(1)) {
      this.parts.push(RcsModelPart.load(range.reset(), pointer));
    }
  }
}

export type StrideInfo = {
  id: number;
  name: string;
  align: number;
  type: number;
  offset: number;
};

/**
 * Vertex attribute formats, as the shaders themselves declare them.
 *
 * The vertex program binds position to v[0], normal to v[1], tangent to v[2]
 * and the UV sets after that, then:
 *
 *   MUL R1.xyz, v0.xyzx, c466.xyzx    positionScale
 *   ADD R3.xyz, R1.xyzx, c467.xyzx    positionBias
 *   MOV o9.xyz, v1.xyzx               normal used as-is
 *   MAD R0.xyz, v2.xyzx, c464.xxxx, -c464.yyyy    tangent scaled and biased
 *   MAD R2.xyz, v1.yzxy, R0.zxyz, -R2.xyzx        bitangent = cross(n, t)
 *   MUL o7.xyz, R2.xyzx, v2.wwww                  times handedness in tangent.w
 *
 * So position is `raw * scale + bias` -- matching the object header's scale and
 * position -- the normal arrives already signed, and the tangent is stored
 * unsigned and unbiased in the shader. `c464` is a constant register the
 * runtime loads rather than a uniform the file names, so its value is not
 * recoverable here; the (2, 1) pair that unpacks [0,1] to [-1,1] is what the
 * data agrees with, at 99.2% unit-length tangents against 17.1% unsigned.
 */
export class RcsModelMeshInfo {
  range = new BufferRange();
  count = 0;
  align = 0;
  strides = [] as StrideInfo[];

  static load(range: BufferRange): RcsModelMeshInfo {
    const id2name = {
      0xb9d31b0a: "position",
      0xde7a971b: "normal",
      0xdbe5f417: "tangent",
      0x7a3f521c: "uv1",
      0xc08c9018: "Uv",
      0x427214fc: "Uv1",
      0xdb7b4546: "Uv2",
      0xac7c75d0: "Uv3",
      0x3218e073: "Uv4",
      0xd7f6305e: "UV1",
      0x49f76806: "Uvset1",
      0xd0fe39bc: "Uvset2",
      0x7d164d3e: "barsUV",
      0xe476fcba: "cellUV",
      0xd8b4d944: "CellUv",
      0xe24a85ec: "bumpUV",
      0x81bdf44d: "blendUV",
      0xa2762127: "diffuseUV",
      0x991801ef: "diffuseUv",
      0xe0ade624: "Diffuse_uv",
      0x2206cab2: "VertexColour",
      0x7493d450: "VertexColour1",
      0xed9a85ea: "VertexColour2",
      0x2003d7e6: "map1",
      0xb90a865c: "map2",
      0x77783981: "Smoke",
      // The crowd meshes' diffuse UV. Type 35 at offset 10 -- byte-identical to
      // Uv1's layout -- and used only by nr_crowd_bustle and cf_cheap_crowd,
      // whose 1360 meshes carry no other UV channel. Left unnamed, those meshes
      // reached Three with no "uv" attribute at all, so the crowd sampled the
      // atlas at (0,0) and the spectators never appeared.
      0xb67dc4be: "crowdUV",
      0x1aefe524: "_unknown",
      0x14071d1e: "_unknown",
      0x1589348f: "_unknown",
      0x1aaf7631: "_unknown",
      // Lightmap atlas coordinates: present on 909 lightmapped meshes and on no
      // mesh without one, never a duplicate of the diffuse set, and 94% of them
      // stay inside [0,1] as an atlas must. Distinct from 0xdb7b4546, which is
      // also called Uv2 but duplicates the diffuse set on 21 of its 29 meshes.
      0x26a7b665: "Lightmap_uv",
      0x2d94f2bc: "_unknown",
      0x3a889b0b: "_unknown",
      0x4487cbd4: "_unknown",
      0x5627d701: "_unknown",
      0x0641512d: "smokeUVs",
      0x6ca4e3cc: "diffuseUVs",
      0x6de8d5b2: "_unknown",
      0x7137c8f8: "_unknown",
      0x7e7d9311: "_unknown",
      0x875926de: "_unknown",
      0xab616fd7: "_unknown",
      0xb0528e1e: "_unknown",
      0xb28abe47: "_unknown",
      0xc3602a42: "_unknown",
      0xce5cd9d9: "_unknown",
      0xd021dd49: "_unknown",
      0x0e7ea5a8: "_unknown",
      0xf55b5a02: "_unknown",
    };

    let ret = new RcsModelMeshInfo();
    ret.range = range.slice(0, 144);
    ret.count = ret.range.getUint8(0);
    ret.align = ret.range.getUint8(1);
    for (let i = 0; i < ret.count; i++) {
      const id = ret.range.getUint32(4 + 8 * i + 0);
      const info = {
        id,
        name: id2name[id],
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
  /**
   * Vertex streams by NAME, kept for existing callers and for debugging.
   *
   * It cannot represent a stream whose id we have no name for: every such
   * stream lands on the same `"_unknown"` key and all but the last is lost.
   * Prefer `byId`, which is always complete.
   */
  attributes: { [name: string]: number[] } = {};
  /**
   * Vertex streams by their raw 32-bit id -- the file's own identity for them.
   *
   * The id is the identity; a name is debug metadata we may or may not have
   * recovered. Keying off names cost us real geometry: 1360 crowd meshes lost
   * their UVs because 0xb67dc4be had no entry in the lookup table, and 192 more
   * lost theirs to names the loader's alias list did not happen to include.
   * See core/formats/rcs/ids.ts.
   */
  byId = new Map<number, number[]>();
  /** The stride record each id came from, for its element type and for debugging. */
  strideById = new Map<number, StrideInfo>();

  static load(range: BufferRange, info: RcsModelMeshInfo, count: number): RcsModelVBO {
    let ret = new RcsModelVBO();
    ret.range = range.slice(0, count * info.align);

    for (const stride of info.strides) {
      let values: number[] = [];

      if (stride.type == 0x16) {
        // Packed normal: signed 10/11/11, x in the top 10 bits. Each field is
        // two's complement and scales by its own half range.
        //
        // Read as unsigned 11/11/10 only 1.6% of normals come out unit length
        // and the mean length is 1.7; with this layout 98.8% are unit and the
        // mean is 0.989. The wrong layout left every component positive, which
        // holds the lighting term near-constant and renders lit surfaces black
        // while an unlit material still shows the texture.
        const signExtend = (value: number, bits: number) => (value << (32 - bits)) >> (32 - bits);
        for (let i = 0; i < count; i++) {
          const offset = i * info.align + stride.offset;
          const u = ret.range.getUint32(offset + 0);
          const x = signExtend((u >>> 22) & 0x3ff, 10) / 511.0;
          const y = signExtend((u >>> 11) & 0x7ff, 11) / 1023.0;
          const z = signExtend((u >>> 0) & 0x7ff, 11) / 1023.0;
          values.push(x, y, z);
        }
      }

      if (stride.type == 0x22) {
        for (let i = 0; i < count; i++) {
          const offset = i * info.align + stride.offset;
          const r = ret.range.getFloat16(offset + 0);
          const g = ret.range.getFloat16(offset + 2);
          const b = ret.range.getFloat16(offset + 4);
          const a = ret.range.getFloat16(offset + 6);
          values.push(r, g, b, a);
        }
      }
      if (stride.type == 0x23) {
        for (let i = 0; i < count; i++) {
          const offset = i * info.align + stride.offset;
          const u = ret.range.getFloat16(offset + 0);
          const v = ret.range.getFloat16(offset + 2);
          values.push(u, v);
        }
      }
      if (stride.type == 0x35) {
        for (let i = 0; i < count; i++) {
          const offset = i * info.align + stride.offset;
          const x = ret.range.getInt16(offset + 0);
          const y = ret.range.getInt16(offset + 2);
          const z = ret.range.getInt16(offset + 4);
          values.push(x, y, z);
        }
      }
      if (stride.type == 0x42) {
        for (let i = 0; i < count; i++) {
          const offset = i * info.align + stride.offset;
          // 16 bytes ???
          const r = ret.range.getFloat32(offset + 0);
          const g = ret.range.getFloat32(offset + 4);
          const b = ret.range.getFloat32(offset + 8);
          const a = ret.range.getFloat32(offset + 12);
          values.push(r, g, b, a);
        }
      }
      if (stride.type == 0x43) {
        for (let i = 0; i < count; i++) {
          const offset = i * info.align + stride.offset;
          const r = ret.range.getUint8(offset + 0);
          const g = ret.range.getUint8(offset + 1);
          const b = ret.range.getUint8(offset + 2);
          const a = ret.range.getUint8(offset + 3);
          values.push(r, g, b, a);
        }
      }
      if (stride.type == 0x44) {
        // Four bytes, but the range depends on what they hold. A colour is
        // unsigned [0, 1]; a tangent is stored unsigned and unbiased by the
        // vertex program (`MAD R0, v2, c464.x, -c464.y`), so it is unpacked
        // here instead. Read as a colour, tangents cluster around 0.5 -- a
        // degenerate frame, 17.1% unit length against 99.2% unpacked -- which
        // leaves normalMap sampling a flat surface and drives lit materials
        // black.
        // Keyed on the id, not the spelling: a variant naming this stream
        // differently would otherwise skip the unpack silently and render as a
        // degenerate tangent frame.
        const signed = stride.id == Stride.tangent;
        for (let i = 0; i < count; i++) {
          const offset = i * info.align + stride.offset;
          const r = ret.range.getUint8(offset + 0) / 255.0;
          const g = ret.range.getUint8(offset + 1) / 255.0;
          const b = ret.range.getUint8(offset + 2) / 255.0;
          const a = ret.range.getUint8(offset + 3) / 255.0;
          if (signed) values.push(r * 2 - 1, g * 2 - 1, b * 2 - 1, a * 2 - 1);
          else values.push(r, g, b, a);
        }
      }

      if (values.length == 0) {
        console.warn(`Unexpected stride type: 0x${stride.type.toString(16)}`);
        continue;
      }

      ret.attributes[stride.name] = values;
      ret.byId.set(stride.id, values);
      ret.strideById.set(stride.id, stride);
    }
    return ret;
  }

  has(name: string) {
    return this.attributes.hasOwnProperty(name);
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

  static canLoad(buffer: ArrayBuffer): boolean {
    // PS3 format has no magic — detected by exclusion (not PS5)
    if (buffer.byteLength < 4) return false;
    const view = new DataView(buffer);
    return view.getUint32(0, true) !== 0xca5caded;
  }

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
