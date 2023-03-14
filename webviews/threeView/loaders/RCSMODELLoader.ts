import * as THREE from "three";

import { api } from "../api";
import { GTF } from "@core/formats/gtf";
import { Loader } from ".";
import { mipmapsToTexture } from "../utils";
import { RcsModel, RcsModelIBO, RcsModelMaterial, RcsModelMesh1, RcsModelMesh5, RcsModelObject, RcsModelTexture, RcsModelVBO } from "@core/formats/rcs";
import { World } from "../worlds";
import { rcsDiffuseWithSpecularFromAlpha } from "../materials/rcs/DiffuseWithSpecularFromAlpha";

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

    if (!fullyLoaded) return;

    if (this.basename == "glass_texture.rcsmaterial") {
      this.material = new THREE.MeshPhongMaterial({
        name: this.rcsMaterial.filename,
        side: THREE.DoubleSide,
        color: 0x000000,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.5,
        shininess: 90,
        reflectivity: 1.0,
        refractionRatio: 0.98,
      });
    } else if (this.basename == "glass_texture_clamped.rcsmaterial") {
      const textureChannel = this.textureChannels[0];
      this.material = new THREE.MeshPhongMaterial({
        name: this.rcsMaterial.filename,
        side: THREE.DoubleSide,
        map: textureChannel.texture,
        transparent: true,
        opacity: 0.95,
      });
    } else if (this.basename == "hexagonalshield_rich.rcsmaterial") {
      const textureChannel = this.textureChannels[0];
      this.material = new THREE.MeshPhongMaterial({
        emissive: 0x8080FF,
        emissiveIntensity: 0.5,
        emissiveMap: textureChannel.texture,
        name: this.rcsMaterial.filename,
        side: THREE.DoubleSide,
        //map: textureChannel.texture,
        transparent: true,
        opacity: 0.80,
      });
    } else if (this.basename == "carbonfibre.rcsmaterial") {
      const textureChannel = this.textureChannels[0];
      textureChannel.texture?.repeat.set(4, 4);
      this.material = new THREE.MeshPhongMaterial({
        name: this.rcsMaterial.filename,
        side: THREE.DoubleSide,
        color: 0x101010,
        specular: 0xffffff,
        specularMap: textureChannel.texture,
        normalMap: textureChannel.texture,
        shininess: 90,
      });
      this.material.needsUpdate = true;
    } else if (this.basename == "emissive_bloom.rcsmaterial") {
      const textureChannel = this.textureChannels[0];
      textureChannel.texture?.repeat.set(20, 20);
      this.material = new THREE.MeshPhongMaterial({
        name: this.basename,
        side: THREE.DoubleSide,
        color: 0xffffff,
        specular: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.0,
        map: textureChannel.texture,
      });
    } else if (this.basename == "detonator_diffuse_with_specular_from_alpha_n_vcol.rcsmaterial") {
      const textureChannel = this.textureChannels[0];
      this.material = rcsDiffuseWithSpecularFromAlpha({
        name: this.basename,
        map: textureChannel.texture,
      });
    } else if (this.basename == "medal.rcsmaterial") {
      this.material = new THREE.MeshStandardMaterial({
        metalness: 1,
        roughness: 0.5,
      });
    } else {
      console.log(`Unsupported material: ${this.basename} ${this.textureChannels}`);
      const textureChannel = this.textureChannels[0];
      this.material = new THREE.MeshPhongMaterial({
        name: this.rcsMaterial.filename,
        side: THREE.DoubleSide,
        color: 0xffffff,
        specular: 0xffffff,
        map: textureChannel.texture,
        specularMap: textureChannel.texture,
      });
    }

    if (this.material) {
      this.world.materials[this.material.name] = this.material;
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

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBufferLike) {
    const model = RcsModel.load(arrayBuffer);
    this.loadMaterials(world, model);
    this.loadScene(world, model);
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
        asyncTexture.require();
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
    return asyncTexture;
  }

  private loadScene(world: World, rcs: RcsModel) {
    for (const objectData of rcs.objects) {
      const object = this.loadObject(world, objectData);
      if (object === null) continue;
      world.scene.add(object);
    }
    console.log("Scene loaded");
  }

  private loadObject(world: World, object: RcsModelObject) {
    const position = object.header.position;
    const scale = object.header.scale;
    const materialId = object.header.material_id;

    const userData = { externalId: object.header.id };

    if (object.mesh instanceof RcsModelMesh1) {
      const mesh = this.loadMesh1(world, object.mesh, materialId);
      mesh.userData = userData;
      mesh.position.set(position.x, position.y, position.z);
      mesh.scale.set(scale.x, scale.y, scale.z);
      return mesh;
    }
    if (object.mesh instanceof RcsModelMesh5) {
      const mesh = this.loadMesh5(world, object.mesh, materialId);
      mesh.userData = userData;
      mesh.position.set(position.x, position.y, position.z);
      mesh.scale.set(scale.x, scale.y, scale.z);
      return mesh;
    }
    return null;
  }

  loadMesh1(world: World, rcsMesh: RcsModelMesh1, materialId: number): THREE.Mesh {
    const geometry = this.loadBO(rcsMesh.vbo, rcsMesh.ibo);
    geometry.computeVertexNormals();
    let material = world.materials["_default"];
    if (materialId in world.materials) material = world.materials[materialId];
    const mesh = new THREE.Mesh(geometry, material);
    this.asyncMaterials[materialId].linkMesh(mesh);
    return mesh;
  }

  loadMesh5(world: World, rcsMesh: RcsModelMesh5, materialId: number): THREE.Group {
    const group = new THREE.Group();
    for (const rcsSubMesh of rcsMesh.submeshes) {
      const geometry = this.loadBO(rcsSubMesh.vbo, rcsSubMesh.ibo);
      geometry.computeVertexNormals();
      let material = world.materials["_default"];
      const mesh = new THREE.Mesh(geometry, material);
      this.asyncMaterials[materialId].linkMesh(mesh);
      group.add(mesh);
    }
    return group;
  }

  loadBO(vbo: RcsModelVBO, ibo: RcsModelIBO) {
    const vertices = [] as number[];
    const s = 2.0 / 65536;
    for (const vertex of vbo.vertices) vertices.push(vertex.x * s, vertex.y * s, vertex.z * s);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

    if (vbo.uv) {
      const uvs = [] as number[];
      for (const uv of vbo.uv) {
        uvs.push(uv.u, uv.v);
      }
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    }

    geometry.setIndex(ibo.indices);
    return geometry;
  }
}
