import * as THREE from "three";

/**
 * Environment probes for the engine's `paraboloidReflectionTex` /
 * `paraboloidIblTex` samplers.
 *
 * On PS3 these are render targets the engine fills around a probe point; the
 * viewer had nothing to put in them but a flat grey, which is why anything
 * whose colour comes ENTIRELY from its environment -- the water underside,
 * the ships' IBL terms -- rendered as a flat plane.
 *
 * The texture's layout is read off the fragment programs that sample it, not
 * assumed. water_test_2's lookup, from its own disassembly:
 *
 *     D = N * dot(V, N) - V            // V: surface -> eye, N: wave normal
 *     h = D.x > 0 ? 0.5 : 0            // which half of the texture
 *     u = sign(D.x) * D.z + h + 0.25   // each half centred on u = h + 0.25
 *     v = 0.5 - 0.5 * D.y
 *
 * So it is ONE 2D image holding two hemispheres side by side, split on the
 * world X axis (track direction), each half addressed linearly by the
 * direction's z and y components -- an orthographic hemisphere map, not a
 * paraboloid in the textbook sense, whatever the sampler is called.
 *
 * Filling it: render a cube map at the probe point, then run a conversion
 * pass that, for every texel, inverts the lookup above into a direction and
 * samples the cube there. The inversion has one free choice the lookup does
 * not pin down -- how far a texel's (z, y) offset reaches in direction space
 * -- which is U_SCALE / V_SCALE below, tuned by eye.
 */

type Consumer = { unit: number; name: string };

type Probe = {
  /** The converted hemisphere map the materials sample. All a probe keeps. */
  target: THREE.WebGLRenderTarget;
  /** Every material bound to this probe. */
  members: Set<THREE.Material>;
  /** Whether the cube has been rendered since the probe was (re)queued. */
  rendered: boolean;
};

const CUBE_SIZE = 256;
const TARGET_W = 512;
const TARGET_H = 256;
/**
 * Probes are shared between materials whose consumer meshes are centred in
 * the same cell of this many cells across the scene's largest extent.
 *
 * A probe is the environment seen from one point. Every material on a ship's
 * hull computes the same point, and on a track a material's centre -- the
 * centroid of its meshes, wherever they are on the course -- is already a
 * rough stand-in for the engine's per-object probes, so materials centred
 * near each other gain nothing from separate cubes. One CubeCamera is six
 * full scene renders; 88 generated materials sample a probe, and giving each
 * its own meant dozens of those per frame on a track.
 */
const CELLS_ACROSS = 8;

const CONVERT_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const CONVERT_FRAG = `
precision highp float;
uniform samplerCube env;
uniform float uScale;
uniform float vScale;
varying vec2 vUv;
void main() {
  // Invert the engine's lookup. Texel -> which half -> (z, y) offset from the
  // half's centre -> a unit direction completed along +-X.
  float h = vUv.x < 0.5 ? 0.0 : 0.5;
  float s = h > 0.0 ? 1.0 : -1.0;
  float dz = (vUv.x - h - 0.25) * s / uScale;
  float dy = (vUv.y - 0.5) / vScale;
  float r2 = dz * dz + dy * dy;
  float dx = s * sqrt(max(0.0, 1.0 - r2));
  vec3 dir = normalize(vec3(dx, dy, dz));
  gl_FragColor = textureCube(env, dir);
}`;

export class ParaboloidProbes {
  private readonly _renderer: THREE.WebGLRenderer;
  private readonly _scene = new THREE.Scene();
  private readonly _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly _quad: THREE.Mesh;

  /**
   * The lookup's free scale factors; see the module comment. 1.0 / 0.5 is
   * the exact inverse of the shader's own arithmetic (u offset = D.z, v
   * offset = -0.5 * D.y); smaller uScale spreads more of the hemisphere into
   * each half at the cost of matching the lookup less literally.
   */
  uScale = 1.0;
  vScale = 0.5;

  constructor(renderer: THREE.WebGLRenderer) {
    this._renderer = renderer;
    this._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this._scene.add(this._quad);
  }

  /** Probes by spatial cell; see CELLS_ACROSS. */
  private readonly _byCell = new Map<string, Probe>();
  /** The cell size, from the scene's extent; fixed on first use. */
  private _cell = 0;
  /** Materials already bound, so a frame does no work for them. */
  private readonly _bound = new Set<THREE.Material>();

  /**
   * Bind every consuming material to a probe, and render ONE unrendered
   * probe per call.
   *
   * Once, not on a timer. The old version re-rendered every probe every 60
   * frames because the scene used to fill in asynchronously after the first
   * frame; the load is awaited now, so the scene is complete before this is
   * first called, and re-rendering only repeated the same six full-scene
   * draws per probe forever -- all probes on the same frame, since they were
   * created together, which is what made the viewer stall once a second.
   *
   * One per call spreads the start-up cost over as many frames as there are
   * probes instead of drawing them all on the first. Animated objects are
   * therefore frozen in reflections at their load-time pose; refresh() redraws
   * everything on demand.
   */
  update(scene: THREE.Scene, materials: THREE.Material[]) {
    for (const material of materials) {
      if (this._bound.has(material)) continue;
      const consumers = this._consumers(material);
      if (!consumers.length) continue;
      this._bound.add(material);

      const centre = this._centreOf(scene, material);
      const probe = this._probeAt(scene, centre);
      probe.members.add(material);
      const uniforms = (material as THREE.ShaderMaterial).uniforms;
      for (const c of consumers) {
        const u = uniforms?.[`TEX${c.unit}`];
        if (u) u.value = probe.target.texture;
      }
      (material as THREE.ShaderMaterial).uniformsNeedUpdate = true;
    }

    for (const probe of this._byCell.values()) {
      if (probe.rendered) continue;
      this._render(scene, probe);
      probe.rendered = true;
      break;
    }
  }

  /** Queue every probe to be drawn again, one per frame. */
  refresh() {
    for (const probe of this._byCell.values()) probe.rendered = false;
  }

  /** The centre of the meshes wearing this material, or null if there are none. */
  private _centreOf(scene: THREE.Scene, material: THREE.Material): THREE.Vector3 | null {
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material === material) box.expandByObject(mesh);
    });
    return box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
  }

  /** The probe for this point, sharing one with anything else in its cell. */
  private _probeAt(scene: THREE.Scene, centre: THREE.Vector3 | null): Probe {
    if (this._cell === 0) {
      const bounds = new THREE.Box3().setFromObject(scene);
      const size = bounds.isEmpty() ? 1 : Math.max(...bounds.getSize(new THREE.Vector3()).toArray());
      this._cell = Math.max(size / CELLS_ACROSS, 1e-3);
    }
    // A material with no meshes has no position; it shares the origin's probe.
    const c = centre ?? new THREE.Vector3();
    const key = [c.x, c.y, c.z].map((v) => Math.floor(v / this._cell)).join(",");
    let probe = this._byCell.get(key);
    if (!probe) {
      probe = this._create();
      this._byCell.set(key, probe);
    }
    return probe;
  }

  private _consumers(material: THREE.Material): Consumer[] {
    const variant = (material as unknown as { userData?: { variant?: { samplers?: Consumer[] } } }).userData?.variant;
    return (variant?.samplers ?? []).filter((s) => s.name === "paraboloidReflectionTex" || s.name === "paraboloidIblTex");
  }

  /**
   * ONE cube target, camera and conversion material, shared by every probe.
   *
   * Only one probe renders per frame, and the cube is read back into the
   * probe's own 2D target in the same call -- so nothing is lost by drawing
   * every probe through the same scratch cube. Each probe used to own one:
   * six 256x256 faces plus depth, ~1.5 MB of GPU memory apiece, for a texture
   * that was only ever read once, immediately, by its own conversion pass.
   */
  private _cube?: THREE.WebGLCubeRenderTarget;
  private _cubeCamera?: THREE.CubeCamera;
  private _convert?: THREE.ShaderMaterial;

  private _scratch() {
    if (!this._cube) {
      this._cube = new THREE.WebGLCubeRenderTarget(CUBE_SIZE, {
        generateMipmaps: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      this._cubeCamera = new THREE.CubeCamera(0.1, 1e5, this._cube);
      this._convert = new THREE.ShaderMaterial({
        uniforms: { env: { value: this._cube.texture }, uScale: { value: this.uScale }, vScale: { value: this.vScale } },
        vertexShader: CONVERT_VERT,
        fragmentShader: CONVERT_FRAG,
        depthTest: false,
        depthWrite: false,
      });
    }
    return { camera: this._cubeCamera!, convert: this._convert! };
  }

  private _create(): Probe {
    const target = new THREE.WebGLRenderTarget(TARGET_W, TARGET_H, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
    return { target, members: new Set(), rendered: false };
  }

  private _render(scene: THREE.Scene, probe: Probe) {
    const { camera, convert } = this._scratch();
    // The probe sits at the centre of the meshes that consume it -- for the
    // water, the water plane; for a ship, the ship -- so what it sees is what
    // the surface would reflect. Those meshes are hidden while it renders: a
    // surface cannot reflect itself.
    const meshes: THREE.Mesh[] = [];
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !probe.members.has(mesh.material as THREE.Material)) return;
      meshes.push(mesh);
      box.expandByObject(mesh);
    });
    if (box.isEmpty()) return;
    box.getCenter(camera.position);

    const hidden = meshes.filter((m) => m.visible);
    for (const m of hidden) m.visible = false;
    camera.update(this._renderer, scene);
    for (const m of hidden) m.visible = true;

    convert.uniforms.uScale.value = this.uScale;
    convert.uniforms.vScale.value = this.vScale;
    this._quad.material = convert;
    const prev = this._renderer.getRenderTarget();
    this._renderer.setRenderTarget(probe.target);
    this._renderer.render(this._scene, this._camera);
    this._renderer.setRenderTarget(prev);
  }
}
