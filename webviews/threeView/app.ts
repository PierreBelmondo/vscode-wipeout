import * as THREE from "three";

import { CSS2DRenderer } from "./renderers/CSS2DRenderer";
import { Loader } from "./loaders";
import { VEXXLoader } from "./loaders/VEXXLoader";
import { RCSModelLoader } from "./loaders/RCSMODELLoader";
import { FELoader } from "./loaders/FELoader";
import { World } from "./worlds";
import { api } from "./api";
import { ThreeViewMessage, ThreeViewMessageImportBody, ThreeViewMessageLoadBody } from "@core/api/rpc";
import { EffectComposer } from "./postprocessing/EffectComposer";
import { RenderPass } from "./postprocessing/RenderPass";
import { FrontEndEdgePass } from "./postprocessing/FrontEndEdgePass";
import { DEFAULT_SCREEN_SETTING, ScreenSetting } from "./frontendSkin";
import { UnrealBloomPass } from "./postprocessing/UnrealBloomPass";
import { TONE_MAPPINGS } from "./renderSettings";
import { ShaderPass } from "./postprocessing/ShaderPass";

const textDecoder = new TextDecoder();

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

// The bloom composite draws straight to the screen. With bloom OFF the scene is
// rendered directly to the canvas and the renderer applies tone mapping and the
// output encoding itself; this pass has to do the same or toggling bloom would
// visibly change the exposure and gamma of the whole scene.
//
// Do NOT define the maths here. Three injects `tonemapping_pars_fragment` and
// `encodings_pars_fragment` into every non-raw ShaderMaterial, and emits two
// wrappers alongside them:
//
//   vec3 toneMapping( vec3 )          -- only when toneMapping != NoToneMapping
//   vec4 linearToOutputTexel( vec4 )  -- always
//
// Declaring our own ACESFilmicToneMapping/LinearTosRGB redefined those chunks'
// functions, so the fragment shader failed to link ("function already has a
// body") and the pass drew nothing. Calling the wrappers also means this pass
// follows the toolbox's tone-mapping dropdown for free.
//
// TONE_MAPPING is defined by the render loop whenever the wrapper exists.
const fragmentShader = `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;

void main() {
  vec4 color = texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv );
  #ifdef BLOOM_GRADING
    #ifdef TONE_MAPPING
      color = vec4( toneMapping( color.rgb ), color.a );
    #endif
    color = linearToOutputTexel( color );
  #endif
  gl_FragColor = color;
}
`;

const params = {
  bloom: true,
  bloomThreshold: 0.5,
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
  private _passEdges: FrontEndEdgePass;
  private _passEdgeScene: RenderPass;
  private _effectComposerEdges: EffectComposer;
  private _screenSpaceTarget: THREE.WebGLRenderTarget;
  /** Materials bound to _screenSpaceTarget, so binding runs once per material
   * rather than re-scanning userData.variant.samplers every frame. */
  private _screenSpaceBound = new WeakSet<THREE.Material>();

  private _world: World;

  constructor(world: World) {
    this._world = world;

    this._renderer = new THREE.WebGLRenderer({ antialias: true });

    // Report shader compile/link failures.
    //
    // Nothing was reporting them, and a raw ShaderMaterial that fails to link
    // draws with whatever the renderer falls back to -- which looks exactly
    // like a shader that runs but ignores every uniform. These programs are
    // machine-translated from RSX bytecode, so a GLSL-level mistake in the
    // emitter is a live possibility and has to be visible rather than inferred.
    this._renderer.debug.checkShaderErrors = true;
    // r149's WebGLDebug type predates onShaderError; the runtime supports it.
    (this._renderer.debug as unknown as {
      onShaderError?: (gl: WebGLRenderingContext, p: WebGLProgram, vs: WebGLShader, fs: WebGLShader) => void;
    }).onShaderError = (gl, program, vs, fs) => {
      const status = (sh: WebGLShader) => gl.getShaderInfoLog(sh)?.trim() ?? "";
      const vlog = status(vs);
      const flog = status(fs);
      const plog = gl.getProgramInfoLog(program)?.trim() ?? "";
      api.log(`[shader] LINK FAILED${plog ? `: ${plog}` : ""}`);
      if (vlog) api.log(`[shader]   vertex: ${vlog.split("\n")[0]}`);
      if (flog) api.log(`[shader]   fragment: ${flog.split("\n")[0]}`);
    };
    this._renderer.setClearColor(0x000000);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    // Colour management. The game's textures are authored in sRGB, and until
    // now nothing declared that: they were sampled as if linear, so every
    // texel was already too bright before a single light touched it. In r149
    // the API is `outputEncoding` / `texture.encoding` (`outputColorSpace`
    // arrives later), and render targets stay Linear -- the conversion happens
    // on the final pass to screen, which is exactly where the composer's last
    // pass draws.
    this._renderer.outputEncoding = THREE.sRGBEncoding;

    // ACES rather than Reinhard. Reinhard is `x / (1 + x)`: at exposure 1 it
    // maps a fully lit surface to 0.5 while leaving shadows near where they
    // started, so it compresses highlights far harder than darks -- which is
    // what flattened the specular lobe and left the scene looking washed out.
    // ACES holds its midtones and rolls off only the top end.
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;

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
        // Filled in by render(), which knows the current renderer state.
        defines: {},
      }),
      "baseTexture"
    );
    this._passFinal.needsSwap = true;

    this._effectComposerFinal = new EffectComposer(this._renderer);
    this._effectComposerFinal.addPass(this._passScene);
    this._effectComposerFinal.addPass(this._passFinal);

    // Front-end edge look: needs a depth attachment the edge detector can read.
    // The detector differences face IDs, so the buffer must hold them verbatim:
    // nearest filtering (linear would blend neighbouring IDs into false edges)
    // and no tone mapping (Reinhard would compress them together).
    //
    // Size it in device pixels: EffectComposer forces _pixelRatio to 1 when it
    // is handed a target, so a CSS-sized buffer would be resampled up to the
    // canvas and blend IDs across every triangle edge.
    const dpr = window.devicePixelRatio;
    const edgeW = Math.floor(window.innerWidth * dpr);
    const edgeH = Math.floor(window.innerHeight * dpr);
    const edgeTarget = new THREE.WebGLRenderTarget(edgeW, edgeH, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    // 24-bit depth. UnsignedShortType (16-bit) is not enough for this scene:
    // surfaces that sit close together resolve to the same depth value, so the
    // winner flips as the camera moves and face IDs bleed into each other.
    edgeTarget.depthTexture = new THREE.DepthTexture(edgeW, edgeH);
    edgeTarget.depthTexture.type = THREE.UnsignedInt248Type;
    edgeTarget.depthTexture.format = THREE.DepthStencilFormat;
    this._effectComposerEdges = new EffectComposer(this._renderer, edgeTarget);
    this._passEdges = new FrontEndEdgePass(this._world.camera, edgeW, edgeH);
    // Its own RenderPass: _passScene is shared with the other two composers, and
    // this one draws flat face IDs through scene.overrideMaterial rather than
    // the scene's real materials.
    this._passEdgeScene = new RenderPass(this._world.scene, this._world.camera, this._passEdges.idMaterial);
    this._effectComposerEdges.addPass(this._passEdgeScene);
    this._effectComposerEdges.addPass(this._passEdges);

    // Screen-space refraction/reflection target.
    //
    // A handful of generated materials (the tunnel refraction shaders,
    // reflectplane_dc_seawater) sample `screenSpaceRefractionTex` or
    // `screenSpaceReflectionTex` -- the PS3 engine's own render-to-texture of
    // the frame so far, which these fragment programs distort and composite
    // into their own colour. With no target bound they fell back to flat
    // grey, so the whole distortion effect multiplied a constant: visible
    // geometry, but never the "melted glass" look the shader computes.
    //
    // Sized at half resolution: this is a background distortion source, not
    // the frame itself, and the fragment programs UV-offset into it before
    // sampling, so a soft source reads as intended blur rather than aliasing.
    const dpr2 = window.devicePixelRatio;
    this._screenSpaceTarget = new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor((window.innerWidth * dpr2) / 2)),
      Math.max(1, Math.floor((window.innerHeight * dpr2) / 2))
    );
  }

  get domElement(): HTMLCanvasElement {
    return this._renderer.domElement;
  }

  set world(world: World) {
    this._world = world;
    this._passScene.scene = world.scene;
    this._passScene.camera = world.camera;
    this._passEdgeScene.scene = world.scene;
    this._passEdgeScene.camera = world.camera;
    this._passEdges.setCamera(world.camera);
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
    const edgeDpr = window.devicePixelRatio;
    this._passEdges.setSize(Math.floor(width * edgeDpr), Math.floor(height * edgeDpr));
    this._effectComposerEdges.setSize(Math.floor(width * edgeDpr), Math.floor(height * edgeDpr));
    this._screenSpaceTarget.setSize(
      Math.max(1, Math.floor((width * edgeDpr) / 2)),
      Math.max(1, Math.floor((height * edgeDpr) / 2))
    );
  }

  readonly bloomMatrials = [
    "emissive_bloom.rcsmaterial",
    "detonator_emissive_bloom.rcsmaterial",
    "flame_test.rcsmaterial",
  ]

  render() {
    // The toolbox owns these (see renderSettings.ts): apply whatever it holds
    // before drawing, so a change takes effect on the next frame. Both are
    // renderer state rather than per-material, so they are set here rather
    // than walked over the scene.
    // Guard every read: a World built before these settings existed, or any
    // path that swaps in a bare settings object, would otherwise write
    // `undefined` into toneMappingExposure and the shader's exposure uniform --
    // which multiplies the whole image by NaN and renders pure black.
    const settings = this._world.settings;
    const toneMapping = TONE_MAPPINGS[settings.toneMapping];
    this._renderer.toneMapping = toneMapping !== undefined ? toneMapping : THREE.ACESFilmicToneMapping;
    const exposure = typeof settings.exposure === "number" && isFinite(settings.exposure) ? settings.exposure : 1.0;
    this._renderer.toneMappingExposure = exposure;
    this._renderer.outputEncoding = settings.srgbOutput === false ? THREE.LinearEncoding : THREE.sRGBEncoding;

    // Keep the composite's defines in step with the renderer. TONE_MAPPING
    // tracks whether Three emitted its `toneMapping()` wrapper at all -- it
    // omits it for NoToneMapping, and calling a function that was never
    // declared fails to link.
    const material = this._passFinal.material as THREE.ShaderMaterial;
    const wanted: { [name: string]: string } = {};
    if (settings.bloomGrading !== false) wanted["BLOOM_GRADING"] = "";
    if (this._renderer.toneMapping !== THREE.NoToneMapping) wanted["TONE_MAPPING"] = "";
    const names = ["BLOOM_GRADING", "TONE_MAPPING"];
    if (names.some((name) => (name in material.defines) !== (name in wanted))) {
      material.defines = wanted;
      material.needsUpdate = true;
    }

    // The generated RCS materials are RAW ShaderMaterials, so Three injects
    // none of its colour-management chunks into them: they write the shading
    // maths's own LINEAR result straight to the target. Everything else in the
    // scene is converted for output -- by Three for its built-in materials, or
    // by the bloom composite, which applies toneMapping + linearToOutputTexel
    // to what it composites. So the RCS materials convert themselves, and only
    // on the path where nothing downstream will do it for them; converting
    // twice washes the scene out as surely as not converting at all leaves it
    // dark.

    if (this._world.settings.frontendEdges) {
      // Drive the detector from the <Main> values skin.xml carries for this
      // screen; VEXXLoader parks them on userdata when it loads the file.
      const setting: ScreenSetting = this._world.userdata.screenSetting ?? DEFAULT_SCREEN_SETTING;
      this._passEdges.setScreenSetting(setting.edgeLevel, setting.fillLevel, setting.edgeWidth);

      // Face IDs must reach the detector unmodified: no tone mapping, and no
      // texture sampling (the white texture's mip chain is not uniformly white,
      // which tinted distant faces and invented edges there).
      const toneMapping = this._renderer.toneMapping;
      this._renderer.toneMapping = THREE.NoToneMapping;

      // World.scene.background is the environment sky, not a colour. Drawn into
      // the ID buffer it gives the detector a fully textured backdrop to find
      // edges in, and its colours bleed into the ID comparison. Swap it out for
      // the page white skin.xml clears to:
      //   <ScreenClear><Values Colour="0x00ffffff">
      const background = this._world.scene.background;
      this._world.scene.background = null;
      this._renderer.setClearColor(0xffffff);

      this._effectComposerEdges.render();

      this._world.scene.background = background;
      this._renderer.toneMapping = toneMapping;
      return;
    }

    this._updateScreenSpaceTarget();

    if (this._world.settings.bloom) {
      const beforeBloom = (obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.material instanceof THREE.ShaderMaterial) {
            // Only the hand-written materials declare this. A generated one is
            // a raw ShaderMaterial built from the game's own program and has no
            // such uniform, so indexing it unguarded threw on every such mesh
            // the moment bloom was switched on.
            if (obj.material.uniforms?.["bloomActive"]) {
              obj.material.uniforms["bloomActive"].value = true;
            }
          } else if (obj.material instanceof THREE.Material) {
            if (this.bloomMatrials.indexOf(obj.material.name) == -1) {
              obj.userData["originalMaterial"] = obj.material;
              obj.material = this.world.materials["_black"];
            }
          }
        }
      };

      const afterBloom = (obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.material instanceof THREE.ShaderMaterial) {
            if (obj.material.uniforms?.["bloomActive"]) {
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

  /**
   * Fill the screen-space target from the main camera, then bind it wherever
   * a material actually samples it.
   *
   * Rendered EVERY frame from the live camera -- this is meant to approximate
   * the previous frame's colour buffer, which is what the PS3 engine's own
   * render-to-texture pass provides. A snapshot taken once at load time would
   * show a fixed camera angle no matter how the view moves, which is wrong in
   * a different way than the flat-grey fallback but just as wrong.
   *
   * Skipped entirely when nothing in the loaded scene needs it: the
   * traversal and an extra full-scene render are not free, and most files
   * (anything without a tunnel or the sea reflection plane) have no consumer.
   */
  private _updateScreenSpaceTarget() {
    let needed = false;
    const targets: { material: THREE.Material & { uniforms?: Record<string, THREE.IUniform> }; uniform: string }[] = [];
    for (const material of Object.values(this._world.materials)) {
      const variant = (material as unknown as { userData?: { variant?: { samplers?: { unit: number; name: string }[] } } })
        .userData?.variant;
      const sampler = variant?.samplers?.find(
        (s) => s.name === "screenSpaceRefractionTex" || s.name === "screenSpaceReflectionTex"
      );
      if (!sampler) continue;
      needed = true;
      const m = material as THREE.Material & { uniforms?: Record<string, THREE.IUniform> };
      if (this._screenSpaceBound.has(m)) continue;
      targets.push({ material: m, uniform: `TEX${sampler.unit}` });
    }
    if (!needed) return;

    // Bind once per material: the uniform VALUE is the render target's
    // texture object, which THREE keeps current across resizes/re-renders on
    // its own, so there is nothing to refresh here after the first frame.
    for (const { material, uniform } of targets) {
      if (material.uniforms?.[uniform]) {
        material.uniforms[uniform].value = this._screenSpaceTarget.texture;
        (material as unknown as { uniformsNeedUpdate: boolean }).uniformsNeedUpdate = true;
      }
      this._screenSpaceBound.add(material);
    }

    // Render the scene from the SAME camera into the target. The consuming
    // materials are excluded via onBeforeRender/onAfterRender toggling their
    // visibility -- a surface cannot meaningfully refract or reflect an image
    // of itself, and the flat grey these fell back to was at least not that.
    const hidden: THREE.Object3D[] = [];
    this._world.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material;
      if (this._screenSpaceBound.has(mat) && mesh.visible) {
        hidden.push(mesh);
        mesh.visible = false;
      }
    });

    const prevTarget = this._renderer.getRenderTarget();
    this._renderer.setRenderTarget(this._screenSpaceTarget);
    this._renderer.render(this._world.scene, this._world.camera);
    this._renderer.setRenderTarget(prevTarget);

    for (const mesh of hidden) mesh.visible = true;
  }
}

class Editor {
  worldRenderer: WorldRenderer;
  labelRenderer: CSS2DRenderer;

  clock: THREE.Clock;
  world: World;

  loader?: Loader;

  constructor(div: Element) {
    this.clock = new THREE.Clock();
    this.world = new World();
    this.world.onUpdate = this.render.bind(this);

    this.worldRenderer = new WorldRenderer(this.world);
    this.worldRenderer.domElement.style.position = "absolute";
    this.worldRenderer.domElement.style.left = "0";
    this.worldRenderer.domElement.style.top = "0";
    this.worldRenderer.domElement.style.width = "100%";
    this.worldRenderer.domElement.style.height = "100%";
    div.appendChild(this.worldRenderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.top = "0px";
    div.appendChild(this.labelRenderer.domElement);

    this.world.setupOrbitContols(this.labelRenderer.domElement);

    document.addEventListener(
      "click",
      (event: MouseEvent) => {
        const pointer = new THREE.Vector2();
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const intersections = this.world.raycast(pointer);
        if (intersections.length > 0) {
          const intersection = intersections[0];
          this.world.emitSelected(intersection.object)
        }
      },
      false
    );

    this.showWorld();
  }

  async load(body: ThreeViewMessageLoadBody) {
    api.log(`Loading ${body.uri} (${body.mime})`);
    switch (body.mime) {
      case "model/vnd.wipeout.vexx": {
        const response = await fetch(body.webviewUri);
        const buffer = await response.arrayBuffer();
        this.loader = new VEXXLoader();
        this.loader.loadFromBuffer(this.world, buffer, body.uri);
        if (body.uri.endsWith("ship.vex")) {
          api.require("locators.vex");
        }
        this.world.emitScene();
        this.world.setupGui();
        this.world.setupGuiCamera();
        this.world.setupGuiButtonExport();
        this.world.setupGuiLayers();
        this.world.setupGuiTrackCamera();
        this.world.setupGuiBackgroundColor();
        this.world.setupGuiBloom();
        this.world.setupGuiRendering();
        this.world.setupGuiDebug();
        this.loadWorld();
        break;
      }
      case "model/vnd.wipeout.rcsmodel": {
        try {
          const response = await fetch(body.webviewUri);
          const buffer = await response.arrayBuffer();
          api.log(`[rcsmodel] fetched ${buffer.byteLength} bytes, loading...`);
          this.loader = new RCSModelLoader();
          await this.loader.loadFromBuffer(this.world, buffer, body.uri);
          api.log(`[rcsmodel] loaded, scene children: ${this.world.scene.children.length}`);
          this.world.emitScene();
          this.world.setupGui();
          this.world.setupGuiCamera();
        this.world.setupGuiButtonExport();
          this.world.setupGuiLayers();
          this.world.setupGuiBackgroundColor();
          this.world.setupGuiRendering();
        this.world.setupGuiDebug();
          this.loadWorld();
        } catch (e: any) {
          api.log(`[rcsmodel] ERROR: ${e.message}\n${e.stack}`);
          console.error("[rcsmodel] load error:", e);
        }
        break;
      }
      case "application/xml+wipeout": {
        const response = await fetch(body.webviewUri);
        const buffer = await response.arrayBuffer();
        this.loader = new FELoader();
        const text = textDecoder.decode(buffer);
        this.loader.loadFromString(this.world, text);
        this.loadWorld();
        break;
      }
    }
  }

  async import(body: ThreeViewMessageImportBody) {
    api.log(`Importing ${body.uri} (${body.mime})`);
    const response = await fetch(body.webviewUri);
    const buffer = await response.arrayBuffer();

    if (this.loader) {
      await this.loader.import(buffer, body.uri);
      if (body.uri.endsWith(".vex")) {
        this.world.emitScene();
        this.world.setupGui();
        this.world.setupGuiCamera();
        this.world.setupGuiButtonExport();
        this.world.setupGuiLayers();
        this.world.setupGuiTrackCamera();
        this.world.setupGuiBackgroundColor();
        this.world.setupGuiBloom();
        this.world.setupGuiRendering();
        this.world.setupGuiDebug();
      }
    }
  }

  loadWorld() {
    /*
    const gridHelper = new THREE.GridHelper(400, 100, 0xffffff, 0x808080);
    gridHelper.position.y = -2;
    gridHelper.position.x = 0;
    this.world.scene.add(gridHelper);
    */
    this.worldRenderer.world = this.world;
    //this.render();
    this.animate();
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

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    this.world.updateAnimations(delta);
    this.render();
  }

  sceneRefresh() {
    this.world.emitScene();
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
        editor.import(msg.body);
        break;
      }
      case "scene.refresh": {
        editor.sceneRefresh();
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
