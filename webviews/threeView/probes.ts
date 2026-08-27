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
  cube: THREE.WebGLCubeRenderTarget;
  camera: THREE.CubeCamera;
  target: THREE.WebGLRenderTarget;
  convert: THREE.ShaderMaterial;
  /** Meshes whose material consumes this probe; hidden while it renders. */
  meshes: THREE.Mesh[];
  /** Frames since the cube was last rendered. */
  age: number;
};

const CUBE_SIZE = 256;
const TARGET_W = 512;
const TARGET_H = 256;
/** Re-render the cube every N frames: the scene fills in asynchronously. */
const REFRESH_FRAMES = 60;

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
  private readonly _probes = new Map<THREE.Material, Probe>();
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

  /** Bind every consuming material to a probe and keep the probes fresh. */
  update(scene: THREE.Scene, materials: THREE.Material[]) {
    for (const material of materials) {
      const consumers = this._consumers(material);
      if (!consumers.length) continue;
      let probe = this._probes.get(material);
      if (!probe) {
        probe = this._create();
        this._probes.set(material, probe);
        const uniforms = (material as THREE.ShaderMaterial).uniforms;
        for (const c of consumers) {
          const u = uniforms?.[`TEX${c.unit}`];
          if (u) u.value = probe.target.texture;
        }
        (material as THREE.ShaderMaterial).uniformsNeedUpdate = true;
      }
      if (probe.age++ % REFRESH_FRAMES === 0) this._render(scene, material, probe);
    }
  }

  private _consumers(material: THREE.Material): Consumer[] {
    const variant = (material as unknown as { userData?: { variant?: { samplers?: Consumer[] } } }).userData?.variant;
    return (variant?.samplers ?? []).filter((s) => s.name === "paraboloidReflectionTex" || s.name === "paraboloidIblTex");
  }

  private _create(): Probe {
    const cube = new THREE.WebGLCubeRenderTarget(CUBE_SIZE, {
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const camera = new THREE.CubeCamera(0.1, 1e5, cube);
    const target = new THREE.WebGLRenderTarget(TARGET_W, TARGET_H, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
    const convert = new THREE.ShaderMaterial({
      uniforms: { env: { value: cube.texture }, uScale: { value: this.uScale }, vScale: { value: this.vScale } },
      vertexShader: CONVERT_VERT,
      fragmentShader: CONVERT_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    return { cube, camera, target, convert, meshes: [], age: 0 };
  }

  private _render(scene: THREE.Scene, material: THREE.Material, probe: Probe) {
    // The probe sits at the centre of the meshes that consume it -- for the
    // water, the water plane; for a ship, the ship -- so what it sees is what
    // the surface would reflect. Those meshes are hidden while it renders: a
    // surface cannot reflect itself.
    probe.meshes.length = 0;
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.material !== material) return;
      probe.meshes.push(mesh);
      box.expandByObject(mesh);
    });
    if (box.isEmpty()) return;
    box.getCenter(probe.camera.position);

    const hidden = probe.meshes.filter((m) => m.visible);
    for (const m of hidden) m.visible = false;
    probe.camera.update(this._renderer, scene);
    for (const m of hidden) m.visible = true;

    probe.convert.uniforms.uScale.value = this.uScale;
    probe.convert.uniforms.vScale.value = this.vScale;
    this._quad.material = probe.convert;
    const prev = this._renderer.getRenderTarget();
    this._renderer.setRenderTarget(probe.target);
    this._renderer.render(this._scene, this._camera);
    this._renderer.setRenderTarget(prev);
  }
}
