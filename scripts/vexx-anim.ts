import * as path from "path";
import * as fs from "fs";

import { Vexx } from "@core/formats/vexx";
import { Vexx4NodeType } from "@core/formats/vexx/v4/type";
import { Vexx6NodeType } from "@core/formats/vexx/v6/type";
import { VexxNodeAnimTransform } from "@core/formats/vexx/v4/anim_transform";
import { VexxNodeMatrix } from "@core/formats/vexx/node";
import { VexxNodeAbsorb } from "@core/formats/vexx/v6/absorb";
import { VexxNodeShipColisionFx } from "@core/formats/vexx/v4/ship_colision_fx";
import { VexxNodeShipMuzzle } from "@core/formats/vexx/v4/ship_muzzle";
import { VexxNodeEngineFire } from "@core/formats/vexx/v4/engine_fire";
import { VexxNodeWingTip } from "@core/formats/vexx/v6/wingtip";

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
  return [...new Uint8Array(buffer)].map((x) => " " + x.toString(16).padStart(2, "0")).join("");
}

function makeDumpMatrices(path: string) {
  let files = getAllFiles(path).filter((x) => x.endsWith(".vex"));
  files = files.slice(0, 150);

  for (const file of files) {
    console.log(file);
    const buffer = fs.readFileSync(file);
    const arraybuffer = toArrayBuffer(buffer);
    const world = Vexx.load(arraybuffer);

    let locators: VexxNodeMatrix[] = [];
    world.traverse((node) => {
      if (node.typeInfo.type == Vexx6NodeType.SHIP_COLLISION_FX) locators.push(node as VexxNodeShipColisionFx);
      if (node.typeInfo.type == Vexx6NodeType.SHIP_MUZZLE) locators.push(node as VexxNodeShipMuzzle);
      if (node.typeInfo.type == Vexx6NodeType.ENGINE_FIRE) locators.push(node as VexxNodeEngineFire);
      if (node.typeInfo.type == Vexx6NodeType.WING_TIP) locators.push(node as VexxNodeWingTip);
      if (node.typeInfo.type == Vexx6NodeType.ABSORB) locators.push(node as VexxNodeAbsorb);
    });

    for (const locator of locators) {
      console.log(locator);
    }
  }
}

function makeDump(path: string) {
  let files = getAllFiles(path).filter((x) => x.endsWith(".vex"));
  files = files.slice(0, 150);

  for (const file of files) {
    console.log(file);
    const buffer = fs.readFileSync(file);
    const arraybuffer = toArrayBuffer(buffer);
    const world = Vexx.load(arraybuffer);

    let animations: VexxNodeAnimTransform[] = [];
    world.traverse((node) => {
      if (node.typeInfo.type == Vexx4NodeType.ANIM_TRANSFORM) animations.push(node as VexxNodeAnimTransform);
      if (node.typeInfo.type == Vexx6NodeType.ANIM_TRANSFORM) animations.push(node as VexxNodeAnimTransform);
    });

    for (const animation of animations) {
      if (animation.count1 < 2)
        continue;
        console.log(`${animation.name}`);
        console.log(`unk6 = ${animation.unk6}`);
        console.log(`unk8 = ${animation.unk8}`);
        console.log(animation.track1);
        //console.log(animation.track2);
        break;
        /*
      const dump = animation.body();
      
      */
    }
  }
}

//makeDumpMatrices("../project-example/ps3/hdf/data/ships");
makeDump("../project-example/ps3/hdf/data/ships/ag_systems");
