import * as THREE from "three";

import { CSS2DRenderer } from "./renderers/CSS2DRenderer";
import { Loader } from "./loaders";
import { VEXXLoader } from "./loaders/VEXXLoader";
import { RCSModelLoader } from "./loaders/RCSMODELLoader";
import { FELoader } from "./loaders/FELoader";
import { World } from "./worlds";
import { api } from "./api";
import { ThreeViewMessage, ThreeViewMessageLoadBody } from "../../core/api/rpc";
import { EffectComposer } from "./postprocessing/EffectComposer";
import { RenderPass } from "./postprocessing/RenderPass";
import { UnrealBloomPass } from "./postprocessing/UnrealBloomPass";
import { ShaderPass } from "./postprocessing/ShaderPass";

const textDecoder = new TextDecoder();

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const fragmentShader = `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
  gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
}
`;

const params = {
  bloom: true,
  bloomThreshold: 0.0,
  bloomStrength: 1.5,
  bloomRadius: 0.1,
};

class WorldRenderer {
  private _renderer: THREE.WebGLRenderer;
  private _passScene: RenderPass;
  private _passBloom: UnrealBloomPass;
  private _passFinal: ShaderPass;
  private _effectComposerBloom: EffectComposer;
  private _effectComposerFinal: EffectComposer;

  private _world: World;

  constructor(world: World) {
    this._world = world;

    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setClearColor(0x000000);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.toneMapping = THREE.ReinhardToneMapping;

    this._passScene = new RenderPass(this._world.scene, this._world.camera);

    this._passBloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    this._passBloom.threshold = params.bloomThreshold;
    this._passBloom.strength = params.bloomStrength;
    this._passBloom.radius = params.bloomRadius;

    this._effectComposerBloom = new EffectComposer(this._renderer);
    this._effectComposerBloom.renderToScreen = false;
    this._effectComposerBloom.addPass(this._passScene);
    this._effectComposerBloom.addPass(this._passBloom);

    this._passFinal = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this._effectComposerBloom.renderTarget2.texture },
        },
        vertexShader,
        fragmentShader,
        defines: {},
      }),
      "baseTexture"
    );
    this._passFinal.needsSwap = true;

    this._effectComposerFinal = new EffectComposer(this._renderer);
    this._effectComposerFinal.addPass(this._passScene);
    this._effectComposerFinal.addPass(this._passFinal);
  }

  get domElement(): HTMLCanvasElement {
    return this._renderer.domElement;
  }

  set world(world: World) {
    this._world = world;
    this._passScene.scene = world.scene;
    this._passScene.camera = world.camera;
  }

  get world(): World {
    return this._world;
  }

  setSize(width: number, height: number) {
    this._passScene.setSize(width, height);
    this._passBloom.setSize(width, height);
    this._passFinal.setSize(width, height);
    this._effectComposerBloom.setSize(width, height);
    this._effectComposerFinal.setSize(width, height);
  }

  render() {
    if (this._world.settings.bloom) {
      const beforeBloom = (obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.material instanceof THREE.ShaderMaterial) {
            if (obj.material.uniforms) {
              obj.material.uniforms["bloomActive"].value = true;
            }
          } else if (obj.material instanceof THREE.Material) {
            if (obj.material.name != "emissive_bloom.rcsmaterial") {
              obj.userData["originalMaterial"] = obj.material;
              obj.material = this.world.materials["_black"];
            }
          }
        }
      };

      const afterBloom = (obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.material instanceof THREE.ShaderMaterial) {
            if (obj.material.uniforms) {
              obj.material.uniforms["bloomActive"].value = false;
            }
          } else if (obj.material instanceof THREE.Material) {
            if ("originalMaterial" in obj.userData) {
              obj.material = obj.userData["originalMaterial"];
            }
          }
        }
      };

      // TODO: stop traversing the mesh twice and use uniform or something
      this._world.scene.traverse(beforeBloom);
      this._renderer.setClearColor(0x000000);
      this._effectComposerBloom.render();
      this._world.scene.traverse(afterBloom);

      this._renderer.setClearColor(this._world.settings.backgroundColor);
      this._effectComposerFinal.render();
    } else {
      this._renderer.setClearColor(this._world.settings.backgroundColor);
      this._renderer.render(this._world.scene, this._world.camera);
    }
  }
}

class Editor {
  worldRenderer: WorldRenderer;
  labelRenderer: CSS2DRenderer;

  world: World;

  loader?: Loader;

  constructor(div: Element) {
    this.world = new World();
    this.world.onUpdate = this.render.bind(this);

    this.worldRenderer = new WorldRenderer(this.world);
    this.worldRenderer.domElement.style.position = 'absolute';
    this.worldRenderer.domElement.style.left = '0';
    this.worldRenderer.domElement.style.top = '0';
    this.worldRenderer.domElement.style.width = '100%';
    this.worldRenderer.domElement.style.height = '100%';
    div.appendChild(this.worldRenderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.top = "0px";
    div.appendChild(this.labelRenderer.domElement);

    this.world.setupOrbitContols(this.labelRenderer.domElement);

    this.showWorld();
  }

  async load(body: ThreeViewMessageLoadBody) {
    api.log("Loading " + body.mime);
    switch (body.mime) {
      case "model/vnd.wipeout.vexx": {
        const response = await fetch(body.webviewUri);
        const buffer = await response.arrayBuffer();
        this.loader = new VEXXLoader();
        this.loader.loadFromBuffer(this.world, buffer);
        if (body.uri.endsWith("ship.vex")) {
          api.require("locators.vex");
        }
        this.world.emitScene();
        this.world.setupGui();
        this.world.setupGuiButtonExport();
        this.world.setupGuiLayers();
        this.world.setupGuiBackgroundColor();
        this.world.setupGuiBloom();
        this.loadWorld();
        break;
      }
      case "model/vnd.wipeout.rcsmodel": {
        const response = await fetch(body.webviewUri);
        const buffer = await response.arrayBuffer();
        this.loader = new RCSModelLoader();
        this.loader.loadFromBuffer(this.world, buffer);
        this.world.emitScene();
        this.world.setupGui();
        this.world.setupGuiButtonExport();
        this.world.setupGuiLayers();
        this.world.setupGuiBackgroundColor();
        this.loadWorld();
        break;
      }
      case "application/xml+wipeout": {
        const response = await fetch(body.webviewUri);
        const buffer = await response.arrayBuffer();
        this.loader = new FELoader();
        const text = textDecoder.decode(buffer)
        this.loader.loadFromString(this.world, text);
        this.loadWorld();
        break;
      }
    }
  }

  async import(buffer: ArrayBuffer, filename: string) {
    if (this.loader) {
      await this.loader.import(buffer, filename);
      this.world.emitScene();
      if (filename.endsWith(".vex")) {
        this.world.setupGui();
        this.world.setupGuiButtonExport();
        this.world.setupGuiLayers();
        this.world.setupGuiBackgroundColor();
        this.world.setupGuiBloom();
      }
    }
  }

  loadWorld() {
    /*
    const gridHelper = new THREE.GridHelper(400, 40, 0x0000ff, 0x808080);
    gridHelper.position.y = 0;
    gridHelper.position.x = 0;
    this.world.scene.add(gridHelper);
    */
    this.worldRenderer.world = this.world;
    this.render();
  }

  render() {
    this.worldRenderer.render();
    this.labelRenderer.render(this.worldRenderer.world.scene, this.worldRenderer.world.camera);
  }

  resize() {
    this.world.camera.aspect = window.innerWidth / window.innerHeight;
    this.world.camera.updateProjectionMatrix();
    this.worldRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  }

  showWorld() {
    this.worldRenderer.world = this.world;
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
      /*
      const hemiLight = new THREE.HemisphereLight(0xa0a0a0, 0x080808, 1);
      world.scene.add(hemiLight);
      */

      this.worldRenderer.world = world;
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

  const editor = new Editor(app);

  // Handle messages from the extension
  window.addEventListener("message", async (e) => {
    const msg = e.data as ThreeViewMessage;
    switch (msg.type) {
      case "load": {
        editor.load(msg.body);
        break;
      }
      case "import": {
        const response = await fetch(msg.body.webviewUri);
        const buffer = await response.arrayBuffer();
        editor.import(buffer, msg.body.uri);
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
