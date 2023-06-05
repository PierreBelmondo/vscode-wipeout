import * as THREE from "three";

import { basicalpha } from "./basicalpha";
import { basic_vertexemissive } from "./basic_vertexemissive";
import { billboarddiffuse } from "./billboarddiffuse";
import { carbonfibre } from "./carbonfibre";
import { constantmaterial } from "./constantmaterial";
import { constantmaterial_vertalpha } from "./constantmaterial_vertalpha";
import { detonator_diffuse_with_specular_from_alpha_n_vcol } from "./detonator_diffuse_with_specular_from_alpha_n_vcol";
import { detonator_emissive_bloom } from "./detonator_emissive_bloom";
import { diffuse } from "./diffuse";
import { diffuse_normal_specular_emmissive_alpha } from "./diffuse_normal_specular_emmissive_alpha";
import { diffuse_specular } from "./diffuse_specular";
import { diffuse_vcol } from "./diffuse_vcol";
import { diffuse_with_specular_from_alpha_n_vcol } from "./diffuse_with_specular_from_alpha_n_vcol";
import { diffuse_with_specular_from_alpha_vcol } from "./diffuse_with_specular_from_alpha_vcol";
import { emissive_bloom } from "./emissive_bloom";
import { emissivecolourchange } from "./emissivecolourchange";
import { flame_test } from "./flame_test";
import { glass_colour_spec_trans } from "./glass_colour_spec_trans";
import { glass_texture } from "./glass_texture";
import { glass_texture_clamped } from "./glass_texture_clamped";
import { glass_texture_n } from "./glass_texture_n";
import { hexagonalshield_rich } from "./hexagonalshield_rich";
import { holographic_projector2 } from "./holographic_projector2";
import { holographic_test } from "./holographic_test";
import { lambert } from "./lambert";
import { medal } from "./medal";
import { orange_glass } from "./orange_glass";
import { simpletexture } from "./simpletexture";
import { simpletextureandtexturealpha } from "./simpletextureandtexturealpha";
import { simpletextureandtexturealphauvoffsetscale } from "./simpletextureandtexturealphauvoffsetscale";
import { tech_de_ra_rocks } from "./tech_de_ra_rocks";
import { tracktexture_with_normal } from "./tracktexture_with_normal";

const FACTORIES = [
  basicalpha,
  basic_vertexemissive,
  billboarddiffuse,
  carbonfibre,
  constantmaterial,
  constantmaterial_vertalpha,
  constantmaterial_vertalpha,
  detonator_diffuse_with_specular_from_alpha_n_vcol,
  detonator_emissive_bloom,
  diffuse,
  diffuse_normal_specular_emmissive_alpha,
  diffuse_specular,
  diffuse_vcol,
  diffuse_with_specular_from_alpha_n_vcol,
  diffuse_with_specular_from_alpha_vcol,
  emissive_bloom,
  emissivecolourchange,
  flame_test,
  glass_colour_spec_trans,
  glass_texture,
  glass_texture_clamped,
  glass_texture_n,
  hexagonalshield_rich,
  holographic_projector2,
  holographic_test,
  lambert,
  medal,
  orange_glass,
  simpletexture,
  simpletextureandtexturealpha,
  simpletextureandtexturealphauvoffsetscale,
  tech_de_ra_rocks,
  tracktexture_with_normal,
];

export function createMaterial(name: string, textures: THREE.Texture[]) {
  const factory = FACTORIES.find((factory) => factory.name == name);

  if (factory) {
    if (textures.length < factory.minTextures) {
      console.warn(`Wrong number of textures for '${name}' (${factory.minTextures} !< ${textures.length} < ${factory.minTextures})`);
    }
    if (textures.length > factory.maxTextures) {
      console.warn(`Wrong number of textures for '${name}' (${factory.minTextures} < ${textures.length} !< ${factory.maxTextures})`);
    }
    const material = factory.make(textures);
    material.name = name;
    return material;
  }

  console.warn(`Unsupported material: ${name} ${textures}`);
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
