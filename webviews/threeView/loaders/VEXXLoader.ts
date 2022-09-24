import * as THREE from "three";
import { Loader, World } from ".";
import { Flat } from "../../../src/core/vexx/flat";
import { vscode } from "../../vscode";
import { MeshSkyMaterial } from "../materials/MeshSkyMaterial";

type LoaderCallback = (world: World, node: any) => THREE.Object3D;

type Mapping = { [id: string]: { callback: LoaderCallback; layer?: string } };

export class VEXXLoader extends Loader {
  load(node: Flat.Node): World {
    const world = new World();
    this.loadTextures(world, node);
    this.loadScene(world, node);
    return world;
  }

  private loadTextures(world: World, node: any) {
    const textureNodes = node.children.filter((x) => x.type === "TEXTURE");
    for (const textureNode of textureNodes)
      this.loadTexture(world, textureNode);
  }

  private loadTexture(world: World, node: any) {
    const texture = new THREE.DataTexture(
      new Uint8Array(node.rgba),
      node.width,
      node.height,
      THREE.RGBAFormat
    );
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    world.textures[node.id] = texture;
  }

  private loadScene(world: World, node: any) {
    const hemiLight = new THREE.HemisphereLight(0xe0e0e0, 0x080808, 1);
    world.scene.add(hemiLight);

    const children = node.children.filter((x) => x.type !== "TEXTURE");
    for (const child of children) {
      const object = this.loadNode(world, child);
      if (object !== null) world.scene.add(object);
    }
  }

  private readonly mapping: Mapping = {
    AIRBRAKE: {
      callback: this.loadAirbrake,
    },
    AMBIENT_LIGHT: {
      callback: this.loadAmbientLight,
    },
    ANIMATION_TRIGGER: {
      callback: this.loadControlPoint, // TODO
      layer: "Animations",
    },
    ANIM_TRANSFORM: {
      callback: this.loadControlPoint, // TODO
      layer: "Animations",
    },
    BLOB: {
      callback: this.loadControlPoint, // TODO
      layer: "Blobs",
    },
    CAMERA: {
      callback: this.loadCamera, // TODO
      layer: "Cameras",
    },
    CLOUD_CUBE: {
      callback: this.loadNodeGeneric, // TODO
      layer: "Clouds",
    },
    CLOUD_GROUP: {
      callback: this.loadNodeGeneric, // TODO
      layer: "Clouds",
    },
    CURVE_SHAPE: {
      callback: this.loadNodeGeneric, // TODO
      layer: "Clouds",
    },
    DIRECTIONAL_LIGHT: {
      callback: this.loadNodeGeneric, // TODO
      layer: "Lights",
    },
    DYNAMIC_SHADOW_OCCLUDER: {
      callback: this.loadNodeGeneric, // TODO
    },
    ENGINE_FIRE: {
      callback: this.loadControlPointMatrix, // TODO
      layer: "Ship engine fire",
    },
    ENGINE_FLARE: {
      callback: this.loadControlPointMatrix,
      layer: "Ship engine flare",
    },
    EXIT_GLOW: {
      callback: this.loadNodeGeneric, // TODO
    },
    FLOOR_COLLISION: {
      callback: this.loadCollision,
      layer: "Floor collisions",
    },
    FOG_CUBE: {
      callback: this.loadNodeGeneric, // TODO
    },
    GROUP: {
      callback: this.loadNodeGeneric,
    },
    LENS_FLARE: {
      callback: this.loadNodeGeneric, // TODO
    },
    LOD_GROUP: {
      callback: this.loadLodGroup,
    },
    MESH: {
      callback: this.loadMesh /*, layer: "Meshes" */,
    },
    PARTICLE_SYSTEM: {
      callback: this.loadNodeGeneric, // TODO
    },
    QUAKE: {
      callback: this.loadNodeGeneric, // TODO
    },
    RESET_COLLISION: {
      callback: this.loadCollision,
      layer: "Reset collisions",
    },
    SEA: {
      callback: this.loadMesh, // TODO
      layer: "Sea",
    },
    SEAWEED: {
      callback: this.loadControlPoint, // TODO
      layer: "Seaweed",
    },
    SEA_REFLECT: {
      callback: this.loadMesh, // TODO
      layer: "Sea reflect",
    },
    SECTION: {
      callback: this.loadNodeGeneric, // TODO
    },
    SHADOW: {
      callback: this.loadNodeGeneric, // TODO
    },
    SHIP_COLLISION_FX: {
      callback: this.loadControlPointMatrix,
      layer: "Ship collisions",
    },
    SHIP_MUZZLE: {
      callback: this.loadControlPointMatrix,
      layer: "Ship muzzle",
    },
    SKYCUBE: {
      callback: this.loadMesh,
      layer: "Skybox",
    },
    SOUND: {
      callback: this.loadSound, // TODO
      layer: "Sounds",
    },
    SPEEDUP_PAD: {
      callback: this.loadMesh, // TODO
      layer: "Pads",
    },
    START_POSITION: {
      callback: this.loadControlPointMatrix,
      layer: "Start position",
    },
    TRAIL: {
      callback: this.loadControlPointMatrix, // TODO
    },
    TRANSFORM: {
      callback: this.loadTransform,
    },
    WALL_COLLISION: {
      callback: this.loadCollision,
      layer: "Wall collisions",
    },
    WEAPON_PAD: {
      callback: this.loadMesh, // TODO
      layer: "Pads",
    },
    WEATHER_POSITION: {
      callback: this.loadNodeGeneric, // TODO
    },
    WORLD: {
      callback: this.loadNodeGeneric,
    },
    WO_POINT: {
      callback: this.loadControlPoint, // TODO
      layer: "WO Points",
    },
    WO_SPOT: {
      callback: this.loadNodeGeneric, // TODO
      layer: "WO Spots",
    },
    WO_TRACK: {
      callback: this.loadNodeGeneric, // TODO
      layer: "WO Tracks",
    },
  };

  private loadNode(world: World, node: any): THREE.Object3D {
    if (!(node.type in this.mapping)) {
      vscode.log(`Node type "${node.type}" is not supported`);
      return this.loadNodeGeneric(world, node);
    }
    const item = this.mapping[node.type];
    const callback = item.callback.bind(this) as LoaderCallback;
    const obj = callback(world, node);
    if (item.layer !== undefined) {
      const layer = world.getLayer(item.layer);
      obj.layers.set(layer);
      obj.traverse((subobj) => {
        subobj.layers.set(layer);
      });
    }
    return obj;
  }

  private loadNodeGeneric(world: World, node: any): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;
    for (const child of node.children) {
      const object = this.loadNode(world, child);
      if (object === null) continue;
      group.add(object);
    }
    return group;
  }

  private loadTransform(world: World, node: any): THREE.Object3D {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(node.matrix);

    const obj = this.loadNodeGeneric(world, node);
    obj.name = node.name;
    obj.applyMatrix4(matrix);
    return obj;
  }

  private loadLodGroup(world: World, node: any): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;
    for (const child of node.children) {
      const object = this.loadNode(world, child);
      if (object === null) continue;
      group.add(object);
      break; // only first LOD for now
    }
    return group;
  }

  private loadAmbientLight(world: World, node: any): THREE.AmbientLight {
    const value =
      ((255.0 * node.rgba.r) << 16) +
      ((255.0 * node.rgba.g) << 8) +
      255.0 * node.rgba.b;
    return new THREE.AmbientLight(value);
  }

  private loadMesh(world: World, node: any): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    for (let i = 0; i < node.chunks.length; i++) {
      const chunk = node.chunks[i];
      const geometry = new THREE.BufferGeometry();

      if (!("positions" in chunk)) continue;

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(chunk.positions, 3)
      );

      if ("normals" in chunk) {
        geometry.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(chunk.normals, 3)
        );
      }

      let material = world.materials["_default"];

      if ("uvs" in chunk && chunk.texture in world.textures) {
        let attr: THREE.BufferAttribute | null = null;
        const size = chunk.uvs.size;
        const data = chunk.uvs.data;
        switch (chunk.uvs.type) {
          case "Int8":
            attr = new THREE.Int8BufferAttribute(data, size, true);
            break;
          case "Int16":
            attr = new THREE.Int16BufferAttribute(data, size, true);
            break;
          case "Float32":
            attr = new THREE.Float32BufferAttribute(data, size, false);
            break;
          default:
            break;
        }

        if (attr !== null) {
          geometry.setAttribute("uv", attr);

          const map = world.textures[chunk.texture];

          if (node.type == "MESH")
            material = new THREE.MeshPhongMaterial({ map });
          else if (node.type == "SKYCUBE") {
            material = new MeshSkyMaterial(map);
          }
        }
      }

      if ("colors" in chunk) {
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(chunk.colors, 3)
        );
      }

      if (chunk.mode == "TRIANGLE_STRIP") {
        const triangles = chunk.positions.length / 3 - 2;
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
      mesh.renderOrder = node.type == "SKYCUBE" ? 0 : 1;
      mesh.layers.set(0);
      group.add(mesh);
    }

    return group;
  }

  private loadCollision(world: World, node: any): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    for (let i = 0; i < node.chunks.length; i++) {
      const chunk = node.chunks[i];
      const geometry = new THREE.BufferGeometry();

      if (!("positions" in chunk)) continue;

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(chunk.positions, 3)
      );

      const material = world.materials["_defaultCollision"];
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 2;
      mesh.layers.set(2);
      group.add(mesh);
    }
    return group;
  }

  private loadCamera(world: World, node: any): THREE.Object3D {
    return this.createControlPoint(node.name);
  }

  private loadSound(world: World, node: any): THREE.Object3D {
    return this.createControlPoint(node.name);
  }

  private loadAirbrake(world: World, node: any): THREE.Object3D {
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

  private loadControlPointMatrix(world: World, node: any): THREE.Object3D {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(node.matrix);
    const obj = this.createControlPoint(node.name);
    obj.name = node.name;
    obj.applyMatrix4(matrix);
    return obj;
  }

  private loadControlPoint(world: World, node: any): THREE.Object3D {
    return this.createControlPoint(node.name);
  }
}
