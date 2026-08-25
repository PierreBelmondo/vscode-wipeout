import * as THREE from "three";

import { api } from "../api";
import { GTF } from "@core/formats/gtf";
import { GXT } from "@core/formats/gxt";
import { GNF } from "@core/formats/gnf";
import { Loader } from ".";
import { facesToCubeTexture, mipmapsToTexture } from "../utils";
import { RcsModel, RcsModelIBO, RcsModelMaterial, RcsModelMesh1, RcsModelMesh5, RcsModelObject, RcsModelPart, RcsModelTexture, RcsModelVBO } from "@core/formats/rcs";
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

  /** A slot with no file: keeps later channels at their real slot index. */
  registerEmptyChannel() {
    this.textureChannels.push({ filename: "", texture: null });
  }

  /**
   * Called once every channel has been registered. A material finishes here
   * when it is waiting for nothing: either it declares no channels at all, or
   * every channel it declares is an empty slot. Those never receive a texture,
   * so import() is never called for them and they would stay without a shader
   * -- cf_constantcolourglow has two empty channels and nothing else, which
   * left 19 meshes on the default material.
   */
  linked() {
    const waiting = this.textureChannels.some((channel) => channel.filename != "");
    if (!waiting) this.finish();
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
      // Empty channels never receive a texture; they must not hold up finish().
      if (this.textureChannels[i].filename != "" && this.textureChannels[i].texture == null) {
        fullyLoaded = false;
      }
    }

    if (fullyLoaded) this.finish();
  }

  finish() {
    console.log(`Creating shader for ${this.basename}, textures: ${this.textureChannels.map(tc => tc.filename + '=' + (tc.texture ? 'loaded' : 'null')).join(', ')}`);
    const textures = this.textureChannels.map((tc) => tc.texture);
    this.material = createMaterial(this.basename, textures);

    if (this.material) {
      this.world.materials[this.material.id] = this.material;
      // Materials that animate (scrolling water UVs, and so on) expose tick().
      const animated = this.material as unknown as { tick?: (delta: number) => void };
      if (typeof animated.tick === "function") {
        this.world.addTickMaterial(animated as { tick: (delta: number) => void });
      }
      // The sky doubles as a cheap ambient reflection. MeshPhongMaterial
      // combines an envMap with MultiplyOperation by default, which would
      // darken every surface by the sky's own colour, so it is added faintly
      // instead -- and never over a material that set its own envMap from a
      // reflection channel of its own.
      if (this.world.scene.background) {
        const phong = this.material instanceof THREE.MeshPhongMaterial ? this.material : undefined;
        const standard = this.material instanceof THREE.MeshStandardMaterial ? this.material : undefined;
        const material = phong ?? standard;
        if (material && !material.envMap) {
          material.envMap = this.world.scene.background as THREE.Texture;
          if (phong) {
            phong.combine = THREE.AddOperation;
            phong.reflectivity = 0.05;
          }
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
  skyFilename = "";
  private world?: World;

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBuffer, filename: string) {
    this.world = world;
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
      // The environment's sky sits beside the model rather than being named by
      // it, so ask for it directly. The name must stay relative: the editor
      // resolves a bare name against the document's own directory, while an
      // absolute path is handed to Uri.parse and never found.
      this.skyFilename = "sky.gtf";
      api.require(this.skyFilename);
      this.loadMaterials(world, model);
      this.loadScene(world, model);
      for (const asyncMaterial of this.asyncMaterials) {
        asyncMaterial.linked();
      }
    }

    // Ambient was 0.6, which is flat and unshadowed: it lifted every surface
    // off black, so nothing was dark enough for a highlight to read against --
    // the scene came out bright and uniformly saturated with no visible
    // specular. Six more directionals at 0.1 from World's constructor add
    // roughly 0.3 on top of these two. Let the directional do the shading and
    // keep ambient as fill.
    world.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(1, 2, 3);
    world.scene.add(dirLight);
    return world;
  }

  override async import(buffer: ArrayBuffer, filename: string) {
    // Deliver to EVERY waiting consumer, not just the first match. A model
    // reuses the same .rcsmaterial across many material entries — 01_vineta_k
    // has 805 entries for only 69 distinct files, with jd_simplespecular alone
    // used 192 times. Returning after the first match left 736 of them without
    // their shader, so their meshes kept the default material and the track
    // surface never appeared. The same holds for textures shared between
    // materials.
    if (filename.endsWith(".rcsmaterial")) {
      for (const asyncMaterial of this.asyncMaterials) {
        if (asyncMaterial.match(filename)) await asyncMaterial.load(buffer);
      }
      return;
    }
    if (this.skyFilename && filename === this.skyFilename) {
      // The sky is a cube map. Sampled as a flat texture it renders black, so
      // it is built from its six faces and used as the scene background.
      const gtf = GTF.load(buffer);
      const cube = gtf.isCube ? facesToCubeTexture(gtf.faces) : undefined;
      if (cube && this.world) {
        this.world.scene.background = cube;
        api.log(`[RCSModelLoader] sky: ${gtf.faces.length} faces ${gtf.header.width}x${gtf.header.height}`);
      } else {
        api.log(`[RCSModelLoader] sky ${filename} is not a usable cube map`);
      }
      return;
    }
    if (filename.endsWith(".gtf") || filename.endsWith(".gxt") || filename.endsWith(".gnf")) {
      for (const asyncTexture of this.asyncTextures) {
        if (asyncTexture.match(filename)) await asyncTexture.load(buffer);
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
        // Slots that hold no file (the empty lightmap placeholder, and the
        // rgba-constant slots) are skipped — but skipping them silently shifts
        // every later channel down, so a material like and_rocktosand
        //   [blend | (empty lightmap) | rock | sand]
        // would hand make() [blend, rock, sand] with no way to tell that the
        // gap was in the middle. Record the gap instead.
        if (!rcsTexture.filename.startsWith("data")) {
          asyncMaterial.registerEmptyChannel();
          continue;
        }
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

    let first: THREE.Object3D | null = null;
    if (object.mesh instanceof RcsModelMesh1) first = this.loadMesh1(world, object.mesh, material);
    if (object.mesh instanceof RcsModelMesh5) first = this.loadMesh5(world, object.mesh, material);
    if (first === null) return null;

    first.userData = userData;
    first.name = name;
    first.position.set(position[0], position[1], position[2]);
    first.scale.set(scale[0], scale[1], scale[2]);

    // Most objects are a single mesh, and wrapping those in a group would add a
    // level to the scene graph for nothing.
    if (object.parts.length === 0) return first;

    // The rest of the model: sibling parts, each with its own material and
    // placement, so each is positioned from its own record rather than the
    // object header's.
    const group = new THREE.Group();
    group.userData = userData;
    group.name = name;
    group.add(first);

    object.parts.forEach((part, index) => {
      const mesh = this.loadPart(world, rcs, part);
      mesh.userData = userData;
      mesh.name = `${name}_part${index + 1}`;
      group.add(mesh);
    });

    return group;
  }

  private loadPart(world: World, rcs: RcsModel, part: RcsModelPart): THREE.Object3D {
    const mesh = this.loadMesh5(world, part.mesh, rcs.materials[part.material_id]);
    mesh.position.set(part.position[0], part.position[1], part.position[2]);
    mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
    return mesh;
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
      // The VBO stores 4 components per vertex (xyz + handedness in w), which is
      // also what THREE wants. Declaring it as 3 made every tangent read
      // straddle two vertices, so normalMap was silently wrong or dropped —
      // and any material using one drew nothing.
      const tangent = vbo.attributes["tangent"];
      const itemSize = tangent.length / (vbo.attributes["position"].length / 3) === 4 ? 4 : 3;
      geometry.setAttribute("tangent", new THREE.Float32BufferAttribute(tangent, itemSize));
    }
    if (vbo.has("uv1")) {
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(vbo.attributes["uv1"], 2));
    }
    if (vbo.has("Uv1")) {
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(vbo.attributes["Uv1"], 2));
    }
    // Other names the exporter uses for the same diffuse channel. Without these
    // the mesh reaches Three.js with no "uv" attribute at all, so its texture
    // never shows.
    for (const alias of ["map1", "Diffuse_uv", "diffuseUV", "diffuseUv"]) {
      if (!geometry.getAttribute("uv") && vbo.has(alias)) {
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(vbo.attributes[alias], 2));
      }
    }
    if (!geometry.getAttribute("uv2") && vbo.has("map2")) {
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(vbo.attributes["map2"], 2));
    }
    // Three.js reads lightMap from "uv2". Two elements claim that slot: the
    // real lightmap atlas (Lightmap_uv) and a second set also named Uv2 that
    // usually just repeats the diffuse coordinates, so the atlas wins.
    if (vbo.has("Lightmap_uv")) {
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(vbo.attributes["Lightmap_uv"], 2));
    } else if (vbo.has("Uv2")) {
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(vbo.attributes["Uv2"], 2));
    }
    if (vbo.has("Uv3")) {
      geometry.setAttribute("uv3", new THREE.Float32BufferAttribute(vbo.attributes["Uv3"], 2));
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
