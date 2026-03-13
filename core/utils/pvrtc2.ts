/**
 * PVRTC2 4BPP software decoder.
 *
 * Each 8-byte block covers 4×4 pixels.
 * Block layout (little-endian):
 *   bytes 0–3: modulation bits (16 pixels × 2-bit selectors, row-major)
 *   bytes 4–7: color data + flags
 *
 * Flags (in the u32 at offset 4):
 *   bit  0:  mod_flag   – modulation mode
 *   bit 15:  hard_flag  – 1 = per-block colours, 0 = bilinear from neighbours
 *   bit 31:  opaque_flag – 1 = opaque RGB, 0 = translucent RGBA
 */

type Color4 = [number, number, number, number]; // r, g, b, a

function expand(val: number, bits: number): number {
  val <<= (8 - bits);
  val |= val >> bits;
  return val & 0xff;
}

function decodeEndpoints(cw: number): [Color4, Color4] {
  const opaque = (cw >>> 31) & 1;

  let ca: Color4, cb: Color4;

  if (opaque) {
    const ba = (cw >>> 1) & 0xf;
    const ga = (cw >>> 5) & 0x1f;
    const ra = (cw >>> 10) & 0x1f;
    ca = [expand(ra, 5), expand(ga, 5), expand(ba, 4), 255];

    const bb = (cw >>> 16) & 0x1f;
    const gb = (cw >>> 21) & 0x1f;
    const rb = (cw >>> 26) & 0x1f;
    cb = [expand(rb, 5), expand(gb, 5), expand(bb, 5), 255];
  } else {
    const ba = (cw >>> 1) & 0x7;
    const ga = (cw >>> 4) & 0xf;
    const ra = (cw >>> 8) & 0xf;
    const aa = (cw >>> 12) & 0x7;
    ca = [expand(ra, 4), expand(ga, 4), expand(ba, 3), expand(aa, 3)];

    const bb = (cw >>> 16) & 0xf;
    const gb = (cw >>> 20) & 0xf;
    const rb = (cw >>> 24) & 0xf;
    const ab = (cw >>> 28) & 0x7;
    cb = [expand(rb, 4), expand(gb, 4), expand(bb, 4), expand(ab, 3)];
  }

  return [ca, cb];
}

function bilerp(tl: Color4, tr: Color4, bl: Color4, br: Color4, wx: number, wy: number): Color4 {
  const iwx = 4 - wx;
  const iwy = 4 - wy;
  return [
    (tl[0] * iwx * iwy + tr[0] * wx * iwy + bl[0] * iwx * wy + br[0] * wx * wy + 8) >> 4,
    (tl[1] * iwx * iwy + tr[1] * wx * iwy + bl[1] * iwx * wy + br[1] * wx * wy + 8) >> 4,
    (tl[2] * iwx * iwy + tr[2] * wx * iwy + bl[2] * iwx * wy + br[2] * wx * wy + 8) >> 4,
    (tl[3] * iwx * iwy + tr[3] * wx * iwy + bl[3] * iwx * wy + br[3] * wx * wy + 8) >> 4,
  ];
}

/**
 * Build Morton-order (Z-curve) unswizzle table for rectangular grids.
 * Maps linear storage index → grid index (by * bw + bx).
 *
 * For non-square textures, bits are interleaved only up to the smaller
 * dimension; the remaining bits of the larger dimension occupy upper bits
 * linearly. This matches PSVita GXT swizzle behaviour.
 */
function buildMortonTable(bw: number, bh: number): Uint32Array {
  const count = bw * bh;
  const mortonToGrid = new Uint32Array(count);

  // Number of bits needed for each dimension
  const xBits = Math.ceil(Math.log2(bw)) || 1;
  const yBits = Math.ceil(Math.log2(bh)) || 1;
  const minBits = Math.min(xBits, yBits);

  for (let i = 0; i < count; i++) {
    // De-interleave: extract x and y from morton index
    let x = 0, y = 0;
    let v = i;
    // Interleaved region: minBits for each of x and y
    for (let bit = 0; bit < minBits; bit++) {
      y |= ((v & 1) << bit); v >>= 1;
      x |= ((v & 1) << bit); v >>= 1;
    }
    // Remaining upper bits belong to the larger dimension
    if (xBits > yBits) {
      x |= (v << minBits);
    } else if (yBits > xBits) {
      y |= (v << minBits);
    }

    if (x < bw && y < bh) {
      mortonToGrid[i] = y * bw + x;
    }
  }
  return mortonToGrid;
}

export class PVRTC2 {
  static decompress(width: number, height: number, data: ArrayBuffer, swizzled: boolean = true): Uint8ClampedArray {
    const src = new DataView(data);
    const dst = new Uint8ClampedArray(width * height * 4);

    const bw = Math.max(1, width >> 2);
    const bh = Math.max(1, height >> 2);
    const blockCount = bw * bh;

    if (data.byteLength < blockCount * 8) {
      console.warn(`PVRTC2: buffer too small (${data.byteLength} < ${blockCount * 8}) for ${width}×${height}`);
      return dst;
    }

    // Build unswizzle map: mortonToGrid[storageIndex] = gridIndex
    const mortonToGrid = swizzled ? buildMortonTable(bw, bh) : null;

    // Pass 1: decode all block endpoints into grid-order arrays.
    // Storage block i maps to grid position mortonToGrid[i].
    const defaultColor: Color4 = [0, 0, 0, 255];
    const colorsA = new Array<Color4>(blockCount);
    const colorsB = new Array<Color4>(blockCount);
    for (let i = 0; i < blockCount; i++) {
      colorsA[i] = defaultColor;
      colorsB[i] = defaultColor;
    }
    const hardFlags = new Uint8Array(blockCount);
    const blockModBits = new Uint32Array(blockCount);
    const blockColorWords = new Uint32Array(blockCount);

    for (let i = 0; i < blockCount; i++) {
      const gi = mortonToGrid ? mortonToGrid[i] : i;
      const cw = src.getUint32(i * 8 + 4, true);
      const [ca, cb] = decodeEndpoints(cw);
      colorsA[gi] = ca;
      colorsB[gi] = cb;
      hardFlags[gi] = (cw >>> 15) & 1;
      blockModBits[gi] = src.getUint32(i * 8, true);
      blockColorWords[gi] = cw;
    }

    // Pass 2: decode pixels (grid order)
    for (let by = 0; by < bh; by++) {
      for (let bx = 0; bx < bw; bx++) {
        const bi = by * bw + bx;
        const modBits = blockModBits[bi];
        const cw = blockColorWords[bi];
        const modFlag = cw & 1;
        const hard = hardFlags[bi];
        const opaque = (cw >>> 31) & 1;

        for (let py = 0; py < 4; py++) {
          for (let px = 0; px < 4; px++) {
            const sel = (modBits >>> ((py * 4 + px) * 2)) & 3;

            let ca: Color4, cb: Color4;

            if (hard) {
              ca = colorsA[bi];
              cb = colorsB[bi];
            } else {
              // Bilinear interpolation from 4 surrounding block centres
              const left  = px < 2 ? 1 : 0;
              const above = py < 2 ? 1 : 0;

              let nx = bx - left;
              let ny = by - above;
              if (nx < 0) nx += bw;
              if (ny < 0) ny += bh;
              const nx1 = (nx + 1) % bw;
              const ny1 = (ny + 1) % bh;

              const iTL = ny  * bw + nx;
              const iTR = ny  * bw + nx1;
              const iBL = ny1 * bw + nx;
              const iBR = ny1 * bw + nx1;

              const wx = left  ? px + 2 : px - 2;
              const wy = above ? py + 2 : py - 2;

              ca = bilerp(colorsA[iTL], colorsA[iTR], colorsA[iBL], colorsA[iBR], wx, wy);
              cb = bilerp(colorsB[iTL], colorsB[iTR], colorsB[iBL], colorsB[iBR], wx, wy);
            }

            let r: number, g: number, b: number, a: number;

            if (modFlag === 0) {
              switch (sel) {
                case 0: r = ca[0]; g = ca[1]; b = ca[2]; a = ca[3]; break;
                case 1: r = (ca[0]*5 + cb[0]*3 + 4) >> 3; g = (ca[1]*5 + cb[1]*3 + 4) >> 3;
                         b = (ca[2]*5 + cb[2]*3 + 4) >> 3; a = (ca[3]*5 + cb[3]*3 + 4) >> 3; break;
                case 2: r = (ca[0]*3 + cb[0]*5 + 4) >> 3; g = (ca[1]*3 + cb[1]*5 + 4) >> 3;
                         b = (ca[2]*3 + cb[2]*5 + 4) >> 3; a = (ca[3]*3 + cb[3]*5 + 4) >> 3; break;
                default: r = cb[0]; g = cb[1]; b = cb[2]; a = cb[3]; break;
              }
            } else {
              if (opaque) {
                switch (sel) {
                  case 0: r = ca[0]; g = ca[1]; b = ca[2]; a = 255; break;
                  case 1: r = (ca[0]+cb[0]+1)>>1; g = (ca[1]+cb[1]+1)>>1;
                           b = (ca[2]+cb[2]+1)>>1; a = 255; break;
                  case 2: r = 0; g = 0; b = 0; a = 0; break;
                  default: r = cb[0]; g = cb[1]; b = cb[2]; a = 255; break;
                }
              } else {
                switch (sel) {
                  case 0: r = ca[0]; g = ca[1]; b = ca[2]; a = ca[3]; break;
                  case 1: r = (ca[0]*5 + cb[0]*3 + 4) >> 3; g = (ca[1]*5 + cb[1]*3 + 4) >> 3;
                           b = (ca[2]*5 + cb[2]*3 + 4) >> 3; a = (ca[3]*5 + cb[3]*3 + 4) >> 3; break;
                  case 2: r = (ca[0]*3 + cb[0]*5 + 4) >> 3; g = (ca[1]*3 + cb[1]*5 + 4) >> 3;
                           b = (ca[2]*3 + cb[2]*5 + 4) >> 3; a = (ca[3]*3 + cb[3]*5 + 4) >> 3; break;
                  default: r = cb[0]; g = cb[1]; b = cb[2]; a = cb[3]; break;
                }
              }
            }

            const dx = bx * 4 + px;
            const dy = by * 4 + py;
            const oi = (dy * width + dx) * 4;
            dst[oi]     = r!;
            dst[oi + 1] = g!;
            dst[oi + 2] = b!;
            dst[oi + 3] = a!;
          }
        }
      }
    }

    return dst;
  }
}
