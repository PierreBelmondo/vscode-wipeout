import * as path from "path";
import * as fs from "fs";

import { Vexx } from "../src/core/vexx";
import { Vexx4NodeType } from "../src/core/vexx/v4/type";
import { VexxNodeTexture } from "../src/core/vexx/v4/texture";
import { Vexx6NodeType } from "../src/core/vexx/v6/type";

function getAllFiles(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  let arrayOfFiles: string[] = [];
  for (const file of files) {
    const newfile = dirPath + "/" + file;
    if (fs.statSync(newfile).isDirectory()) {
      arrayOfFiles = arrayOfFiles.concat(getAllFiles(newfile));
    } else {
      arrayOfFiles.push(newfile);
    }
  }
  return arrayOfFiles;
}

function toArrayBuffer(buffer: Buffer) {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}

function buf2hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function makeStat(path: string) {
  let files = getAllFiles(path).filter((x) => x.endsWith(".vex"));
  files = files.slice(0,150);

  const stats: any = {};
  for (const file of files) {
    const buffer = fs.readFileSync(file);
    const arraybuffer = toArrayBuffer(buffer);
    const world = Vexx.load(arraybuffer);

    let textures: VexxNodeTexture[] = [];
    world.traverse((node) => {
      if (node.typeInfo.type == Vexx4NodeType.TEXTURE)
        textures.push(node as VexxNodeTexture);
      if (node.typeInfo.type == Vexx6NodeType.TEXTURE)
        textures.push(node as VexxNodeTexture);
    });

    for (const texture of textures) {
      const value = texture.properties.alphaMode;
      if (!(value in stats)) stats[value] = 0;
      stats[value]++;
    }
  }
  return stats;
}

let stats1 = makeStat("../project-example/ps2");
let stats2 = makeStat("../project-example/psp");
console.log(stats1, stats2);