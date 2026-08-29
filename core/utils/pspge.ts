// PSP Graphics Engine: hardware behaviour, as opposed to the libgu API surface
// mirrored in pspgu.ts.
//
// What lives here is what the GE itself does with memory -- layouts a texture
// must already be in before it is handed to the hardware -- rather than the
// constants an application passes to sceGu* calls.

export namespace GE {
  /**
   * Width of a swizzle block, in bytes. The GE always reads 16 bytes across,
   * whatever the pixel format, so a 4bpp image covers 32 pixels per block and
   * an 8bpp image 16.
   */
  export const SWIZZLE_BLOCK_WIDTH = 16;

  /** Height of a swizzle block, in rows. */
  export const SWIZZLE_BLOCK_HEIGHT = 8;

  /**
   * Undo the GE texture swizzle.
   *
   * A swizzled texture is stored as a run of 16-byte x 8-row blocks laid out
   * row-major across the image, so reading it linearly interleaves eight-row
   * bands and the image comes out striped. Bit 0 of the GE's TMODE command
   * (0xC2) selects the layout per texture: WipEout's PSP executable emits that
   * bit straight from a flag on its texture record when it builds the display
   * list, which is why .mip, VEXX v4 and .fnt each carry a swizzle flag of
   * their own.
   *
   * `stride` is the row pitch in BYTES, so a 4bpp image passes half its width.
   * The dimensions need not divide evenly: a partial trailing block is possible,
   * so the copy is clipped rather than assuming they do.
   */
  export function unswizzle(src: Uint8Array, stride: number, height: number): Uint8Array {
    const out = new Uint8Array(stride * height);
    const blocksX = Math.ceil(stride / SWIZZLE_BLOCK_WIDTH);
    const blocksY = Math.ceil(height / SWIZZLE_BLOCK_HEIGHT);
    let read = 0;
    for (let by = 0; by < blocksY; by++) {
      for (let bx = 0; bx < blocksX; bx++) {
        for (let y = 0; y < SWIZZLE_BLOCK_HEIGHT; y++) {
          const row = by * SWIZZLE_BLOCK_HEIGHT + y;
          for (let x = 0; x < SWIZZLE_BLOCK_WIDTH; x++) {
            const col = bx * SWIZZLE_BLOCK_WIDTH + x;
            if (row < height && col < stride) out[row * stride + col] = src[read];
            read++;
          }
        }
      }
    }
    return out;
  }

  /**
   * Bytes a swizzled image occupies. It is a whole number of blocks, so this is
   * at least `stride * height` and more when the dimensions do not divide
   * evenly -- reading only `stride * height` truncates the last block row.
   */
  export function swizzledSize(stride: number, height: number): number {
    return Math.ceil(stride / SWIZZLE_BLOCK_WIDTH) * SWIZZLE_BLOCK_WIDTH * (Math.ceil(height / SWIZZLE_BLOCK_HEIGHT) * SWIZZLE_BLOCK_HEIGHT);
  }
}
