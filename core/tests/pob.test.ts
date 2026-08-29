/**
 * POB test suite -- parses every .pob file and validates the decoded output.
 *
 * The sharp check is that every embedded texture decodes to a non-blank image.
 * Pointers inside a .pob are payload-relative and the game relocates them by
 * `payloadBase` at load time (Pob_RelocatePointers, boot.bin 0x00145020);
 * resolving them against any other base lands the CLUT in padding, and the
 * sheet decodes to solid zeroes.
 */

import { readFile, defineTest } from "./helper";
import { POB, POB_PATHS_PER_EMITTER } from "@core/formats/pob";

export default defineTest("POB", "pob", (file) => {
  const buf = readFile(file);
  const pob = POB.load(buf);

  const failures: string[] = [];

  if (pob.blocks.length === 0) failures.push("no blocks parsed");
  if (pob.name.length === 0) failures.push("no system name");

  // Header invariant, verified across the whole corpus.
  if (pob.range.size - pob.header.dataSize !== pob.header.size)
    failures.push(`header size mismatch: fileSize-dataSize=${pob.range.size - pob.header.dataSize}, header.size=${pob.header.size}`);

  if (pob.header.payloadBase !== 0x10 + 4 * pob.header.offsetCount)
    failures.push("payloadBase is not 0x10 + 4*offsetCount");

  // Every entry in the offset table names a pointer inside the payload, so it
  // has to land there -- a wrong payload base shows up here first.
  for (const [i, offset] of pob.usedOffsets.entries()) {
    if (pob.header.payloadBase + offset + 4 > pob.range.size)
      failures.push(`offset[${i}]: 0x${offset.toString(16)} points past end of file`);
  }

  for (const [i, texture] of pob.textures.entries()) {
    if (texture.width === 0 || texture.height === 0)
      failures.push(`texture[${i}]: zero dimensions (${texture.width}x${texture.height})`);

    if (texture.clutOffset + texture.clutSize > pob.range.size)
      failures.push(`texture[${i}]: CLUT runs past end of file`);

    const mipmap = texture.toMipmap();

    if (mipmap.data.length !== mipmap.width * mipmap.height * 4)
      failures.push(`texture[${i}]: decoded ${mipmap.data.length} bytes, expected ${mipmap.width * mipmap.height * 4}`);

    // A CLUT read from the right place is never uniformly blank.
    if (!(mipmap.data as Uint8Array).some((b) => b !== 0))
      failures.push(`texture[${i}]: decoded to all zeroes -- CLUT is misplaced`);
  }

  // A PsysPath's keys are normalised on BOTH axes; the curve is mapped onto the
  // path's own [minValue, maxValue] when sampled.
  for (const block of pob.blocks) {
    for (const path of block.animationPaths()) {
      const where = `block[${block.index}]+0x${path.offset.toString(16)}`;
      let previous = -Infinity;
      for (const key of path.keys) {
        if (!(key.time >= 0 && key.time <= 1.0001)) failures.push(`${where}: time ${key.time} outside [0,1]`);
        if (!(key.value >= 0 && key.value <= 1.0001)) failures.push(`${where}: value ${key.value} outside [0,1]`);
        if (key.time < previous) failures.push(`${where}: times not monotonic`);
        previous = key.time;
      }
    }
  }

  // Emitters hold five paths, 0xE0 apart -- the layout PsysDef_CreateEmitter
  // allocates. Shorter runs are emitters whose trailing paths carry no keys.
  for (const emitter of pob.emitters) {
    if (emitter.paths.length > POB_PATHS_PER_EMITTER)
      failures.push(`emitter@0x${emitter.offset.toString(16)}: ${emitter.paths.length} paths, expected at most ${POB_PATHS_PER_EMITTER}`);
  }

  return failures;
});
