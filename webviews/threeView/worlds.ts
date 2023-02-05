import * as THREE from "three";
import { GUI } from "lil-gui";

import { OrbitControls } from "./controls/OrbitControls";
import { FlyControls } from "./controls/FlyControls";
import { GLTFExporter } from "./exporters/GLTFExporter";
import { api } from "./api";

const _exporter = new GLTFExporter();

type Airbrake = {
  name: string;
  object: THREE.Object3D;
};

export class World {
  onUpdate?: () => void;

  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls | FlyControls;
  gui: GUI;

  settings = { layers: {}, airbrakes: {}, backgroundColor: "#000000" };
  textures: { [id: number | string]: THREE.Texture } = {};
  materials: { [id: number | string]: THREE.Material } = {};

  private _layers: { [id: string]: number } = {};
  private _layerIndex = 8;
  private _airbrakes: Airbrake[] = [];

  constructor() {
    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 20000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 0, 500);

    this.materials["_default"] = new THREE.MeshPhongMaterial({
      specular: 0x003000,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.materials["_defaultCollision"] = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
  }

  emitUpdate() {
    if (this.onUpdate) this.onUpdate();
  }

  emitScene() {
    const scene = this.scene.toJSON();
    api.scene(scene);
  }

  setupOrbitContols(element: HTMLElement) {
    this.controls = new OrbitControls(this.camera, element);
    this.controls.enablePan = true;
    this.controls.update();
    this.controls.addEventListener("change", this.emitUpdate.bind(this));
  }

  setupFlyContols(element: HTMLElement) {
    /* broken */
    this.controls = new FlyControls(this.camera, element);
    this.controls.addEventListener("change", this.emitUpdate.bind(this));
  }

  setupGui() {
    this.gui = new GUI();
    this.gui.onChange(this.emitUpdate.bind(this));
  }

  setupGuiButtonExport() {
    this.settings["Export to glTF"] = () => {
      _exporter.parse(
        this.scene,
        (gltf: any) => {
          api.exportGTLF(gltf);
        },
        (error: any) => {
          api.log("An error happened:");
          console.log(error);
        },
        {}
      );
    };
    this.gui.add(this.settings, "Export to glTF");
  }

  setupGuiButtonUpdate() {
    this.settings["Update scene graph"] = () => {
      this.emitScene();
    };
    this.gui.add(this.settings, "Update scene graph");
  }

  setupGuiBackgroundColor() {
    this.gui.addColor(this.settings, "backgroundColor").onChange(() => {
      this.emitUpdate();
    });
  }

  setupGuiLayers() {
    this.settings.layers = {};
    if (this.layers.length > 0) {
      const folder = this.gui.addFolder("Layers");
      for (const layerInfo of this.layers) {
        this.settings.layers[layerInfo.name] = false;
        folder.add(this.settings.layers, layerInfo.name).onChange((value: boolean) => {
          if (value) this.camera.layers.enable(layerInfo.id);
          else this.camera.layers.disable(layerInfo.id);
          this.emitUpdate();
        });
      }
    }

    this.settings.airbrakes = {};
    if (this._airbrakes.length > 0) {
      const folder = this.gui.addFolder("Airbrakes");
      for (const airbrake of this._airbrakes) {
        this.settings.airbrakes[airbrake.name] = 0;
        folder.add(this.settings.airbrakes, airbrake.name, 0.0, 1.0).onChange((value: number) => {
          const object = airbrake.object as THREE.Object3D;
          const euler = new THREE.Euler(value, 0, 0);
          object.setRotationFromEuler(euler);
          this.emitUpdate();
        });
      }
    }
  }

  getLayer(name: string): number {
    if (!(name in this._layers)) {
      this._layers[name] = this._layerIndex;
      this._layerIndex++;
    }
    return this._layers[name];
  }

  addAirbrake(object: THREE.Object3D) {
    const airbrake = { name: object.name, object };
    this._airbrakes.push(airbrake);
  }

  getTextureByName(name: string): THREE.Texture | null {
    for (const index in this.textures) {
      const texture = this.textures[index];
      if (texture.name == name) return texture;
    }
    return null;
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
}
