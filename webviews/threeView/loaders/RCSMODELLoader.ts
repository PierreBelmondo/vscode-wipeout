import * as THREE from "three";
import { Scene, Object, UV, Mesh } from "../../../src/core/rcs/types";
import { World } from ".";

export class RCSModelLoader {
  load(data: Scene): World {
    const world = new World();
    this.loadMaterials(world, data);
    this.loadScene(world, data);
    return world;
  }

  private loadMaterials(world: World, data: Scene) {
    let material_id = 0;
    for (const materialData of data.materials) {
      console.log(`Loading material ${materialData.id}`);
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      material.name = materialData.filename;
      world.materials[material_id] = material;

      for (const textureData of materialData.textures) {
        console.log(`Loading texture ${textureData.id}`);

        let mimaps: THREE.Texture[] = [];
        for (const mipmapData of textureData.mipmaps) {
          const array = new Uint8Array(mipmapData.rgba);
          const texture = new THREE.DataTexture(array, mipmapData.width, mipmapData.height, THREE.RGBAFormat);
          mimaps.push(texture);
        }

        const texture = mimaps[0];
        texture.name = textureData.filename;
        //texture.generateMipmaps = false;
        //texture.mipmaps = mimaps.slice(1); //this does not work... incomplete mipmap chain ?
        //texture.magFilter = THREE.LinearMipMapNearestFilter;
        //texture.minFilter = THREE.LinearMipMapNearestFilter;
        texture.needsUpdate = true;

        world.textures[textureData.id] = texture;
        material.map = texture;

        break; // no multi texture atm
      }
      material_id++;

      if (material_id > 32)
        break;
    }
    console.log("Done loading materials");
  }

  private loadScene(world: World, data: Scene) {
    const hemiLight = new THREE.HemisphereLight(0xe0e0e0, 0x080808, 1);
    world.scene.add(hemiLight);

    for (const objectData of data.objects) {
      const object = this.loadObject(world, objectData);
      if (object === null) continue;
      world.scene.add(object);
    }
  }

  private loadObject(world: World, objectData: Object) {
    const group = new THREE.Group();
    group.position.set(objectData.position.x, objectData.position.y, objectData.position.z);
    group.scale.set(objectData.scale.x, objectData.scale.y, objectData.scale.z);
    for (const meshData of objectData.meshes) {
      const mesh = this.loadMesh(world, meshData, objectData.material_id);
      if (mesh === null) continue;
      group.add(mesh);
    }
    return group;
  }

  private loadMesh(world: World, meshData: Mesh, material_id: number): THREE.Object3D {
    const vertices = [] as number[];
    const s = 2.0 / 65536;
    for (const vertex of meshData.vertices) {
      vertices.push(vertex.x * s, vertex.y * s, vertex.z * s);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(meshData.indices);
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

    if (meshData.uvs) {
      const uvs = [] as number[];
      for (const uv of meshData.uvs) {
        uvs.push(uv.u, uv.v);
      }
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    }
    /*
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );
    */

    let material = world.materials["_default"];
    if (material_id in world.materials)
      material = world.materials[material_id];

    return new THREE.Mesh(geometry, material);
  }
}
