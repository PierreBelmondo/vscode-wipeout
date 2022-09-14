import * as THREE from "three";
import { World } from ".";

export class RCSModelLoader {
  load(data: any): World {
    const world = new World();
    const hemiLight = new THREE.HemisphereLight(0xe0e0e0, 0x080808, 1);
    world.scene.add(hemiLight);
    this.loadMaterials(world, data);
    this.loadScene(world, data);
    return world;
  }

  private loadMaterials(world: World, data: any) {
    const material = new THREE.MeshPhongMaterial({
      specular: 0x003000,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    world.materials[0] = material;
  }

  private loadScene(world: World, data: any) {
    for (const objectData of data.objects) {
      const object = this.loadObject(world, objectData);
      if (object === null) continue;
      world.scene.add(object);
    }
  }

  private loadObject(world: World, objectData: any) {
    switch (objectData.type) {
      case "group":
        return this.loadGroup(world, objectData);
      case "mesh":
        return this.loadMesh(world, objectData);
    }
    return null;
  }

  private loadGroup(world: World, groupData: any): THREE.Object3D {
    const group = new THREE.Group();
    group.position.set(
      groupData.position.x,
      groupData.position.y,
      groupData.position.z
    );
    group.scale.set(groupData.scale.x, groupData.scale.y, groupData.scale.z);
    for (const objectData of groupData.objects) {
      const object = this.loadObject(world, objectData);
      if (object === null) continue;
      group.add(object);
    }
    return group;
  }

  private loadMesh(world: World, simpleData: any): THREE.Object3D {
    const vertices = [] as number[];
    const s = 2.0 / 65536;
    for (const vertex of simpleData.vertices) {
      vertices.push(vertex.x * s, vertex.y * s, vertex.z * s);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(simpleData.indices);
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
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

    return new THREE.Mesh(geometry, world.materials[0]);
  }
}
