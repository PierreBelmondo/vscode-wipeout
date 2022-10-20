import * as THREE from "three";
import { World, Loader } from ".";
import { GTF } from "../../../core/gtf";

import { RcsModel, RcsModelIBO, RcsModelMaterial, RcsModelMesh1, RcsModelMesh5, RcsModelObject, RcsModelTexture, RcsModelVBO } from "../../../core/rcs";

import { vscode } from "../../vscode";

class AsyncMaterial {
  world: World;
  rcsMaterial: RcsModelMaterial;
  meshes: THREE.Mesh[] = [];
  textures: THREE.Texture[] = [];
  material?: THREE.Material;

  private loadableTextures: number; //dirty hack to know when material can be loaded

  constructor(world: World, material: RcsModelMaterial) {
    this.world = world;
    this.rcsMaterial = material;
    this.loadableTextures = this.countLoadableTextures();
  }

  private countLoadableTextures(): number {
    let total = 0;
    for (const rcsTexture of this.rcsMaterial.textures) {
      if (!rcsTexture.filename.startsWith("data")) continue;
      if (rcsTexture.type != 0x8001) continue;
      total++;
    }
    return Math.min(1, total); // only load one atm
  }

  linkMesh(mesh: THREE.Mesh) {
    this.meshes.push(mesh);
  }

  match(filename: string) {
    return this.rcsMaterial.filename == filename;
  }

  async load(buffer: ArrayBufferLike) {
    // Nothing to do at the moment
  }

  async import(asyncTexture: AsyncTexture) {
    if (this.material) return;
    if (!asyncTexture.texture) return;
    this.textures.push(asyncTexture.texture);

    if (this.textures.length == this.loadableTextures) {
      this.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: this.textures[0] });
      this.material.name = this.rcsMaterial.filename;
      for (const mesh of this.meshes) mesh.material = this.material;
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

  match(filename: string) {
    return this.rcsTexture.filename == filename;
  }

  linkAsyncMaterial(asyncMaterial: AsyncMaterial) {
    this.asyncMaterials.push(asyncMaterial);
  }

  async load(buffer: ArrayBufferLike) {
    console.log(`Loading GTF ${this.rcsTexture.filename}`);
    const gtf = await GTF.load(buffer);

    let mimaps: THREE.Texture[] = [];
    for (const gtfMipmap of gtf.mipmaps) {
      switch (gtfMipmap.type) {
        case "RGBA":
          {
            const texture = new THREE.DataTexture(gtfMipmap.data, gtfMipmap.width, gtfMipmap.height, THREE.RGBAFormat);
            mimaps.push(texture);
          }
          break;
        case "DXT1":
          {
            const imd = [gtfMipmap as unknown as ImageData];
            const texture = new THREE.CompressedTexture(imd, gtfMipmap.width, gtfMipmap.height, THREE.RGBA_S3TC_DXT1_Format);
            mimaps.push(texture);
          }
          break;
        case "DXT3":
          {
            const imd = [gtfMipmap as unknown as ImageData];
            const texture = new THREE.CompressedTexture(imd, gtfMipmap.width, gtfMipmap.height, THREE.RGBA_S3TC_DXT3_Format);
            mimaps.push(texture);
          }
          break;
        case "DXT5":
          {
            const imd = [gtfMipmap as unknown as ImageData];
            const texture = new THREE.CompressedTexture(imd, gtfMipmap.width, gtfMipmap.height, THREE.RGBA_S3TC_DXT5_Format);
            mimaps.push(texture);
          }
          break;
      }
    }

    this.texture = mimaps[0];
    this.texture.name = this.rcsTexture.filename;
    this.texture.wrapS = THREE.RepeatWrapping
    this.texture.wrapT = THREE.RepeatWrapping
    this.texture.magFilter = THREE.LinearMipMapNearestFilter;
    this.texture.minFilter = THREE.LinearMipMapNearestFilter;
    /* this does not work... incomplete mipmap chain ?
    this.texture.generateMipmaps = false;
    this.texture.mipmaps = mimaps.slice(1);
    */
    this.texture.needsUpdate = true;

    for (const asyncMaterial of this.asyncMaterials) asyncMaterial.import(this);
  }
}

export class RCSModelLoader extends Loader {
  asyncMaterials: AsyncMaterial[] = [];
  asyncTextures: AsyncTexture[] = [];
  asyncTextureLookup: { [filename: string]: number } = {};

  requiredFiles: string[] = [];

  override load(world: World, buffer: ArrayBufferLike) {
    const model = RcsModel.load(buffer);
    this.loadMaterials(world, model);
    this.loadScene(world, model);
    for (const requiredFile of this.requiredFiles) vscode.require(requiredFile);
    return world;
  }

  require(filename: string) {
    if (filename in this.requiredFiles) return;
    console.log(`Require ${filename}`);
    this.requiredFiles.push(filename);
  }

  override async import(buffer: ArrayBufferLike, filename: string) {
    if (filename.endsWith(".rcsmaterial")) {
      for (const asyncMaterial of this.asyncMaterials) {
        if (asyncMaterial.match(filename)) asyncMaterial.load(buffer);
      }
    }
    if (filename.endsWith(".gtf")) {
      for (const asyncTexture of this.asyncTextures) {
        if (asyncTexture.match(filename)) asyncTexture.load(buffer);
      }
    }
  }

  private loadMaterials(world: World, rcs: RcsModel) {
    for (const rcsMaterial of rcs.materials) {
      const asyncMaterial = new AsyncMaterial(world, rcsMaterial);
      this.asyncMaterials.push(asyncMaterial);
      //this.require(rcsMaterial.filename);
      for (const rcsTexture of rcsMaterial.textures) {
        if (!rcsTexture.filename.startsWith("data")) continue;
        if (rcsTexture.type != 0x8001) continue;
        const asyncTexture = this.loadTexture(world, rcsTexture);
        asyncTexture.linkAsyncMaterial(asyncMaterial);
        break; // only load one atm
      }
    }
    console.log("Materials loaded");
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
    this.require(filename);
    return asyncTexture;
  }

  private loadScene(world: World, rcs: RcsModel) {
    const hemiLight = new THREE.HemisphereLight(0xe0e0e0, 0x080808, 1);
    world.scene.add(hemiLight);

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
    if (object.mesh instanceof RcsModelMesh1) {
      const mesh = this.loadMesh1(world, object.mesh, materialId);
      mesh.userData.externalId = object.header.id;
      mesh.position.set(position.x, position.y, position.z);
      mesh.scale.set(scale.x, scale.y, scale.z);
      return mesh;
    }
    if (object.mesh instanceof RcsModelMesh5) {
      const mesh = this.loadMesh5(world, object.mesh, materialId);
      mesh.userData.externalId = object.header.id;
      mesh.position.set(position.x, position.y, position.z);
      mesh.scale.set(scale.x, scale.y, scale.z);
      return mesh;
    }
    return null;
  }

  loadMesh1(world: World, rcsMesh: RcsModelMesh1, materialId: number): THREE.Mesh {
    const geometry = this.loadBO(rcsMesh.vbo, rcsMesh.ibo);
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
