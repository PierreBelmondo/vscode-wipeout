import { BufferRange } from "@core/utils/range";
import { VexxNode, VexxNodeType } from "./node";

import { Vexx4NodeType } from "./v4/type";
import { VexxNodeAirbrake } from "./v4/airbrake";
import { VexxNodeAmbientLight } from "./v4/ambient_light";
import { VexxNodeAnimationTrigger } from "./v4/animation_trigger";
import { VexxNodeAnimTransform } from "./v4/anim_transform";
import { VexxNodeBlob } from "./v4/blob";
import { VexxNodeCamera } from "./v4/camera";
import { VexxNodeCloudCube } from "./v4/cloud_cube";
import { VexxNodeCloudGroup } from "./v4/cloud_group";
import { VexxNodeCurveShape } from "./v4/curve_shape";
import { VexxNodeDirectionalLight } from "./v4/directional_light";
import { VexxNodeDynamicShadowOccluder } from "./v4/dynamic_shadow_occluder";
import { VexxNodeEngineFlare } from "./v4/engine_flare";
import { VexxNodeExitGlow } from "./v4/exit_glow";
import { VexxNodeFloorCollision } from "./v4/collision";
import { VexxNodeFogCube } from "./v4/fog_cube";
import { VexxNodeGridCamera } from "./v4/grid_camera";
import { VexxNodeGroup } from "./v4/group";
import { VexxNodeLensFlare } from "./v4/lens_flare";
import { VexxNodeLodGroup } from "./v4/lod_group";
import { VexxNodeParticleSystem } from "./v4/particle_system";
import { VexxNodePositionShape } from "./v4/weather_position";
import { VexxNodeQuake } from "./v4/quake";
import { VexxNodeResetCollision } from "./v4/collision";
import { VexxNodeSea } from "./v4/sea";
import { VexxNodeSeaReflect } from "./v4/sea_reflect";
import { VexxNodeSeaweed } from "./v4/seaweed";
import { VexxNodeSection } from "./v4/section";
import { VexxNodeShadow } from "./v4/shadow";
import { VexxNodeMesh } from "./v4/mesh";
import { VexxNodeShipColisionFx } from "./v4/ship_colision_fx";
import { VexxNodeShipMuzzle } from "./v4/ship_muzzle";
import { VexxNodeSkycube } from "./v4/skycube";
import { VexxNodeSound } from "./v4/sound";
import { VexxNodeSpeaker } from "./v4/speaker";
import { VexxNodeSpeedupPad } from "./v4/speedup_pad";
import { VexxNodeStartPosition } from "./v4/start_position";
import { VexxNodeTexture } from "./v4/texture";
import { VexxNodeTrail } from "./v4/trail";
import { VexxNodeTransform } from "./v4/transform";
import { VexxNodeWallCollision } from "./v4/collision";
import { VexxNodeWeaponPad } from "./v4/weapon_pad";
import { VexxNodeWoPoint } from "./v4/wo_point";
import { VexxNodeWoSpot } from "./v4/wo_spot";
import { VexxNodeWoTrack } from "./v4/wo_track";
import { VexxNodeWorld } from "./v4/world";
import { VexxNodeEngineFire } from "./v4/engine_fire";

import { Vexx6NodeType } from "./v6/type";
import { VexxNodeCageCollision } from "./v6/cage_collision";
import { VexxNodeCanonFlash } from "./v6/canon_flash";
import { VexxNodeMagFloorCollision } from "./v6/mag_floor_collision";
import { VexxNodePointLight } from "./v6/point_light";
import { VexxNodeSoundCone } from "./v6/sound_cone";
import { VexxNodeWingTip } from "./v6/wingtip";
import { VexxNodeTrackWallCollision } from "./v6/track_wall_collision";
import { VexxNodeAbsorb } from "./v6/absorb";

VexxNode.registerV4(Vexx4NodeType.AIRBRAKE, VexxNodeAirbrake);
VexxNode.registerV4(Vexx4NodeType.AMBIENT_LIGHT, VexxNodeAmbientLight);
VexxNode.registerV4(Vexx4NodeType.ANIMATION_TRIGGER, VexxNodeAnimationTrigger);
VexxNode.registerV4(Vexx4NodeType.ANIM_TRANSFORM, VexxNodeAnimTransform);
VexxNode.registerV4(Vexx4NodeType.BLOB, VexxNodeBlob);
VexxNode.registerV4(Vexx4NodeType.CAMERA, VexxNodeCamera);
VexxNode.registerV4(Vexx4NodeType.CLOUD_CUBE, VexxNodeCloudCube);
VexxNode.registerV4(Vexx4NodeType.CLOUD_GROUP, VexxNodeCloudGroup);
VexxNode.registerV4(Vexx4NodeType.CURVE_SHAPE, VexxNodeCurveShape);
VexxNode.registerV4(Vexx4NodeType.DIRECTIONAL_LIGHT, VexxNodeDirectionalLight);
VexxNode.registerV4(Vexx4NodeType.DYNAMIC_SHADOW_OCCLUDER, VexxNodeDynamicShadowOccluder);
VexxNode.registerV4(Vexx4NodeType.ENGINE_FIRE, VexxNodeEngineFire);
VexxNode.registerV4(Vexx4NodeType.ENGINE_FLARE, VexxNodeEngineFlare);
VexxNode.registerV4(Vexx4NodeType.EXIT_GLOW, VexxNodeExitGlow);
VexxNode.registerV4(Vexx4NodeType.FLOOR_COLLISION, VexxNodeFloorCollision);
VexxNode.registerV4(Vexx4NodeType.FOG_CUBE, VexxNodeFogCube);
VexxNode.registerV4(Vexx4NodeType.GROUP, VexxNodeGroup);
VexxNode.registerV4(Vexx4NodeType.GRID_CAMERA, VexxNodeGridCamera);
VexxNode.registerV4(Vexx4NodeType.LENS_FLARE, VexxNodeLensFlare);
VexxNode.registerV4(Vexx4NodeType.LOD_GROUP, VexxNodeLodGroup);
VexxNode.registerV4(Vexx4NodeType.MESH, VexxNodeMesh);
VexxNode.registerV4(Vexx4NodeType.PARTICLE_SYSTEM, VexxNodeParticleSystem);
VexxNode.registerV4(Vexx4NodeType.QUAKE, VexxNodeQuake);
VexxNode.registerV4(Vexx4NodeType.RESET_COLLISION, VexxNodeResetCollision);
VexxNode.registerV4(Vexx4NodeType.SEA, VexxNodeSea);
VexxNode.registerV4(Vexx4NodeType.SEAWEED, VexxNodeSeaweed);
VexxNode.registerV4(Vexx4NodeType.SEA_REFLECT, VexxNodeSeaReflect);
VexxNode.registerV4(Vexx4NodeType.SECTION, VexxNodeSection);
VexxNode.registerV4(Vexx4NodeType.SHADOW, VexxNodeDynamicShadowOccluder);
VexxNode.registerV4(Vexx4NodeType.SHADOW, VexxNodeShadow);
VexxNode.registerV4(Vexx4NodeType.SHIP_COLLISION_FX, VexxNodeShipColisionFx);
VexxNode.registerV4(Vexx4NodeType.SHIP_MUZZLE, VexxNodeShipMuzzle);
VexxNode.registerV4(Vexx4NodeType.SKYCUBE, VexxNodeSkycube);
VexxNode.registerV4(Vexx4NodeType.SOUND, VexxNodeSound);
VexxNode.registerV4(Vexx4NodeType.SPEAKER, VexxNodeSpeaker);
VexxNode.registerV4(Vexx4NodeType.SPEEDUP_PAD, VexxNodeSpeedupPad);
VexxNode.registerV4(Vexx4NodeType.START_POSITION, VexxNodeStartPosition);
VexxNode.registerV4(Vexx4NodeType.TEXTURE, VexxNodeTexture);
VexxNode.registerV4(Vexx4NodeType.TRAIL, VexxNodeTrail);
VexxNode.registerV4(Vexx4NodeType.TRANSFORM, VexxNodeTransform);
VexxNode.registerV4(Vexx4NodeType.WALL_COLLISION, VexxNodeWallCollision);
VexxNode.registerV4(Vexx4NodeType.WEAPON_PAD, VexxNodeWeaponPad);
VexxNode.registerV4(Vexx4NodeType.WEATHER_POSITION, VexxNodePositionShape);
VexxNode.registerV4(Vexx4NodeType.WO_POINT, VexxNodeWoPoint);
VexxNode.registerV4(Vexx4NodeType.WO_SPOT, VexxNodeWoSpot);
VexxNode.registerV4(Vexx4NodeType.WO_TRACK, VexxNodeWoTrack);
VexxNode.registerV4(Vexx4NodeType.WORLD, VexxNodeWorld);

VexxNode.registerV6(Vexx6NodeType.ABSORB, VexxNodeAbsorb);
VexxNode.registerV6(Vexx6NodeType.AIRBRAKE, VexxNodeAirbrake);
VexxNode.registerV6(Vexx6NodeType.AMBIENT_LIGHT, VexxNodeAmbientLight);
VexxNode.registerV6(Vexx6NodeType.ANIMATION_TRIGGER, VexxNodeAnimationTrigger);
VexxNode.registerV6(Vexx6NodeType.ANIM_TRANSFORM, VexxNodeAnimTransform);
VexxNode.registerV6(Vexx6NodeType.BLOB, VexxNodeBlob);
VexxNode.registerV6(Vexx6NodeType.CAGE_COLLISION, VexxNodeCageCollision);
VexxNode.registerV6(Vexx6NodeType.CAMERA, VexxNodeCamera);
VexxNode.registerV6(Vexx6NodeType.CANON_FLASH, VexxNodeCanonFlash);
VexxNode.registerV6(Vexx6NodeType.CLOUD_CUBE, VexxNodeCloudCube);
VexxNode.registerV6(Vexx6NodeType.CLOUD_GROUP, VexxNodeCloudGroup);
VexxNode.registerV6(Vexx6NodeType.CURVE_SHAPE, VexxNodeCurveShape);
VexxNode.registerV6(Vexx6NodeType.DIRECTIONAL_LIGHT, VexxNodeDirectionalLight);
VexxNode.registerV6(Vexx6NodeType.DYNAMIC_SHADOW_OCCLUDER, VexxNodeDynamicShadowOccluder);
VexxNode.registerV6(Vexx6NodeType.ENGINE_FIRE, VexxNodeEngineFire);
VexxNode.registerV6(Vexx6NodeType.ENGINE_FLARE, VexxNodeEngineFlare);
VexxNode.registerV6(Vexx6NodeType.EXIT_GLOW, VexxNodeExitGlow);
VexxNode.registerV6(Vexx6NodeType.FLOOR_COLLISION, VexxNodeFloorCollision);
VexxNode.registerV6(Vexx6NodeType.FOG_CUBE, VexxNodeFogCube);
VexxNode.registerV6(Vexx6NodeType.GRID_CAMERA, VexxNodeGridCamera);
VexxNode.registerV6(Vexx6NodeType.GROUP, VexxNodeGroup);
VexxNode.registerV6(Vexx6NodeType.LENS_FLARE, VexxNodeLensFlare);
VexxNode.registerV6(Vexx6NodeType.LOD_GROUP, VexxNodeLodGroup);
VexxNode.registerV6(Vexx6NodeType.PARTICLE_SYSTEM, VexxNodeParticleSystem);
VexxNode.registerV6(Vexx6NodeType.POINT_LIGHT, VexxNodePointLight);
VexxNode.registerV6(Vexx6NodeType.QUAKE, VexxNodeQuake);
VexxNode.registerV6(Vexx6NodeType.RESET_COLLISION, VexxNodeResetCollision);
VexxNode.registerV6(Vexx6NodeType.SEA, VexxNodeSea);
VexxNode.registerV6(Vexx6NodeType.SEAWEED, VexxNodeSeaweed);
VexxNode.registerV6(Vexx6NodeType.SEA_REFLECT, VexxNodeSeaReflect);
VexxNode.registerV6(Vexx6NodeType.SECTION, VexxNodeSection);
VexxNode.registerV6(Vexx6NodeType.SHADOW, VexxNodeDynamicShadowOccluder);
VexxNode.registerV6(Vexx6NodeType.MAG_FLOOR_COLLISION, VexxNodeMagFloorCollision);
VexxNode.registerV6(Vexx6NodeType.MESH, VexxNodeMesh);
VexxNode.registerV6(Vexx6NodeType.SHADOW, VexxNodeShadow);
VexxNode.registerV6(Vexx6NodeType.SHIP_COLLISION_FX, VexxNodeShipColisionFx);
VexxNode.registerV6(Vexx6NodeType.SHIP_MUZZLE, VexxNodeShipMuzzle);
VexxNode.registerV6(Vexx6NodeType.SKYCUBE, VexxNodeSkycube);
VexxNode.registerV6(Vexx6NodeType.SOUND, VexxNodeSound);
VexxNode.registerV6(Vexx6NodeType.SOUND_CONE, VexxNodeSoundCone);
VexxNode.registerV6(Vexx6NodeType.SPEEDUP_PAD, VexxNodeSpeedupPad);
VexxNode.registerV6(Vexx6NodeType.START_POSITION, VexxNodeStartPosition);
VexxNode.registerV6(Vexx6NodeType.TEXTURE, VexxNodeTexture);
VexxNode.registerV6(Vexx6NodeType.TRACK_WALL_COLLISION, VexxNodeTrackWallCollision);
VexxNode.registerV6(Vexx6NodeType.TRAIL, VexxNodeTrail);
VexxNode.registerV6(Vexx6NodeType.TRANSFORM, VexxNodeTransform);
VexxNode.registerV6(Vexx6NodeType.WALL_COLLISION, VexxNodeWallCollision);
VexxNode.registerV6(Vexx6NodeType.WEAPON_PAD, VexxNodeWeaponPad);
VexxNode.registerV6(Vexx6NodeType.WEATHER_POSITION, VexxNodePositionShape);
VexxNode.registerV6(Vexx6NodeType.WO_POINT, VexxNodeWoPoint);
VexxNode.registerV6(Vexx6NodeType.WO_SPOT, VexxNodeWoSpot);
VexxNode.registerV6(Vexx6NodeType.WO_TRACK, VexxNodeWoTrack);
VexxNode.registerV6(Vexx6NodeType.WING_TIP, VexxNodeWingTip);
VexxNode.registerV6(Vexx6NodeType.WORLD, VexxNodeWorld);

class VexxHeader {
  range = new BufferRange();
  version = 4;
  nodesSize = 0;
  texturesSize = 0;
  magic = "VEXX";

  static get size() {
    return 16;
  }

  static load(range: BufferRange) {
    const ret = new VexxHeader();
    range = ret.range = range.slice(0, 16);
    ret.version = range.getUint32(0);
    ret.nodesSize = range.getUint32(4);
    ret.texturesSize = range.getUint32(8);
    return ret;
  }

  get size() {
    return this.range.size;
  }

  get nodesBegin() {
    return this.size;
  }

  get texturesBegin() {
    return this.size + this.nodesSize;
  }

  nodesRange() {
    return this.range.reset(this.nodesBegin, this.nodesBegin + this.nodesSize);
  }

  texturesRange() {
    return this.range.reset(this.texturesBegin, this.texturesBegin + this.texturesSize);
  }
}

export class Vexx {
  range = new BufferRange();
  header = new VexxHeader();
  root: VexxNode = new VexxNodeWorld();

  get name(): string {
    return "VEXX";
  }

  static load(buffer: ArrayBuffer): Vexx {
    const ret = new Vexx();
    ret.range = new BufferRange(buffer);

    // Check endianess of file
    const tmpMagic = ret.range.slice(12, 16).getString();
    if (tmpMagic == "XXEV") ret.range.le = false;

    ret.header = VexxHeader.load(ret.range);

    const nodesRange = ret.header.nodesRange();
    const texturesRange = ret.header.texturesRange();

    const totalSize = ret.header.size + nodesRange.size + texturesRange.size;
    if (totalSize != buffer.byteLength) console.warn("Total expected size is different than file size");

    const node = Vexx.loadNode(nodesRange, ret.header.version);
    if (!(node instanceof VexxNodeWorld)) console.warn("root node is not of type World ?");
    ret.root = node;

    if (texturesRange.size > 0) {
      let offset = texturesRange.begin;
      for (const texture of ret.textures) {
        texture.setCmapRange(offset, offset + texture.properties.cmapSize);
        offset += texture.properties.cmapSize;
        texture.setDataRange(offset, offset + texture.properties.dataSize);
        offset += texture.properties.dataSize;
        texture.loadTexture();
      }
    }

    return ret;
  }

  private static loadNode(range: BufferRange, version: number): VexxNode {
    const node = VexxNode.load(range, version);
    for (let i = 0; i < node.header.childrenCount; i++) {
      const childrenSlice = range.slice(node.sizeWithChildren);
      const child = Vexx.loadNode(childrenSlice, version);
      child.parent = node;
      node.children.push(child);
    }
    return node;
  }

  filter(cb: (node: VexxNode) => boolean): VexxNode[] {
    const ret: VexxNode[] = [];
    this.root.forEach((node) => {
      if (cb(node)) ret.push(node);
    });
    return ret;
  }

  traverse(callback: (node: VexxNode) => void) {
    this.root.traverse(callback);
  }

  get textures(): VexxNodeTexture[] {
    switch (this.header.version) {
      case 4:
        return this.filter((n) => n.typeInfo.type == Vexx4NodeType.TEXTURE) as unknown as VexxNodeTexture[];
      case 6:
        return this.filter((n) => n.typeInfo.type == Vexx6NodeType.TEXTURE) as unknown as VexxNodeTexture[];
      default:
        return [];
    }
  }

  dumpNode(node: VexxNode, level = 0) {
    console.log(" ".repeat(level * 2) + node.header.name + " (" + node.header.childrenCount + " children)");
    for (const child of node.children) {
      this.dumpNode(child, level + 1);
    }
  }

  dump() {
    this.dumpNode(this.root);
  }
}
