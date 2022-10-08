import * as THREE from "three";
import { Scene, Object, UV } from "../../../src/core/rcs/types";
import { World } from ".";

export class RCSModelLoader {
  load(data: Scene): World {
    const world = new World();
    this.loadMaterials(world, data);
    this.loadScene(world, data);
    return world;
  }

  private loadMaterials(world: World, data: Scene) {
    for (const materialData of data.materials) {
      console.log(`Loading material ${materialData.id}`);
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      world.materials[material.id] = material;

      for (const textureData of materialData.textures) {
        console.log(`Loading texture ${textureData.id}`);

        let textures: THREE.Texture[] = [];
        for (const mipmapData of textureData.mipmaps) {
          const array = new Uint8Array(mipmapData.rgba);
          const texture = new THREE.DataTexture(array, mipmapData.width, mipmapData.height, THREE.RGBAFormat);
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearFilter;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.needsUpdate = true;
          textures.push(texture);
        }

        material.map = textures[0];
        //material.map.mipmaps = textures.slice(1);
        world.textures[textureData.id] = material.map;

        break; // no multi texture atm
      }
      break; // one material only atm
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
    switch (objectData.type) {
      case "group":
        return this.loadGroup(world, objectData);
      case "mesh":
        return this.loadMesh(world, objectData);
    }
    return null;
  }

  private loadGroup(world: World, groupData: { type?: "group"; position: any; scale: any; objects: any }): THREE.Object3D {
    const group = new THREE.Group();
    group.position.set(groupData.position.x, groupData.position.y, groupData.position.z);
    group.scale.set(groupData.scale.x, groupData.scale.y, groupData.scale.z);
    for (const objectData of groupData.objects) {
      const object = this.loadObject(world, objectData);
      if (object === null) continue;
      group.add(object);
    }
    return group;
  }

  private loadMesh(world: World, simpleData: { type?: "mesh"; vertices: any; indices: any; uvs?: UV[] }): THREE.Object3D {
    const vertices = [] as number[];
    const s = 2.0 / 65536;
    for (const vertex of simpleData.vertices) {
      vertices.push(vertex.x * s, vertex.y * s, vertex.z * s);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(simpleData.indices);
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

    if (simpleData.uvs) {
      const uvs = [] as number[];
      for (const uv of simpleData.uvs) {
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
    for (const name in world.materials) {
      if (name.startsWith("_")) continue;
      material = world.materials[name];
      console.log(material);
      break;
    }

    return new THREE.Mesh(geometry, material);
  }
}
