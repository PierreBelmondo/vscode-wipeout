/**
 * VEXX test suite – runs all checks on a single .vex file.
 */

import { readFile, defineTest } from "./helper";
import { checkParseErrors } from "./vexx.parse.test";
import { checkMeshAabb } from "./vexx.mesh.test";
import { Vexx } from "@core/formats/vexx";
import { Vexx4NodeType } from "@core/formats/vexx/v4/type";

export default defineTest("VEXX", "vex", (file) => {
  const vexx = Vexx.load(readFile(file));

  const parseFailures: string[] = [];
  checkParseErrors(vexx, parseFailures);
  if (parseFailures.length > 0)
    throw new Error(`parse errors:\n${parseFailures.join("\n")}`);

  const aabbFailures: string[] = [];
  checkMeshAabb(vexx, aabbFailures, Vexx4NodeType.MESH);
  if (aabbFailures.length > 0)
    throw new Error(`Vexx4NodeType.MESH out-of-AABB vertices:\n${aabbFailures.join("\n")}`);
});
