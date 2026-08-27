import * as THREE from "three";
import { CSS2DObject } from "../renderers/CSS2DRenderer";
import { World } from "../worlds";

export abstract class Loader {
  /**
   * Async because a loader resolves its own dependencies -- textures, the
   * companion .rcsmodel, the sky -- and callers build the GUI from the finished
   * scene, so the promise has to cover the whole load, not just the parse.
   */
  async loadFromBuffer(world: World, arrayBuffer: ArrayBuffer, filename: string): Promise<unknown> {
    return undefined;
  }

  loadFromString(world: World, content: string) {}

  protected createControlPoint(name: string): THREE.Object3D {
    const div = document.createElement("div") as HTMLDivElement;
    div.innerHTML = name;
    div.style.background = "rgba(0.5,0.5,0.5,.5)";
    div.style.border = "1px solid white";
    div.style.borderRadius = "3px";
    div.style.padding = "5px";
    div.style.color = "white";

    const label = new CSS2DObject(div);
    label.layers.set(1);

    const mesh = new THREE.AxesHelper(1);
    mesh.name = `.ControlPoint${name}`;
    mesh.add(label);
    mesh.layers.set(1);
    return mesh;
  }
}
