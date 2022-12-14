import * as THREE from "three";

import { CSS2DRenderer } from "./renderers/CSS2DRenderer";
import { Loader } from "./loaders";
import { VEXXLoader } from "./loaders/VEXXLoader";
import { RCSModelLoader } from "./loaders/RCSMODELLoader";
import { FELoader } from "./loaders/FELoader";
import { World } from "./worlds";
import { api } from "./api";
import { ThreeViewMessage, ThreeViewMessageLoadBody } from "../../core/api/rpc";

class Editor {
  canvas: HTMLCanvasElement;

  world: World;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;

  loader?: Loader;
  currentWorld: World;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    this.world = new World();
    this.world.onUpdate = this.render.bind(this);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setClearColor(0x000000);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.top = "0px";
    document.body.appendChild(this.labelRenderer.domElement);

    this.world.setupOrbitContols(this.labelRenderer.domElement);

    this.showWorld();
  }

  load(body: ThreeViewMessageLoadBody) {
    api.log("Loading " + body.mime);
    switch (body.mime) {
      case "model/vnd.wipeout.vexx": {
        const array = Uint8Array.from(window.atob(body.buffer), (v) => v.charCodeAt(0));
        this.loader = new VEXXLoader();
        this.loader.loadFromBuffer(this.world, array.buffer);
        this.world.emitScene();
        this.world.setupGui();
        this.world.setupGuiButtonExport();
        this.world.setupGuiLayers();
        this.loadWorld();
        break;
      }
      case "model/vnd.wipeout.rcsmodel": {
        const array = Uint8Array.from(window.atob(body.buffer), (v) => v.charCodeAt(0));
        this.loader = new RCSModelLoader();
        this.loader.loadFromBuffer(this.world, array.buffer);
        this.world.emitScene();
        this.world.setupGuiButtonExport();
        this.world.setupGuiLayers();
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
      this.world.emitScene();
    }
  }

  loadWorld() {
    /*
    const gridHelper = new THREE.GridHelper(400, 40, 0x0000ff, 0x808080);
    gridHelper.position.y = 0;
    gridHelper.position.x = 0;
    this.world.scene.add(gridHelper);
    */
    this.currentWorld = this.world;
    this.render();
  }

  render() {
    const world = this.currentWorld;
    this.renderer.render(world.scene, world.camera);
    this.labelRenderer.render(world.scene, world.camera);
  }

  resize() {
    this.world.camera.aspect = window.innerWidth / window.innerHeight;
    this.world.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  }

  showWorld() {
    this.currentWorld = this.world;
  }

  showTexture(name: string) {
    const map = this.world.getTextureByName(name);
    if (map) {
      const world = new World();
      world.camera.position.set(0, 0, 3);

      const square = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshPhongMaterial({ map, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(square, material);
      world.scene.add(mesh);

      const box = new THREE.BoxHelper(mesh, 0xffff00);
      world.scene.add(box);

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
        world.scene.add(mesh);

        const box = new THREE.BoxHelper(mesh, 0xffff00);
        world.scene.add(box);

        offset += size / 2;
      }
      const hemiLight = new THREE.HemisphereLight(0xa0a0a0, 0x080808, 1);
      world.scene.add(hemiLight);

      this.currentWorld = world;
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
