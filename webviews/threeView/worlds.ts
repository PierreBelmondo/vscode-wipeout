import * as THREE from "three";
import { GUI } from "lil-gui";

import { OrbitControls } from "./controls/OrbitControls";
import { FlyControls } from "./controls/FlyControls";
import { GLTFExporter } from "./exporters/GLTFExporter";
import { VertexNormalsHelper } from "./helpers/VertexNormalsHelper";
import { api } from "./api";
import type { WoTrackPoint } from "@core/formats/vexx/v4/wo_track";

//import hangar from "./resources/hangar.jpg";

const _exporter = new GLTFExporter();

type Airbrake = {
  name: string;
  object: THREE.Object3D;
};

export class World {
  onUpdate?: () => void;

  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster = new THREE.Raycaster();

  directionalLights = [] as THREE.DirectionalLight[];
  controls: OrbitControls | FlyControls;
  gui: GUI;

  settings = { layers: {}, airbrakes: {}, actions: {}, backgroundColor: "#000000", bloom: false, showNormals: false, normalsSize: 0.1 };
  textures: { [id: number | string]: THREE.Texture } = {};
  materials: { [id: number | string]: THREE.Material } = {};
  userdata: any = {};

  private _layers: { [id: string]: number } = {};
  private _layerGroups: { [id: string]: string } = {};
  private _layerIndex = 8;
  private _airbrakes: Airbrake[] = [];
  private _actions: { name: string; mixer: THREE.AnimationMixer; action: THREE.AnimationAction }[] = [];
  private _tickMaterials: { tick: (delta: number) => void }[] = [];
  private _normalsHelpers: VertexNormalsHelper[] = [];

  // Track camera state
  private _trackCameraActive = false;
  private _trackCameraIndex = 0;
  private _trackCameraSpeed = 30; // points per second

  constructor() {
    this.scene.name = "World";

    /*
    const background = new THREE.TextureLoader().load(hangar);
    background.mapping = THREE.EquirectangularReflectionMapping;
    background.encoding = THREE.sRGBEncoding;
    this.scene.background = background;
    */

    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 20000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 0, 500);

    this.materials["_black"] = new THREE.MeshBasicMaterial({
      name: ".black",
      color: "black",
    });

    this.materials["_default"] = new THREE.MeshPhongMaterial({
      name: ".default",
      specular: 0x003000,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    this.materials["_defaultCollision"] = new THREE.MeshBasicMaterial({
      name: ".defaultCollision",
      color: 0xffff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });

    for (let i = 0; i < 6; i++) {
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1);
      const x = (i % 3 == 0 ? 1 : 0) * (i > 2 ? -1 : 1);
      const y = (i % 3 == 1 ? 1 : 0) * (i > 2 ? -1 : 1);
      const z = (i % 3 == 2 ? 1 : 0) * (i > 2 ? -1 : 1);
      directionalLight.position.set(x, y, z);
      directionalLight.name = `.WorldDirectionalLight${i}`;
      this.scene.add(directionalLight);
      this.directionalLights.push(directionalLight);
    }
  }

  raycast(pointer: THREE.Vector2) {
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    return intersects;
  }

  emitUpdate() {
    if (this.onUpdate) this.onUpdate();
  }

  emitScene() {
    const scene = this.scene.toJSON();
    api.scene(scene);
  }

  emitSelected(object: THREE.Object3D<THREE.Event>) {
    api.sceneSelected(object.uuid);
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
    this.gui
      .addColor(this.settings, "backgroundColor")
      .name("Background Color")
      .onChange(() => {
        this.emitUpdate();
      });
  }

  setupGuiBloom() {
    this.gui
      .add(this.settings, "bloom")
      .name("Bloom")
      .onChange(() => {
        this.emitUpdate();
      });
  }

  setupGuiDebug() {
    const folder = this.gui.addFolder("Debug").close();
    folder
      .add(this.settings, "showNormals")
      .name("Show normals")
      .onChange((value: boolean) => {
        if (value) this._addNormalsHelpers(this.settings.normalsSize);
        else this._removeNormalsHelpers();
        this.emitUpdate();
      });
    folder
      .add(this.settings, "normalsSize", 0, 1, 0.01)
      .name("Normal size")
      .onChange((value: number) => {
        if (this.settings.showNormals) {
          this._removeNormalsHelpers();
          this._addNormalsHelpers(value);
          this.emitUpdate();
        }
      });
  }

  private _addNormalsHelpers(size: number) {
    this.scene.updateMatrixWorld(true);
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!obj.geometry.attributes.normal) return;
      const helper = new VertexNormalsHelper(obj, size, 0xffff00);
      helper.name = ".NormalsHelper";
      this.scene.add(helper);
      this._normalsHelpers.push(helper);
    });
  }

  private _removeNormalsHelpers() {
    for (const h of this._normalsHelpers) {
      this.scene.remove(h);
      h.dispose();
    }
    this._normalsHelpers = [];
  }

  // Layers that are visible by default when a file is first opened.
  private static readonly _DEFAULT_ON_LAYERS = new Set([
    "Skybox", "Lights", "Pads", "Sea", "Sea reflect",
  ]);

  setupGuiLayers() {
    this.settings.layers = {};
    if (this.layers.length > 0) {
      const folder = this.gui.addFolder("Layers");
      const subfolders: { [group: string]: GUI } = {};

      for (const layerInfo of this.layers) {
        const on = World._DEFAULT_ON_LAYERS.has(layerInfo.name);
        this.settings.layers[layerInfo.name] = on;
        if (on) this.camera.layers.enable(layerInfo.id);

        const group = this._layerGroups[layerInfo.name];
        const target = group
          ? (subfolders[group] ??= folder.addFolder(group))
          : folder;

        target.add(this.settings.layers, layerInfo.name).onChange((value: boolean) => {
          if (value) this.camera.layers.enable(layerInfo.id);
          else this.camera.layers.disable(layerInfo.id);
          if (layerInfo.name === "Fog") this._applySceneFog(value);
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

    this.settings.actions = {};
    if (this._actions.length > 0) {
      const folder = this.gui.addFolder("Animations").close();

      for (const action of this._actions) {
        this.settings.actions[action.name] = false;
        folder.add(this.settings.actions, action.name).onChange((value: number) => {
          if (value) {
            action.action.reset();
            action.action.play();
          } else action.action.stop();
        });
      }

      this.settings["All"] = () => {
        for (const action of this._actions) {
          action.action.reset();
          action.action.play();
        }
      };
      this.gui.add(this.settings, "All");
    }
  }

  private _applySceneFog(enabled: boolean) {
    if (!enabled) {
      this.scene.fog = null;
      return;
    }
    this.scene.traverse((obj) => {
      if (obj.userData.type === "FOG_CUBE" && obj.userData.fogZone0) {
        const { color, near, far } = obj.userData.fogZone0;
        this.scene.fog = new THREE.Fog(color, near, far);
      }
    });
  }

  getLayer(name: string, group?: string): number {
    if (!(name in this._layers)) {
      this._layers[name] = this._layerIndex;
      this._layerIndex++;
    }
    if (group) this._layerGroups[name] = group;
    return this._layers[name];
  }

  addAirbrake(object: THREE.Object3D) {
    const airbrake = { name: object.name, object };
    this._airbrakes.push(airbrake);
  }

  addAction(name, action: THREE.AnimationAction, mixer: THREE.AnimationMixer) {
    const a = { name, mixer, action };
    this._actions.push(a);
  }

  addTickMaterial(mat: { tick: (delta: number) => void }) {
    this._tickMaterials.push(mat);
  }

  updateAnimations(delta: number) {
    for (const action of this._actions) action.mixer.update(delta);
    for (const mat of this._tickMaterials) mat.tick(delta);
    if (this._trackCameraActive) this._updateTrackCamera(delta);
  }

  setupGuiTrackCamera() {
    const pts: WoTrackPoint[] | undefined = this.userdata.woTrackPoints;
    if (!pts || pts.length === 0) return;

    this.settings["trackCamera"] = false;
    this.gui
      .add(this.settings, "trackCamera")
      .name("Track Camera")
      .onChange((value: boolean) => {
        this._trackCameraActive = value;
        if (this.controls instanceof OrbitControls) this.controls.enabled = !value;
        if (value) {
          this._trackCameraIndex = 0;
          this._applyTrackCameraPoint(pts[0]);
        } else {
          if (this.controls instanceof OrbitControls) this.controls.enabled = true;
        }
      });
  }

  private _applyTrackCameraPoint(pt: WoTrackPoint) {
    const fwd   = new THREE.Vector3(pt.forward[0], pt.forward[1], pt.forward[2]);
    const right = new THREE.Vector3(pt.right[0],   pt.right[1],   pt.right[2]);
    const up    = new THREE.Vector3(-pt.down[0],   -pt.down[1],   -pt.down[2]);
    const pos   = new THREE.Vector3(pt.position[0], pt.position[1], pt.position[2]);

    // Yaw 90° left: camera looks along -right.
    // Basis: X=cam-right (-fwd), Y=cam-up, Z=cam-back (+right) so -Z = -right = look direction.
    const m = new THREE.Matrix4();
    m.makeBasis(fwd, up, right.clone().negate());

    // Position: above and to the right side of the track, offset along +right.
    const camPos = pos.clone().addScaledVector(up, 5).addScaledVector(right, 10);
    m.setPosition(camPos);

    this.camera.matrix.copy(m);
    this.camera.matrix.decompose(this.camera.position, this.camera.quaternion, this.camera.scale);
  }

  private _trackCameraFrac = 0;

  private _updateTrackCamera(delta: number) {
    const pts: WoTrackPoint[] | undefined = this.userdata.woTrackPoints;
    if (!pts || pts.length === 0) return;

    this._trackCameraFrac += delta * this._trackCameraSpeed;
    while (this._trackCameraFrac >= 1) {
      this._trackCameraFrac -= 1;
      this._trackCameraIndex = (this._trackCameraIndex + 1) % pts.length;
    }
    this._applyTrackCameraPoint(pts[this._trackCameraIndex]);
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
