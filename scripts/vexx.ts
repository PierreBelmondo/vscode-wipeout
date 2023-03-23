import * as fs from "fs";

import { BufferRange } from "@core/utils/range";
import { Vexx } from "@core/formats/vexx";
import { VexxNode } from "@core/formats/vexx/node";
import { VexxNodeMesh } from "@core/formats/vexx/v4/mesh";

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
  const vexx = Vexx.load(arrayBuffer);
  const output = new Output();

  const config = {
   
  };

  function dumpNode(node: VexxNode) {
    output.push()
    output.h2(node.name, node.range);
    output.log("Type:       " + node.typeName)
    output.log("Children:   " + node.children.length)

    if (node instanceof VexxNodeMesh) {
      output.log("Chunks:     " + node.chunkLinks.length);
      output.log("externalId: " + node.externalId);
      output.br();

      for (const chunkLink of node.chunkLinks) {
        output.push()
        output.h2("Chunk", chunkLink.range);
        output.log("Quat1?:    " + JSON.stringify(chunkLink.maybe_quat1));
        output.log("Quat2?:    " + JSON.stringify(chunkLink.maybe_quat2));
        output.log("UV?:       " + JSON.stringify(chunkLink.maybe_uv));
        output.log("Unknown:   " + chunkLink.unknown3);
        output.log("Unknown:   " + chunkLink.range.getUint8Array(0, chunkLink.range.size));
        output.br();
        output.pop();
      }
    }

    node.forEach(dumpNode);
    output.pop();
  }

  output.h1(filename);
  vexx.root.forEach(dumpNode)
}

main(process.argv);
