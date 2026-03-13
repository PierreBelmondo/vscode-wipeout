import * as path from "path";

const ROOT = path.resolve(__dirname, "../../../project-example");

export const config = {
  root: ROOT,
  reportFile: path.resolve(__dirname, "test-report.txt"),
};
