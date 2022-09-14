import * as THREE from "three";
import { Loader, World } from ".";
import { Flat } from "../../../src/core/vexx/flat";
import { vscode } from "../../vscode";

type LoaderCallback = (world: World, node: any) => THREE.Object3D;

type Mapping = { [id: string]: { fn: LoaderCallback; layer?: string } };

export class VEXXLoader extends Loader {
  load(node: Flat.Node): World {
    const world = new World();
    this.loadMaterials(world, node);
    this.loadScene(world, node);
    return world;
  }

  private loadMaterials(world: World, node: any) {
    const textureNodes = node.children.filter((x) => x.type === "TEXTURE");
    for (const textureNode of textureNodes) {
      const object1 = new THREE.DataTexture(
        new Uint8Array(textureNode.rgba),
        textureNode.width,
        textureNode.height,
        THREE.RGBAFormat
      );
      object1.magFilter = THREE.LinearFilter;
      object1.minFilter = THREE.LinearFilter;
      object1.wrapS = THREE.RepeatWrapping;
      object1.wrapT = THREE.RepeatWrapping;
      object1.needsUpdate = true;

      const material = new THREE.MeshPhongMaterial({ map: object1 });
      if (textureNode.alphaMode != 1) material.alphaTest = 0.0;
      else material.alphaTest = textureNode.alphaTest;

      world.materials[textureNode.id] = material;
    }
  }

  private loadScene(world: World, node: any) {
    const axesHelper = new THREE.AxesHelper(10);

    /*
    world.scene.add(axesHelper);
    this.gui.add(axesHelper, "visible").name("Show origin");
    */

    const hemiLight = new THREE.HemisphereLight(0xe0e0e0, 0x080808, 1);
    world.scene.add(hemiLight);

    const children = node.children.filter((x) => x.type !== "TEXTURE");
    for (const child of children) {
      const object = this.loadNode(world, child);
      if (object !== null) world.scene.add(object);
    }
  }

  private readonly mapping: Mapping = {
    AIRBRAKE: { fn: this.loadNodeGeneric },
    AMBIENT_LIGHT: { fn: this.loadNodeGeneric },
    ANIMATION_TRIGGER: {
      fn: this.loadNodeGeneric,
      layer: "Animation triggers",
    },
    ANIM_TRANSFORM: { fn: this.loadNodeGeneric },
    BLOB: { fn: this.loadNodeGeneric },
    CAMERA: { fn: this.loadCamera, layer: "Cameras" },
    CLOUD_CUBE: { fn: this.loadNodeGeneric, layer: "Clouds" },
    CLOUD_GROUP: { fn: this.loadNodeGeneric, layer: "Clouds" },
    CURVE_SHAPE: { fn: this.loadNodeGeneric, layer: "Clouds" },
    DIRECTIONAL_LIGHT: { fn: this.loadNodeGeneric, layer: "Lights" },
    DYNAMIC_SHADOW_OCCLUDER: { fn: this.loadNodeGeneric },
    ENGINE_FIRE: { fn: this.loadControlPoint, layer: "Ship engine fire" },
    ENGINE_FLARE: { fn: this.loadControlPoint, layer: "Ship engine flare" },
    EXIT_GLOW: { fn: this.loadNodeGeneric },
    FLOOR_COLLISION: {
      fn: this.loadCollision,
      layer: "Floor collisions",
    },
    FOG_CUBE: { fn: this.loadNodeGeneric },
    GROUP: { fn: this.loadNodeGeneric },
    LENS_FLARE: { fn: this.loadNodeGeneric },
    LOD_GROUP: { fn: this.loadLodGroup },
    MESH: { fn: this.loadMesh },
    PARTICLE_SYSTEM: { fn: this.loadNodeGeneric },
    QUAKE: { fn: this.loadNodeGeneric },
    RESET_COLLISION: {
      fn: this.loadCollision,
      layer: "Reset collisions",
    },
    SEA: { fn: this.loadMesh, layer: "Sea" },
    SEAWEED: { fn: this.loadNodeGeneric, layer: "Seaweed" },
    SEA_REFLECT: { fn: this.loadMesh, layer: "Sea reflect" },
    SECTION: { fn: this.loadNodeGeneric },
    SHADOW: { fn: this.loadNodeGeneric },
    SHIP_COLLISION_FX: { fn: this.loadControlPoint, layer: "Ship collisions"  },
    SHIP_MUZZLE: { fn: this.loadControlPoint, layer: "Ship muzzle" },
    SKYCUBE: { fn: this.loadMesh, layer: "Skybox" },
    SOUND: { fn: this.loadSound, layer: "Sounds" },
    SPEEDUP_PAD: { fn: this.loadMesh, layer: "Pads" },
    START_POSITION: {
      fn: this.loadControlPoint,
      layer: "Start position",
    },
    TEXTURE: { fn: this.loadNodeGeneric },
    TRAIL: { fn: this.loadControlPoint },
    TRANSFORM: { fn: this.loadTransform },
    WALL_COLLISION: { fn: this.loadCollision, layer: "Wall collisions" },
    WEAPON_PAD: { fn: this.loadMesh, layer: "Pads" },
    WEATHER_POSITION: { fn: this.loadNodeGeneric },
    WORLD: { fn: this.loadNodeGeneric },
    WO_POINT: { fn: this.loadNodeGeneric, layer: "WO Points" },
    WO_SPOT: { fn: this.loadNodeGeneric, layer: "WO Spots" },
    WO_TRACK: { fn: this.loadNodeGeneric, layer: "WO Tracks" },
  };

  private loadNode(world: World, node: any): THREE.Object3D {
    if (!(node.type in this.mapping)) {
      vscode.log(`Node type "${node.type}" is not supported`);
      return this.loadNodeGeneric(world, node);
    }
    const item = this.mapping[node.type];
    const fn = item.fn.bind(this) as LoaderCallback;
    const obj = fn(world, node);
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
    obj.applyMatrix4(matrix);
    return obj;
  }

  private loadLodGroup(world: World, node: any): THREE.Object3D {
    const group = new THREE.Group();
    for (const child of node.children) {
      const object = this.loadNode(world, child);
      if (object === null) continue;
      group.add(object);
      break; // only first LOD for now
    }
    return group;
  }

  private loadMesh(world: World, node: any): THREE.Object3D {
    const group = new THREE.Group();

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

      let material: THREE.Material = new THREE.MeshPhongMaterial({
        specular: 0x003000,
        flatShading: true,
        side: THREE.DoubleSide,
      });

      if ("uvs" in chunk && chunk.texture in world.materials) {
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
          material = world.materials[chunk.texture];
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
      mesh.layers.set(0);
      group.add(mesh);
    }

    return group;
  }

  private loadCollision(world: World, node: any): THREE.Object3D {
    const group = new THREE.Group();

    for (let i = 0; i < node.chunks.length; i++) {
      const chunk = node.chunks[i];
      const geometry = new THREE.BufferGeometry();

      if (!("positions" in chunk)) continue;

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(chunk.positions, 3)
      );

      const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });

      const mesh = new THREE.Mesh(geometry, material);
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

  private loadControlPoint(world: World, node: any): THREE.Object3D {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(node.matrix);
    const obj = this.createControlPoint(node.name);
    obj.applyMatrix4(matrix);
    return obj;
  }
}
