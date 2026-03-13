import * as fs from "fs";
import { listFiles, relPath } from "./helper";
import { config } from "./config";
import vexxTest from "./vexx.test";

declare const gc: (() => void) | undefined;

if (typeof gc !== "function") {
  process.stderr.write("error: gc is not available — run with --expose-gc\n");
  process.exit(1);
}

const root = config.root;
const tests = [vexxTest];

const testJobs = tests.map(test => ({
  test,
  files: [...listFiles(root, test.ext)],
}));

const totalFiles = testJobs.reduce((n, j) => n + j.files.length, 0);
const reportLines: string[] = [];
let done = 0;
let failed = 0;

function drawProgress(): void {
  const width = 40;
  const filled = totalFiles === 0 ? width : Math.round((done / totalFiles) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  const pct = totalFiles === 0 ? 100 : Math.round((done / totalFiles) * 100);
  const passing = done - failed;
  process.stdout.write(`\r[${bar}] ${pct}% (${done}/${totalFiles}) ✓ ${passing}  ✗ ${failed}`);;
}

drawProgress();

for (const { test, files } of testJobs) {
  for (const file of files) {
    const label = relPath(file, root);
    try {
      test.run(file);
    } catch (e: any) {
      reportLines.push(`FAIL [${test.name}] ${label}\n  ${e.message.replaceAll("\n", "\n  ")}`);
      failed++;
    }
    done++;
    drawProgress();
    gc();
  }
}

process.stdout.write("\n\n");

const passed = totalFiles - failed;
const pct = totalFiles === 0 ? 100 : Math.round((passed / totalFiles) * 100);
process.stdout.write(`Tests:   ${tests.length} suite(s), ${totalFiles} file(s)\n`);
process.stdout.write(`Passed:  ${passed} (${pct}%)\n`);
process.stdout.write(`Failed:  ${failed}\n`);

if (reportLines.length > 0) {
  fs.writeFileSync(config.reportFile, reportLines.join("\n\n") + "\n");
  process.stdout.write(`Report:  ${config.reportFile}\n`);
  process.exit(1);
}
