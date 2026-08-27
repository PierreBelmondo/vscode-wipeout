import * as THREE from "three";
import { GUI } from "lil-gui";
import { invalidateSceneLights } from "./materials/rcs/_generated";

import { OrbitControls } from "./controls/OrbitControls";
import { FlyControls } from "./controls/FlyControls";
import { GLTFExporter } from "./exporters/GLTFExporter";
import { VertexNormalsHelper } from "./helpers/VertexNormalsHelper";
import { api } from "./api";
import { DEFAULT_RENDER_SETTINGS, TONE_MAPPINGS } from "./renderSettings";
import type { WoTrackPoint } from "@core/formats/vexx/v4/wo_track";
import { EnvKey, type EnvSettings } from "@core/formats/rcs/envsettings";
import { liveUniformNames, setUniformOverride, getUniformOverride, reportOverrideReach, DRIVEN_UNIFORMS } from "./materials/rcs";


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
  /**
   * The track's .envsettings, once loaded.
   *
   * Materials read fog and prelit values from here rather than inventing them;
   * undefined until the file arrives, and for formats that ship none.
   */
  envSettings?: EnvSettings;

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

    // Six lights down ±X, ±Y and ±Z: an omnidirectional wash that is ambient
    // light by another name. It predates the Rendering folder's Ambient
    // control and double-counts the indirect the baked lightmaps already
    // carry, so it defaults to off and is driven by the Fill slider.
    for (let i = 0; i < 6; i++) {
      const directionalLight = new THREE.DirectionalLight(0xffffff, DEFAULT_RENDER_SETTINGS.fillIntensity);
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

  /**
   * Send the scene outline to the editor.
   *
   * NOT scene.toJSON(). That serialises every geometry -- each vertex attribute
   * as a JSON array of numbers, and the generated materials alias their
   * streams as extra `a_vN` attributes, so a track's position buffer went out
   * several times over -- plus a base64 PNG of every uncompressed texture.
   * For a track that is hundreds of megabytes of JSON, built here, copied
   * across the bridge, and then RETAINED by the extension host as
   * `document.scene` for as long as the file is open: the single largest
   * memory cost of opening a track, for a tree view that reads none of it.
   *
   * The outline (src/sceneGraph.ts) reads exactly: the object tree's uuid,
   * type, name, children, userData.format/type and material uuid; each
   * material's uuid, name, type, map, specularMap and texture-valued
   * uniforms; each texture's uuid, name and type. That is all this emits.
   */
  emitScene() {
    const materials = new Map<string, THREE.Material>();
    const textures = new Map<string, THREE.Texture>();
    const texture = (t: unknown) => {
      if (!(t instanceof THREE.Texture)) return undefined;
      textures.set(t.uuid, t);
      return t.uuid;
    };
    const walk = (object: THREE.Object3D): Record<string, unknown> => {
      const node: Record<string, unknown> = { uuid: object.uuid, type: object.type, name: object.name };
      const ud = object.userData;
      if (ud && (ud.format !== undefined || ud.type !== undefined)) node.userData = { format: ud.format, type: ud.type };
      const material = (object as THREE.Mesh).material;
      if (material instanceof THREE.Material) {
        materials.set(material.uuid, material);
        node.material = material.uuid;
      } else if (Array.isArray(material)) {
        for (const m of material) materials.set(m.uuid, m);
        node.material = material.map((m) => m.uuid);
      }
      if (object.children.length) node.children = object.children.map(walk);
      return node;
    };
    const object = walk(this.scene);

    const materialJson = [...materials.values()].map((m) => {
      const json: Record<string, unknown> = { uuid: m.uuid, name: m.name, type: m.type };
      const slots = m as unknown as { map?: unknown; specularMap?: unknown; uniforms?: Record<string, { value: unknown }> };
      const map = texture(slots.map);
      if (map) json.map = map;
      const specularMap = texture(slots.specularMap);
      if (specularMap) json.specularMap = specularMap;
      if (slots.uniforms) {
        const uniforms: Record<string, { value: string }> = {};
        for (const [name, u] of Object.entries(slots.uniforms)) {
          const uuid = texture(u?.value);
          if (uuid) uniforms[name] = { value: uuid };
        }
        if (Object.keys(uniforms).length) json.uniforms = uniforms;
      }
      return json;
    });
    const textureJson = [...textures.values()].map((t) => ({ uuid: t.uuid, name: t.name, type: t.type }));

    api.scene({ object, materials: materialJson, textures: textureJson });
  }

  emitSelected(object: THREE.Object3D<THREE.Event>) {
    api.sceneSelected(object.uuid);

    // What was clicked is usually the child mesh a Group holds, and only the
    // Group carries the `Object_<id>` name -- so a bare uuid identifies nothing
    // you can look up in the files. Walk up for the first named ancestor and
    // report that, along with the material, which is what a rendering problem
    // actually needs to be traced back to a .rcsmaterial.
    let named: THREE.Object3D | null = object;
    while (named && !named.name) named = named.parent;

    const mesh = object as THREE.Mesh;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const parts = [
      named?.name || "(unnamed)",
      object.name && object.name !== named?.name ? `/ ${object.name}` : "",
      material ? `material=${material.name || material.type}` : "",
    ].filter(Boolean);

    const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
    const verts = geometry?.getAttribute("position")?.count;
    // How much of THIS mesh faces the sun the lightmaps were baked from.
    //
    // The lightmap is ground truth -- the engine baked it with the track's own
    // sun -- so a surface that reads as LIT in the bake while scoring near 0
    // here means the normals and the sun direction disagree, which is exactly
    // what makes a lit wall grow darker as the Sun scale is raised.
    //
    // Computed HERE rather than at load: the geometry is decoded before the
    // .envsettings arrives, so the sun is not known yet when the streams are
    // built. At pick time both are available, and the light is read from the
    // scene so it reflects whatever the toolbox has done to it since.
    const facing = (() => {
      // Prefer the shader's own normal stream over Three's `normal` attribute:
      // a generated material binds its inputs as v0..v8 from geometry.userData,
      // and the mesh that draws may not carry a conventional `normal` at all.
      const streams = geometry?.userData?.rcsStreams as Map<number, THREE.BufferAttribute> | undefined;
      const nrm =
        (streams?.get(3732576027) as THREE.BufferAttribute | undefined) ??
        (geometry?.getAttribute("normal") as THREE.BufferAttribute | undefined);
      if (!nrm || typeof nrm.getX !== "function") return "no-normals";
      let sun: THREE.DirectionalLight | null = null;
      this.scene.traverse((o) => {
        if (!sun && o instanceof THREE.DirectionalLight && !o.name.startsWith(".World")) sun = o;
      });
      if (!sun) return "no-sun";
      // Exactly what the SHADER computes, or the number is not comparable to
      // what is on screen. Two things were wrong before:
      //
      //  - the light: the shader receives the normalised light POSITION (the
      //    direction toward the sun), so that is what to dot against;
      //  - the normal: bindModelMatrix now transforms it into world space in
      //    the vertex program, so the raw attribute is in model space and
      //    disagrees with the shader wherever the mesh is rotated.
      const L = (sun as THREE.DirectionalLight).position.clone().normalize();
      const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      const n = new THREE.Vector3();
      let pos = 0;
      // The distribution, not just the sign: the fragment's diffuse term is the
      // UNCLAMPED dot scaled by the sun colour (which ships as HDR, ~4.0), so a
      // mean of -0.3 is a -1.2 subtraction against a prelit term well under 1.
      // The percentage alone cannot show that.
      let mean = 0, min = 1, max = -1;
      for (let i = 0; i < nrm.count; i++) {
        n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).applyMatrix3(nm).normalize();
        const d = n.dot(L);
        if (d > 0) pos++;
        mean += d;
        if (d < min) min = d;
        if (d > max) max = d;
      }
      mean /= nrm.count || 1;
      // Face-vs-vertex alignment: the one orientation check unit length cannot
      // do. Face normals from the positions and indices, dotted against the
      // decoded vertex normals. ~+1 = decode agrees with the geometry;
      // ~-1 = THIS MESH'S NORMALS ARE INVERTED (or its winding is), which is
      // exactly what turns a sun-facing wall black: the unclamped N.L goes
      // negative and the sun subtracts. Signed per winding, so read |value|.
      let align = "n/a";
      const posAttr = geometry?.getAttribute("position") as THREE.BufferAttribute | undefined;
      const index = geometry?.index;
      if (posAttr && index) {
        const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
        const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), f = new THREE.Vector3();
        let sum = 0, cnt = 0;
        for (let t = 0; t + 2 < index.count && cnt < 5000; t += 3) {
          const [ia, ib, ic] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
          pa.fromBufferAttribute(posAttr, ia);
          pb.fromBufferAttribute(posAttr, ib);
          pc.fromBufferAttribute(posAttr, ic);
          f.crossVectors(e1.subVectors(pb, pa), e2.subVectors(pc, pa));
          const fl = f.length();
          if (fl < 1e-9) continue;
          n.set(
            nrm.getX(ia) + nrm.getX(ib) + nrm.getX(ic),
            nrm.getY(ia) + nrm.getY(ib) + nrm.getY(ic),
            nrm.getZ(ia) + nrm.getZ(ib) + nrm.getZ(ic)
          );
          const nl = n.length();
          if (nl < 1e-6) continue;
          sum += f.dot(n) / (fl * nl);
          cnt++;
        }
        if (cnt) align = (sum / cnt).toFixed(2);
      }
      return `${((100 * pos) / nrm.count).toFixed(1)}% meanNL=${mean.toFixed(2)} [${min.toFixed(2)}..${max.toFixed(2)}] L=(${L.x.toFixed(2)},${L.y.toFixed(2)},${L.z.toFixed(2)}) faceAlign=${align}`;
    })();
    api.log(`[picked] ${parts.join(" ")}${verts ? ` verts=${verts}` : ""} facingSun=${facing}`);

    // The blend state, since "it looks transparent" is usually decided here
    // rather than in the shader.
    if (material) {
      const m = material as THREE.Material & { uniforms?: Record<string, { value: unknown }> };
      const alphaTest = m.uniforms?.u_alphaTest?.value;
      api.log(
        `[picked]   transparent=${m.transparent} opacity=${m.opacity}` +
          ` depthWrite=${m.depthWrite} u_alphaTest=${alphaTest ?? "n/a"}`
      );
      // A mesh still on the placeholder either waits for a material that never
      // finished (the stamp names it) or was never claimed by one (no stamp).
      if (m.name === "" || m.name === "_default" || m.name === ".default") {
        const pending = mesh.userData?.rcsPendingMaterial;
        api.log(`[picked]   DEFAULT material: ${pending ? `linked to '${pending}' which never finished` : "never linked to any AsyncMaterial"}`);
      }

      // Which permutation ran, and every colour-valued uniform it reads.
      //
      // A surface whose texture is visibly right but tinted is being MULTIPLIED
      // by something, and the only candidates are the uniforms -- a shader
      // declares them, `declaredUniforms` invents a neutral for whatever
      // nothing else fills in, and a wrong neutral tints every pixel uniformly.
      // Printing the values is the only way to tell which one it is; deriving
      // it from the shader text has repeatedly pointed at the wrong term.
      const variant = m.userData?.variant as
        | {
            permutation?: number;
            samplers?: { unit: number; name: string }[];
            attributes?: { reg: number; name: string }[];
          }
        | undefined;
      if (variant) {
        api.log(`[picked]   permutation=${variant.permutation} samplers=${variant.samplers?.map((s) => `${s.unit}:${s.name}`).join(" ")}`);
      }
      // A throw anywhere below must not silently truncate the pick log -- two
      // rounds of debugging were spent on output that stopped mid-block.
      try {
      // ONE LINE each. Several rounds of these diagnostics arrived truncated a
      // few lines in -- the log pipeline drops later lines -- so each section
      // is a single api.log call, and the pick block stays readable end to end.
      //
      // Attributes: as BOUND on this geometry, with value ranges. An attribute
      // the shader declares but the geometry lacks reads the constant (0,0,0,1)
      // -- a missing a_v4 samples the lightmap at ONE texel for the whole mesh.
      if (geometry) {
        const attrs: string[] = [];
        for (const [aname, attr] of Object.entries(geometry.attributes)) {
          if (!aname.startsWith("a_v")) continue;
          const a = attr as THREE.BufferAttribute;
          let lo = Infinity, hi = -Infinity;
          const items = Math.min(a.count, 2000);
          for (let i = 0; i < items; i++) {
            for (let c = 0; c < a.itemSize; c++) {
              const v = a.array[i * a.itemSize + c] as number;
              if (v < lo) lo = v;
              if (v > hi) hi = v;
            }
          }
          // The stream NAME from the permutation's own binding table, so a
          // range that makes no sense for its role reads as such -- a "Uv1"
          // spanning thousands is a decode fault; the same range on a packed
          // engine stream may be by design.
          const bname = variant?.attributes?.find((b) => `a_v${b.reg}` === aname)?.name;
          attrs.push(`${aname}${bname ? `=${bname}` : ""}(${a.itemSize}x${a.count} [${lo.toFixed(2)}..${hi.toFixed(2)}])`);
        }
        if (attrs.length) api.log(`[picked]   attrs: ${attrs.join(" ")}`);
      }
      // Samplers: the file each slot resolved to and its upload encoding.
      // "(fallback)" marks the viewer's stand-in for an engine render target --
      // a live reflection term sampling a flat fallback is a whole-surface
      // wash. sRGB on a DATA texture is invisible everywhere else.
      {
        const texes: string[] = [];
        for (const [name, u] of Object.entries(m.uniforms ?? {})) {
          if (!name.startsWith("TEX")) continue;
          const t = u?.value as THREE.Texture | null;
          if (t && (t as THREE.Texture).isTexture) {
            const enc = t.encoding === THREE.sRGBEncoding ? "sRGB" : t.encoding === THREE.LinearEncoding ? "linear" : `enc${t.encoding}`;
            texes.push(`${name}=${t.name.split("/").pop() || "(fallback)"}/${enc}`);
          }
        }
        if (texes.length) api.log(`[picked]   tex: ${texes.join(" ")}`);
      }
      } catch (e) {
        api.log(`[picked]   (diagnostics failed: ${e})`);
      }
      const fmt = (v: unknown) => {
        const q = v as { x?: number; y?: number; z?: number; w?: number; isVector4?: boolean; isVector3?: boolean };
        if (q && (q.isVector4 || q.isVector3)) {
          const p = (n?: number) => (n ?? 0).toFixed(2);
          return `(${p(q.x)},${p(q.y)},${p(q.z)}${q.isVector4 ? `,${p(q.w)}` : ""})`;
        }
        return typeof v === "number" ? v.toFixed(2) : undefined;
      };
      // One line, same truncation defence as above.
      const us: string[] = [];
      for (const [name, u] of Object.entries(m.uniforms ?? {})) {
        if (name.startsWith("TEX") || name.startsWith("viewProj")) continue;
        const s = fmt(u?.value);
        if (s) us.push(`${name}=${s}`);
      }
      if (us.length) api.log(`[picked]   u: ${us.join(" ")}`);

      // The fog term, evaluated here the way the shader evaluates it.
      //
      // A surface that has gone flat is usually fully fogged, and the factor is
      // exp(-(distance * density)^2) -- so the two things worth seeing are the
      // distance the shader actually receives and what it turns into. The
      // distance is the clip-space w, which for this projection is the view
      // depth of the mesh's own origin; close enough for a diagnostic.
      const fogUniform = m.uniforms?.fogColour?.value as THREE.Vector4 | undefined;
      if (fogUniform) {
        const world = object.getWorldPosition(new THREE.Vector3());
        const distance = world.distanceTo(this.camera.getWorldPosition(new THREE.Vector3()));
        const factor = Math.exp(-Math.pow(distance * fogUniform.w, 2));
        api.log(
          `[picked]   fog: distance=${distance.toFixed(1)} density=${fogUniform.w}` +
            ` factor=${factor.toFixed(4)} -> ${((1 - factor) * 100).toFixed(0)}% fog colour`
        );
      }
    }
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

    // Ambient / Directional / Fill / Lightmap / Specular / Shininess used to
    // live here. They were guesses at values the game files turned out to
    // carry: a track's .envsettings gives the sun's colour and direction, the
    // constant ambient, the fog and the prelit scales, and the generated
    // materials read those directly. Four of the six drove properties only
    // Three's built-in materials have (lightMapIntensity, specular, shininess,
    // the fill lights), so they did nothing at all for the 441 generated ones
    // while still looking live. See setupGuiEnvironment.
  }

  /**
   * The track's own environment values, once its .envsettings has loaded.
   *
   * Read-only on purpose: these are what the engine shipped, so the useful
   * thing is seeing them, not inventing alternatives. The scale control is the
   * exception -- it exists because a viewer has no tone-mapping pipeline
   * identical to the game's, so the sun sometimes needs trimming.
   */
  setupGuiEnvironment() {
    if (this._envFolder) {
      this._envFolder.destroy();
      this._envFolder = null;
    }
    const env = this.envSettings;
    if (!env) return;

    const folder = this.gui.addFolder("Environment").close();
    this._envFolder = folder;

    const show = (label: string, value: string) => {
      const holder = { [label]: value };
      folder.add(holder, label).disable();
    };
    const fmt = (v: number[] | undefined, digits = 3) =>
      v ? v.map((n) => n.toFixed(digits)).join(", ") : "-";

    // Through EnvKey, not raw strings: the files come in two generations and
    // half the tracks spell these keys the older way, which a literal misses.
    show("Sun colour", fmt(env.get(EnvKey.sunColour)));
    show("Sun direction", fmt(env.get(EnvKey.sunDirection), 6));
    show("Ambient", fmt(env.get(EnvKey.constantAmbient)));
    show("Fog colour", fmt(env.get(EnvKey.fogColour)));
    show("Fog density", fmt(env.get(EnvKey.fogDensity), 5));
    show("Prelit scale", fmt(env.get(EnvKey.prelitAmbientScale)));

    folder
      .add(this.settings, "directionalIntensity", 0.0, 3.0, 0.05)
      .name("Sun scale")
      .onChange((value: number) => {
        // Scales the track's own sun rather than replacing it: the colour
        // carries the engine's brightness (up to 4.0, an HDR value), and this
        // is the multiplier on top.
        this.scene.traverse((obj) => {
          if (obj instanceof THREE.DirectionalLight && !obj.name.startsWith(".World")) {
            obj.intensity = value;
          }
        });
        invalidateSceneLights();
        this.emitUpdate();
      });
    folder
      .add(this.settings, "ambientIntensity", 0.0, 2.0, 0.05)
      .name("Ambient scale")
      .onChange((value: number) => {
        this.scene.traverse((obj) => {
          if (obj instanceof THREE.AmbientLight) obj.intensity = value;
        });
        invalidateSceneLights();
        this.emitUpdate();
      });
  }

  private _envFolder: ReturnType<GUI["addFolder"]> | null = null;
  private _uniformsFolder: ReturnType<GUI["addFolder"]> | null = null;
  /** Refreshers for the disabled, per-frame-driven uniform controls. */
  private _uniformProbes: (() => void)[] = [];

  /**
   * A control per uniform the loaded materials actually declare.
   *
   * These are the values the engine fed from render state the viewer does not
   * model. `declaredUniforms` guesses a neutral for each from its name -- 1 for
   * anything that looks multiplicative, 0 for a bias -- and a wrong guess tints
   * or blackens every surface that shader draws, uniformly. Which uniform is at
   * fault cannot be read off the shader text, so this makes it something you
   * drag rather than something to derive.
   *
   * Built from the live materials, not a fixed list: 114 distinct names appear
   * across the corpus and which are in play depends on the track. Call after a
   * model has loaded.
   */
  setupGuiUniforms() {
    if (this._uniformsFolder) {
      this._uniformsFolder.destroy();
      this._uniformsFolder = null;
    }
    this._uniformProbes = [];
    const live = liveUniformNames();
    if (!live.size) return;

    const folder = this.gui.addFolder("Shader uniforms").close();
    this._uniformsFolder = folder;

    // Materials stream in, so the folder can be built before the last one
    // exists. Rebuilding is cheap and keeps overrides, which live in the
    // material layer rather than in these controls.
    folder.add({ refresh: () => this.setupGuiUniforms() }, "refresh").name("rescan materials");

    // Split by whether anything actually drives the value. A uniform fed from
    // the camera, the clock, the mesh transform, the lights or the track's
    // .envsettings is rewritten every frame or every draw, so an override on it
    // is undone immediately -- the slider looks dead and invites the conclusion
    // that the uniform does not matter. The ones worth dragging are the others:
    // the values `declaredUniforms` invented from the name alone.
    const names = [...live.keys()].sort();
    const guessed = names.filter((n) => !DRIVEN_UNIFORMS.has(n));
    const driven = names.filter((n) => DRIVEN_UNIFORMS.has(n));
    const drivenFolder = driven.length ? folder.addFolder("driven (read-only sources)").close() : null;

    for (const name of [...guessed, ...driven]) {
      const current = getUniformOverride(name) ?? live.get(name)!;
      const parent = DRIVEN_UNIFORMS.has(name) ? drivenFolder! : folder;
      const sub = parent.addFolder(name).close();
      // Held per control so a drag on one channel keeps the others.
      const state = { x: current.x, y: current.y, z: current.z, w: current.w };
      // The value BEFORE any slider touched it, kept here as well as in the
      // material layer: reset has to put the controls back too, or the sliders
      // keep showing the dragged numbers and the next drag on any one channel
      // pushes the stale others straight back in.
      const pristine = { x: current.x, y: current.y, z: current.z, w: current.w };
      const controllers: { updateDisplay: () => void }[] = [];
      let reported = false;
      const push = () => {
        setUniformOverride(name, new THREE.Vector4(state.x, state.y, state.z, state.w));
        // Once per slider: says whether the value is reaching any shader at all.
        if (!reported) { reported = true; reportOverrideReach(name); }
        this.emitUpdate();
      };
      // -2..4 rather than 0..1: several of these are HDR intensities the
      // engine drives well above 1, and a few are signed.
      for (const axis of ["x", "y", "z", "w"] as const) {
        // fogColour.w is not a colour channel: it is the fog DENSITY, and the
        // shaders read it as `distance * fogColour.w` before squaring and
        // exponentiating. The shipped values are around 0.0002-0.00175, so on
        // the colour range a single step saturates the fog completely and the
        // surface snaps to flat fog colour -- which reads as the texture
        // vanishing the moment the slider is touched.
        const isDensity = name === "fogColour" && axis === "w";
        const c = isDensity
          ? sub.add(state, axis, 0, 0.005, 0.00005).name("w (density)").onChange(push)
          : name === "prelitBias"
            // An EXPONENT, not a colour: the lightmapped shaders compute
            // pow(lightmap, prelitBias). Values below 1 lift dark texels much
            // more than bright ones, which is the curve a too-black shadow
            // wants, and the whole useful range sits between 0 and 1 -- far
            // too fine to find on a -2..4 slider stepping by 0.01.
            ? sub.add(state, axis, 0.05, 2, 0.005).onChange(push)
            : sub.add(state, axis, -2, 4, 0.01).onChange(push);
        // Per-frame sources win: tick() rewrites these from the camera and the
        // clock, so the control shows the live value rather than pretending to
        // set it. fogColour and the light/ambient uniforms are the exception --
        // they come from the .envsettings, which an override is meant to beat,
        // and applyUniformOverrides re-asserts after every settings pass.
        if (name === "eyePositionWorldSpace" || name === "time" || name === "positionScale" || name === "positionBias") {
          c.disable();
          const source = live.get(name)!;
          this._uniformProbes.push(() => {
            state[axis] = source[axis];
            c.updateDisplay();
          });
        }
        controllers.push(c);
      }
      sub
        .add(
          {
            reset: () => {
              setUniformOverride(name, null);
              // Put the controls back as well as the uniform.
              Object.assign(state, pristine);
              for (const c of controllers) c.updateDisplay();
              this.emitUpdate();
            },
          },
          "reset"
        )
        .name("reset to default");
    }
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
        // The loader calls play() as soon as it builds the clip, so an action
        // IS running by the time this folder is built. Initialising the toggle
        // to false without stopping it left the control disagreeing with the
        // scene: every box read "off" while every animation ran, and the first
        // click -- which the user means as "start this" -- stopped it instead.
        // Report the truth rather than inventing a default.
        this.settings.actions[action.name] = action.action.isRunning();
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

  /**
   * Animations that start stopped. The loader plays every clip it builds;
   * these are held at their first keyframe instead and left to the
   * Animations folder (or "All") to start.
   *
   * `EF_` is the effect rigs -- engine flares, exhaust, and the like -- which
   * loop constantly and get in the way when the point is to look at the model.
   */
  static readonly STOPPED_BY_DEFAULT = ["EF_"];

  addAction(name: string, action: THREE.AnimationAction, mixer: THREE.AnimationMixer) {
    // Case-insensitive: the rigs are hand-named by artists, and the same prefix
    // turns up as EF_, ef_ and Ef_ across files.
    const lower = name.toLowerCase();
    if (World.STOPPED_BY_DEFAULT.some((prefix) => lower.startsWith(prefix.toLowerCase()))) {
      // The loader has already snapped the mixer to frame 0, so stopping here
      // leaves the pose there. Done before the Animations folder is built, so
      // its toggle -- initialised from isRunning() -- reads "off" truthfully.
      action.stop();
    }
    const a = { name, mixer, action };
    this._actions.push(a);
  }

  addTickMaterial(mat: { tick: (delta: number) => void }) {
    // Materials are shared between the entries that name the same file, so the
    // same instance is offered here many times -- 805 times for 68 materials on
    // 01_vineta_k. Ticking one repeatedly does the same work over and over.
    if (this._tickMaterials.includes(mat)) return;
    this._tickMaterials.push(mat);
  }

  /** One-shot report of what the frame loop is actually driving. */
  private _tickReported = false;

  updateAnimations(delta: number) {
    for (const action of this._actions) action.mixer.update(delta);
    for (const mat of this._tickMaterials) mat.tick(delta);
    // Says whether anything is being animated at all, and whether the clock is
    // moving -- "the animations are broken" has three separate causes (nothing
    // registered, tick not running, the uniform not reaching the shader) and
    // this distinguishes them without another round of guessing.
    if (!this._tickReported && this._tickMaterials.length) {
      this._tickReported = true;
      const withClock = this._tickMaterials.filter(
        (m) => (m as unknown as { uniforms?: Record<string, unknown> }).uniforms?.["time"]
      ).length;
      const running = this._actions.filter((a) => a.action.isRunning()).length;
      const weighted = this._actions.filter((a) => a.action.getEffectiveWeight() > 0).length;
      const durations = this._actions.map((a) => a.action.getClip().duration);
      const zeroLength = durations.filter((d) => !(d > 0)).length;
      api.log(
        `[anim] ${this._actions.length} mixer actions (${running} running,` +
          ` ${weighted} weighted, ${zeroLength} zero-duration,` +
          ` maxDur=${Math.max(0, ...durations).toFixed(2)}s),` +
          ` ${this._tickMaterials.length} tick materials (${withClock} declare 'time'),` +
          ` delta=${delta.toFixed(4)}`
      );
    }
    // The driven uniforms' controls are disabled probes, so they have to be
    // refreshed from the material or they show whatever was there when the
    // folder was built. Guarded because this is a DEBUG readout: a controller
    // destroyed by a folder rebuild must not take the camera updates below it
    // -- or the whole frame loop -- down with it.
    if (this._uniformsFolder) {
      try {
        for (const refresh of this._uniformProbes) refresh();
      } catch {
        this._uniformProbes = [];
      }
    }
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
