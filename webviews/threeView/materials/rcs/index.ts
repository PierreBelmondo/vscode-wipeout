import * as THREE from "three";

import { basic_vertexemissive } from "./basic_vertexemissive";
import { carbonfibre } from "./carbonfibre";
import { constantmaterial } from "./constantmaterial";
import { constantmaterial_vertalpha } from "./constantmaterial_vertalpha";
import { detonator_diffuse_with_specular_from_alpha_n_vcol } from "./detonator_diffuse_with_specular_from_alpha_n_vcol";
import { emissive_bloom } from "./emissive_bloom";
import { glass_texture_clamped } from "./glass_texture_clamped";
import { glass_texture } from "./glass_texture";
import { hexagonalshield_rich } from "./hexagonalshield_rich";
import { medal } from "./medal";
import { tracktexture_with_normal } from "./tracktexture_with_normal";

const FACTORIES = [
  basic_vertexemissive,
  carbonfibre,
  constantmaterial,
  constantmaterial_vertalpha,
  detonator_diffuse_with_specular_from_alpha_n_vcol,
  emissive_bloom,
  glass_texture_clamped,
  glass_texture,
  hexagonalshield_rich,
  medal,
  tracktexture_with_normal,
];

export function createMaterial(name: string, textures: THREE.Texture[]) {
  const factory = FACTORIES.find((factory) => factory.name == name);

  if (factory) {
    if (textures.length != factory.textures) {
      console.warn(`Wrong number of textures for '${name}' (${textures.length}!=${factory.textures})`);
    }
    const material = factory.make(textures);
    material.name = name;
    return material;
  }

  //console.log(`Unsupported material: ${name} ${textures}`);
  if (false) {
    return new THREE.MeshBasicMaterial({ name, vertexColors: true });
  } else if (false) {
    return new THREE.MeshNormalMaterial({ name });
  } else {
    if (textures.length == 0) {
      return new THREE.MeshPhongMaterial({
        name,
        side: THREE.DoubleSide,
        color: 0xffffff,
        specular: 0xffffff,
      });
    } else if (textures.length > 0) {
      return new THREE.MeshPhongMaterial({
        name,
        side: THREE.DoubleSide,
        color: 0xffffff,
        specular: 0xffffff,
        map: textures[0],
        specularMap: textures[0],
      });
    }
  }
}
