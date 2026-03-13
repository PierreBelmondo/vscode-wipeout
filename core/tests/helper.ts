import * as fs from "fs";
import * as path from "path";

export interface Test {
  name: string;
  ext: string;
  run(file: string): void;
}

/** Define a named test for files matching the given extension. */
export function defineTest(name: string, ext: string, fn: (file: string) => void): Test {
  return { name, ext, run: fn };
}

/** Recursively yield all files whose name matches the given extension under root. */
export function* listFiles(root: string, ext: string): Generator<string> {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) yield* listFiles(full, ext);
    else if (entry.name.toLowerCase().endsWith(ext)) yield full;
  }
}

/** Read a file and return its contents as an ArrayBuffer. */
export function readFile(filePath: string): ArrayBuffer {
  const buf = fs.readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Return a short label for a file relative to a root. */
export function relPath(filePath: string, root: string): string {
  return path.relative(root, filePath);
}
