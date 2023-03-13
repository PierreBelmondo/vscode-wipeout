import * as fs from "fs";

import { GTF } from "@core/formats/gtf";

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

async function stats(path: string) {
  const files = getAllFiles(path).filter((x) => x.endsWith(".gtf"));
  for (const file of files) {
    console.log(file);
    const buffer = fs.readFileSync(file);
    const arraybuffer = toArrayBuffer(buffer);
    const gtf = await GTF.load(arraybuffer);
    console.log(`    Format: ${gtf.header.formatName}`);
    console.log(`      Size: ${gtf.header.width} x ${gtf.header.height}`);
    console.log(`Normalized: ${gtf.header.normalized}`);
    console.log(`   Mipmaps: ${gtf.header.mipmaps}`);
    console.log(`   Swizzle: ${gtf.header.swizzle}`);
    console.log(`        ^2: ${gtf.header.isPowerOf2}`);
    console.log(`      Cube: ${gtf.header.isCube}`);
  }
}

const path = "../project-example/ps3/hdf/data/ships/ag_systems";
stats(path);
