import * as THREE from "three";
import { GUI } from "lil-gui";
import { OrbitControls } from "./controls/OrbitControls";
import { FlyControls } from "./controls/FlyControls";
import { CSS2DRenderer } from "./renderers/CSS2DRenderer";
import { VEXXLoader } from "./loaders/VEXXLoader";
import { vscode } from "../vscode";
import { World } from "./loaders";
import { RCSModelLoader } from "./loaders/RCSMODELLoader";

class Editor {
  ready: boolean;
  rendering: boolean;
  canvas: HTMLCanvasElement;

  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  controls: OrbitControls | FlyControls;
  light: THREE.PointLight;
  materials: { [id: number]: THREE.Material };

  gui: GUI;
  settings = {
    layers: {},
    airbrakes: {},
  };

  constructor(canvas: HTMLCanvasElement) {
    this.ready = false;
    this.rendering = false;

    this.canvas = canvas;
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 20000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 0, 500);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setClearColor(0x000000);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.top = "0px";
    document.body.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(
      this.camera,
      this.labelRenderer.domElement
    );
    /*
    this.controls = new FlyControls(
      this.camera,
      this.labelRenderer.domElement
    );
    */
    this.controls.enablePan = true;
    this.controls.update();
    this.controls.addEventListener("change", this.render.bind(this));

    // Scene.
    this.scene = new THREE.Scene();
    this.materials = {};

    this.gui = new GUI();
    this.gui.onChange(() => {
      this.render();
    });
  }

  loadVEXX(node: any) {
    const loader = new VEXXLoader();
    const world = loader.load(node);
    this.loadWorld(world);
  }

  loadRCSMODEL(node: any) {
    const loader = new RCSModelLoader();
    const world = loader.load(node);
    this.loadWorld(world);
  }

  loadWorld(world: World) {
    this.scene = world.scene;

    this.settings.layers = {};
    if (world.layers.length > 0) {
      const folder = this.gui.addFolder("Layers");
      for (const layerInfo of world.layers) {
        this.settings.layers[layerInfo.name] = false;
        folder
          .add(this.settings.layers, layerInfo.name)
          .onChange((value: boolean) => {
            if (value) this.camera.layers.enable(layerInfo.id);
            else this.camera.layers.disable(layerInfo.id);
            this.render();
          });
      }
    }

    this.settings.airbrakes = {};
    if ("airbrakes" in world.settings) {
      const folder = this.gui.addFolder("Airbrakes");
      for (const airbrake of world.settings.airbrakes) {
        this.settings.airbrakes[airbrake.name] = 0;
        folder
          .add(this.settings.airbrakes, airbrake.name, 0.0, 1.0)
          .onChange((value: number) => {
            const object = airbrake.object as THREE.Object3D;
            const euler = new THREE.Euler(value, 0, 0);
            object.setRotationFromEuler(euler);
            this.render();
          });
      }
    }

    const aabb = new THREE.Box3();
    aabb.setFromObject(this.scene);
    // todo control camera init

    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  }
}

export function main() {
  const app = window.document.querySelector("#app");
  if (!app) {
    console.error("Cannot find .app in document");
    return;
  }

  const canvas = document.createElement("canvas");
  app.append(canvas);
  if (!canvas) {
    console.error("Cannot create canvas");
    return;
  }

  const editor = new Editor(canvas);

  // Handle messages from the extension
  window.addEventListener("message", async (e) => {
    const { type, body } = e.data;
    switch (type) {
      case "load.vexx": {
        editor.loadVEXX(body.scene);
        return;
      }
      case "load.rcsmodel": {
        editor.loadRCSMODEL(body.scene);
        return;
      }
    }
  });

  window.addEventListener(
    "resize",
    () => {
      editor.resize();
    },
    false
  );

  vscode.ready();
}
