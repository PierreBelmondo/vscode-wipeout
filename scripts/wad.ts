import * as fs from "fs";

import { Wad } from "@core/formats/wad";

function toArrayBuffer(buffer: Buffer) {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}

const EU_DLCS = [
  "UCES00001DA7MUSIC",
  "UCES00001DCLASSICMPAK1",
  "UCES00001DCLASSICMPAK2",
  "UCES00001DCLASSICPAK1",
  "UCES00001DCLASSICPAK2",
  "UCES00001DDELTAPAK",
  "UCES00001DGAMESRADAR",
  "UCES00001DGAMMAPAK",
  "UCES00001DOBLIVION",
  "UCES00001DOMEGAPAK",
  "UCES00001DOMEGAPAKS",
  "UCES00001DSCIFIPAK",
  "UCES00001DURBANBENELUX",
  "UCES00001DURBANFRANCE",
  "UCES00001DURBANGERMANY",
  "UCES00001DURBANITALY",
  "UCES00001DURBANSPAIN",
  "UCES00001DURBANUK",
  "UCES00001DVOCMUSIC",
];

for (const dlc of EU_DLCS) {
  const filename = "../project-example/psp/pure/eu/dlc/" + dlc + "/PI.WAD";
  const buffer = fs.readFileSync(filename);
  const arraybuffer = toArrayBuffer(buffer);

  const wad = Wad.load(arraybuffer);

  const db = {
    code: dlc,
    name: "WipEout Pure European DLC",
    wads: [
      {
        path: "PI.WAD",
        files: [],
      },
    ],
  };

  for (const file of wad.files) {
    if (file.compressed) {
      console.log(`File ${file.filename}`);
      console.log(`  Compressed: ${file.compressed}`);
      console.log(`  ${file.sizeCompressed} => ${file.sizeUncompressed} / ${file.content.byteLength}`);
      console.log(`  Valid: ${(file.sizeUncompressed & 0x7FFFFFFF) == file.content.byteLength}`);
    }
    const content = file.content;
    const entry = {
      hash: file.hash,
      filename: file.filename,
      confidence: 0,
    };
    db.wads[0].files.push(entry);
  }

  break;

  /*
  const data = JSON.stringify(db, undefined, 2);
  fs.writeFileSync("src/core/wad/db/" + dlc + ".json", data);
  */
}
