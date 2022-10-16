import * as fs from "fs";
import { crc32 } from "../core/utils/crc32";

function rehash(filename: string): number {
  return crc32(filename.replace("\\", "/").toLowerCase());
}

function phash(hash: number): string {
  let hash_str = hash.toString(16);
  const pad = "0".repeat(8 - hash_str.length);
  return `${pad}${hash_str}`;
}

type TableDataEntry = {
  hash: number;
  filename: string;
  confidence: number;
};

type TableDataWad = {
  path: string;
  files: TableDataEntry[];
};

type TableData = {
  code: string;
  name: string;
  wads: TableDataWad[];
};

class Table {
  data: TableData;

  load(filename: string) {
    console.log(`Loading file ${filename}`);
    const rawdata = fs.readFileSync(filename);
    this.data = JSON.parse(rawdata.toString("utf8"));
  }

  save(filename: string) {
    console.log(`Saving file ${filename}`);
    const rawdata = JSON.stringify(this.data, undefined, 2);
    fs.writeFileSync(filename, rawdata);
  }

  import(hashes: Map<number, string>, ask: (options: string[]) => number) {
    for (const wad of this.data.wads) {
      for (const file of wad.files) {
        if (hashes.has(file.hash)) {
          if (file.filename.toUpperCase() != hashes.get(file.hash).toUpperCase()) {
            const choices = [file.filename, hashes.get(file.hash)];
            const choice = ask(choices);
            file.filename = choices[choice];
          }
        }
      }
    }
  }

  dump() {
    for (const wad of this.data.wads) {
      for (const file of wad.files) {
        console.log(`${phash(file.hash)}: ${file.filename}`);
      }
    }
  }
}

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

function loadTables() {
  const tables: Table[] = [];
  const filenames = getAllFiles(__dirname + "/hashes");
  for (const filename of filenames) {
    const table = new Table();
    table.load(filename);
    tables.push(table);
  }
  return tables;
}

function mergeTables(tables: Table[]) {
  const hashes = new Map<number, string>();
  for (const table of tables) {
    console.log(`Merging ${table.data.name}`);
    for (const wad of table.data.wads) {
      for (const file of wad.files) {
        if (hashes.has(file.hash)) {
          if (file.filename == hashes.get(file.hash)) continue;
          console.log(`${file.hash}:${file.filename}  ${hashes.get(file.hash)}`);
        }
        hashes.set(file.hash, file.filename);
      }
    }
  }
  return hashes;
}

function outputHashes(hashes: Map<number, string>, filename: string) {
  let content = "";

  hashes.forEach((filename, hash) => {
    let hash_str = hash.toString(16);
    hash_str = "0".repeat(8 - hash_str.length) + hash_str;
    content += `\t0x${hash_str}: "${filename}",\n`;
  });

  content = `export const WAD_HASHMAP = {\n${content}};
  
  export function filenameFromHash(hash: number) {
      if (hash in WAD_HASHMAP)
          return WAD_HASHMAP[hash];
      let hash_str = hash.toString(16);
      const pad = '0'.repeat(8 - hash_str.length);
      return \`Data/\${pad}\${hash_str}\`;
  }
  `;
  fs.writeFileSync(filename, content);
}

function loadFilenames(filename = __dirname + "/filenames.txt") {
  console.log(`Loading filenames from ${filename}`);
  const hashes = new Map<number, string>();
  const rawdata = fs.readFileSync(filename);
  const filenames = rawdata.toString("utf-8").split("\n");
  for (const filename of filenames) {
    const hash = rehash(filename);
    hashes.set(hash, filename);
  }
  return hashes;
}

function importHashes(tables: Table[], hashes: Map<number, string>) {
  for (const table of tables) {
    console.log(`Fixing table ${table.data.code} (${table.data.name})`);
    table.import(hashes, (choices) => {
      console.log(choices);
      return 1;
    });
    table.save(__dirname + "/hashes/" + table.data.code + ".json");
  }
}

function validateHash(hashes: Map<number, string>) {
  hashes.forEach((filename, hash) => {
    if (rehash(filename) != hash) console.log(`Filename ${filename} has wrong hash`);
  });
}

let command = process.argv[2];

switch (command) {
  case "import": {
    const tables = loadTables();
    const hashes = loadFilenames();
    validateHash(hashes);
    importHashes(tables, hashes);
    break;
  }
  case "generate": {
    const tables = loadTables();
    const hashes = mergeTables(tables);
    validateHash(hashes);
    outputHashes(hashes, __dirname + "/../src/core/wad/hashes.ts");
    break;
  }
}
