import * as THREE from "three";

import { api } from "../api";
import { Loader } from ".";
import { MeshSkyMaterial } from "../materials/MeshSkyMaterial";
import { mipmapsToTexture } from "../utils";
import { RCSModelLoader } from "./RCSMODELLoader";
import { World } from "../worlds";

import { GU } from "@core/utils/pspgu";
import { Vexx } from "@core/formats/vexx";
import { VexxNode, VexxNodeMatrix } from "@core/formats/vexx/node";
import { VexxNodeAirbrake } from "@core/formats/vexx/v4/airbrake";
import { VexxNodeAmbientLight } from "@core/formats/vexx/v4/ambient_light";
import { VexxNodeAnimTransform } from "@core/formats/vexx/v4/anim_transform";
import { VexxNodeCamera } from "@core/formats/vexx/v4/camera";
import { VexxNodeCollision } from "@core/formats/vexx/v4/collision";
import { VexxNodeEngineFire } from "@core/formats/vexx/v4/engine_fire";
import { VexxNodeEngineFlare } from "@core/formats/vexx/v4/engine_flare";
import { VexxNodeLodGroup } from "@core/formats/vexx/v4/lod_group";
import { VexxNodeMesh } from "@core/formats/vexx/v4/mesh";
import { VexxNodeSea } from "@core/formats/vexx/v4/sea";
import { VexxNodeSeaReflect } from "@core/formats/vexx/v4/sea_reflect";
import { VexxNodeShipColisionFx } from "@core/formats/vexx/v4/ship_colision_fx";
import { VexxNodeShipMuzzle } from "@core/formats/vexx/v4/ship_muzzle";
import { VexxNodeSkycube } from "@core/formats/vexx/v4/skycube";
import { VexxNodeSound } from "@core/formats/vexx/v4/sound";
import { VexxNodeSpeaker } from "@core/formats/vexx/v4/speaker";
import { VexxNodeSpeedupPad } from "@core/formats/vexx/v4/speedup_pad";
import { VexxNodeStartPosition } from "@core/formats/vexx/v4/start_position";
import { VexxNodeTrail } from "@core/formats/vexx/v4/trail";
import { VexxNodeTransform } from "@core/formats/vexx/v4/transform";
import { VexxNodeWeaponPad } from "@core/formats/vexx/v4/weapon_pad";
import { VexxNodeAbsorb } from "@core/formats/vexx/v6/absorb";
import { VexxNodeWingTip } from "@core/formats/vexx/v6/wingtip";

class AsyncRcsMesh {
  world: World;
  vexxMesh: VexxNodeMesh;
  object: THREE.Object3D;

  constructor(world: World, vexxMesh: VexxNodeMesh, object: THREE.Object3D) {
    this.world = world;
    this.vexxMesh = vexxMesh;
    this.object = object;
  }

  async load() {
    const externalId = this.vexxMesh.externalId;
  }
}

class AsyncRcsModel {
  rcsModelLoader = new RCSModelLoader();
  asyncRcsMeshes: AsyncRcsMesh[] = [];
  world: World;

  constructor(world: World) {
    this.world = world;
  }

  requireAsyncMesh(asyncMesh: AsyncRcsMesh) {
    this.asyncRcsMeshes.push(asyncMesh);
  }

  async load(buffer: ArrayBuffer, filename: string) {
    this.rcsModelLoader.loadFromBuffer(this.world, buffer, filename);
    for (const asyncRcsMesh of this.asyncRcsMeshes) {
      const externalId = asyncRcsMesh.vexxMesh.externalId;
      for (const object of this.world.scene.children) {
        if (!object.userData.externalId) continue;
        if (object.userData.externalId != externalId) continue;
        this.world.scene.remove(object);
        asyncRcsMesh.object.add(object);
      }
    }
  }

  async import(buffer: ArrayBuffer, filename: string) {
    this.rcsModelLoader.import(buffer, filename);
  }
}

class AsyncVexxModel {
  world: World;
  parent: VEXXLoader;

  constructor(world: World, parent: VEXXLoader) {
    this.world = world;
    this.parent = parent;
  }

  async load(filename: string, buffer: ArrayBuffer, engineflare: boolean = false) {
    const vexx = Vexx.load(buffer);
    const object = this.parent.loadNode(this.world, vexx.root);
    if (engineflare) {
      this.world.scene.traverse((locator: THREE.Object3D) => {
        if (locator.name == "engine_flare") {
          for (const child of object.children) locator.add(child);
        }
      });
    } else {
      this.world.scene.add(object);
    }
    const rcsFilename = filename.replace(".vex", ".rcsmodel");
    api.require(rcsFilename);
  }
}

export class VEXXLoader extends Loader {
  asyncVexxModel: AsyncVexxModel;
  asyncRcsModel?: AsyncRcsModel;

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBuffer, filename: string) {
    world.userdata.filename = filename;
    this.asyncVexxModel = new AsyncVexxModel(world, this);
    const vexx = Vexx.load(arrayBuffer);
    this.loadTextures(world, vexx);
    this.loadScene(world, vexx);
    return world;
  }

  override async import(buffer: ArrayBuffer, filename: string) {
    if (this.asyncRcsModel === undefined) {
      console.error("Unexpected file: " + filename);
      return;
    }
    if (filename.endsWith(".vex")) {
      if (filename.endsWith("engineflare.vex")) {
        this.asyncVexxModel.load(filename, buffer, true);
      } else {
        this.asyncVexxModel.load(filename, buffer);
      }
    } else if (filename.endsWith(".rcsmodel")) {
      this.asyncRcsModel.load(buffer, filename);
    } else {
      this.asyncRcsModel.import(buffer, filename);
    }
  }

  require(world: World, object3d: THREE.Object3D, node: VexxNodeMesh) {
    if (this.asyncRcsModel === undefined) {
      this.asyncRcsModel = new AsyncRcsModel(world);
      const filename = world.userdata.filename.replace(".vex", ".rcsmodel");
      api.require(filename);
    }
    const asyncMesh = new AsyncRcsMesh(world, node, object3d);
    this.asyncRcsModel.requireAsyncMesh(asyncMesh);
  }

  private loadTextures(world: World, vexx: Vexx) {
    for (const vexxTexture of vexx.textures) {
      const texture = mipmapsToTexture(vexxTexture.mipmaps);
      texture.name = vexxTexture.name;
      world.textures[vexxTexture.properties.id] = texture;
    }
  }

  private loadScene(world: World, vexx: Vexx) {
    const object = this.loadNode(world, vexx.root);
    world.scene.add(object);
  }

  public loadNode(world: World, node: VexxNode): THREE.Object3D {
    let object: THREE.Object3D;
    let layer: string | null = null;

    switch (node.typeName) {
      case "ABSORB": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeAbsorb);
        layer = "Ship abosrbs";
        break;
      case "AIRBRAKE":
        object = this.loadAirbrake(world, node as VexxNodeAirbrake);
        break;
      case "AMBIENT_LIGHT":
        object = this.loadAmbientLight(world, node as VexxNodeAmbientLight);
        break;
      case "ANIMATION_TRIGGER": // TODO
        object = this.loadControlPoint(world, node);
        layer = "Animation triggers";
        break;
      case "ANIM_TRANSFORM": // TODO
        object = this.loadAnimTransform(world, node as VexxNodeAnimTransform);
        break;
      case "BLOB": // TODO
        object = this.loadControlPoint(world, node);
        layer = "Blobs";
        break;
      case "CAMERA":
        object = this.loadCamera(world, node as VexxNodeCamera);
        layer = "Cameras";
        break;
      case "CANON_FLASH": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "CLOUD_CUBE": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Clouds";
        break;
      case "CLOUD_GROUP": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Clouds";
        break;
      case "CURVE_SHAPE": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Curve";
        break;
      case "DIRECTIONAL_LIGHT": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Lights";
        break;
      case "DYNAMIC_POINT_LIGHT": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Lights";
        break;
      case "DYNAMIC_SHADOW_OCCLUDER": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "ENGINE_FIRE": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeEngineFire);
        layer = "Ship engine fire";
        break;
      case "ENGINE_FLARE": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeEngineFlare);
        api.require("engineflare.vex");
        layer = "Ship engine flare";
        break;
      case "EXIT_GLOW": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "FLOOR_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Floor collisions";
        break;
      case "FOG_CUBE": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Fog";
        break;
      case "GATE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "GRID_CAMERA":
        object = this.loadNodeGeneric(world, node);
        layer = "Cameras";
        break;
      case "GROUP":
        object = this.loadNodeGeneric(world, node);
        break;
      case "LENS_FLARE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "LOD_GROUP":
        object = this.loadLodGroup(world, node as VexxNodeLodGroup);
        break;
      case "MESH":
        object = this.loadMesh(world, node as VexxNodeMesh);
        break;
      case "MESH_NODE_GHOST": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "NURBS_SURFACE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "PARTICLE_SYSTEM": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "POINT_LIGHT": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Lights";
        break;
      case "QUAKE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "RESET_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Reset collisions";
        break;
      case "SEA": // TODO
        object = this.loadMesh(world, node as VexxNodeSea);
        layer = "Sea";
        break;
      case "SEAWEED":
        object = this.loadControlPoint(world, node);
        layer = "Seaweed";
        break;
      case "SEA_REFLECT":
        object = this.loadMesh(world, node as VexxNodeSeaReflect);
        layer = "Sea reflect";
        break;
      case "SECTION": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "SHADOW": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "SHIP_COLLISION_FX": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeShipColisionFx);
        layer = "Ship collisions";
        break;
      case "SHIP_MUZZLE":
        object = this.loadControlPointMatrix(world, node as VexxNodeShipMuzzle);
        layer = "Ship muzzle";
        break;
      case "SKYCUBE":
        object = this.loadMesh(world, node as VexxNodeSkycube);
        layer = "Skybox";
        break;
      case "SOUND": // TODO
        object = this.loadSound(world, node as VexxNodeSound);
        layer = "Sounds";
        break;
      case "SPEAKER": // TODO
        object = this.loadSpeaker(world, node);
        layer = "Sounds";
        break;
      case "SPEEDUP_PAD":
        object = this.loadMesh(world, node as VexxNodeSpeedupPad);
        layer = "Pads";
        break;
      case "START_POSITION":
        object = this.loadControlPointMatrix(world, node as VexxNodeStartPosition);
        layer = "Start position";
        break;
      case "TEXTURE":
        throw new Error("This should not happen");
      case "TEXTURE_BLOB": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "TRACK_WALL_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Track wall collisions";
        break;
      case "TRAIL":
        object = this.loadControlPointMatrix(world, node as VexxNodeTrail);
        break;
      case "TRANSFORM":
        object = this.loadTransform(world, node as VexxNodeTransform);
        break;
      case "UNUSED_1": // TODO ?
        object = this.loadNodeGeneric(world, node);
        break;
      case "WALL_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Wall collisions";
        break;
      case "WEAPON_PAD":
        object = this.loadMesh(world, node as VexxNodeWeaponPad);
        layer = "Pads";
        break;
      case "WEATHER_POSITION": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "WORLD":
        object = this.loadNodeGeneric(world, node);
        break;
      case "WO_POINT": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "WO Points";
        break;
      case "WO_SPOT": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "WO Spots";
        break;
      case "WO_TRACK": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "WO Tracks";
        break;
      case "WING_TIP": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeWingTip);
        layer = "Ship wing tips";
        break;
      default:
        console.warn(`Unexpected node type ${node.typeName} ${node.name}`);
        object = this.loadNodeGeneric(world, node);
        break;
    }

    if (!("format" in object.userData)) {
      object.userData = { format: "VEXX", type: node.typeName };
    }

    if (layer) {
      const layerId = world.getLayer(layer);
      object.layers.set(layerId);
      object.traverse((subobj) => {
        subobj.layers.set(layerId);
      });
    }

    return object;
  }

  private loadNodeGeneric(world: World, node: VexxNode): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;
    for (const child of node.children) {
      if (child.typeName == "TEXTURE") continue;
      const object = this.loadNode(world, child);
      if (object === null) continue;
      group.add(object);
    }
    return group;
  }

  private loadTransform(world: World, node: VexxNodeTransform): THREE.Object3D {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(node.matrix);

    const obj = this.loadNodeGeneric(world, node);
    obj.name = node.name;
    obj.applyMatrix4(matrix);
    return obj;
  }

  private loadLodGroup(world: World, node: VexxNodeLodGroup): THREE.Object3D {
    const lod = new THREE.LOD();
    lod.name = node.name;
    let i = 0;
    for (let child of node.children) {
      const object = this.loadNode(world, child);
      if (object === null) continue;
      lod.addLevel(object, 100 * i++);
    }
    return lod;
  }

  private loadAmbientLight(world: World, node: VexxNodeAmbientLight): THREE.AmbientLight {
    const value = ((255.0 * node.rgba[0]) << 16) + ((255.0 * node.rgba[1]) << 8) + 255.0 * node.rgba[2];
    return new THREE.AmbientLight(value);
  }

  private loadAnimTransform(world: World, node: VexxNodeAnimTransform): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    console.log(node);
    
    if (node.has_position) {
      const m = new THREE.Matrix4();
      m.makeTranslation(node.x, node.y, node.z);
      group.applyMatrix4(m);
    }

    let tracks: THREE.VectorKeyframeTrack[] = [];
    if (node.track1) {
      const track1 = new THREE.VectorKeyframeTrack(".position", node.track1.keys, node.track1.values, THREE.InterpolateSmooth);
      track1.createInterpolant();
      tracks.push(track1);
    }

    if (node.track2) {
      const track2 = new THREE.VectorKeyframeTrack(".position", node.track2.keys, node.track2.values, THREE.InterpolateSmooth);
      track2.createInterpolant();
      tracks.push(track2);
    }

    if (tracks.length > 0) {
      const clip = new THREE.AnimationClip(group.name, 2, tracks);
      const mixer = new THREE.AnimationMixer(group);
      const action = mixer.clipAction(clip);
      action.timeScale = 1;
      //action.clampWhenFinished = true;
      world.addAction(group.name, action, mixer);
    }

    for (const child of node.children) {
      const object = this.loadNode(world, child);
      if (object === null) continue;
      group.add(object);
    }
    return group;
  }

  private loadMesh(world: World, node: VexxNodeMesh): THREE.Object3D {
    if (node.isExternal) {
      const group = new THREE.Group();
      group.name = node.name;
      group.userData = { format: "VEXX", type: "MESH/RCS" };
      this.require(world, group, node);
      return group;
    }

    const primitiveType = (id: number) => {
      switch (id) {
        case GU.PrimitiveType.POINTS:
          return "POINTS";
        case GU.PrimitiveType.LINES:
          return "LINES";
        case GU.PrimitiveType.LINE_STRIP:
          return "LINE_STRIP";
        case GU.PrimitiveType.TRIANGLES:
          return "TRIANGLES";
        case GU.PrimitiveType.TRIANGLE_STRIP:
          return "TRIANGLE_STRIP";
        case GU.PrimitiveType.TRIANGLE_FAN:
          return "TRIANGLE_FAN";
        case GU.PrimitiveType.SPRITES:
          return "SPRITES";
        default:
          return "UNKNOWN";
      }
    };

    const group = new THREE.Group();
    group.name = node.name;

    for (let i = 0; i < node.chunks.length; i++) {
      const chunk = node.chunks[i];
      const chunkHeader = chunk.header;
      const strideInfo = chunkHeader.strideInfo;
      const strides = chunk.strides;

      const geometry = new THREE.BufferGeometry();

      if (strideInfo.vertex.size == 0) continue;
      const positions = strides.map((v) => v.vertex as { x: number; y: number; z: number }).reduce((r, v) => r.concat([v.x, v.y, v.z]), [] as number[]);
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

      if (strideInfo.normal.size > 0) {
        const normals = strides.map((v) => v.normal as { x: number; y: number; z: number }).reduce((r, v) => r.concat([v.x, v.y, v.z]), [] as number[]);
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      }

      let material = world.materials["_default"];
      const textureId = node.materials[chunkHeader.id].textureId;
      if (textureId in world.materials) {
        material = world.materials[textureId];
      } else if (textureId in world.textures) {
        const map = world.textures[textureId];
        if (node.typeName == "MESH") {
          material = new THREE.MeshPhongMaterial({ map });
          material.name = "PhongMaterial_" + textureId;
        } else if (node.typeName == "SKYCUBE") {
          material = new MeshSkyMaterial(map);
          material.name = "SkyMaterial_" + textureId;
        }
        world.materials[textureId] = material;
      }

      if (strideInfo.texture.size > 0) {
        const uvs = strides
          .map((v) => v.uv as { u: number; v: number }) // force cast
          .reduce((r, v) => r.concat([v.u, v.v]), [] as number[]);

        if (strideInfo.texture.size == 1) {
          const attr = new THREE.Int8BufferAttribute(uvs, 2, true);
          geometry.setAttribute("uv", attr);
        } else if (strideInfo.texture.size == 2) {
          const attr = new THREE.Int16BufferAttribute(uvs, 2, true);
          geometry.setAttribute("uv", attr);
        } else if (strideInfo.texture.size == 4) {
          const attr = new THREE.Float32BufferAttribute(uvs, 2, false);
          geometry.setAttribute("uv", attr);
        }
      }

      /*
      if (chunk.colors !== undefined) {
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(chunk.colors, 3)
        );
      }
      */

      const mode = primitiveType(chunk.header.primitiveType);
      if (mode == "TRIANGLE_STRIP") {
        const triangles = positions.length / 3 - 2;
        const indices: number[] = [];
        for (let j = 0; j < triangles; j++) {
          if (j % 2 == 0) {
            indices.push(j + 0);
            indices.push(j + 1);
            indices.push(j + 2);
          } else {
            indices.push(j + 1);
            indices.push(j + 0);
            indices.push(j + 2);
          }
        }
        geometry.setIndex(indices);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = node.name + "__" + i;
      mesh.renderOrder = node.typeName == "SKYCUBE" ? 0 : 1;
      mesh.layers.set(0);
      group.add(mesh);
    }

    return group;
  }

  private loadCollision(world: World, node: VexxNodeCollision): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    for (const block of node.blocks) {
      const geometry = new THREE.BufferGeometry();

      if (block.blocks.length != 3) {
        console.log(`Cannot load collision "${node.name}"`);
        continue;
      }
      if (block.blocks[0].points == null) {
        console.log(`Cannot load collision "${node.name}"`);
        continue;
      }
      if (block.blocks[2].points == null) {
        console.log(`Cannot load collision "${node.name}"`);
        continue;
      }

      const attr = new THREE.Float32BufferAttribute(block.blocks[0].points, 3);
      geometry.setAttribute("position", attr);
      geometry.setIndex(Array.from(block.blocks[2].points));

      const material = world.materials["_defaultCollision"];
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 2;
      mesh.layers.set(2);
      group.add(mesh);
    }

    return group;
  }

  private loadCamera(world: World, node: VexxNodeCamera): THREE.Object3D {
    const camera = new THREE.PerspectiveCamera(45, 1.33, 32, 34);
    camera.name = node.name;

    const helper = new THREE.CameraHelper(camera);
    helper.matrix = new THREE.Matrix4();
    helper.name = `.CameraHelper_${camera.name}`
    camera.add(helper);

    const control = this.createControlPoint(node.name);
    camera.add(control);

    return camera;
  }

  private loadSound(world: World, node: VexxNodeSound): THREE.Object3D {
    return this.createControlPoint(node.name);
  }

  private loadSpeaker(world: World, node: VexxNodeSpeaker): THREE.Object3D {
    return this.createControlPoint(node.name);
  }

  private loadAirbrake(world: World, node: VexxNodeAirbrake): THREE.Object3D {
    const object = this.loadNodeGeneric(world, node);
    object.name = node.name;
    world.addAirbrake(object);
    return object;
  }

  private loadControlPointMatrix(world: World, node: VexxNodeMatrix): THREE.Object3D {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(node.matrix);
    const obj = this.createControlPoint(node.name);
    obj.name = node.name;
    obj.applyMatrix4(matrix);
    return obj;
  }

  private loadControlPoint(world: World, node: VexxNode): THREE.Object3D {
    return this.createControlPoint(node.name);
  }
}
