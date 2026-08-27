/**
 * Golden-file texture tests.
 *
 *   npm run test:textures       verify decoders against the validated goldens
 *   npm run test:textures:gen   (re)generate golden PNGs for hand validation
 *
 * The workflow: `gen` decodes each curated sample (core/tests/textures/
 * manifest.ts) and writes a PNG plus a hash of the raw RGBA into golden/.
 * A human then looks at the PNGs -- that is the validation step no test can
 * replace, because the only ground truth for "does the decoder read this
 * format right" is a person recognising the picture. Once the images are
 * committed, `verify` re-decodes every sample and compares hashes: any change
 * to a decoder that alters one pixel of a validated texture fails here.
 *
 * The PNG is for eyes, the hash is for the machine. Verification never reads
 * the PNGs back, so the encoder needs no decoder and the comparison cannot be
 * fooled by an image viewer's colour management.
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { GTF } from "@core/formats/gtf";
import { DDS } from "@core/formats/dds";
import { Mipmaps } from "@core/utils/mipmaps";
import { GOLDEN_TEXTURES } from "./textures/manifest";
import { mipToRGBA } from "./textures/rgba";
import { encodePNG } from "./textures/png";
import { config } from "./config";

const GOLDEN_DIR = path.resolve(__dirname, "textures/golden");
const MANIFEST_JSON = path.join(GOLDEN_DIR, "manifest.json");

type GoldenRecord = {
  name: string;
  source: string;
  mip: number;
  face: number | null;
  type: string;
  width: number;
  height: number;
  /** SHA-256 of the decoded RGBA bytes -- the machine's half of the golden. */
  sha256: string;
};

/** Decode a sample by its extension; each format's loader owns its chain. */
function loadChains(file: string): { mipmaps: Mipmaps; faces: Mipmaps[] } {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  switch (path.extname(file).toLowerCase()) {
    case ".gtf": {
      const gtf = GTF.load(ab);
      return { mipmaps: gtf.mipmaps, faces: gtf.faces };
    }
    case ".dds":
      return { mipmaps: DDS.load(ab).mipmaps, faces: [] };
    default:
      throw new Error(`no loader for ${file}`);
  }
}

function decodeEntry(source: string, mip: number, face: number | null) {
  const file = path.join(config.root, source);
  const loaded = loadChains(file);
  const chain = face === null ? loaded.mipmaps : loaded.faces[face];
  if (!chain) throw new Error(`no ${face === null ? "mipmaps" : `face ${face}`} in ${source}`);
  const level = chain[mip];
  if (!level) throw new Error(`no mip ${mip} in ${source} (${chain.length} levels)`);
  return { level, rgba: mipToRGBA(level) };
}

function sha(rgba: Uint8ClampedArray): string {
  return crypto.createHash("sha256").update(rgba).digest("hex");
}

function generate() {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  const records: GoldenRecord[] = [];
  for (const e of GOLDEN_TEXTURES) {
    const { level, rgba } = decodeEntry(e.source, e.mip ?? 0, e.face ?? null);
    const png = encodePNG(level.width, level.height, rgba);
    fs.writeFileSync(path.join(GOLDEN_DIR, `${e.name}.png`), png);
    records.push({
      name: e.name,
      source: e.source,
      mip: e.mip ?? 0,
      face: e.face ?? null,
      type: level.type,
      width: level.width,
      height: level.height,
      sha256: sha(rgba),
    });
    console.log(`gen  ${e.name}.png  ${level.type} ${level.width}x${level.height}  (${(png.length / 1024).toFixed(1)} KiB)`);
  }
  fs.writeFileSync(MANIFEST_JSON, JSON.stringify(records, null, 2) + "\n");
  console.log(`\n${records.length} goldens written to ${path.relative(process.cwd(), GOLDEN_DIR)}`);
  console.log("Hand-validate the PNGs, then commit them together with manifest.json.");
}

function verify(): number {
  if (!fs.existsSync(MANIFEST_JSON)) {
    console.log("No golden manifest -- run `npm run test:textures:gen`, validate the PNGs, commit them.");
    return 1;
  }
  const records: GoldenRecord[] = JSON.parse(fs.readFileSync(MANIFEST_JSON, "utf8"));
  const known = new Set(records.map((r) => r.name));
  let failed = 0;
  for (const r of records) {
    const file = path.join(config.root, r.source);
    if (!fs.existsSync(file)) {
      console.log(`skip ${r.name}: sample data not present (${r.source})`);
      continue;
    }
    try {
      const { level, rgba } = decodeEntry(r.source, r.mip, r.face);
      const ok = level.width === r.width && level.height === r.height && level.type === r.type && sha(rgba) === r.sha256;
      if (ok) console.log(`ok   ${r.name}`);
      else {
        console.log(
          `FAIL ${r.name}: decoded ${level.type} ${level.width}x${level.height} sha ${sha(rgba).slice(0, 12)}..` +
            ` != golden ${r.type} ${r.width}x${r.height} sha ${r.sha256.slice(0, 12)}..`
        );
        failed++;
      }
    } catch (err) {
      console.log(`FAIL ${r.name}: ${(err as Error).message}`);
      failed++;
    }
  }
  // Curated entries with no validated golden yet: not failures, but visible.
  for (const e of GOLDEN_TEXTURES) {
    if (!known.has(e.name)) console.log(`pend ${e.name}: no golden yet (run test:textures:gen and validate)`);
  }
  console.log(`\n${records.length - failed}/${records.length} golden textures verified`);
  return failed ? 1 : 0;
}

const mode = process.argv[2] ?? "verify";
if (mode === "generate") generate();
else process.exit(verify());
