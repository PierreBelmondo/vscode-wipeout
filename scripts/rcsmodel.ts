import * as fs from "fs";

import { RcsModel, RcsModelMatrix, RcsModelMesh1, RcsModelMesh5, RcsModelMeshInfo } from "@core/formats/rcs";
import { BufferRange } from "@core/utils/range";

class Output {
  private _indents: number[] = [];
  private _intentTotal: string = "";

  push(spaces: number = 2) {
    this._indents.push(spaces);
    const total = this._indents.reduce((s, a) => s + a, 0);
    this._intentTotal = " ".repeat(total);
  }

  pop() {
    this._indents.pop();
    const total = this._indents.reduce((s, a) => s + a, 0);
    this._intentTotal = " ".repeat(total);
  }

  h1(name: string) {
    this.log(name);
    this.log("=".repeat(name.length));
  }

  h2(name: string, range?: BufferRange) {
    let s = name;
    if (range) s += ` (0x${range.begin.toString(16)} => 0x${range.end.toString(16)})`;
    this.log(s);
    this.log("-".repeat(s.length));
  }

  log(text: string) {
    const lines = text.split("\n");
    for (const line of lines) console.log(`${this._intentTotal}${line}`);
  }

  br() {
    console.log();
  }
}

function buf2hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function read(path: string) {
  const buffer = fs.readFileSync(path);
  const arrayBuffer = new Uint8Array(buffer, buffer.byteOffset, buffer.byteLength);
  return arrayBuffer.buffer;
}

function main(args: string[]) {
  if (process.argv.length != 3) {
    console.log("Usage: ts-node scripts/rcsmodel.ts <filename.rcsmodel>");
    return;
  }
  const filename = args[2];

  const arrayBuffer = read(filename);
  const rcs = RcsModel.load(arrayBuffer);
  const output = new Output();

  const config = {
    header: false,
    aabb: false,
    materials: true,
    meshes: true,
    lookup: false,
    strides: true,
    matrices: false,
    strings: false,
    points: false,
  };

  output.h1(filename);
  output.log(`@begin: 0x${rcs.range.begin.toString(16)}`);
  output.log(`@end:   0x${rcs.range.end.toString(16)}`);
  output.br();

  if (config.header) {
    output.h2("Header", rcs.header.range);
    output.log(`Lookup table offset:   0x${rcs.header.lookup_table_offset.toString(16)}`);
    output.log(`Object unknown offset: 0x${rcs.header.object_unknown_table_offset.toString(16)}`);
    output.log(`Object table offset:   0x${rcs.header.object_table_offset.toString(16)}`);
    output.log(`Object count:          ${rcs.header.object_table_count}`);
    output.log(`Material table offset: 0x${rcs.header.material_table_offset.toString(16)}`);
    output.log(`Material count:        ${rcs.header.material_table_count}`);
    output.br();
  }

  if (config.aabb) {
    output.h2("AABB", rcs.object_unknown_table.range);
    output.log(`Object count:          ${rcs.object_unknown_table.values.length}`);
    output.br();
  }

  if (config.materials) {
    output.h2("Materials table", rcs.materials_table.range);
    output.log(`Object count:          ${rcs.materials_table.offsets.length}`);
    output.br();

    let id = 0;
    for (const material of rcs.materials) {
      output.h2(`Material ${id}`, material.range);
      output.log(`Filename:            ${material.filename}`);
      output.log(`Texture count:       ${material.textures_count}`);
      output.log(`Texture offset:      0x${material.textures_offset.toString(16)}`);
      output.log(`Unknown offset:      0x${material.unknown_offset.toString(16)}`);
      output.br();

      output.push();
      for (const texture of material.textures) {
        output.h2(`Texture ${texture.id}`, texture.range);
        output.log(`Filename offset:     0x${texture.offset_filename.toString(16)}`);
        output.log(`Filename:            ${texture.filename}`);
        output.log(`Type:                ${texture.type}`);
        output.br();
      }
      const unknown = material.unknown;
      output.h2(`Unknown`, unknown.range);
      output.log(`Unknown value1:      ${unknown.unknown1}`);
      output.log(`Unknown value2:      ${unknown.unknown2}`);
      output.br();
      output.pop();
      id++;
    }
  }

  if (config.meshes) {
    output.h2("Mesh offset table", rcs.objects_table.range);
    output.log(`Object count:          ${rcs.objects_table.offsets.length}`);
    for (const offset of rcs.objects_table.offsets) {
      output.log(`:                      0x${offset.toString(16)}`);
    }
    output.br();
  }

  if (config.lookup) {
    output.h2("Lookup table", rcs.lookup_table.range);
    output.log(`Items:                 ${rcs.lookup_table.values.length}`);
    output.br();
  }

  if (config.strides) {
    output.h2("Mesh info table");
    output.push();
    {
      let infos: { [offset: number]: RcsModelMeshInfo } = {};
      for (const object of rcs.objects) {
        if (object.mesh instanceof RcsModelMesh1) {
          const info = object.mesh.info;
          if (!(info.range.begin in infos)) infos[info.range.begin] = info;
        }
        if (object.mesh instanceof RcsModelMesh5) {
          const info = object.mesh.info;
          if (!(info.range.begin in infos)) infos[info.range.begin] = info;
        }
      }
      const keys = Object.keys(infos)
        .map((x) => parseInt(x))
        .sort();
      for (const key of keys) {
        const info = infos[key];
        output.h2(`Mesh-info`, info.range);
        output.log(`Object count/length:          ${info.count}/${info.align}`);
        for (const s of info.strides) {
          output.log(`id:0x${s["id"].toString(16)} align:${s["align"]} type:0x${s["type"].toString(16)} offset:${s["offset"]}`);
        }
        output.br();
      }
    }
    output.pop();
  }

  if (config.matrices) {
    let matrices: { [offset: number]: RcsModelMatrix } = {};
    for (const object of rcs.objects) {
      const matrix = object.matrix;
      if (!(matrix.range.begin in matrices)) matrices[matrix.range.begin] = matrix;
    }
    const keys = Object.keys(matrices)
      .map((x) => parseInt(x))
      .sort();
    for (const key of keys) {
      const matrix = matrices[key];
      const n = matrix.numbers;
      output.h2(`Matrix?`, matrix.range);
      output.log(`${n[0]} ${n[1]} ${n[2]} ${n[3]}`);
      output.log(`${n[4]} ${n[5]} ${n[6]} ${n[7]}`);
      output.log(`${n[8]} ${n[9]} ${n[10]} ${n[11]}`);
      output.log(`${n[12]} ${n[13]} ${n[14]} ${n[15]}`);
      output.br();
    }
  }

  if (config.strings) {
    let strings: { [offset: number]: string } = {};
    for (const material of rcs.materials) {
      const offset = material.offset_filename;
      const string = material.filename;
      if (!(offset in strings)) strings[offset] = string;
      for (const texture of material.textures) {
        const offset = texture.offset_filename;
        const string = texture.filename;
        if (offset == 0 || texture.filename.length == 0) continue;
        if (!(offset in strings)) strings[offset] = string;
      }
    }
    const keys = Object.keys(strings)
      .map((x) => parseInt(x))
      .sort();
    output.h2(`Strings`);
    for (const key of keys) {
      const string = strings[key];
      output.log(`0x${key.toString(16)} => 0x${(key + string.length).toString(16)} : ${string}`);
    }
    output.br();
  }

  if (config.meshes) {
    for (const object of rcs.objects) {
      output.h2(`Mesh ${object.header.id}`, object.header.range);
      output.log(`Unknown value1:       0x${object.header.unknown1.toString(16)}`);
      output.log(`Matrix offset?:       0x${object.header.matrix_offset.toString(16)}`);
      output.log(`Type:                 ${object.header.type}`);
      output.log(`Type ?:               ${object.header.type2}`);
      output.log(`Position:             ${object.header.position}`);
      output.log(`Scale:                ${object.header.scale}`);
      output.log(`Material ID:          0x${object.header.material_id.toString(16)}`);
      output.br();

      output.push();
      if (object.mesh instanceof RcsModelMesh1) {
        output.h2(`Mesh (type=1)`, object.mesh.range);
        output.log(`IBO offset:         0x${object.mesh.ibo_offset.toString(16)}`);
        output.log(`IBO count:          ${object.mesh.ibo_count}`);
        output.log(`VBO offset:         0x${object.mesh.vbo_offset.toString(16)}`);

        output.log(`Unknown offset:     0x${object.header.offset_unknown.toString(16)}`);
        output.br();

        output.push();
        output.h2(`IBO`, object.mesh.ibo.range);
        output.br();
        output.h2(`VBO`, object.mesh.vbo.range);
        output.br();
        output.pop();
      }
      if (object.mesh instanceof RcsModelMesh5) {
        output.h2(`Mesh (type=5)`, object.mesh.range);
        output.log(`Mesh-info offset:   0x${object.mesh.info_offset.toString(16)}`);
        output.log(`Unknown offset:     0x${object.header.offset_unknown.toString(16)}`);
        output.log(`Sub-mesh offset:    0x${object.mesh.submesh_offset.toString(16)}`);
        output.log(`Sub-mesh count:     ${object.mesh.submesh_count}`);
        output.br();

        output.push();
        for (const submesh of object.mesh.submeshes) {
          output.h2(`Sub-mesh`, submesh.range);
          output.log(`VBO offset:      0x${submesh.vbo_offset.toString(16)}`);
          output.log(`VBO count:       ${submesh.vbo_count}`);
          output.log(`IBO offset:      0x${submesh.ibo_offset.toString(16)}`);
          output.log(`IBO count:       ${submesh.ibo_count}`);
          output.br();

          output.push();
          output.h2(`VBO`, submesh.vbo.range);
          output.log("Vertices: " + submesh.vbo.vertices.length);
          output.log("UVs: " + submesh.vbo.uv.length);
          output.log("Normals: " + submesh.vbo.normals.length);
          output.log("Colors: " + submesh.vbo.rgba.length);
          if (config.points) {
            output.log("vertices: " + submesh.vbo.vertices);
            output.log("normals: " + submesh.vbo.normals);
          }
          output.br();
          output.h2(`IBO`, submesh.ibo.range);
          output.br();
          output.pop();
        }

        //output.h2(`Unknown`, object.unknown.range);
        output.pop();
      }
      output.pop();
    }
  }
}

main(process.argv);
