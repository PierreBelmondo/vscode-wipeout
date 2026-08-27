import * as THREE from "three";

import { Mipmaps } from "@core/utils/mipmaps";
import { DXT1, DXT3, DXT5 } from "@core/utils/dxt";

export function generateMissingMipmaps(mipmaps: Mipmaps) {
  let last = mipmaps[mipmaps.length - 1];
  if (last.type == "RGBA") {
    while (last.width >= 2 || last.height >= 2) {
      const width = Math.floor(last.width / 2);
      const height = Math.floor(last.height / 2);
      const data = new Uint8ClampedArray(height * width * 4);
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          for (let i = 0; i < 4; i++) {
            let c = 0;
            c += Math.pow(last.data[4 * (2 * x + 0 + (2 * y + 0) * width * 2) + i], 2);
            c += Math.pow(last.data[4 * (2 * x + 1 + (2 * y + 0) * width * 2) + i], 2);
            c += Math.pow(last.data[4 * (2 * x + 0 + (2 * y + 1) * width * 2) + i], 2);
            c += Math.pow(last.data[4 * (2 * x + 1 + (2 * y + 1) * width * 2) + i], 2);
            data[4 * (x + y * width) + i] = Math.sqrt(c / 4);
          }
        }
      }
      last = { type: "RGBA", width, height, data };
      mipmaps.push(last);
    }
  }
  return mipmaps;
}

/**
 * Build a cube texture from the six faces of a GTF cube.
 *
 * Environment skies ship as cube maps; sampling one as a flat 2D texture is
 * what left them black. Three.js r149 has no compressed cube texture, so the
 * faces are decoded to RGBA here.
 */
export function facesToCubeTexture(faces: Mipmaps[]): THREE.CubeTexture | undefined {
  if (faces.length !== 6) return undefined;

  const images: THREE.DataTexture[] = [];
  for (const face of faces) {
    const level = face[0];
    if (!level) return undefined;

    let rgba: Uint8ClampedArray;
    switch (level.type) {
      case "DXT1":
        rgba = DXT1.decompress(level.width, level.height, toArrayBuffer(level.data));
        break;
      case "DXT3":
        rgba = DXT3.decompress(level.width, level.height, toArrayBuffer(level.data));
        break;
      case "DXT5":
        rgba = DXT5.decompress(level.width, level.height, toArrayBuffer(level.data));
        break;
      case "RGBA":
        rgba = new Uint8ClampedArray(level.data);
        break;
      case "ARGB":
        rgba = convertARGBtoRGBA(level.data);
        break;
      default:
        console.warn(`Cube face format ${level.type} is not supported`);
        return undefined;
    }
    // Each face has to be a DataTexture, not a bare {data, width, height}:
    // WebGLTextures decides how to upload a cube by reading
    // `texture.image[0].isDataTexture`, then takes `texture.image[i].image` for
    // the pixels. A plain object fails that test and every face is skipped
    // with texImage2D, leaving the cube empty and the sky unrendered.
    const face2 = new THREE.DataTexture(rgba as unknown as Uint8ClampedArray<ArrayBuffer>, level.width, level.height, THREE.RGBAFormat);
    face2.needsUpdate = true;
    images.push(face2);
  }

  const texture = new THREE.CubeTexture(images as unknown as HTMLImageElement[]);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function toArrayBuffer(data: Uint8Array | Uint8ClampedArray): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

export function mipmapsToTexture(mipmaps: Mipmaps): THREE.Texture {
  let textures: THREE.Texture[] = [];

  mipmaps = generateMissingMipmaps(mipmaps);

  // ONE texture carrying the WHOLE chain.
  //
  // This used to build a separate texture per mip level and return the first,
  // so for compressed formats every level past 0 was constructed and thrown
  // away: the GPU never saw the chain, minFilter stayed at LinearFilter, and
  // every DXT texture in the scene aliased under minification -- the caustics
  // and torch projections shimmered as if their mipmaps were corrupt. The
  // files' chains were fine all along (the golden texture tests decode them
  // bit-exact); they simply never reached the GPU.
  const first = mipmaps[0];
  if (!first) {
    console.log(`Failed to load mipmaps`, mipmaps);
    return undefined as unknown as THREE.Texture;
  }

  let texture: THREE.Texture;
  switch (first.type) {
    case "DXT1":
    case "DXT3":
    case "DXT5": {
      const format =
        first.type === "DXT1"
          ? THREE.RGBA_S3TC_DXT1_Format
          : first.type === "DXT3"
            ? THREE.RGBA_S3TC_DXT3_Format
            : THREE.RGBA_S3TC_DXT5_Format;
      const chain = mipmaps.map((m) => ({ data: m.data, width: m.width, height: m.height }));
      texture = new THREE.CompressedTexture(chain as unknown as ImageData[], first.width, first.height, format);
      // Mipmap filtering only when the chain runs all the way to 1x1. Three
      // r149 never sets TEXTURE_MAX_LEVEL, so sampling a PARTIAL chain with a
      // mipmap filter reads levels that were never uploaded and the texture is
      // incomplete -- which WebGL renders as black.
      const last = mipmaps[mipmaps.length - 1];
      const complete = Math.max(last.width, last.height) === 1;
      texture.minFilter = complete && mipmaps.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      break;
    }
    case "ARGB":
    case "RGBA": {
      for (const mipmap of mipmaps) {
        const data = mipmap.type === "ARGB" ? convertARGBtoRGBA(mipmap.data) : mipmap.data;
        textures.push(new THREE.DataTexture(data as unknown as Uint8ClampedArray<ArrayBuffer>, mipmap.width, mipmap.height, THREE.RGBAFormat));
      }
      texture = textures[0];
      const images = textures.map((t) => t.image);
      (texture as THREE.DataTexture).mipmaps = images;
      const lastRgba = mipmaps[mipmaps.length - 1];
      texture.minFilter =
        textures.length > 1 && Math.max(lastRgba.width, lastRgba.height) === 1
          ? THREE.LinearMipmapLinearFilter
          : THREE.LinearFilter;
      break;
    }
    default:
      console.log(`Failed to load mipmaps`, mipmaps);
      return undefined as unknown as THREE.Texture;
  }

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  texture.needsUpdate = true;

  return texture;
}

function convertARGBtoRGBA(data: Uint8ClampedArray | Uint8Array): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length / 4; i++) {
    rgba[i * 4 + 0] = data[i * 4 + 1];
    rgba[i * 4 + 1] = data[i * 4 + 2];
    rgba[i * 4 + 2] = data[i * 4 + 3];
    rgba[i * 4 + 3] = data[i * 4 + 0];
  }
  return rgba;
}
