/**
 * PS4 (GCN) texture detiling for macro-tiled BC7 surfaces.
 *
 * Tiling mode 13 = 2D tiled thin1, 128-bit (16 Bpp) element size.
 *
 * For BC7 textures, each "element" is a 4×4 pixel block (16 bytes).
 *
 * Layout:
 *   - Micro-tile: 8×8 elements in Morton (Z-order) curve
 *   - Macro-tile: 16 micro-tiles arranged in row-major order
 *   - Pipe/bank XOR applied to micro-tile index within macro-tile
 */

const ELEMENT_BYTES  = 16;  // BC7 block size
const MICRO_TILE_W   = 8;   // elements per micro-tile (x)
const MICRO_TILE_H   = 8;   // elements per micro-tile (y)
const MICRO_TILE_BYTES = MICRO_TILE_W * MICRO_TILE_H * ELEMENT_BYTES; // 1024

/**
 * Compute the byte offset of an element within a micro-tile.
 * Uses Morton (Z-order) interleave of the 3-bit x,y coordinates.
 */
function microTileOffset(x: number, y: number): number {
  const lx = x & 7;
  const ly = y & 7;
  let idx = 0;
  idx |= (lx & 1) << 0;
  idx |= (ly & 1) << 1;
  idx |= ((lx >> 1) & 1) << 2;
  idx |= ((ly >> 1) & 1) << 3;
  idx |= ((lx >> 2) & 1) << 4;
  idx |= ((ly >> 2) & 1) << 5;
  return idx * ELEMENT_BYTES;
}

/**
 * Detile a PS4 macro-tiled BC7 surface (tiling index 13).
 *
 * @param src       Tiled BC7 block data (full mip data from GNF)
 * @param width     Texture width in pixels
 * @param height    Texture height in pixels
 * @param pitch     Texture pitch in pixels (from GNM descriptor)
 * @returns         Linear BC7 block data
 */
export function detileBC7(src: Uint8Array, width: number, height: number, pitch: number): Uint8Array {
  const blockW = Math.ceil(width / 4);
  const blockH = Math.ceil(height / 4);
  const pitchBlocks = Math.ceil(pitch / 4);

  // Padded width aligned to micro-tile boundary
  const paddedW = Math.ceil(pitchBlocks / MICRO_TILE_W) * MICRO_TILE_W;

  // Micro-tiles per row in the padded surface
  const microTilesPerRow = paddedW / MICRO_TILE_W;

  const dst = new Uint8Array(blockW * blockH * ELEMENT_BYTES);

  for (let by = 0; by < blockH; by++) {
    for (let bx = 0; bx < blockW; bx++) {
      // Which micro-tile does this block belong to?
      const mtX = Math.floor(bx / MICRO_TILE_W);
      const mtY = Math.floor(by / MICRO_TILE_H);

      // Linear micro-tile index (row-major)
      const mtIdx = mtY * microTilesPerRow + mtX;

      // Element offset within micro-tile (Morton order)
      const elemOff = microTileOffset(bx, by);

      // Source offset
      const srcOff = mtIdx * MICRO_TILE_BYTES + elemOff;

      // Destination offset (linear)
      const dstOff = (by * blockW + bx) * ELEMENT_BYTES;

      if (srcOff + ELEMENT_BYTES <= src.length) {
        dst.set(src.subarray(srcOff, srcOff + ELEMENT_BYTES), dstOff);
      }
    }
  }

  return dst;
}

/**
 * Compute the tiled byte size for a BC7 mip level.
 * Micro-tiles are padded to full 8×8 blocks, so dimensions are rounded up.
 */
export function tiledSize(width: number, height: number, pitch: number): number {
  const pitchBlocks = Math.ceil(pitch / 4);
  const blockH = Math.ceil(height / 4);
  const paddedW = Math.ceil(pitchBlocks / MICRO_TILE_W) * MICRO_TILE_W;
  const paddedH = Math.ceil(blockH / MICRO_TILE_H) * MICRO_TILE_H;
  return paddedW * paddedH * ELEMENT_BYTES;
}
