import * as THREE from "three";
import { GUI } from "lil-gui";

import { OrbitControls } from "./controls/OrbitControls";
import { FlyControls } from "./controls/FlyControls";
import { GLTFExporter } from "./exporters/GLTFExporter";
import { VertexNormalsHelper } from "./helpers/VertexNormalsHelper";
import { api } from "./api";
import { DEFAULT_RENDER_SETTINGS, TONE_MAPPINGS } from "./renderSettings";
import type { WoTrackPoint } from "@core/formats/vexx/v4/wo_track";


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

  settings = { layers: {}, airbrakes: {}, actions: {}, backgroundColor: "#000000", bloom: false, frontendEdges: false, showNormals: false, showBoxes: false, normalsSize: 0.1, ...DEFAULT_RENDER_SETTINGS };
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
  private _boxHelpers: THREE.Object3D[] = [];

  // Scene-camera state: when set, the render camera copies this camera's
  // animated world transform every frame instead of being user-controlled.
  private _sceneCamera: THREE.Camera | null = null;
  private _freeCameraState: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;

  // Track camera state
  private _trackCameraActive = false;
  private _trackCameraIndex = 0;
  private _trackCameraSpeed = 30; // points per second

  constructor() {
    this.scene.name = "World";

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

  /**
   * Camera selector. "Free camera" is the usual user-controlled one; the other
   * entries are CAMERA nodes from the scene, which sit under an ANIM_TRANSFORM
   * and so carry the file's own camera animation.
   */
  setupGuiCamera() {
    const cameras: THREE.Camera[] = [];
    this.scene.traverse((obj) => {
      if ((obj as THREE.Camera).isCamera) cameras.push(obj as THREE.Camera);
    });
    if (cameras.length === 0) return;

    const FREE = "Free camera";
    // Scene camera names are not unique — 01_vineta_k/track.vex has 13 cameras
    // all called "pasted__cameraShape". Duplicate entries in a lil-gui dropdown
    // are ambiguous (indexOf would always resolve to the first), so suffix any
    // repeat with its index.
    const seen = new Map<string, number>();
    const names = [FREE];
    for (let i = 0; i < cameras.length; i++) {
      const base = cameras[i].name || `camera${i}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      names.push(n === 1 ? base : `${base} #${n}`);
    }
    this.settings["camera"] = FREE;

    this.gui
      .add(this.settings, "camera", names)
      .name("Camera")
      .onChange((value: string) => {
        if (value === FREE) {
          for (const cam of cameras) for (const child of cam.children) child.visible = true;
          this._sceneCamera = null;
          if (this.controls instanceof OrbitControls) this.controls.enabled = true;
          // Put the user back where they were before taking the scene camera.
          if (this._freeCameraState) {
            this.camera.position.copy(this._freeCameraState.position);
            this.camera.quaternion.copy(this._freeCameraState.quaternion);
          }
          return;
        }
        const index = names.indexOf(value) - 1;
        const target = cameras[index];
        if (!target) return;
        if (!this._sceneCamera) {
          this._freeCameraState = {
            position: this.camera.position.clone(),
            quaternion: this.camera.quaternion.clone(),
          };
        }
        this._sceneCamera = target;
        if (this.controls instanceof OrbitControls) this.controls.enabled = false;
        this._applySceneCamera();
      });
  }

  /** Copy the selected scene camera's animated world transform. */
  private _applySceneCamera() {
    const cam = this._sceneCamera;
    if (!cam) return;
    // The frustum helper and control point live under the camera, so looking
    // through it would put them in front of the lens.
    for (const child of cam.children) {
      if (child.name.startsWith(".CameraHelper_") || child.type === "Object3D") child.visible = false;
    }
    cam.updateWorldMatrix(true, false);
    cam.matrixWorld.decompose(this.camera.position, this.camera.quaternion, new THREE.Vector3());
    // Keep the viewer's own lens: the CAMERA node's fov/near/far are not
    // decoded yet (loadCamera hardcodes 45 / 32 / 34).
    this.camera.updateMatrixWorld();
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
    this.gui
      .add(this.settings, "frontendEdges")
      .name("Front-end edges")
      .onChange(() => {
        this.emitUpdate();
      });
  }

  /**
   * The lighting and grading tunables.
   *
   * None of these are read from the game files (see renderSettings.ts), so the
   * only way to settle them is to look at the result. They apply live: the
   * light controls retarget the scene's lights, and the material controls walk
   * every material already built and re-apply, because materials are created
   * once when a model loads and would otherwise keep the value they were born
   * with.
   */
  setupGuiRendering() {
    const folder = this.gui.addFolder("Rendering").close();

    folder
      .add(this.settings, "toneMapping", Object.keys(TONE_MAPPINGS))
      .name("Tone mapping")
      .onChange(() => this.emitUpdate());
    folder
      .add(this.settings, "exposure", 0.1, 3.0, 0.05)
      .name("Exposure")
      .onChange(() => this.emitUpdate());
    folder
      .add(this.settings, "srgbOutput")
      .name("sRGB output")
      .onChange(() => this.emitUpdate());
    folder
      .add(this.settings, "bloomGrading")
      .name("Grade bloom pass")
      .onChange(() => this.emitUpdate());

    folder
      .add(this.settings, "ambientIntensity", 0.0, 2.0, 0.05)
      .name("Ambient")
      .onChange((value: number) => {
        this.scene.traverse((obj) => {
          if (obj instanceof THREE.AmbientLight) obj.intensity = value;
        });
        this.emitUpdate();
      });
    folder
      .add(this.settings, "directionalIntensity", 0.0, 3.0, 0.05)
      .name("Directional")
      .onChange((value: number) => {
        // Only the model's own key light. The six faint fill lights World adds
        // are named .WorldDirectionalLight* and are deliberately left alone.
        this.scene.traverse((obj) => {
          if (obj instanceof THREE.DirectionalLight && !obj.name.startsWith(".World")) obj.intensity = value;
        });
        this.emitUpdate();
      });

    folder
      .add(this.settings, "lightmapIntensity", 0.0, 4.0, 0.05)
      .name("Lightmap")
      .onChange((value: number) => {
        this._forEachMaterial((material) => {
          if ("lightMap" in material && (material as THREE.MeshPhongMaterial).lightMap) {
            (material as THREE.MeshPhongMaterial).lightMapIntensity = value;
          }
        });
        this.emitUpdate();
      });

    folder
      .addColor(this.settings, "specularColor")
      .name("Specular")
      .onChange((value: string) => {
        this._forEachMaterial((material) => {
          const phong = material as THREE.MeshPhongMaterial;
          if (phong.specular) phong.specular.set(value);
        });
        this.emitUpdate();
      });
    folder
      .add(this.settings, "specularShininess", 1, 200, 1)
      .name("Shininess")
      .onChange((value: number) => {
        this._forEachMaterial((material) => {
          const phong = material as THREE.MeshPhongMaterial;
          if (phong.shininess !== undefined) phong.shininess = value;
        });
        this.emitUpdate();
      });
  }

  /** Every material in the scene, including each entry of a material array. */
  private _forEachMaterial(fn: (material: THREE.Material) => void) {
    const seen = new Set<THREE.Material>();
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (!material || seen.has(material)) continue;
        seen.add(material);
        fn(material);
      }
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
      .add(this.settings, "showBoxes")
      .name("Show mesh bounds")
      .onChange((value: boolean) => {
        this._removeBoxHelpers();
        // Report either way: unticking should still say what it found, so the
        // diagnostic does not depend on which state the box happened to be in.
        if (value) this._addBoxHelpers();
        else this._reportTrackMeshes();
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

  /**
   * One wireframe box per mesh, in world space. Useful when geometry is loaded
   * and positioned but nothing shows: a box with no surface inside it means the
   * mesh is there but not drawing.
   */
  private _addBoxHelpers() {
    this.scene.updateMatrixWorld(true);
    this._reportTrackMeshes(true);
  }

  /** Log what the renderer would do with the track meshes. */
  private _reportTrackMeshes(addHelpers = false) {
    this.scene.updateMatrixWorld(true);

    /** Nearest named ancestor, so a mesh can be attributed to its VEXX node. */
    const owner = (obj: THREE.Object3D) => {
      for (let o: THREE.Object3D | null = obj; o; o = o.parent)
        if (o.name && !o.name.startsWith(".") && !/^Object_/.test(o.name)) return o.name;
      return "";
    };

    const box = new THREE.Box3();
    let n = 0;
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name.startsWith(".")) return;
      // Only the track surface. "collision_trackwall" also matches "track", and
      // its 112 collision meshes would swamp the 48 real ones.
      if (!/wohdtrack/i.test(owner(obj))) return;
      if (addHelpers) {
        const helper = new THREE.BoxHelper(obj, 0x00ff00);
        helper.name = ".BoxHelper";
        this.scene.add(helper);
        this._boxHelpers.push(helper);
      }
      obj.geometry.computeBoundingBox();
      if (obj.geometry.boundingBox) box.union(obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld));
      n++;
    });
    // Also report what the renderer would actually draw for these meshes.
    let drawn = 0, noIndex = 0, zeroIdx = 0, hidden = 0, matMissing = 0;
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!/track|wohdtrack/i.test(owner(obj))) return;
      const g = obj.geometry as THREE.BufferGeometry;
      const mat = obj.material as THREE.Material;
      if (!g.index) noIndex++;
      else if (g.index.count === 0) zeroIdx++;
      if (!obj.visible) hidden++;
      if (!mat || mat.visible === false) matMissing++;
      const range = g.drawRange;
      if (g.index && g.index.count > 0 && obj.visible && mat?.visible !== false &&
          range.count !== 0) drawn++;
    });
    api.log(`[bounds] drawable=${drawn} noIndex=${noIndex} emptyIndex=${zeroIdx} ` +
            `hidden=${hidden} materialHidden=${matMissing}`);

    // Layer test: a mesh on a layer the camera does not enable is skipped by
    // the renderer, while a BoxHelper added to the scene root stays on layer 0
    // and is drawn regardless — which is exactly the paradox here.
    const camMask = this.camera.layers.mask;
    const byLayer = new Map<number, number>();
    let onCamera = 0, offCamera = 0;
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!/track|wohdtrack/i.test(owner(obj))) return;
      byLayer.set(obj.layers.mask, (byLayer.get(obj.layers.mask) ?? 0) + 1);
      if ((obj.layers.mask & camMask) !== 0) onCamera++; else offCamera++;
    });
    const layerName = (mask: number) => {
      const names: string[] = [];
      for (const [name, id] of Object.entries(this._layers))
        if (mask & (1 << (id as number))) names.push(name);
      return names.join(",") || (mask === 1 ? "(default layer 0)" : "?");
    };
    api.log(`[bounds] camera mask=0x${camMask.toString(16)} ` +
            `onEnabledLayer=${onCamera} onDisabledLayer=${offCamera}`);
    api.log(`[bounds] known layers: ${Object.entries(this._layers).map(([n, i]) => `${n}=${i}`).join(", ")}`);
    for (const [mask, count] of byLayer)
      api.log(`[bounds]   ${count} meshes on layer mask 0x${mask.toString(16)} "${layerName(mask)}"` +
              `${(mask & camMask) === 0 ? "  <-- NOT DRAWN" : ""}`);
    // Who actually owns the layer-19 meshes? Report their VEXX ancestry.
    const owners = new Map<string, number>();
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.layers.mask !== 0x80000) return;
      const chain: string[] = [];
      for (let o: THREE.Object3D | null = obj; o && chain.length < 4; o = o.parent)
        if (o.name && !o.name.startsWith(".")) chain.push(o.name);
      const key = chain.reverse().join(" > ");
      owners.set(key, (owners.get(key) ?? 0) + 1);
    });
    api.log(`[bounds] layer-19 meshes belong to ${owners.size} distinct paths:`);
    for (const [k, c] of [...owners].slice(0, 8)) api.log(`[bounds]   x${c}  ${k}`);

    api.log(`[bounds] ${n} track meshes` +
            (box.isEmpty() ? "" : `, world bbox ${box.min.toArray().map(v => v.toFixed(0))} .. ${box.max.toArray().map(v => v.toFixed(0))}`));
  }

  private _removeBoxHelpers() {
    for (const h of this._boxHelpers) this.scene.remove(h);
    this._boxHelpers = [];
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
    if (this._sceneCamera) this._applySceneCamera();
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
