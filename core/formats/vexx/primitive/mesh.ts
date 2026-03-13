// GU component type codes (matches PSP GE hardware encoding).
export const GU_TYPE_INT8    = 1;
export const GU_TYPE_INT16   = 2;
export const GU_TYPE_FLOAT32 = 3;

export type GUComponentMeta = {
  type:       typeof GU_TYPE_INT8 | typeof GU_TYPE_INT16 | typeof GU_TYPE_FLOAT32;
  itemSize:   number;   // components per vertex (2 for UV, 3 for normal/vertex)
  normalized: boolean;  // true for snorm/unorm — GPU remaps to [-1,1] or [0,1]
};

export type MeshData = {
  // Positions are always decoded to float32 (Three.js has no native scaled-int16 vertex support).
  positions:     Float32Array;
  // Normals and UVs are stored in their native PSP type; meta describes how the loader
  // should create the BufferAttribute (type, itemSize, normalized).
  normals:       Int8Array | Int16Array | Float32Array | null;
  normalMeta:    GUComponentMeta | null;
  uvs:           Int8Array | Int16Array | Float32Array | null;
  uvMeta:        GUComponentMeta | null;
  indices:       Uint16Array;
};

/**
 * Raw bulk-extracted vertex data straight from the buffer.
 * All arrays are stride-parallel (index i → vertex i, before degenerate filtering).
 * `valid[i]` is 1 if stride i has a real vertex, 0 if it is a strip-restart marker.
 */
export type RawVertexData = {
  // Float32, 3 components — already decoded (i16 × scale, or raw f32).
  positions: Float32Array;
  // Native typed array matching normalMeta.type, 3 components — raw, not normalized.
  normals:   Int8Array | Int16Array | Float32Array | null;
  normalMeta: GUComponentMeta | null;
  // Native typed array matching uvMeta.type, 2 components — raw, not normalized.
  uvs:       Int8Array | Int16Array | Float32Array | null;
  uvMeta:    GUComponentMeta | null;
  // 1 = valid vertex, 0 = strip-restart / degenerate.
  valid:     Uint8Array;
  // Actual number of valid vertices (popcount of `valid`).
  validCount: number;
};

/**
 * Pack raw vertex data into a compacted MeshData with triangle index buffer.
 *
 * Degenerate strides (`valid[i] === 0`) are excluded from all component buffers
 * and reset the winding counter.  If `section2` is provided it is appended as a
 * second strip with an implicit restart between the two sections.
 *
 * This is the hot path — no JS object allocation, typed-array writes throughout.
 */
export function packMeshData(
  s1:            RawVertexData,
  s2:            RawVertexData | null,
  triangleStrip: boolean = true,
): MeshData {
  const validTotal = s1.validCount + (s2 ? s2.validCount : 0);
  const maxTris    = Math.max(0, validTotal - 2);

  const normalMeta = s1.normalMeta ?? s2?.normalMeta ?? null;
  const uvMeta     = s1.uvMeta     ?? s2?.uvMeta     ?? null;

  const positions = new Float32Array(validTotal * 3);
  const normals   = normalMeta
    ? (normalMeta.type === GU_TYPE_INT8  ? new Int8Array(validTotal * 3)
    :  normalMeta.type === GU_TYPE_INT16 ? new Int16Array(validTotal * 3)
    :                                      new Float32Array(validTotal * 3))
    : null;
  const uvs       = uvMeta
    ? (uvMeta.type === GU_TYPE_INT8  ? new Int8Array(validTotal * 2)
    :  uvMeta.type === GU_TYPE_INT16 ? new Int16Array(validTotal * 2)
    :                                   new Float32Array(validTotal * 2))
    : null;
  const indices   = new Uint16Array(maxTris * 3);

  let vOut   = 0;  // next output vertex slot
  let iCount = 0;  // indices written
  let run    = 0;  // consecutive valid vertices in current strip

  const writeSections = (sections: RawVertexData[], insertRestartBetween: boolean) => {
    for (let si = 0; si < sections.length; si++) {
      if (insertRestartBetween && si > 0) run = 0;  // implicit restart between sections

      const sec = sections[si];
      const srcPos = sec.positions;
      const srcNor = sec.normals;
      const srcUv  = sec.uvs;
      const valid  = sec.valid;
      const n      = valid.length;

      for (let i = 0; i < n; i++) {
        if (!valid[i]) { run = 0; continue; }

        const srcV = i * 3;
        const dstV = vOut * 3;
        positions[dstV]     = srcPos[srcV];
        positions[dstV + 1] = srcPos[srcV + 1];
        positions[dstV + 2] = srcPos[srcV + 2];

        if (normals && srcNor) {
          normals[dstV]     = srcNor[srcV];
          normals[dstV + 1] = srcNor[srcV + 1];
          normals[dstV + 2] = srcNor[srcV + 2];
        }

        if (uvs && srcUv) {
          const srcU = i * 2, dstU = vOut * 2;
          uvs[dstU]     = srcUv[srcU];
          uvs[dstU + 1] = srcUv[srcU + 1];
        }

        const idx = vOut++;
        run++;

        if (triangleStrip) {
          if (run >= 3) {
            const a = idx - 2, b = idx - 1, c = idx;
            if ((run - 3) % 2 === 0) {
              indices[iCount++] = a; indices[iCount++] = b; indices[iCount++] = c;
            } else {
              indices[iCount++] = b; indices[iCount++] = a; indices[iCount++] = c;
            }
          }
        } else {
          if (run % 3 === 0) {
            indices[iCount++] = idx - 2;
            indices[iCount++] = idx - 1;
            indices[iCount++] = idx;
          }
        }
      }
    }
  };

  writeSections(s2 ? [s1, s2] : [s1], s2 !== null);

  const hasNormals = normals !== null && s1.normalMeta !== null;
  const hasUvs     = uvs     !== null && s1.uvMeta     !== null;

  return {
    positions:  positions.subarray(0, vOut * 3) as Float32Array,
    normals:    hasNormals ? normals!.subarray(0, vOut * 3) as typeof normals : null,
    normalMeta: hasNormals ? normalMeta : null,
    uvs:        hasUvs    ? uvs!.subarray(0, vOut * 2)    as typeof uvs    : null,
    uvMeta:     hasUvs    ? uvMeta  : null,
    indices:    indices.subarray(0, iCount) as Uint16Array,
  };
}
