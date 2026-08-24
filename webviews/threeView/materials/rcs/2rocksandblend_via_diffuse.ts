import * as THREE from "three";
import { LIGHTMAP_INTENSITY, MaterialFactory } from "./_abstract";

/**
 * data/environments/*\/materials/2rocksandblend_via_diffuse.rcsmaterial
 *
 * Terrain blend. Three real textures plus an often-real lightmap:
 *   tex[0] ?         j_rockblend*.gtf   blend weights (which layer wins where)
 *   tex[1] Texture1  j_landtext1.gtf    layer A
 *   tex[2] Texture2  j_rock2.gtf | j_landrockblend.gtf   layer B
 *   tex[3] lightmap  lmaps/*-lmap.gtf   real file on most meshes here
 *
 * Rendering tex[0] as the diffuse map is what made the terrain read as
 * black/red: a blend-weight mask is not a colour. Until the blend is
 * implemented, show layer A (Texture1), which is the dominant ground texture.
 *
 * Permutation: Static[0] of 27 — the lit, Ambient, no-shadow, no-spot point of
 *   the matrix (see _abstract.ts). The others are TODO.
 *
 * TODO: real two-layer blend. Needs a ShaderMaterial doing
 *   mix(texture(Texture1, uv), texture(Texture2, uv), blend.<channel>)
 *   — the channel of tex[0] that drives the mix is not identified yet.
 */
export const rocksandblend_via_diffuse_2: MaterialFactory = {
  name: "2rocksandblend_via_diffuse.rcsmaterial",
  minTextures: 3,
  maxTextures: 4,
  make: (textures: THREE.Texture[]) => {
    const [, layerA, , lightMap] = textures;
    return new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      ...(layerA ? { map: layerA } : {}),
      ...(lightMap ? { lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
    });
  },
};
