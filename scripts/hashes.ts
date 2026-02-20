import * as fs from "fs";
import * as nodepath from "path";
import { Command } from "commander";
import { crc32 } from "@core/utils/crc32";
import { Wad } from "@core/formats/wad";

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

// Detects entries whose filename stem is just the hash encoded as hex (confidence=0 placeholder),
// regardless of subdirectory prefix or file extension.
function isPlaceholder(filename: string): boolean {
  const base = filename.split("/").pop() ?? "";
  const stem = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
  return /^[0-9A-Fa-f]{7,8}$/.test(stem);
}

function verifyDatabase(tables: Table[], fix = false) {
  let totalEntries = 0;
  let knownEntries = 0;
  let unknownEntries = 0;
  const invalid: Array<{ table: Table; file: TableDataEntry; wad: TableDataWad }> = [];

  for (const table of tables) {
    let tableKnown = 0;
    let tableUnknown = 0;
    let tableInvalid = 0;

    for (const wad of table.data.wads) {
      for (const file of wad.files) {
        totalEntries++;
        if (isPlaceholder(file.filename)) {
          unknownEntries++;
          tableUnknown++;
        } else if (rehash(file.filename) === file.hash) {
          knownEntries++;
          tableKnown++;
        } else {
          invalid.push({ table, file, wad });
          tableInvalid++;
          totalEntries--; // don't double-count in totals
        }
      }
    }

    const flag = tableInvalid > 0 ? "  !" : "";
    console.log(`  ${table.data.code.padEnd(32)} ${String(tableKnown).padStart(5)} known  ${String(tableUnknown).padStart(5)} unknown${flag}`);
  }

  // ── Detect same hash with conflicting placeholder names across tables ───────
  // For each placeholder hash, track the longest filename seen (most informative dir prefix).
  const bestPlaceholder = new Map<number, string>(); // hash → longest placeholder filename
  for (const table of tables)
    for (const wad of table.data.wads)
      for (const file of wad.files)
        if (isPlaceholder(file.filename)) {
          const best = bestPlaceholder.get(file.hash);
          if (!best || file.filename.length > best.length)
            bestPlaceholder.set(file.hash, file.filename);
        }

  const conflicting: Array<{ table: Table; file: TableDataEntry }> = [];
  for (const table of tables)
    for (const wad of table.data.wads)
      for (const file of wad.files)
        if (isPlaceholder(file.filename)) {
          const best = bestPlaceholder.get(file.hash)!;
          if (file.filename.toLowerCase() !== best.toLowerCase())
            conflicting.push({ table, file });
        }

  const total = totalEntries + invalid.length;
  const mergedHashes = mergeTables(tables);
  const uniqueKnown = [...mergedHashes.values()].filter(f => !isPlaceholder(f)).length;
  const uniqueUnknown = mergedHashes.size - uniqueKnown;

  console.log(`
Overall
  Tables:         ${tables.length}
  Total entries:  ${total}
  Known:          ${knownEntries}  (${((knownEntries / total) * 100).toFixed(1)}%)
  Unknown:        ${unknownEntries}  (${((unknownEntries / total) * 100).toFixed(1)}%)
  Invalid:        ${invalid.length}
  Conflicting:    ${conflicting.length}
  Unique hashes:  ${mergedHashes.size}  (${uniqueKnown} resolved, ${uniqueUnknown} placeholder)`);

  if (conflicting.length > 0) {
    console.log(`\nConflicting placeholders (will unify to longest):`);
    for (const { table, file } of conflicting)
      console.log(`  ${table.data.code}: ${file.filename}  →  ${bestPlaceholder.get(file.hash)}`);
    if (fix) {
      const dirtyTables = new Set<Table>();
      for (const { table, file } of conflicting) {
        file.filename = bestPlaceholder.get(file.hash)!;
        dirtyTables.add(table);
      }
      for (const t of dirtyTables)
        t.save(__dirname + "/hashes/" + t.data.code + ".json");
      console.log(`Fixed ${conflicting.length} conflicting entries across ${dirtyTables.size} file(s).`);
    }
  }

  if (invalid.length === 0) return;

  console.log(`\nInvalid entries:`);
  for (const { table, wad, file } of invalid) {
    const dir = file.filename.includes("/") ? file.filename.slice(0, file.filename.lastIndexOf("/") + 1) : "Data/";
    const placeholder = `${dir}${phash(file.hash).toUpperCase()}`;
    console.log(`  ${table.data.code}/${wad.path}: ${phash(file.hash)} "${file.filename}" → "${placeholder}"`);
  }

  if (!fix) return;

  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`\nReplace all ${invalid.length} invalid entries with placeholders? [y/N] `, (answer: string) => {
    rl.close();
    if (answer.toLowerCase() !== "y") {
      console.log("Aborted.");
      return;
    }

    const dirtyTables = new Set<Table>();
    for (const { table, file } of invalid) {
      const dir = file.filename.includes("/") ? file.filename.slice(0, file.filename.lastIndexOf("/") + 1) : "Data/";
      file.filename = `${dir}${phash(file.hash).toUpperCase()}`;
      file.confidence = 0;
      dirtyTables.add(table);
    }
    for (const table of dirtyTables) {
      table.save(__dirname + "/hashes/" + table.data.code + ".json");
    }
    console.log(`Fixed ${invalid.length} entries across ${dirtyTables.size} file(s).`);
  });
}

function resolveInteractive(tables: Table[]) {
  type Entry = { file: TableDataEntry; table: Table };
  const byHash = new Map<number, Entry[]>();
  for (const table of tables) {
    for (const wad of table.data.wads) {
      for (const file of wad.files) {
        if (isPlaceholder(file.filename)) {
          if (!byHash.has(file.hash)) byHash.set(file.hash, []);
          byHash.get(file.hash)!.push({ file, table });
        }
      }
    }
  }

  console.log(`Database has ${byHash.size} unique unresolved hashes.`);
  console.log(`Type a filename to test it. Type "quit" or press Ctrl+D to exit.\n`);

  const readline = require("readline") as typeof import("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  type PendingMatch = { hash: number; filename: string; entries: Entry[] };
  let pending: PendingMatch | null = null;

  const prompt = () => rl.question(pending ? "apply? [y/N] " : "filename> ", onLine);

  const onLine = (input: string) => {
    input = input.trim();

    if (pending) {
      if (input.toLowerCase() === "y") {
        const dirty = new Set<Table>();
        for (const { file, table } of pending.entries) {
          file.filename = pending.filename;
          file.confidence = 9;
          dirty.add(table);
        }
        for (const table of dirty) {
          table.save(__dirname + "/hashes/" + table.data.code + ".json");
        }
        byHash.delete(pending.hash);
        console.log(`  → Updated ${pending.entries.length} entry(ies) across ${dirty.size} file(s). ${byHash.size} unresolved remaining.\n`);
      } else {
        console.log(`  Skipped.\n`);
      }
      pending = null;
      prompt();
      return;
    }

    if (!input || input === "quit" || input === "exit") {
      rl.close();
      return;
    }

    const hash = rehash(input);
    const entries = byHash.get(hash);

    if (!entries) {
      console.log(`  ${phash(hash)} — no match\n`);
      prompt();
      return;
    }

    const codes = [...new Set(entries.map(e => e.table.data.code))];
    console.log(`  MATCH  ${phash(hash)}  "${input}"  (${entries.length} occurrence(s) in: ${codes.join(", ")})`);
    pending = { hash, filename: input, entries };
    prompt();
  };

  rl.on("close", () => console.log(`\nSession ended. ${byHash.size} unresolved hash(es) remaining.`));

  prompt();
}

function resolveFromStdin(tables: Table[], skipConfirm: boolean) {
  // Index every placeholder entry by hash so we can update them all when a match is found
  type Entry = { file: TableDataEntry; table: Table };
  const byHash = new Map<number, Entry[]>();
  for (const table of tables) {
    for (const wad of table.data.wads) {
      for (const file of wad.files) {
        if (isPlaceholder(file.filename)) {
          if (!byHash.has(file.hash)) byHash.set(file.hash, []);
          byHash.get(file.hash)!.push({ file, table });
        }
      }
    }
  }

  console.log(`Database has ${byHash.size} unique unresolved hashes. Reading filenames from stdin…\n`);

  const readline = require("readline") as typeof import("readline");
  const rl = readline.createInterface({ input: process.stdin });

  type Match = { hash: number; filename: string; entries: Entry[] };
  const matches: Match[] = [];

  rl.on("line", (line: string) => {
    const filename = line.trim();
    if (!filename) return;

    const hash = rehash(filename);
    const entries = byHash.get(hash);
    if (!entries) return;

    const tables = new Set(entries.map(e => e.table.data.code));
    console.log(`  MATCH  ${phash(hash)}  "${filename}"  (${entries.length} occurrence(s) in: ${[...tables].join(", ")})`);
    matches.push({ hash, filename, entries });
    byHash.delete(hash); // prevent duplicate matches for the same hash
  });

  rl.on("close", () => {
    if (matches.length === 0) {
      console.log("No matches found.");
      return;
    }

    const totalOccurrences = matches.reduce((n, m) => n + m.entries.length, 0);
    console.log(`\n${matches.length} match(es) covering ${totalOccurrences} database entry(ies).`);

    const applyChanges = () => {
      const dirty = new Set<Table>();
      for (const { filename, entries } of matches) {
        for (const { file, table } of entries) {
          file.filename = filename;
          file.confidence = 9;
          dirty.add(table);
        }
      }
      for (const table of dirty) {
        table.save(__dirname + "/hashes/" + table.data.code + ".json");
      }
      console.log(`Updated ${totalOccurrences} entry(ies) across ${dirty.size} file(s).`);
    };

    if (skipConfirm) {
      applyChanges();
      return;
    }

    // stdin is exhausted — open /dev/tty directly for the confirmation prompt
    try {
      const ttyIn = fs.createReadStream("/dev/tty");
      const rl2 = readline.createInterface({ input: ttyIn, output: process.stdout });
      rl2.question(`Apply all ${matches.length} change(s)? [y/N] `, (answer: string) => {
        rl2.close();
        if (answer.toLowerCase() === "y") applyChanges();
        else console.log("Aborted.");
      });
    } catch {
      console.log("Cannot open /dev/tty for confirmation. Use --yes to apply without prompting.");
    }
  });
}

function bruteforceFilenames(tables: Table[], window: number) {
  // ── Incremental CRC32 — table built once, same algorithm as @core/utils/crc32
  // The library rebuilds its table on every call, so we copy the table-building
  // logic here to run it only once, then do inline processing.
  function reflect(x: number, n: number) {
    let b = 0;
    while (n) { b = b * 2 + (x % 2); x = Math.floor(x / 2); n--; }
    return b;
  }
  const poly = 0x04c11db7;
  const _t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let t = reflect(i, 8) * (1 << 24);
    for (let j = 0; j < 8; j++) t = ((t * 2) ^ (((t >>> 31) & 1) * poly)) >>> 0;
    _t[i] = reflect(t, 32);
  }
  // crcState: process string from init, return raw state (no final XOR)
  const crcState = (s: string, init = 0): number => {
    let crc = init;
    for (let i = 0; i < s.length; i++) crc = ((crc >>> 8) ^ _t[(crc ^ s.charCodeAt(i)) & 0xFF]) >>> 0;
    return crc;
  };
  const crcFull = (s: string, init = 0) => (crcState(s, init) ^ 0xFFFFFFFF) >>> 0;

  // ── Extract patterns from resolved DB entries ─────────────────────────────
  // Maps: lowercase key → original-case value (first seen wins)
  const resolved = [...mergeTables(tables).values()].filter(f => !isPlaceholder(f));

  const knownDirs  = new Map<string, string>(); // lc dir  → original dir
  const knownBases = new Map<string, string>(); // lc base → original base
  const knownExts  = new Map<string, string>(); // lc ext  → original ext

  for (const f of resolved) {
    const slash = f.lastIndexOf("/");
    if (slash < 0) continue;
    const dir  = f.slice(0, slash);
    const base = f.slice(slash + 1);
    if (!knownDirs.has(dir.toLowerCase()))  knownDirs.set(dir.toLowerCase(), dir);
    if (!knownBases.has(base.toLowerCase())) knownBases.set(base.toLowerCase(), base);
    const dot = base.lastIndexOf(".");
    if (dot >= 0) {
      const ext = base.slice(dot);
      if (!knownExts.has(ext.toLowerCase())) knownExts.set(ext.toLowerCase(), ext);
    }
  }

  // Placeholder dirs are also valid candidate directories
  for (const table of tables)
    for (const wad of table.data.wads)
      for (const file of wad.files)
        if (isPlaceholder(file.filename)) {
          const slash = file.filename.lastIndexOf("/");
          if (slash >= 0) {
            const dir = file.filename.slice(0, slash);
            if (!knownDirs.has(dir.toLowerCase())) knownDirs.set(dir.toLowerCase(), dir);
          }
        }

  // Cross-product: every known stem × every known extension
  const nativeBases = knownBases.size;
  for (const [lcBase, origBase] of [...knownBases]) {
    const dot  = lcBase.lastIndexOf(".");
    const lcStem   = dot >= 0 ? lcBase.slice(0, dot)   : lcBase;
    const origStem = dot >= 0 ? origBase.slice(0, dot) : origBase;
    for (const [lcExt, origExt] of knownExts) {
      const lcNew = lcStem + lcExt;
      if (!knownBases.has(lcNew)) knownBases.set(lcNew, origStem + origExt);
    }
  }

  console.log(`Patterns: ${knownDirs.size} dirs, ${knownBases.size} basenames` +
    ` (${nativeBases} native + ${knownBases.size - nativeBases} cross-product,` +
    ` ${knownExts.size} extensions)`);

  // ── Collect placeholder context: neighbor dirs & extensions per unique hash ─
  type PlaceholderCtx = {
    neighborDirs: Set<string>;
    neighborExts: Set<string>;
    count: number;
    hint: string;   // existing placeholder filename (may carry a useful dir prefix)
    candidates: Array<{ path: string; score: number; tags: string[] }>;
  };
  const byHash = new Map<number, PlaceholderCtx>();

  for (const table of tables) {
    for (const wad of table.data.wads) {
      const files = wad.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!isPlaceholder(file.filename)) continue;

        let ctx = byHash.get(file.hash);
        if (!ctx) {
          const slash = file.filename.lastIndexOf("/");
          const hintDir = slash >= 0 ? file.filename.slice(0, slash).toLowerCase() : "";
          byHash.set(file.hash, ctx = {
            neighborDirs: new Set(hintDir ? [hintDir] : []),
            neighborExts: new Set(),
            count: 0,
            hint: file.filename,
            candidates: [],
          });
        }
        ctx.count++;

        for (let j = Math.max(0, i - window); j <= Math.min(files.length - 1, i + window); j++) {
          if (j === i || isPlaceholder(files[j].filename)) continue;
          const nb = files[j].filename.toLowerCase();
          const slash = nb.lastIndexOf("/");
          if (slash >= 0) ctx.neighborDirs.add(nb.slice(0, slash));
          const base = nb.slice(slash + 1);
          const dot  = base.lastIndexOf(".");
          if (dot >= 0) ctx.neighborExts.add(base.slice(dot));
        }
      }
    }
  }

  // ── Precompute per-dir CRC32 intermediate state ───────────────────────────
  // ── Precompute per-dir CRC32 intermediate state ───────────────────────────
  // key = lc dir, value = [original dir, raw crc state after "lcdir/"]
  const dirStates = new Map<string, [string, number]>();
  for (const [lcDir, origDir] of knownDirs)
    dirStates.set(lcDir, [origDir, crcState(lcDir + "/")]);

  // ── Forward scan: iterate combinations, check against placeholder set ─────
  const totalCombos = knownDirs.size * knownBases.size;
  console.log(`Scanning ${knownDirs.size} × ${knownBases.size}` +
    ` = ${totalCombos.toLocaleString()} combinations against ${byHash.size} placeholder hashes…`);

  for (const [lcDir, [origDir, dirCrc]] of dirStates) {
    for (const [lcBase, origBase] of knownBases) {
      const hash = crcFull(lcBase, dirCrc);
      const ctx = byHash.get(hash);
      if (!ctx) continue;

      const lcExt   = lcBase.includes(".") ? lcBase.slice(lcBase.lastIndexOf(".")) : "";
      const score = (ctx.neighborDirs.has(lcDir) ? 2 : 0) + (ctx.neighborExts.has(lcExt) ? 1 : 0);
      const tags  = [
        ctx.neighborDirs.has(lcDir) ? "neighbor-dir" : "",
        ctx.neighborExts.has(lcExt) ? "neighbor-ext" : "",
      ].filter(Boolean);
      ctx.candidates.push({ path: `${origDir}/${origBase}`, score, tags });
    }
  }

  // ── Display results ───────────────────────────────────────────────────────
  let foundCount = 0;
  for (const [hash, ctx] of byHash) {
    if (!ctx.candidates.length) continue;
    ctx.candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

    foundCount++;
    const mult = ctx.count > 1 ? ` ×${ctx.count}` : "";
    console.log(`  ${phash(hash)}${mult}  (placeholder: ${ctx.hint})`);
    for (const { path, tags } of ctx.candidates) {
      const tagStr = tags.length ? `  [${tags.join(", ")}]` : "";
      console.log(`    → ${path}${tagStr}`);
    }
  }

  console.log(`\nCandidates found for ${foundCount} / ${byHash.size} placeholder hashes.`);
  if (foundCount > 0) console.log(`Note: CRC32 has ~1 in 4 billion false-positive rate — verify candidates before committing.`);
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  new Uint8Array(ab).set(buffer);
  return ab;
}

function scanDirectory(dirPath: string, knownHashes: Map<number, string>) {
  const allFiles = getAllFiles(dirPath);
  const wadFiles = allFiles.filter(f => f.toLowerCase().endsWith(".wad"));

  console.log(`Found ${wadFiles.length} WAD file(s) in ${dirPath}\n`);

  let totalEntries = 0;
  let totalUncovered = 0;

  for (const wadPath of wadFiles) {
    let wad: Wad;
    try {
      const buffer = fs.readFileSync(wadPath);
      wad = Wad.load(toArrayBuffer(buffer));
    } catch (e) {
      console.log(`${wadPath}: error - ${e.message}`);
      continue;
    }

    const missing: number[] = [];
    for (const file of wad.files) {
      totalEntries++;
      if (!knownHashes.has(file.hash)) {
        missing.push(file.hash);
        totalUncovered++;
      }
    }

    if (missing.length > 0) {
      console.log(`${wadPath}: ${missing.length}/${wad.files.length} uncovered`);
      for (const hash of missing) {
        console.log(`  ${phash(hash)}`);
      }
    } else {
      console.log(`${wadPath}: all ${wad.files.length} entries covered`);
    }
  }

  console.log(`\nTotal: ${totalUncovered} uncovered out of ${totalEntries} entries across ${wadFiles.length} WAD file(s)`);
}

const program = new Command();

program
  .name("hashes")
  .description("WAD hash database management tool");

program
  .command("import")
  .description("Import filenames from a text file into the hash tables")
  .argument("[filenames]", "path to filenames.txt", __dirname + "/filenames.txt")
  .action((filenames: string) => {
    const tables = loadTables();
    const hashes = loadFilenames(filenames);
    validateHash(hashes);
    importHashes(tables, hashes);
  });

program
  .command("bruteforce")
  .description("Try to guess placeholder filenames using known patterns and incremental CRC32 (read-only)")
  .option("-w, --window <n>", "neighbor window size for directory/extension hints", "10")
  .action((options: { window: string }) => {
    const tables = loadTables();
    bruteforceFilenames(tables, parseInt(options.window));
  });

program
  .command("resolve")
  .description("Read filenames from stdin, match against placeholder hashes, and update the database")
  .option("-i, --interactive", "interactive mode: type filenames one at a time")
  .option("-y, --yes", "apply changes without confirmation (batch mode only)")
  .action((options: { interactive?: boolean; yes?: boolean }) => {
    const tables = loadTables();
    if (options.interactive) resolveInteractive(tables);
    else resolveFromStdin(tables, options.yes ?? false);
  });

program
  .command("verify")
  .description("Verify hash integrity and print database statistics")
  .option("--fix", "interactively replace invalid entries with placeholders")
  .action((options: { fix?: boolean }) => {
    const tables = loadTables();
    verifyDatabase(tables, options.fix ?? false);
  });

program
  .command("generate")
  .description("Merge all hash tables and emit src/core/wad/hashes.ts")
  .action(() => {
    const tables = loadTables();
    const hashes = mergeTables(tables);
    validateHash(hashes);
    outputHashes(hashes, __dirname + "/../src/core/wad/hashes.ts");
  });

program
  .command("scan <directory>")
  .description("Recursively scan a directory for WAD files and report hashes not covered by the database")
  .action((directory: string) => {
    const tables = loadTables();
    const knownHashes = mergeTables(tables);
    scanDirectory(directory, knownHashes);
  });

program
  .command("hash <filename>")
  .description("Compute the CRC32 hash of a filename as used in WAD files")
  .action((filename: string) => {
    const hash = rehash(filename);
    console.log(`${filename} => ${phash(hash)}`);
  });

program
  .command("register <wad>")
  .description("Create a hash database JSON entry for a WAD file")
  .option("-c, --code <code>", "identifier for the JSON file (default: parent directory name)")
  .option("-n, --name <name>", "human-readable name for this entry")
  .action((wadPath: string, options: { code?: string; name?: string }) => {
    const resolved = nodepath.resolve(wadPath);
    const code = options.code ?? nodepath.basename(nodepath.dirname(resolved));
    const name = options.name ?? code;

    const outPath = nodepath.join(__dirname, "hashes", code + ".json");
    if (fs.existsSync(outPath)) {
      console.error(`${outPath} already exists — delete it first or choose a different --code`);
      process.exit(1);
    }

    const tables = loadTables();
    const knownHashes = mergeTables(tables);

    let wad: Wad;
    try {
      const buffer = fs.readFileSync(resolved);
      wad = Wad.load(toArrayBuffer(buffer));
    } catch (e) {
      console.error(`Error reading WAD: ${(e as Error).message}`);
      process.exit(1);
    }

    const files = wad.files.map(file => ({
      hash: file.hash,
      filename: knownHashes.get(file.hash) ?? `Data/${phash(file.hash).toUpperCase()}`,
      confidence: 0,
    }));

    const covered = files.filter(f => knownHashes.has(f.hash)).length;

    const db: TableData = {
      code,
      name,
      wads: [{ path: nodepath.basename(resolved), files }],
    };

    fs.writeFileSync(outPath, JSON.stringify(db, undefined, 2));
    console.log(`Saved ${outPath}: ${covered}/${files.length} filenames resolved`);
  });

program.parse(process.argv);
