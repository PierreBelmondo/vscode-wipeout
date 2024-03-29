export enum Vexx6NodeType {
  _UNKNOWN = -1,
  GROUP = 0x000,
  TRANSFORM = 0x06e,
  WORLD = 0x0f4,
  CAMERA = 0x0f7,
  CURVE_SHAPE = 0x101,
  MESH = 0x125,
  AMBIENT_LIGHT = 0x12c,
  NURBS_SURFACE = 0x123,
  DIRECTIONAL_LIGHT = 0x131,
  POINT_LIGHT = 0x132,
  LOD_GROUP = 0x2ee,
  FLOOR_COLLISION = 0x3b9,
  WALL_COLLISION = 0x3ba,
  WO_TRACK = 0x3bb,
  START_POSITION = 0x3bc,
  SPEEDUP_PAD = 0x3bd,
  WEAPON_PAD = 0x3be,
  ENGINE_FLARE = 0x3bf,
  ANIM_TRANSFORM = 0x3c0,
  TEXTURE = 0x3C1,
  DYNAMIC_POINT_LIGHT = 0x3c2,
  DYNAMIC_SHADOW_OCCLUDER = 0x3c3,
  PARTICLE_SYSTEM = 0x3c4,
  AIRBRAKE = 0x3c5,
  SKYCUBE = 0x3c6,
  QUAKE = 0x3c7,
  TRAIL = 0x3c8,
  SECTION = 0x3c9,
  GATE = 0x3ca,
  SHADOW = 0x3cb,
  SPEAKER = 0x3cc,
  RESET_COLLISION = 0x3cd,
  WO_SPOT = 0x3ce,
  WO_POINT = 0x3cf,
  SHIP_COLLISION_FX = 0x3d0,
  FOG_CUBE = 0x3d3,
  MESH_NODE_GHOST = 0x3d4,
  SEAWEED = 0x3d5,
  SEA = 0x3d6,
  SEA_REFLECT = 0x3d7,
  CLOUD_CUBE = 0x3d8,
  CLOUD_GROUP = 0x3d9,
  WEATHER_POSITION = 0x3da,
  UNUSED_1 = 0x3db,
  ANIMATION_TRIGGER = 0x3dc,
  GRID_CAMERA = 0x3dd,
  LENS_FLARE = 0x3de,
  TEXTURE_BLOB = 0x3df,
  BLOB = 0x3e0,
  SOUND = 0x3e1,
  SOUND_CONE = 0x3e9, // only in v6
  SHIP_MUZZLE = 0x3e2,
  EXIT_GLOW = 0x3e4,
  ENGINE_FIRE = 0x3e5,
  MAG_FLOOR_COLLISION = 0x3e6, // only in v6
  CAGE_COLLISION = 0x3e7, // only in v6
  CANON_FLASH = 0x3eb, // only in v6
  WING_TIP = 0x3ec, // only in v6
  TRACK_WALL_COLLISION = 0x3ed, // only in v6
  ABSORB = 0x3ee // only in v6
}