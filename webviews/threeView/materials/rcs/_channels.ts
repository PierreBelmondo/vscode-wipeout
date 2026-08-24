import * as THREE from "three";

/**
 * Texture channel ids, as named by the shaders themselves.
 *
 * Every `.rcsmaterial` permutation lists its fragment samplers by name and
 * hash; these are the sampler entries (`ffff8xxx` / `0000 8xxx` bindings)
 * collected across every material shipped with the game, so the mapping is the
 * engine's own rather than inferred from filenames -- which are unreliable
 * (`ds_sfblend_ns` is a normal map, `and_rock4` appears in both diffuse and
 * normal slots).
 *
 * `slot` is the Three.js material property the channel feeds, or null when the
 * viewer has nothing to bind it to (shadow maps, spot lights, the zone-mode
 * palettes).
 */
export const TEXTURE_CHANNELS: { [id: number]: { name: string; slot: string | null } } = {
  0xd5e000d1: { name: "zoneTexInner", slot: null }, // x34016
  0x1f6f85a3: { name: "zoneTexVis", slot: null }, // x33896
  0x00e5b679: { name: "zoneTexInnerNearest", slot: null }, // x33896
  0x3bdc0403: { name: "Texture1", slot: "map" }, // x28005
  0xcc090349: { name: "zoneTexOuter", slot: null }, // x17008
  0x52834137: { name: "zoneTexOuterNearest", slot: null }, // x16948
  0x730df9ee: { name: "shadowMapTex", slot: null }, // x15906
  0x37b5db58: { name: "lightmap", slot: "lightMap" }, // x15687
  0x21c54273: { name: "textureSpot0ShadowTex", slot: null }, // x15104
  0x1f0f1fa1: { name: "textureSpot0Tex", slot: null }, // x15104
  0xa51b8b14: { name: "directionalLight0LightmapTex", slot: null }, // x14902
  0x9becc725: { name: "directionalLight0ShadowTex", slot: null }, // x14902
  0xa2d555b9: { name: "Texture2", slot: "map" }, // x9415
  0x9edd3243: { name: "paraboloidReflectionTex", slot: "envMap" }, // x9200
  0xce07294d: { name: "textureSpot1ShadowTex", slot: null }, // x6386
  0xa7b378c4: { name: "textureSpot1Tex", slot: null }, // x6386
  0x11cb4f74: { name: "DiffuseTexture", slot: "map" }, // x4586
  0xd9d6922d: { name: "Normal", slot: "normalMap" }, // x2226
  0xdcaf37ac: { name: "diffuseTexture", slot: "map" }, // x2179
  0xa567d33c: { name: "ambientShadowTex", slot: null }, // x2060
  0xfb17503f: { name: "Diffuse_Texture", slot: "map" }, // x1824
  0x85c9fd48: { name: "Wave", slot: "map" }, // x858
  0x15b908fd: { name: "Emissive_Texture", slot: "emissiveMap" }, // x744
  0x872ed3bd: { name: "paraboloidIblTex", slot: "envMap" }, // x720
  0x436d3929: { name: "Normal_Map", slot: "normalMap" }, // x452
  0xabfaed85: { name: "zoneAnisoPalette", slot: null }, // x440
  0x02ab9f07: { name: "Colour", slot: "map" }, // x362
  0xd5d2652f: { name: "Texture3", slot: "map" }, // x327
  0x152839b8: { name: "Specular_Texture", slot: "specularMap" }, // x312
  0x2d5fc6a6: { name: "EnvMap", slot: "envMap" }, // x230
  0xdb88e56b: { name: "zoneAnisoPaletteOuter", slot: null }, // x220
  0x9ee31012: { name: "Diffuse", slot: "map" }, // x216
  0xfa79b1cd: { name: "Emissive", slot: "emissiveMap" }, // x180
  0xc78c9866: { name: "Normal_Opacity", slot: "normalMap" }, // x180
  0xf476bff0: { name: "Specular", slot: "specularMap" }, // x168
  0xec2b3fc2: { name: "screenSpaceReflectionTex", slot: "envMap" }, // x164
  0x0617f872: { name: "Normal_Texture", slot: "normalMap" }, // x152
  0x515e298e: { name: "diffuse", slot: "map" }, // x126
  0xc97c5a4c: { name: "snow", slot: "map" }, // x100
  0x67a30ab1: { name: "snownorm", slot: "normalMap" }, // x100
  0x23433302: { name: "Shield_Texture", slot: "map" }, // x100
  0xc8f18561: { name: "Norm", slot: "normalMap" }, // x98
  0xfe9bd1f3: { name: "icenormal", slot: "normalMap" }, // x88
  0xeddf202a: { name: "snownorm1", slot: "normalMap" }, // x88
  0x030fd39b: { name: "emissive", slot: "emissiveMap" }, // x76
  0x88a0df95: { name: "screenSpaceRefractionTex", slot: null }, // x64
  0x2e7d71db: { name: "snow1", slot: "map" }, // x56
  0xc8b6445d: { name: "rock", slot: "map" }, // x50
  0x34b07bf1: { name: "ice", slot: "map" }, // x50
  0x9fc347ff: { name: "Spec", slot: "specularMap" }, // x48
  0x2f1fc695: { name: "alpha", slot: "alphaMap" }, // x40
  0xc2aa6655: { name: "texture1", slot: "map" }, // x14
};

/** The Three.js slot a channel feeds, or null when it has no equivalent. */
export function channelSlot(id: number): string | null {
  return TEXTURE_CHANNELS[id]?.slot ?? null;
}
