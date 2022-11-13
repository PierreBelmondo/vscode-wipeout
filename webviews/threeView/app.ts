import * as THREE from "three";
import { GUI } from "lil-gui";

import { OrbitControls } from "./controls/OrbitControls";
import { FlyControls } from "./controls/FlyControls";
import { CSS2DRenderer } from "./renderers/CSS2DRenderer";
import { GLTFExporter } from "./exporters/GLTFExporter";
import { Loader, World } from "./loaders";
import { VEXXLoader } from "./loaders/VEXXLoader";
import { RCSModelLoader } from "./loaders/RCSMODELLoader";
import { FELoader } from "./loaders/FELoader";

import { api } from "./api";
import { ThreeViewMessage, ThreeViewMessageLoadBody } from "../../core/api/rpc";

class Editor {
  canvas: HTMLCanvasElement;

  world: World;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  controls: OrbitControls | FlyControls;

  gui: GUI;
  settings = {
    layers: {},
    airbrakes: {},
  };

  loader?: Loader;
  currentScene: THREE.Scene;

  constructor(canvas: HTMLCanvasElement) {
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

    this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
    /*
    this.controls = new FlyControls(
      this.camera,
      this.labelRenderer.domElement
    );
    */
    this.controls.enablePan = true;
    this.controls.update();
    this.controls.addEventListener("change", this.render.bind(this));

    this.gui = new GUI();
    this.gui.onChange(() => {
      this.render();
    });

    // Buttons
    this.settings["Export to glTF"] = () => {
      const exporter = new GLTFExporter();
      exporter.parse(
        this.world.scene,
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

    /*
    this.settings["Update scene graph"] = () => {
      this.updated();
    };
    this.gui.add(this.settings, "Update scene graph");
    */

    this.world = new World();
    this.currentScene = this.world.scene;
  }

  load(body: ThreeViewMessageLoadBody) {
    api.log("Loading " + body.mime);
    switch (body.mime) {
      case "model/vnd.wipeout.vexx": {
        const array = Uint8Array.from(window.atob(body.buffer), (v) => v.charCodeAt(0));
        this.loader = new VEXXLoader();
        this.loader.loadFromBuffer(this.world, array.buffer);
        this.loadWorld();
        break;
      }
      case "model/vnd.wipeout.rcsmodel": {
        const array = Uint8Array.from(window.atob(body.buffer), (v) => v.charCodeAt(0));
        this.loader = new RCSModelLoader();
        this.loader.loadFromBuffer(this.world, array.buffer);
        this.loadWorld();
        break;
      }
      case "application/xml+wipeout": {
        this.loader = new FELoader();
        this.loader.loadFromString(this.world, body.buffer);
        this.loadWorld();
        break;
      }
    }
  }

  async import(array: Uint8Array, filename: string) {
    if (this.loader) {
      await this.loader.import(array.buffer, filename);
      this.updated();
    }
  }

  updated() {
    //const aabb = new THREE.Box3().setFromObject(this.world.scene);
    //const helper = new THREE.Box3Helper(aabb, new THREE.Color(0xffff00));
    //this.world.scene.add(helper);

    const scene = this.world.scene.toJSON();
    api.scene(scene); // Arrays won't be serialized and that's ok
  }

  loadWorld() {
    this.settings.layers = {};
    if (this.world.layers.length > 0) {
      const folder = this.gui.addFolder("Layers");
      for (const layerInfo of this.world.layers) {
        this.settings.layers[layerInfo.name] = false;
        folder.add(this.settings.layers, layerInfo.name).onChange((value: boolean) => {
          if (value) this.camera.layers.enable(layerInfo.id);
          else this.camera.layers.disable(layerInfo.id);
          this.render();
        });
      }
    }

    this.settings.airbrakes = {};
    if ("airbrakes" in this.world.settings) {
      const folder = this.gui.addFolder("Airbrakes");
      for (const airbrake of this.world.settings.airbrakes) {
        this.settings.airbrakes[airbrake.name] = 0;
        folder.add(this.settings.airbrakes, airbrake.name, 0.0, 1.0).onChange((value: number) => {
          const object = airbrake.object as THREE.Object3D;
          const euler = new THREE.Euler(value, 0, 0);
          object.setRotationFromEuler(euler);
          this.render();
        });
      }
    }

    /*
    const gridHelper = new THREE.GridHelper(400, 40, 0x0000ff, 0x808080);
    gridHelper.position.y = 0;
    gridHelper.position.x = 0;
    this.world.scene.add(gridHelper);
    */

    this.currentScene = this.world.scene;

    this.updated();
    this.render();
  }

  render() {
    this.renderer.render(this.currentScene, this.camera);
    this.labelRenderer.render(this.currentScene, this.camera);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  }

  showWorld() {
    this.currentScene = this.world.scene;
  }

  showTexture(name: string) {
    const map = this.world.getTextureByName(name);
    if (map) {
      this.currentScene = new THREE.Scene();
      const square = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshPhongMaterial({ map, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(square, material);
      this.currentScene.add(mesh);
      const box = new THREE.BoxHelper(mesh, 0xffff00);
      this.currentScene.add(box);
      let offset = 0;
      for (let i = 1; i < map.mipmaps.length; i++) {
        const mipmap = map.mipmaps[i];
        const texture = new THREE.DataTexture(mipmap.data, mipmap.width, mipmap.height, THREE.RGBAFormat);
        texture.needsUpdate = true;
        const size = 1.0 / Math.pow(2, i);
        const square = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshPhongMaterial({ map: texture, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(square, material);
        mesh.position.x += size / 2 + 0.5;
        mesh.position.y += size / 2 - offset;
        this.currentScene.add(mesh);
        const box = new THREE.BoxHelper(mesh, 0xffff00);
        this.currentScene.add(box);
        offset += size / 2;
      }
      const hemiLight = new THREE.HemisphereLight(0xa0a0a0, 0x080808, 1);
      this.currentScene.add(hemiLight);
      this.render();
    }
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
    const msg = e.data as ThreeViewMessage;
    switch (msg.type) {
      case "load": {
        editor.load(msg.body);
        break;
      }
      case "import": {
        const filename = msg.body.filename;
        const array = Uint8Array.from(window.atob(msg.body.buffer), (v) => v.charCodeAt(0));
        editor.import(array, filename);
        break;
      }
      case "show.world": {
        editor.showWorld();
        break;
      }
      case "show.texture": {
        const name = msg.body.name;
        editor.showTexture(name);
        break;
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

  api.ready();
}
