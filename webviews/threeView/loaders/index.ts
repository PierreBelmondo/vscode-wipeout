import * as THREE from "three";
import { CSS2DObject } from "../renderers/CSS2DRenderer";

export class World {
  scene: THREE.Scene;
  textures: { [id: number | string]: THREE.Texture };
  materials: { [id: number | string]: THREE.Material };

  private _layers: { [id: string]: number };
  private _layerIndex = 8;

  private _settings: any = {};

  constructor() {
    this.scene = new THREE.Scene();
    this.textures = {};
    this.materials = {};
    this._layers = {};
    this._settings = {};
  }

  getLayer(name: string): number {
    if (!(name in this._layers)) {
      this._layers[name] = this._layerIndex;
      this._layerIndex++;
    }
    return this._layers[name];
  }

  get layers(): { name: string; id: number }[] {
    const ret: { name: string; id: number }[] = [];
    for (const name in this._layers)
      ret.push({
        name,
        id: this._layers[name],
      });

    return ret;
  }

  get settings() {
    return this._settings;
  }
}

export abstract class Loader {
  abstract load(data: any): World;

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
    mesh.add(label);
    mesh.layers.set(1);
    return mesh;
  }
}
