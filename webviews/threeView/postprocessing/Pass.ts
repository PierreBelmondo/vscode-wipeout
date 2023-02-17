import * as THREE from "three";

abstract class Pass {
  // if set to true, the pass is processed by the composer
  enabled: boolean;

  // if set to true, the pass indicates to swap read and write buffer after rendering
  needsSwap: boolean;

  // if set to true, the pass clears its buffer before rendering
  clear: boolean;

  // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
  renderToScreen: boolean;

  constructor() {
    this.enabled = true;
    this.needsSwap = true;
    this.clear = false;
    this.renderToScreen = false;
  }

  setSize(width: number, height: number) {}

  abstract render(renderer: THREE.WebGLRenderer, writeBuffer, readBuffer, deltaTime?, maskActive?): void;

  dispose() {}
}

// Helper for passes that need to fill the viewport with a single quad.
const _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// https://github.com/mrdoob/three.js/pull/21358

const _geometry = new THREE.BufferGeometry();
_geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
_geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

class FullScreenQuad {
  private _mesh: THREE.Mesh;

  constructor(material) {
    this._mesh = new THREE.Mesh(_geometry, material);
  }

  dispose() {
    this._mesh.geometry.dispose();
  }

  render(renderer: THREE.Renderer) {
    renderer.render(this._mesh, _camera);
  }

  get material() {
    return this._mesh.material;
  }

  set material(value) {
    this._mesh.material = value;
  }
}

export { Pass, FullScreenQuad };
