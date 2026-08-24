import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";
import { WaterMaterial } from "./_water";

/**
 * data/environments/*\/materials/water_noref.rcsmaterial
 *
 * The main sea surface — 3 of the 5 water slots in 01_vineta_k.
 *
 *   tex[0] ?         waves2.gtf      wave/normal detail
 *   tex[1] ?         skyreflect.gtf  sky reflection
 *   tex[2] ?         waves2.gtf      second wave layer (same texture, own UVs)
 *   tex[3] lightmap  lmaps/*-lmap.gtf
 *   Colour           (0.024, 0.039, 0.043)  deep water tint
 *   Specular_Colour  (0.914, 0.914, 0.605)  sun glint
 *   Specular_Power   30
 *
 * "noref" = no planar reflection; it uses the sky texture instead. Every
 * lit permutation also binds paraboloidReflectionTex, which the viewer has no
 * equivalent for — the sky texture stands in as an environment map.
 *
 * Permutation: Ambient of 21 (index 2) — the lit, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 */
export const water_noref: MaterialFactory = {
  name: "water_noref.rcsmaterial",
  minTextures: 2,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [waves, skyreflect, , lightMap] = textures;
    const envMap = skyreflect?.clone();
    if (envMap) {
      envMap.mapping = THREE.EquirectangularReflectionMapping;
      envMap.needsUpdate = true;
    }
    return new WaterMaterial({
      side: THREE.DoubleSide,
      ...(waves ? { map: waves } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
      ...(envMap ? { envMap } : {}),
      reflectivity: 0.35,
      color: new THREE.Color(0x0a1418),
      specular: new THREE.Color(0xe9e99a),
      shininess: 30,
    });
  },
};
