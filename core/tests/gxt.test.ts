/**
 * GXT test suite – parses every .gxt file and validates the decoded output.
 */

import { readFile, defineTest } from "./helper";
import { GXT } from "@core/formats/gxt";

export default defineTest("GXT", "gxt", (file) => {
  const buf = readFile(file);
  const gxt = GXT.load(buf);

  const failures: string[] = [];

  if (gxt.textures.length === 0) {
    failures.push("no textures parsed");
  }

  for (let i = 0; i < gxt.textures.length; i++) {
    const info = gxt.textures[i];

    if (info.width === 0 || info.height === 0)
      failures.push(`texture[${i}]: zero dimensions (${info.width}×${info.height})`);

    if (info.dataSize === 0)
      failures.push(`texture[${i}]: dataSize is 0`);
  }

  // Validate the decoded mipmap for the primary texture
  if (gxt.textures.length > 0 && gxt.mipmaps.length > 0) {
    const info = gxt.textures[0];
    const mip0 = gxt.mipmaps[0];

    if (mip0.width !== info.width || mip0.height !== info.height)
      failures.push(`mip0 dimensions ${mip0.width}×${mip0.height} don't match header ${info.width}×${info.height}`);

    const expectedBytes = mip0.width * mip0.height * 4;
    if (mip0.data.length !== expectedBytes)
      failures.push(`mip0 RGBA buffer length ${mip0.data.length} != expected ${expectedBytes}`);
  } else if (gxt.textures.length > 0 && gxt.mipmaps.length === 0) {
    // Unsupported format — warn but don't fail
    const fmt = `0x${gxt.textures[0].format.toString(16)}`;
    failures.push(`unsupported format ${fmt}, no mipmaps decoded`);
  }

  if (failures.length > 0)
    throw new Error(failures.join("\n"));
});
