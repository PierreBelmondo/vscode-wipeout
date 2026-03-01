import * as fs from "fs";

import { Vexx } from "@core/formats/vexx";
import { Vexx4NodeType } from "@core/formats/vexx/v4/type";
import { Vexx6NodeType } from "@core/formats/vexx/v6/type";
import { VexxNodeAnimTransform } from "@core/formats/vexx/v4/anim_transform";

function getAllFiles(dirPath: string): string[] {
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


function dumpAnimTransform(node: VexxNodeAnimTransform, file: string) {
  const parentDesc = node.parent ? `${node.parent.typeName} "${node.parent.name}"` : "none";
  const childTypes = node.children.map(c => c.typeName).join(", ");
  console.log(`\n=== ${node.name} (${file})  parent: ${parentDesc}  children: [${childTypes}] ===`);
  console.log(`  unk1=${node.unk1}  count1=${node.count1}  count2=${node.count2}  has_position=${node.has_position}`);
  console.log(`  track1_end=0x${node.track1_end.toString(16)}  track1_start=0x${node.track1_start.toString(16)}`);
  console.log(`  nodeHeaderSize=${node.header.size}  bodySize=${node.bodyRange.size}`);
  if (node.has_position) {
    console.log(`  position: (${node.x}, ${node.y}, ${node.z})`);
    // Decode the 20 mystery bytes after XYZ in the position block (body[28..48])
    const body = new DataView(node.bodyRange.buffer);
    const sx = body.getFloat32(32, true);
    const sy = body.getFloat32(36, true);
    const sz = body.getFloat32(40, true);
    console.log(`  scale_bytes: (${sx.toExponential(3)}, ${sy.toExponential(3)}, ${sz.toExponential(3)})`);
    console.log(`  scale*32767: (${(sx*32767).toFixed(4)}, ${(sy*32767).toFixed(4)}, ${(sz*32767).toFixed(4)})`);
    console.log(`  |pos|/32767: (${(Math.abs(node.x)/32767).toFixed(4)}, ${(Math.abs(node.y)/32767).toFixed(4)}, ${(Math.abs(node.z)/32767).toFixed(4)})`);
  }

  if (node.track1) {
    console.log(`  track1: ${node.track1.keys.length} keys, ${node.track1.values.length} values`);
    console.log(`    keys:   [${node.track1.keys.join(", ")}]`);
    // Also show raw int16 values before scaling
    const body = new DataView(node.bodyRange.buffer);
    const valStart = node.track1_start + node.count1 * 2;
    const v = node.track1.values;
    for (let i = 0; i < v.length; i += 3) {
      const ri = (i - 3) / 3;  // raw index (skip the pushed base position at i=0)
      let rawStr = "";
      if (i >= 3) {
        const rx = body.getInt16(valStart + (ri*3)*2, true);
        const ry = body.getInt16(valStart + (ri*3+1)*2, true);
        const rz = body.getInt16(valStart + (ri*3+2)*2, true);
        rawStr = ` [raw: ${rx}, ${ry}, ${rz}]`;
      }
      console.log(`    val[${i/3}]: (${v[i]?.toFixed(4)}, ${v[i+1]?.toFixed(4)}, ${v[i+2]?.toFixed(4)})${rawStr}`);
    }
  }
  if (node.track2) {
    console.log(`  track2: ${node.track2.keys.length} keys, ${node.track2.values.length} values`);
    console.log(`    keys:   [${node.track2.keys.join(", ")}]`);
    const v = node.track2.values;
    for (let i = 0; i < v.length; i += 3) {
      console.log(`    val[${i/3}]: (${v[i]?.toFixed(4)}, ${v[i+1]?.toFixed(4)}, ${v[i+2]?.toFixed(4)})`);
    }
  }
}

function makeDump(searchPath: string) {
  const files = getAllFiles(searchPath).filter((x) => x.endsWith(".vex"));

  let found = 0;
  for (const file of files) {
    const buffer = fs.readFileSync(file);
    const arraybuffer = toArrayBuffer(buffer);
    const world = Vexx.load(arraybuffer);

    function walkDeep(node: typeof world.root) {
      if (
        node.typeInfo.type == Vexx4NodeType.ANIM_TRANSFORM ||
        node.typeInfo.type == Vexx6NodeType.ANIM_TRANSFORM
      ) {
        const anim = node as VexxNodeAnimTransform;
        dumpAnimTransform(anim, file.replace(searchPath, ""));
        found++;
      }
      for (const child of node.children) walkDeep(child);
    }
    walkDeep(world.root);
  }

  console.log(`\nTotal ANIM_TRANSFORM nodes found: ${found}`);
}

const base = "../project-example/psp/pulse/us/1.00/Data";
makeDump(`${base}/Billboards`);
makeDump(`${base}/Environments`);
