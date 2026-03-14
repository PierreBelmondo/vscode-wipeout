/**
 * VEXX test suite – runs all checks on a single .vex file.
 */

import { readFile, defineTest } from "./helper";
import { checkParseErrors } from "./vexx.parse.test";
import { checkMeshAabb } from "./vexx.mesh.test";
import { checkWoTrack } from "./vexx.wo_track.test";
import { Vexx } from "@core/formats/vexx";
import { Vexx4NodeType } from "@core/formats/vexx/v4/type";
import { Vexx6NodeType } from "@core/formats/vexx/v6/type";

export default defineTest("VEXX", "vex", (file) => {
  const vexx = Vexx.load(readFile(file));

  const parseFailures: string[] = [];
  checkParseErrors(vexx, parseFailures);
  if (parseFailures.length > 0)
    throw new Error(`parse errors:\n${parseFailures.join("\n")}`);

  const aabbFailures: string[] = [];
  const meshType = vexx.header.version === 6 ? Vexx6NodeType.MESH : Vexx4NodeType.MESH;
  checkMeshAabb(vexx, aabbFailures, meshType);
  if (aabbFailures.length > 0)
    throw new Error(`MESH out-of-AABB vertices:\n${aabbFailures.join("\n")}`);

  const trackFailures: string[] = [];
  checkWoTrack(vexx, trackFailures);
  if (trackFailures.length > 0)
    throw new Error(`WO_TRACK failures:\n${trackFailures.join("\n")}`);
});
