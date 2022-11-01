import * as THREE from "three";
import { Loader, World } from ".";
import { MeshSkyMaterial } from "../materials/MeshSkyMaterial";

import { Vexx } from "../../../core/vexx";
import { VexxNode, VexxNodeMatrix } from "../../../core/vexx/node";
import { VexxNodeAirbrake } from "../../../core/vexx/v4/airbrake";
import { VexxNodeAmbientLight } from "../../../core/vexx/v4/ambient_light";
import { VexxNodeCamera } from "../../../core/vexx/v4/camera";
import { VexxNodeCollision } from "../../../core/vexx/v4/collision";
import { VexxNodeEngineFire } from "../../../core/vexx/v4/engine_fire";
import { VexxNodeEngineFlare } from "../../../core/vexx/v4/engine_flare";
import { VexxNodeLodGroup } from "../../../core/vexx/v4/lod_group";
import { VexxNodeMesh } from "../../../core/vexx/v4/mesh";
import { VexxNodeSea } from "../../../core/vexx/v4/sea";
import { VexxNodeSeaReflect } from "../../../core/vexx/v4/sea_reflect";
import { VexxNodeShipColisionFx } from "../../../core/vexx/v4/ship_colision_fx";
import { VexxNodeShipMuzzle } from "../../../core/vexx/v4/ship_muzzle";
import { VexxNodeSkycube } from "../../../core/vexx/v4/skycube";
import { VexxNodeSound } from "../../../core/vexx/v4/sound";
import { VexxNodeSpeaker } from "../../../core/vexx/v4/speaker";
import { VexxNodeSpeedupPad } from "../../../core/vexx/v4/speedup_pad";
import { VexxNodeStartPosition } from "../../../core/vexx/v4/start_position";
import { VexxNodeTrail } from "../../../core/vexx/v4/trail";
import { VexxNodeTransform } from "../../../core/vexx/v4/transform";
import { VexxNodeWeaponPad } from "../../../core/vexx/v4/weapon_pad";
import { GU } from "../../../core/utils/pspgu";

import { RCSModelLoader } from "./RCSMODELLoader";

import { vscode } from "../../vscode";
import { VexxNodeAnimTransform } from "../../../core/vexx/v4/anim_transform";
import { Mipmaps } from "../../../core/utils/mipmaps";

const rcsModelLoader = new RCSModelLoader();

class AsyncRcsMesh {
  world: World;
  vexxMesh: VexxNodeMesh;
  object: THREE.Object3D;

  constructor(world: World, vexxMesh: VexxNodeMesh, object: THREE.Object3D) {
    this.world = world;
    this.vexxMesh = vexxMesh;
    this.object = object;
  }

  match(filename: string) {
    return true;
  }

  async load(world: World) {
    const externalId = this.vexxMesh.externalId;
    for (const child of world.scene.children) {
      if (!child.userData.externalId) continue;
      if (child.userData.externalId != externalId) continue;
      if (this.object.parent) {
        const parent = this.object.parent;
        parent.remove(child);

        for (let i = 0; i < this.vexxMesh.chunkLinks.length; i++) {
          const chunkLink = this.vexxMesh.chunkLinks[i];
          const submesh = child.children[i];

          const transform = new THREE.Group();

          /*
          let m = new THREE.Matrix4();
          const x = child.userData.unknownCoordinates.x;
          const y = child.userData.unknownCoordinates.y;
          const z = child.userData.unknownCoordinates.z;
          const w = child.userData.unknownCoordinates.w;
          const e = new THREE.Euler(x,y,z);
          const q = new THREE.Quaternion(x,y,z,w);         
          m = m.makeRotationFromQuaternion(q);
          transform.applyMatrix4(m);
          */

          transform.add(child);
          parent.add(transform);
        }
      }
    }
  }
}

export class VEXXLoader extends Loader {
  asyncRcsMeshes: AsyncRcsMesh[] = [];
  requiredFiles: string[] = [];

  override async load(world: World, buffer: ArrayBufferLike) {
    const model = Vexx.load(buffer);
    this.loadTextures(world, model);
    this.loadScene(world, model);
    for (const requiredFile of this.requiredFiles) vscode.require(requiredFile);
    return world;
  }

  require(filename: string) {
    if (this.requiredFiles.indexOf(filename) != -1) return;
    console.log(`Require ${filename}`);
    this.requiredFiles.push(filename);
  }

  override async import(buffer: ArrayBufferLike, filename: string) {
    if (filename.endsWith(".rcsmodel")) {
      const tmpWorld = new World();
      rcsModelLoader.load(tmpWorld, buffer);
      for (const asyncRcsMesh of this.asyncRcsMeshes) {
        if (asyncRcsMesh.match(filename)) asyncRcsMesh.load(tmpWorld);
      }
    } else {
      rcsModelLoader.import(buffer, filename);
    }
  }

  generateMissingMipmaps(mipmaps: Mipmaps) {
    const last = mipmaps[mipmaps.length - 1];
    let width = last.width;
    let height = last.height;
    while (width > 1) {
      width = Math.floor(width / 2);
      height = Math.floor(height / 2);
      const data = new Uint8ClampedArray(height * width * 4);
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          for (let i = 0; i < 4; i++) {
            let c = 0;
            c += last.data[4 * (x + 0 + (y + 0) * width) + i];
            c += last.data[4 * (x + 1 + (y + 0) * width) + i];
            c += last.data[4 * (x + 0 + (y + 1) * width) + i];
            c += last.data[4 * (x + 1 + (y + 1) * width) + i];
            c = 255;
            data[4 * (x + y * width) + i] = Math.round(c / 4);
          }
        }
      }
      mipmaps.push({ type: "RGBA", width, height, data });
    }
    return mipmaps;
  }

  private loadTextures(world: World, vexx: Vexx) {
    for (const vexxTexture of vexx.textures) {
      let mipmaps: THREE.Texture[] = [];
      //vexxTexture.mipmaps = this.generateMissingMipmaps(vexxTexture.mipmaps);
      for (const vexxMipmap of vexxTexture.mipmaps) {
        const mipmap = new THREE.DataTexture(vexxMipmap.data, vexxMipmap.width, vexxMipmap.height, THREE.RGBAFormat);
        mipmaps.push(mipmap);
      }
      const texture = mipmaps[0];
      const images = mipmaps.map((texture) => texture.image, mipmaps);
      //texture.mipmaps = images;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      //texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.needsUpdate = true;
      texture.name = vexxTexture.name;
      world.textures[vexxTexture.properties.id] = texture;
    }
  }

  private loadScene(world: World, vexx: Vexx) {
    const hemiLight = new THREE.HemisphereLight(0xa0a0a0, 0x080808, 1);
    world.scene.add(hemiLight);
    const object = this.loadNode(world, vexx.root);
    world.scene.add(object);
  }

  private loadNode(world: World, node: VexxNode): THREE.Object3D {
    let object: THREE.Object3D;
    let layer: string | null = null;

    switch (node.typeName) {
      case "AIRBRAKE":
        object = this.loadAirbrake(world, node as VexxNodeAirbrake);
        break;
      case "AMBIENT_LIGHT":
        object = this.loadAmbientLight(world, node as VexxNodeAmbientLight);
        break;
      case "ANIMATION_TRIGGER": // TODO
        object = this.loadControlPoint(world, node);
        layer = "Animations";
        break;
      case "ANIM_TRANSFORM": // TODO
        object = this.loadAnimTransform(world, node as VexxNodeAnimTransform);
        layer = "Animations";
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
      default:
        console.warn(`Unexpected node type ${node.typeName}`);
        object = this.loadNodeGeneric(world, node);
        break;
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

    if (node.unk3 == 0x01) {
      const m1 = new THREE.Matrix4();
      m1.makeRotationFromEuler(new THREE.Euler(-0.1, node.x > 0 ? -0.08 : 0.08, node.x > 0 ? -0.47 : 0.47));
      group.applyMatrix4(m1);

      const m = new THREE.Matrix4();
      m.makeTranslation((node.x - 0.5) * 1.3, node.y - 0.05, node.z - 2.22);
      group.applyMatrix4(m);
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
      this.require(".rcsmodel");
      const point = this.createControlPoint(node.name);
      const asyncMesh = new AsyncRcsMesh(world, node, point);
      this.asyncRcsMeshes.push(asyncMesh);
      return point;
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

    for (const chunk of node.chunks) {
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
      if (textureId in world.textures) {
        const map = world.textures[textureId];
        if (node.typeName == "MESH") material = new THREE.MeshPhongMaterial({ map });
        else if (node.typeName == "SKYCUBE") material = new MeshSkyMaterial(map);
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

    const helper = new THREE.CameraHelper(camera);
    helper.matrix = new THREE.Matrix4();
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

    if (!("airbrakes" in world.settings)) world.settings["airbrakes"] = [];
    const airbrake = {
      name: node.name,
      object,
    };
    world.settings["airbrakes"].push(airbrake);

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
