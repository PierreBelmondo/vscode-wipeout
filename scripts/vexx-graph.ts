import * as fs from "fs";

import { Vexx } from "@core/vexx";

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

function makeGraph(path: string) {
  let files = getAllFiles(path).filter((x) => x.endsWith(".vex"));
  files = files.slice(0, 150);

  const stats: any = {};

  for (const file of files) {
    console.log(file);
    try {
      const buffer = fs.readFileSync(file);
      const arraybuffer = toArrayBuffer(buffer);
      const world = Vexx.load(arraybuffer);

      world.traverse((node) => {
        const cName = node.typeInfo.name;
        if (node.parent === undefined) return;
        const pName = node.parent.typeInfo.name;
        if (!(pName in stats)) stats[pName] = [];
        if (stats[pName].indexOf(cName) !== -1) return;
        stats[pName].push(cName);
      });
    } catch (e) {
      console.log(e);
    }
  }

  return stats;
}

let graph = makeGraph("../project-example/psp/pure");
//let graph = makeGraph("../project-example/psp/pure/eu/1.01/Data/Ships");
//let graph = makeGraph("../project-example/psp/pulse");

console.log("digraph G {");
for (const p in graph) {
  for (const c of graph[p]) console.log(`\t${p} -> ${c}`);
}
console.log("}");
