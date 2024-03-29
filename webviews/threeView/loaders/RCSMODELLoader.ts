import * as THREE from "three";

import { api } from "../api";
import { GTF } from "@core/formats/gtf";
import { Loader } from ".";
import { mipmapsToTexture } from "../utils";
import { RcsModel, RcsModelIBO, RcsModelMaterial, RcsModelMesh1, RcsModelMesh5, RcsModelObject, RcsModelTexture, RcsModelVBO } from "@core/formats/rcs";
import { World } from "../worlds";
import { createMaterial } from "../materials/rcs";

type TextureChannel = {
  filename: string;
  texture: THREE.Texture | null;
};

class AsyncMaterial {
  world: World;
  rcsMaterial: RcsModelMaterial;
  meshes: THREE.Mesh[] = [];
  textureChannels: TextureChannel[] = [];
  material?: THREE.Material;

  constructor(world: World, material: RcsModelMaterial) {
    this.world = world;
    this.rcsMaterial = material;
  }

  get basename(): string {
    const list = this.rcsMaterial.filename.split("/");
    return list[list.length - 1];
  }

  require() {
    api.require(this.rcsMaterial.filename);
  }

  linkMesh(mesh: THREE.Mesh) {
    this.meshes.push(mesh);
  }

  match(filename: string) {
    return this.rcsMaterial.filename == filename;
  }

  registerTexture(filename: string) {
    this.textureChannels.push({ filename, texture: null });
  }

  linked() {
    if (this.textureChannels.length == 0) this.finish();
  }

  async load(buffer: ArrayBuffer) {
    // Nothing to do at the moment
  }

  import(texture: THREE.Texture) {
    let fullyLoaded = true;
    for (let i = 0; i < this.textureChannels.length; i++) {
      if (this.textureChannels[i].filename == texture.name) {
        this.textureChannels[i].texture = texture;
      }
      if (this.textureChannels[i].texture == null) fullyLoaded = false;
    }

    if (fullyLoaded) this.finish();
  }

  finish() {
    //console.log(`Creating shader for ${this.basename}`);
    const textures = this.textureChannels.map((tc) => tc.texture);
    this.material = createMaterial(this.basename, textures);

    if (this.material) {
      this.world.materials[this.material.id] = this.material;
      if (this.world.scene.background) {
        if (this.material instanceof THREE.MeshPhongMaterial) {
          this.material.envMap = this.world.scene.background as THREE.Texture;
        }
      }
      for (const mesh of this.meshes) {
        mesh.material = this.material;
      }
    }
  }
}

class AsyncTexture {
  world: World;
  rcsTexture: RcsModelTexture;
  asyncMaterials: AsyncMaterial[] = [];
  texture?: THREE.Texture;

  constructor(world: World, rcsTexture: RcsModelTexture) {
    this.world = world;
    this.rcsTexture = rcsTexture;
  }

  require() {
    api.require(this.rcsTexture.filename);
  }

  match(filename: string) {
    return this.rcsTexture.filename == filename;
  }

  linkAsyncMaterial(asyncMaterial: AsyncMaterial) {
    asyncMaterial.registerTexture(this.rcsTexture.filename);
    this.asyncMaterials.push(asyncMaterial);
  }

  async load(buffer: ArrayBuffer) {
    console.log(`Loading GTF ${this.rcsTexture.filename}`);
    const gtf = GTF.load(buffer);
    this.texture = mipmapsToTexture(gtf.mipmaps);
    this.texture.name = this.rcsTexture.filename;

    this.world.textures[this.texture.name] = this.texture;
    for (const asyncMaterial of this.asyncMaterials) {
      asyncMaterial.import(this.texture);
    }
  }
}

export class RCSModelLoader extends Loader {
  asyncMaterials: AsyncMaterial[] = [];
  asyncTextures: AsyncTexture[] = [];
  asyncTextureLookup: { [filename: string]: number } = {};

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBufferLike, filename: string) {
    world.userdata.filename = filename;
    const model = RcsModel.load(arrayBuffer);
    this.loadMaterials(world, model);
    this.loadScene(world, model);
    for (const asyncMaterial of this.asyncMaterials) {
      asyncMaterial.linked();
    }
    return world;
  }

  override async import(buffer: ArrayBufferLike, filename: string) {
    if (filename.endsWith(".rcsmaterial")) {
      for (const asyncMaterial of this.asyncMaterials) {
        if (asyncMaterial.match(filename)) {
          await asyncMaterial.load(buffer);
          return;
        }
      }
      return;
    }
    if (filename.endsWith(".gtf")) {
      for (const asyncTexture of this.asyncTextures) {
        if (asyncTexture.match(filename)) {
          await asyncTexture.load(buffer);
          return;
        }
      }
      return;
    }
  }

  private loadMaterials(world: World, rcs: RcsModel) {
    for (const rcsMaterial of rcs.materials) {
      const asyncMaterial = new AsyncMaterial(world, rcsMaterial);
      this.asyncMaterials.push(asyncMaterial);
      //asyncMaterial.require();

      for (const rcsTexture of rcsMaterial.textures) {
        if (!rcsTexture.filename.startsWith("data")) continue; // filter out
        const asyncTexture = this.loadTexture(world, rcsTexture);
        asyncTexture.linkAsyncMaterial(asyncMaterial);
      }
    }
  }

  private loadTexture(world: World, rcsTexture: RcsModelTexture) {
    const filename = rcsTexture.filename;
    if (filename in this.asyncTextureLookup) {
      const index = this.asyncTextureLookup[filename];
      return this.asyncTextures[index];
    }
    const asyncTexture = new AsyncTexture(world, rcsTexture);
    this.asyncTextures.push(asyncTexture);
    this.asyncTextureLookup[filename] = this.asyncTextures.length - 1;
    asyncTexture.require();
    return asyncTexture;
  }

  private loadScene(world: World, rcs: RcsModel) {
    for (const objectData of rcs.objects) {
      const object = this.loadObject(world, rcs, objectData);
      if (object === null) continue;
      world.scene.add(object);
    }
  }

  private loadObject(world: World, rcs: RcsModel, object: RcsModelObject) {
    const position = object.header.position;
    const scale = object.header.scale;
    const materialIndex = object.header.material_id;
    const material = rcs.materials[materialIndex];

    const userData = { externalId: object.header.id };

    if (object.mesh instanceof RcsModelMesh1) {
      const mesh = this.loadMesh1(world, object.mesh, material);
      mesh.userData = userData;
      mesh.name = world.userdata.filename;
      mesh.position.set(position[0], position[1], position[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      return mesh;
    }
    if (object.mesh instanceof RcsModelMesh5) {
      const mesh = this.loadMesh5(world, object.mesh, material);
      mesh.userData = userData;
      mesh.name = world.userdata.filename;
      mesh.position.set(position[0], position[1], position[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      return mesh;
    }
    return null;
  }

  loadMesh1(world: World, rcsMesh: RcsModelMesh1, rcsMaterial: RcsModelMaterial): THREE.Mesh {
    const geometry = this.loadBO(rcsMesh.vbo, rcsMesh.ibo);
    //geometry.computeVertexNormals();
    let material = world.materials["_default"];
    if (rcsMaterial.id in world.materials) material = world.materials[rcsMaterial.id];
    const mesh = new THREE.Mesh(geometry, material);
    for (const asyncMaterial of this.asyncMaterials) {
      if (asyncMaterial.rcsMaterial.id == rcsMaterial.id) {
        asyncMaterial.linkMesh(mesh);
        break;
      }
    }
    return mesh;
  }

  loadMesh5(world: World, rcsMesh: RcsModelMesh5, rcsMaterial: RcsModelMaterial): THREE.Group {
    const group = new THREE.Group();
    for (const rcsSubMesh of rcsMesh.submeshes) {
      const geometry = this.loadBO(rcsSubMesh.vbo, rcsSubMesh.ibo);
      //geometry.computeVertexNormals();
      let material = world.materials["_default"];
      const mesh = new THREE.Mesh(geometry, material);
      for (const asyncMaterial of this.asyncMaterials) {
        if (asyncMaterial.rcsMaterial.id == rcsMaterial.id) {
          asyncMaterial.linkMesh(mesh);
          break;
        }
      }
      group.add(mesh);
    }
    return group;
  }

  loadBO(vbo: RcsModelVBO, ibo: RcsModelIBO) {
    const geometry = new THREE.BufferGeometry();

    if (vbo.has("position")) {
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vbo.attributes["position"], 3));
    }
    if (vbo.has("normal")) {
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(vbo.attributes["normal"], 3));
    }
    if (vbo.has("tangent")) {
      geometry.setAttribute("tangent", new THREE.Float32BufferAttribute(vbo.attributes["tangent"], 3));
    }
    if (vbo.has("uv1")) {
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(vbo.attributes["uv1"], 2));
    }
    if (vbo.has("Uv1")) {
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(vbo.attributes["Uv1"], 2));
    }
    if (vbo.has("Uv2")) {
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(vbo.attributes["Uv2"], 2));
    }
    if (vbo.has("Uv3")) {
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(vbo.attributes["Uv3"], 2));
    }
    if (vbo.has("VertexColour1")) {
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(vbo.attributes["VertexColour1"], 4));
    }
    if (vbo.has("VertexColour2")) {
      geometry.setAttribute("color2", new THREE.Float32BufferAttribute(vbo.attributes["VertexColour2"], 4));
    }

    geometry.setIndex(ibo.indices);
    return geometry;
  }
}
