import * as THREE from "three";
import { BankDefaults, BankLayout, BankValues, BankWindow, buildBank } from "./_bank";
import { AttrBinding } from "./_bindings";
import { EnvKey, EnvSettings } from "@core/formats/rcs/envsettings";
import { Permutation, RawRcsMaterial } from "./_raw";

/**
 * A material whose GLSL came out of `rcsdump -g` rather than being written here.
 *
 * The hand-transcribed factories beside this file each read one permutation's
 * disassembly and rewrite its maths in GLSL. That is accurate but does not
 * scale: there are 1722 .rcsmaterial files and 112109 shader programs in them.
 * rcsdump emits the same programs mechanically, so this class is what runs one.
 *
 * What the generated GLSL needs that a hand-written shader does not:
 *
 *  - Vertex attributes are named vN after the RSX register, not `position` or
 *    `uv`. The permutation's own binding table says which stream id belongs on
 *    each register, and the id is the identity -- 0xb9d31b0a is Stride.position
 *    whatever the exporter happened to call it. See _bindings.ts.
 *  - Samplers are TEXn by texture unit, likewise from the binding table.
 *  - Constants the permutation declares become named uniforms; the rest are
 *    read from the engine's shared bank, rebased by the emitter into a small
 *    `c[]` array. See _bank.ts for why that bank is not a fixed table.
 */

/**
 * The scene's key light and total ambient, looked up once per frame.
 *
 * syncLights runs per material, and a track builds hundreds of them -- 805 for
 * 01_vineta_k. Traversing the whole scene in each one meant hundreds of full
 * scene walks every frame, which is most of why the viewer crawled. The lights
 * are the same for all of them, so the walk is done once and shared; the cache
 * is keyed on Three's own frame-invalidating counter so it still tracks changes
 * made by the Rendering toolbox.
 */
type SceneLights = {
  sun: THREE.DirectionalLight | null;
  sunDirection: THREE.Vector3 | null;
  ambient: THREE.Color;
};
let lightsCache: { scene: THREE.Scene; version: number; value: SceneLights } | null = null;
let lightsVersion = 0;

/** Call when the scene's lights change, so the next frame re-reads them. */
export function invalidateSceneLights() {
  lightsVersion++;
}

function sceneLights(scene: THREE.Scene): SceneLights {
  if (lightsCache && lightsCache.scene === scene && lightsCache.version === lightsVersion) {
    return lightsCache.value;
  }
  const ambient = new THREE.Color(0, 0, 0);
  let sun: THREE.DirectionalLight | null = null;
  let sunDirection: THREE.Vector3 | null = null;
  scene.traverse((object) => {
    // .FallbackAmbientLight is VEXXLoader's stand-in for Three's BUILT-IN
    // materials in files that author no lights (ship.vex authors none). At
    // intensity 1.0 it is not an engine ambient -- envsettings put
    // constantAmbientColour around 0.2-0.4 -- and summing it in washed the
    // whole hull out white. The engine uniform takes its value from
    // .EnvAmbient (or the track's own settings) instead.
    if (object instanceof THREE.AmbientLight && object.name !== ".FallbackAmbientLight") {
      ambient.add(object.color.clone().multiplyScalar(object.intensity));
    } else if (object instanceof THREE.DirectionalLight && !object.name.startsWith(".World") && !sun) {
      sun = object;
      sunDirection = object.position.clone().normalize().negate();
    }
  });
  const value: SceneLights = { sun, sunDirection, ambient };
  lightsCache = { scene, version: lightsVersion, value };
  return value;
}

export class GeneratedRcsMaterial extends RawRcsMaterial {
  private readonly _layout: BankLayout;

  /**
   * Which vertex stream id belongs on which `vN` register, from the
   * permutation's own binding table. RCSModelLoader reads this to alias each
   * mesh's streams onto the registers the shader declares.
   */
  readonly attributeBindings: AttrBinding[];

  private readonly _window: BankWindow;
  /** The VP's own embedded constants; see BankDefaults in _bank.ts. */
  private readonly _defaults: BankDefaults;
  /** Whether the bank carries the clock, so tick() must rebuild it. */
  private _bankHasTime = false;

  constructor(
    params: THREE.ShaderMaterialParameters,
    permutation: Permutation,
    layout: BankLayout,
    values: BankValues,
    attributeBindings: AttrBinding[] = [],
    window: BankWindow = { base: 454, size: 14 },
    defaults: BankDefaults = []
  ) {
    super(params, permutation);
    this._layout = layout;
    this.attributeBindings = attributeBindings;
    this._window = window;
    this._defaults = defaults;
    this._bankHasTime = layout.some((entry) => entry.name === "time");
    this.setBank(values);
  }

  /**
   * Rebuild the `c[]` bank.
   *
   * Called on construction and again whenever a value the bank carries moves --
   * `time` every frame for materials that read it, the eye position when the
   * camera moves.
   */
  setBank(values: BankValues) {
    const bank = buildBank(this._layout, values, this._window.base, this._window.size, this._defaults);
    if (!this.uniforms.c) this.uniforms.c = { value: bank };
    else this.uniforms.c.value = bank;
  }

  private _elapsed = 0;

  /**
   * Whether this material's vertex program dequantises position itself.
   *
   * The .rcsmodel stores position as raw int16 and carries the scale and bias
   * that turn it into world space on the PART, not in the buffer -- for
   * amphiseum's object[249] that is scale 1/128 and a bias of a few hundred
   * units, against raw values up to +-30706. The engine's vertex program does
   * `v0 * positionScale + positionBias` with exactly those numbers, so leaving
   * them at identity (as this first did) fed the shader raw +-30706 coordinates
   * and exploded the geometry across the screen.
   *
   * Three's own path instead leaves the buffer raw and puts the same scale and
   * bias on the mesh transform. Both are available, and exactly one must run.
   */
  get usesEngineDequantisation(): boolean {
    return this.uniforms.positionScale !== undefined && this.uniforms.positionBias !== undefined;
  }

  /**
   * Feed this mesh's own transform to the shader, per draw.
   *
   * The generated vertex program multiplies by `viewProj` alone -- there is no
   * modelMatrix anywhere in it -- because the engine folds the model transform
   * into the per-draw positionScale/positionBias. So Three's scene graph does
   * NOT reach this shader: leaving the uniforms at identity draws every mesh at
   * the origin, however correct the mesh's own transform is.
   *
   * The uniforms live on the material, which meshes share, so writing them once
   * at attach time lets the last mesh win -- and since Three orders draws by
   * camera distance, that reads as meshes teleporting as the camera moves. The
   * fix is to write them per draw AND set `uniformsNeedUpdate`, because a
   * ShaderMaterial re-uploads only when that flag is set (WebGLRenderer clears
   * it after each upload). object.onBeforeRender runs before renderBufferDirect,
   * so the value written here is the one that reaches the GPU for this mesh.
   *
   * The mesh's world matrix is the source, not the geometry's tag: it already
   * composes the part's own placement with anything above it in the graph.
   */
  bindPositionTransform(mesh: THREE.Mesh) {
    if (!this.usesEngineDequantisation) return;
    mesh.onBeforeRender = () => {
      // Read LIVE from matrixWorld, per draw.
      //
      // This used to read a snapshot the loader took at load time, which was
      // fine for static track geometry and wrong for anything that moves: a
      // .vex scene parents rcsmodel meshes under ANIM_TRANSFORM pivots, so the
      // scene graph updates every frame while the shader kept replaying the
      // position the mesh had when the file finished loading. The animations
      // ran; they simply never reached the vertex program.
      //
      // The full matrix, not a scale/bias pair. The old form assumed these
      // transforms were pure scale + translate, which holds for the static
      // track but NOT for an animated pivot -- those carry a quaternion track,
      // and a rotation cannot be expressed as a per-axis scale plus an offset.
      //
      // The mesh's own transform stays in the graph (that is where matrixWorld
      // comes from) and the loader does not neutralise it; the dequantisation
      // uniforms stay at identity so Three's transform is not applied twice.
      mesh.updateWorldMatrix(true, false);

      // The mesh's world matrix. A composed program gets its placement from
      // Three's own `modelMatrix` built-in, so this is here for the Phong
      // bisect (see PHONG_OVERRIDE), which is written against the engine's
      // register names rather than Three's attributes.
      const model = this.uniforms.rcsModelMatrix;
      if (model) model.value.copy(mesh.matrixWorld);
      // The matching normal matrix -- inverse-transpose of matrixWorld -- for
      // the composer's injected normal transform. The dequantisation scale is
      // per-axis, so mat3(matrixWorld) would both crush the normal's length
      // (~1/100) and skew slanted normals toward the part's long axis.
      const normalU = this.uniforms.rcsNormalMatrix;
      if (normalU) normalU.value.getNormalMatrix(mesh.matrixWorld);

      // `world_0..3` is the engine's OWN name for the same matrix, split into
      // columns the way rcsdump splits viewProj: 70 vertex programs accumulate
      // `x*world_0 + y*world_1 + z*world_2 + world_3`. Nothing was writing it,
      // so declaredUniforms fell back to its (1,1,1,1) neutral for all four --
      // which makes every column point the same way, collapses all three axes
      // onto one line and reduces the mesh to a degenerate sliver. It read as
      // the object being invisible rather than as a broken transform.
      //
      // The world matrix's ROTATION, with no translation.
      //
      // world_N is the object's world matrix, and 68 of the 70 programs that
      // declare it use it for two things at once: the position, and -- more
      // importantly -- the NORMAL, which they transform with world_0..2 and no
      // world_3, since a direction does not translate. That normal is what
      // feeds the reflection lookup, so world_N is effectively the reflection
      // basis for these materials.
      //
      // Hence rotation but not translation. The position must not be moved
      // here: the scene graph already places the mesh, and rcsModelMatrix
      // carries that for the injected transform, so a full matrix would apply
      // the placement twice -- which sheared the train glass into a dense
      // black-and-white dither. But identity is equally wrong: it would leave
      // every normal in model space while the geometry rotates around it, and
      // every reflection would be lit from a fixed direction regardless of how
      // the object is turned.
      //
      // The FULL world matrix, translation included.
      //
      // bindModelMatrix skips these 70 shaders precisely because they already
      // apply a model transform themselves, so world_N is the only thing that
      // can carry it -- and it has to carry ALL of it. The scene graph's scale
      // is what dequantises the raw int16 vertex buffer, so a rotation-only
      // world_N (which this briefly had) left the positions unscaled at their
      // full +-32767 range: the geometry flew far outside the view and what
      // remained on screen read as black-and-white noise.
      //
      // As a matrix: _compose.ts rewrites the four `world_N` columns into one
      // `mat4 world` and unpacks it inside main(), so binding the columns would
      // leave that matrix at zero.
      // IDENTITY, not matrixWorld -- because the preamble already placed the
      // vertex.
      //
      // 73 of the 727 vertex programs do BOTH: they dequantise with
      // `v0 * positionScale + positionBias` and then multiply the result by
      // `world_0..3`. On PS3 those are two different transforms -- the first is
      // only int16 decompression into MODEL space, the second places the mesh
      // in the world -- so applying both is correct there.
      //
      // Here they are not two transforms. _compose.ts derives positionScale and
      // positionBias from Three's per-mesh `modelMatrix`, which is the full
      // world placement, so after the dequantisation the vertex is already
      // where it belongs. Copying matrixWorld into `world` as well applied the
      // placement a second time -- squaring the scale and doubling the offset,
      // which for a track part throws the geometry far outside the frustum.
      //
      // `world` still has to be BOUND: the shader reads world_0..3 and an
      // unbound mat4 reads as zero, which would collapse the mesh to a point.
      // Identity is the value that leaves the already-correct position alone.
      const worldU = this.uniforms.world;
      if (worldU) worldU.value.identity();
      // positionScale/positionBias are NOT written here any more.
      //
      // They used to be derived from matrixWorld per draw, which cannot be
      // right: the uniforms live on the material, a material is shared by every
      // mesh that uses it, and those meshes do not share a transform. The
      // per-draw write was an attempt to work around that, and it left the
      // values belonging to whichever mesh drew last.
      //
      // _compose.ts now computes both names in the vertex preamble from
      // `modelMatrix`, which Three supplies PER MESH -- so there is no shared
      // value left to get wrong, and the decompiled body still reads the names
      // the engine gave it. See DEQUANTISATION there.
      //
      // Rotation is handled now: the composer transforms the position register
      // by the full modelMatrix and neutralises the body's scale/bias, so a
      // rotating ANIM_TRANSFORM pivot renders correctly. (The diagonal
      // approximation this warning guarded is only the fallback for a program
      // with no position binding, and the corpus has none.)

      this.uniformsNeedUpdate = true;
    };
  }

  /**
   * Push the scene's lights into the ENGINE's uniform names.
   *
   * The base class syncs `lightColour`/`lightDirection`/`ambientColour`, which
   * are the names the hand-written shaders in _raw.ts declare. A generated
   * shader declares whatever the fragment program named -- typically
   * `directionalLight0Colour` and `directionalLight0DirectionWorldSpace` -- and
   * never those, so the inherited sync would write to uniforms that do not
   * exist and throw on the first frame. Overridden rather than extended.
   */
  /**
   * Take fog and prelit values from the track's own .envsettings.
   *
   * `fogColour` is one vec4 doing two jobs: rgb is the colour and W is the
   * DENSITY, which the fragment program uses as
   * `exp(-(distance * density)^2)` -- an exponential-squared falloff. Leaving W
   * at zero, as the placeholder did, makes that term exactly 1 and disables fog
   * entirely, so a track's haze simply never appeared.
   *
   * The prelit pair scales the lightmap contribution; both were viewer
   * conventions until the settings file turned up.
   */
  /** True once a track's .envsettings has supplied the ambient directly. */
  private _envAmbient = false;

  applyEnvSettings(env: EnvSettings) {
    // The engine's own constant ambient, in full: this is the term that lights
    // a face turned away from the sun, and 992 of the corpus's 1912 fragment
    // programs read it. It was previously taken from the scene's AmbientLight,
    // which applyEnvSettings had already flattened to grey and clamped to 1 for
    // the benefit of Three's built-in materials -- so a generated shader got a
    // desaturated, dimmer ambient than the track asks for.
    const ambient = env.getVec3(EnvKey.constantAmbient, [0, 0, 0]);
    const amb = this.uniforms.constantAmbientColour;
    if (amb) {
      amb.value.set(ambient[0], ambient[1], ambient[2], 1);
      this._envAmbient = true;
    }

    const fog = this.uniforms.fogColour;
    if (fog) {
      const c = env.getVec3(EnvKey.fogColour, [0, 0, 0]);
      const density = env.getNumber(EnvKey.fogDensity, 0);
      fog.value.set(c[0], c[1], c[2], density);
    }
    const scale = env.getVec3(EnvKey.prelitAmbientScale, [1, 1, 1]);
    const prelitScale = this.uniforms.prelitScaleSpecular;
    if (prelitScale) prelitScale.value.set(scale[0], scale[1], scale[2], 1);
    // prelitBias is deliberately NOT set from `Prelit ambient colour bias`.
    // The settings key is a bias and reads 0.0 on every track that states it,
    // but the uniform of that name is used as an EXPONENT -- the lightmapped
    // permutations all compute exp2(log2(lightmap) * prelitBias), i.e.
    // pow(lightmap, prelitBias) -- so writing the key's 0.0 there raises every
    // lightmap to the power zero and flattens it to a uniform 1.0. Whatever the
    // engine feeds this uniform, the settings file does not state it, so the
    // neutral exponent of 1 stands.
    this.uniformsNeedUpdate = true;
  }

  override syncLights(scene: THREE.Scene) {
    const lights = sceneLights(scene);
    const colour = this.uniforms.directionalLight0Colour;
    if (colour && lights.sun) {
      const c = lights.sun.color, k = lights.sun.intensity;
      colour.value.set(c.r * k, c.g * k, c.b * k, 1);
    }
    const dir = this.uniforms.directionalLight0DirectionWorldSpace;
    if (dir && lights.sunDirection) {
      // Passed through as sceneLights() returns it -- the file's own
      // `Lighting.Sun direction`, recovered from Three's light position.
      //
      // NOT a simple sign error, though it looks like one. Rendering N.L on its
      // own shows a +X wall dark where the lightmap's alpha shows it LIT, which
      // argues for negating. But vineta_k's sun is (-2.0, 0.8, 1.0), and with
      // that vector NEITHER sign satisfies both surfaces:
      //
      //   as-is:   +X wall shadow, -X wall LIT,    ground LIT
      //   negated: +X wall LIT,    -X wall shadow, ground shadow
      //
      // Negating trades the wall for the entire ground plane, which no daytime
      // track can want. So the disagreement is real but the fix is not here --
      // either the sun the shaders should see is not this vector, or the walls
      // in question are lit by something other than the directional term.
      // Left as the file states it until that is established.
      const d = lights.sunDirection;
      dir.value.set(d.x, d.y, d.z, 0);
    }
    // Ambient comes from the track's own settings when they are loaded --
    // applyEnvSettings sets it directly -- because the scene's AmbientLight is
    // deliberately a grey stand-in for Three's built-in materials and has lost
    // both the colour and, once clamped, some of the brightness. Only fall back
    // to the scene light when no settings have arrived.
    const amb = this.uniforms.constantAmbientColour;
    if (amb && !this._envAmbient) {
      amb.value.set(lights.ambient.r, lights.ambient.g, lights.ambient.b, 1);
    }

    // Ambient is NOT written to prelitBias. The fragment program uses that as
    // an EXPONENT -- pow(lightmap, prelitBias) -- so a colour landed there as a
    // per-channel power, brightening rather than tinting and overwriting the
    // track's own value every frame. Permutations that want ambient declare
    // `constantAmbientColour`, which is set above when present.
  }

  override tick(delta: number) {
    super.tick(delta);
    this._elapsed += delta;

    // The engine's clock. 529 shaders read it -- scrolling water, pulsing
    // glows, the crowd's avatar cycling -- and it was left at the constant
    // neutral every other unset uniform gets, so all of them stood still. The
    // vertex program uses it as a plain seconds value.
    const clock = this.uniforms.time;
    if (clock) {
      clock.value.set(this._elapsed, this._elapsed, this._elapsed, this._elapsed);
      this.uniformsNeedUpdate = true;
    }

    const camera = this._camera;
    if (!camera) return;

    camera.updateMatrixWorld();
    const viewProj = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    // The matrix itself. _compose.ts rewrites the engine's four `viewProj_N`
    // column uniforms into one `mat4 viewProj` and unpacks it back inside
    // main(), so the column order is handled there -- `mat4[i]` indexes a
    // column in GLSL, which is what the program accumulates against.
    const vp = this.uniforms.viewProj;
    if (vp) vp.value.copy(viewProj);

    const eye = camera.getWorldPosition(new THREE.Vector3());
    const eyeUniform = this.uniforms.eyePositionWorldSpace;
    if (eyeUniform) eyeUniform.value.set(eye.x, eye.y, eye.z, 1);

    // A shader often reads the clock from the BANK rather than a named uniform:
    // water_test_2's vertex program scrolls its uv with `time * c[2]`, where
    // time is bank slot 458. The bank is built once at construction, so its
    // copy of the clock stayed at zero however fast the named uniform advanced
    // -- the water was lit correctly and simply never moved. Rebuilt here when
    // the layout actually carries a clock.
    if (this._bankHasTime) {
      this.setBank({
        time: this._elapsed,
        eyePositionWorldSpace: eye,
        prelitBias: this.uniforms.prelitBias?.value ?? new THREE.Vector4(1, 1, 1, 0),
        prelitScaleSpecular: this.uniforms.prelitScaleSpecular?.value ?? new THREE.Vector4(1, 1, 1, 1),
      });
      this.uniformsNeedUpdate = true;
    }

  }

  /** Set by RCSModelLoader alongside the scene. */
  private _camera: THREE.Camera | null = null;

  attachCamera(camera: THREE.Camera) {
    this._camera = camera;
  }

  /**
   * Whether this material's vertex program dequantises position itself.
   *
   * The .rcsmodel stores position as raw int16 and carries the scale and bias
   * that turn it into world space on the PART, not in the buffer -- for
   * amphiseum's object[249] that is scale 1/128 and a bias of a few hundred
   * units, against raw values up to +-30706. The engine's vertex program does
   * `v0 * positionScale + positionBias` with exactly those numbers.
   *
   * Three's own path instead leaves the buffer raw and puts the same scale and
   * bias on the mesh transform, so `modelMatrix` already encodes them (there is
   * no rotation, so a TRS transform IS scale*v + bias). A generated shader
   * therefore has both available and must use exactly one of them, or the
   * geometry is transformed twice. Leaving these at identity, as this first
   * did, fed the shader raw +-30706 coordinates and exploded the geometry.
   *
   * A material is shared by every mesh that uses it, and those meshes do NOT
   * share a scale -- so the per-mesh values cannot live in a uniform here. The
   * identity below is therefore deliberate: dequantisation is left to Three's
   * per-mesh `modelMatrix`, which the loader keeps intact for these materials.
   */
}
