import * as THREE from "three";

import { api } from "../api";
import { GTF } from "@core/formats/gtf";
import { GXT } from "@core/formats/gxt";
import { GNF } from "@core/formats/gnf";
import { Loader } from ".";
import { mipmapsToTexture } from "../utils";
import { RcsModel, RcsModelIBO, RcsModelMaterial, RcsModelMesh1, RcsModelMesh5, RcsModelObject, RcsModelTexture, RcsModelVBO } from "@core/formats/rcs";
import { RcsModelPS5, RcsModelPS5Material, RcsModelPS5Texture } from "@core/formats/rcs/rcsmodel_ps5";
import { World } from "../worlds";
import { createMaterial } from "../materials/rcs";
import { VertexNormalsHelper } from "../helpers/VertexNormalsHelper";

type TextureChannel = {
  filename: string;
  texture: THREE.Texture | null;
};

class AsyncMaterial {
  world: World;
  rcsMaterial: RcsModelMaterial | RcsModelPS5Material;
  meshes: THREE.Mesh[] = [];
  textureChannels: TextureChannel[] = [];
  material?: THREE.Material;

  constructor(world: World, material: RcsModelMaterial | RcsModelPS5Material) {
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
    console.log(`Creating shader for ${this.basename}, textures: ${this.textureChannels.map(tc => tc.filename + '=' + (tc.texture ? 'loaded' : 'null')).join(', ')}`);
    const textures = this.textureChannels.map((tc) => tc.texture);
    this.material = createMaterial(this.basename, textures);

    if (this.material) {
      this.world.materials[this.material.id] = this.material;
      if (this.world.scene.background) {
        if (this.material instanceof THREE.MeshPhongMaterial || this.material instanceof THREE.MeshStandardMaterial) {
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
  rcsTexture: RcsModelTexture | RcsModelPS5Texture;
  asyncMaterials: AsyncMaterial[] = [];
  texture?: THREE.Texture;

  constructor(world: World, rcsTexture: RcsModelTexture | RcsModelPS5Texture) {
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
    const fn = this.rcsTexture.filename;
    console.log(`Loading texture ${fn} (${buffer.byteLength} bytes)`);
    let mipmaps;
    if (fn.endsWith(".gnf")) {
      const gnf = await GNF.load(buffer);
      mipmaps = gnf.mipmaps;
    } else if (fn.endsWith(".gxt")) {
      mipmaps = GXT.load(buffer).mipmaps;
    } else {
      mipmaps = GTF.load(buffer).mipmaps;
    }
    this.texture = mipmapsToTexture(mipmaps);
    if (!this.texture) {
      console.warn(`Failed to create texture for ${fn} (${mipmaps.length} mipmaps)`);
      return;
    }
    this.texture.name = fn;
    console.log(`Texture ${fn} created (${mipmaps.length} mipmaps), notifying ${this.asyncMaterials.length} materials`);

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

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBuffer, filename: string) {
    world.userdata.filename = filename;
    const magic = new DataView(arrayBuffer).getUint32(0, true);
    api.log(`[RCSModelLoader] loading ${filename} (${arrayBuffer.byteLength} bytes, magic=0x${magic.toString(16)})`);
    if (RcsModelPS5.canLoad(arrayBuffer)) {
      const model = RcsModelPS5.load(arrayBuffer);
      api.log(`[RCSModelLoader] PS5/Vita: ${model.shapes.length} shapes, ${model.meshes.length} meshes, ${model.materials.length} materials`);
      this.loadMaterialsPS5(world, model);
      this.loadScenePS5(world, model);
      for (const asyncMaterial of this.asyncMaterials) {
        asyncMaterial.linked();
      }
    } else {
      const model = RcsModel.load(arrayBuffer);
      api.log(`[RCSModelLoader] PS3: ${model.objects.length} objects, ${model.materials.length} materials`);
      this.loadMaterials(world, model);
      this.loadScene(world, model);
      for (const asyncMaterial of this.asyncMaterials) {
        asyncMaterial.linked();
      }
    }

    world.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 2, 3);
    world.scene.add(dirLight);
    return world;
  }

  override async import(buffer: ArrayBuffer, filename: string) {
    if (filename.endsWith(".rcsmaterial")) {
      for (const asyncMaterial of this.asyncMaterials) {
        if (asyncMaterial.match(filename)) {
          await asyncMaterial.load(buffer);
          return;
        }
      }
      return;
    }
    if (filename.endsWith(".gtf") || filename.endsWith(".gxt") || filename.endsWith(".gnf")) {
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

  private loadTexture(world: World, rcsTexture: RcsModelTexture | RcsModelPS5Texture) {
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

    const name = `Object_${object.header.id}`;

    if (object.mesh instanceof RcsModelMesh1) {
      const mesh = this.loadMesh1(world, object.mesh, material);
      mesh.userData = userData;
      mesh.name = name;
      mesh.position.set(position[0], position[1], position[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      return mesh;
    }
    if (object.mesh instanceof RcsModelMesh5) {
      const mesh = this.loadMesh5(world, object.mesh, material);
      mesh.userData = userData;
      mesh.name = name;
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
    /*
    const helper = new VertexNormalsHelper( mesh, 1, 0xff0000 );
    helper.name = ".VertexNormalsHelper"
    mesh.add(helper);
    */
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
      /*
      const helper = new VertexNormalsHelper( mesh, 1, 0xff0000 );
      helper.name = ".VertexNormalsHelper"
      mesh.add(helper);
      */
      group.add(mesh);
    }
    return group;
  }

  private loadMaterialsPS5(world: World, model: RcsModelPS5) {
    for (const ps5Mat of model.materials) {
      const asyncMaterial = new AsyncMaterial(world, ps5Mat);
      this.asyncMaterials.push(asyncMaterial);

      for (const tex of ps5Mat.textures) {
        if (!tex.filename.startsWith("data")) {
          api.log(`[RCSModelLoader] skipping texture (no data prefix): "${tex.filename}" for material "${ps5Mat.name}"`);
          continue;
        }
        const asyncTexture = this.loadTexture(world, tex);
        asyncTexture.linkAsyncMaterial(asyncMaterial);
      }
    }
    api.log(`[RCSModelLoader] ${this.asyncMaterials.length} materials, ${this.asyncTextures.length} textures queued`);
  }

  private loadScenePS5(world: World, model: RcsModelPS5) {
    let loaded = 0, skipped = 0;
    for (let i = 0; i < model.shapes.length; i++) {
      const shape = model.shapes[i];
      const mesh  = model.meshes[i];
      if (mesh.ibo.indices.length === 0 || mesh.vbo.positions.length === 0) {
        api.log(`[RCSModelLoader] skip shape[${i}] "${shape.name}": ibo=${mesh.ibo.indices.length} vbo=${mesh.vbo.positions.length}`);
        skipped++;
        continue;
      }
      loaded++;
      if (loaded <= 5 || loaded % 200 === 0) {
        const p = mesh.vbo.positions;
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
        for (let j=0;j<p.length;j+=3){if(p[j]<minX)minX=p[j];if(p[j]>maxX)maxX=p[j];if(p[j+1]<minY)minY=p[j+1];if(p[j+1]>maxY)maxY=p[j+1];if(p[j+2]<minZ)minZ=p[j+2];if(p[j+2]>maxZ)maxZ=p[j+2];}
        api.log(`[shape ${i}] "${shape.name}" verts=${p.length/3} idx=${mesh.ibo.indices.length} mat=${shape.material_index} bbox=[${minX.toFixed(0)}..${maxX.toFixed(0)}, ${minY.toFixed(0)}..${maxY.toFixed(0)}, ${minZ.toFixed(0)}..${maxZ.toFixed(0)}]`);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.vbo.positions, 3));
      geometry.setAttribute("normal",   new THREE.Float32BufferAttribute(mesh.vbo.normals, 3));
      geometry.setAttribute("uv",       new THREE.Float32BufferAttribute(mesh.vbo.uvs, 2));

      // Check if this mesh has real vertex colours (not all-white placeholder)
      const hasColors = mesh.vbo.colors.some((v, idx) => idx % 4 < 3 && v !== 255);
      if (hasColors) {
        const colors = mesh.vbo.colors.map(v => v / 255);
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
      }
      geometry.setIndex(mesh.ibo.indices);

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: hasColors,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.0,
      });
      const threeMesh = new THREE.Mesh(geometry, mat);
      threeMesh.name = shape.name;
      if (shape.externalId) threeMesh.userData = { externalId: shape.externalId };

      // Link mesh to its material
      const matIdx = shape.material_index;
      if (matIdx >= 0 && matIdx < model.materials.length) {
        const ps5Mat = model.materials[matIdx];
        for (const asyncMaterial of this.asyncMaterials) {
          if (asyncMaterial.rcsMaterial.id === ps5Mat.id) {
            asyncMaterial.linkMesh(threeMesh);
            break;
          }
        }
      }

      world.scene.add(threeMesh);
    }
    api.log(`[RCSModelLoader] PS5/Vita scene: ${loaded} loaded, ${skipped} skipped (shapes.length=${model.shapes.length}, meshes.length=${model.meshes.length})`);
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
