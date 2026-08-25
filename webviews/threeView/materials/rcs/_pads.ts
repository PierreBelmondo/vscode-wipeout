import * as THREE from "three";
import { DXT1, DXT3, DXT5 } from "@core/utils/dxt";

/**
 * The speedup / weapon pads.
 *
 * Both materials shade the same way. Reading `weapon_pads`' fragment program
 * (the `speedup_material` one is instruction-for-instruction the same shape):
 *
 *   TEXR H0.xyz, f[TEX3], TEX0          ; Texture1 -> diffuse
 *   MULH H0.xyz, H1, H0                 ; x interpolated ambient/vertex colour
 *   TEXR H0.w,   f[TEX3], TEX1          ; Texture2 ALPHA -> emissive mask
 *   MADH H0.xyz, H0.w, <uniform>, H0    ; += mask * uniform
 *
 * The glow is therefore Texture2's ALPHA channel, tinted by a uniform and
 * added on top of the lit diffuse. The uniform is `W_Cycle` on the weapon pads
 * and `Colour` on the speedup pads; neither ships a value in the .rcsmaterial
 * (they are set per draw, and the engine animates them), so the colours and
 * the pulse rate below are a viewer convention, not decompiled values.
 *
 * TODO: read the real `W_Cycle` / `Colour` values, and the engine's cycle rate,
 *   if they ever become reachable from the node setup.
 */

/**
 * How hard the glow is driven.
 *
 * The emissive has to go well past 1.0 to read as a glow, because the viewer
 * grades with Reinhard at a low exposure: a peak of 0.82 lands at only 0.41 on
 * screen once tone mapping and the sRGB transfer have taken their cut, which
 * looks like a tinted surface rather than something emitting light. At this
 * multiplier the peak lands around 0.73 — bright, without blowing out. Colours
 * stay unclamped in THREE.Color, so the tone mapper does the limiting.
 */
const PAD_EMISSIVE_GAIN = 6.0;

/** Weapon pickup pads glow red. */
export const PAD_EMISSIVE_WEAPON = new THREE.Color(0xd02020).multiplyScalar(PAD_EMISSIVE_GAIN);

/** Speed boost pads glow blue. */
export const PAD_EMISSIVE_SPEED = new THREE.Color(0x2060d0).multiplyScalar(PAD_EMISSIVE_GAIN);

/**
 * How fast the pads cycle, in radians/second, and how deep the dip goes.
 *
 * ~1s per cycle, dipping to a third of peak — a visible throb rather than the
 * slow 2.9s swell this started at.
 */
export const PAD_PULSE_RATE = 6.5;
export const PAD_PULSE_DEPTH = 0.65;

/**
 * Turn the `_ne` map into an emissive mask Three can use.
 *
 * The shader reads that texture's ALPHA, but Three's `emissivemap_fragment` is
 *
 *     vec4 emissiveColor = texture2D( emissiveMap, vUv );
 *     totalEmissiveRadiance *= emissiveColor.rgb;
 *
 * — rgb only, alpha ignored. Binding the `_ne` texture directly would light the
 * pad by its normal map's RGB, which is not the mask at all. Broadcast alpha
 * into RGB instead so Three multiplies by the channel the engine uses.
 *
 * The source is normally a CompressedTexture (the pads' `_ne` maps ship as
 * DXT3), whose `image` is only `{width, height}` — the blocks live in
 * `mipmaps[0]`, which is still the loader's `{data, width, height, type}`
 * record. Decode level 0 from there.
 *
 * Returns undefined if the pixels cannot be reached, in which case the caller
 * gets no emissive map: the pad still renders, just without its glow.
 */
export function padEmissiveMap(source: THREE.Texture | undefined): THREE.Texture | undefined {
  if (!source) return undefined;

  // Either an uncompressed DataTexture (pixels on .image) or a compressed one
  // (blocks on .mipmaps[0]).
  const direct = source.image as { data?: ArrayBufferView; width?: number; height?: number } | undefined;
  const level = (source.mipmaps?.[0] ?? undefined) as
    | { data?: Uint8Array; width?: number; height?: number; type?: string }
    | undefined;

  let rgba: Uint8Array | Uint8ClampedArray | undefined;
  let width = 0;
  let height = 0;

  if (direct?.data && direct.width && direct.height) {
    rgba = direct.data as Uint8Array;
    width = direct.width;
    height = direct.height;
  } else if (level?.data && level.width && level.height) {
    width = level.width;
    height = level.height;
    const blocks = level.data;
    const buffer = blocks.buffer.slice(blocks.byteOffset, blocks.byteOffset + blocks.byteLength) as ArrayBuffer;
    if (level.type === "DXT3") rgba = DXT3.decompress(width, height, buffer);
    else if (level.type === "DXT5") rgba = DXT5.decompress(width, height, buffer);
    else if (level.type === "DXT1") rgba = DXT1.decompress(width, height, buffer);
    else if (level.type === "RGBA") rgba = blocks;
  }

  if (!rgba || !width || !height || rgba.length < width * height * 4) return undefined;

  const mask = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const alpha = rgba[i * 4 + 3];
    mask[i * 4 + 0] = alpha;
    mask[i * 4 + 1] = alpha;
    mask[i * 4 + 2] = alpha;
    mask[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(mask, width, height, THREE.RGBAFormat);
  texture.wrapS = source.wrapS;
  texture.wrapT = source.wrapT;
  texture.flipY = source.flipY;
  texture.needsUpdate = true;
  return texture;
}
