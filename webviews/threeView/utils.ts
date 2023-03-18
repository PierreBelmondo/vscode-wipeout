import * as THREE from "three";

import { Mipmaps } from "@core/utils/mipmaps";

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

export function mipmapsToTexture(mipmaps: Mipmaps): THREE.Texture {
    let textures: THREE.Texture[] = [];
    
    mipmaps = generateMissingMipmaps(mipmaps);

    for (const mipmap of mipmaps) {
      switch (mipmap.type) {
        case "RGBA": {
          const texture = new THREE.DataTexture(mipmap.data, mipmap.width, mipmap.height, THREE.RGBAFormat);
          textures.push(texture);
          break;
        }
        case "DXT1": {
          const imd = [mipmap as unknown as ImageData];
          const texture = new THREE.CompressedTexture(imd, mipmap.width, mipmap.height, THREE.RGBA_S3TC_DXT1_Format);
          textures.push(texture);
          break;
        }
        case "DXT3": {
          const imd = [mipmap as unknown as ImageData];
          const texture = new THREE.CompressedTexture(imd, mipmap.width, mipmap.height, THREE.RGBA_S3TC_DXT3_Format);
          textures.push(texture);
          break;
        }
        case "DXT5": {
          const imd = [mipmap as unknown as ImageData];
          const texture = new THREE.CompressedTexture(imd, mipmap.width, mipmap.height, THREE.RGBA_S3TC_DXT5_Format);
          textures.push(texture);
          break;
        }
      }
    }

    const texture = textures[0];
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    if (textures.length > 0 && texture instanceof THREE.DataTexture) {
        const images = textures.map((texture) => texture.image);
        texture.mipmaps = images;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
    }

    return texture;
}
