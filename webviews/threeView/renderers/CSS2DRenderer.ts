import * as THREE from "three";

export class CSS2DObject extends THREE.Group {
  element: Node;

  constructor(element: Node = document.createElement("div")) {
    super();

    this.element = element;
    if (this.element instanceof HTMLDivElement) {
      this.element.style.position = "absolute";
      this.element.style.userSelect = "none";
      this.element.setAttribute("draggable", "false");
    }

    /*
    this.addEventListener("removed", function () {
      this.traverse((object: THREE.Object3D) => {
        if (object instanceof CSS2DObject) {
          if (
            object.element instanceof Element &&
            object.element.parentNode !== null
          ) {
            object.element.parentNode.removeChild(object.element);
          }
        }
      });
    });
    */
  }

  copy(source: this, recursive?: boolean) {
    super.copy(source, recursive);
    this.element = source.element.cloneNode(true);
    return this;
  }
}

const _vector = new THREE.Vector3();
const _viewMatrix = new THREE.Matrix4();
const _viewProjectionMatrix = new THREE.Matrix4();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/** Frames between rebuilds of the cached label list; see _labelsIn. */
const LABEL_REFRESH_FRAMES = 120;

type CSS2DRendererParameters = {
  element?: HTMLDivElement;
};

export class CSS2DRenderer {
  domElement: HTMLDivElement;

  private _width: number;
  private _height: number;
  private _widthHalf: number;
  private _heightHalf: number;

  private cache = {
    objects: new WeakMap(),
  };

  constructor(parameters: CSS2DRendererParameters = {}) {
    const domElement =
      parameters.element !== undefined
        ? parameters.element
        : document.createElement("div");
    domElement.style.overflow = "hidden";
    this.domElement = domElement;
  }

  getSize(): THREE.Vector2 {
    return new THREE.Vector2(this._width, this._height);
  }

  /**
   * Draw the labels. Call this AFTER the WebGL pass of the same frame.
   *
   * This does not update the scene's world matrices. The stock renderer did,
   * and that is a full pass over every object in the graph -- the same pass
   * WebGLRenderer.render() has just made for the same frame, so on a track
   * it doubled the per-frame matrix work for a handful of labels. The camera
   * is still refreshed: it is one object, and may sit outside the scene.
   */
  render(scene: THREE.Scene, camera: THREE.Camera) {
    if (camera.parent === null && camera.matrixAutoUpdate === true)
      camera.updateMatrixWorld();

    _viewMatrix.copy(camera.matrixWorldInverse);

    _viewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix,
      _viewMatrix
    );

    const labels = this._labelsIn(scene);
    for (const label of labels) this.renderObject(label, scene, camera);
    this.zOrder(labels);
  }

  private _labelScene?: THREE.Scene;
  private _labels: THREE.Object3D[] = [];
  private _labelsAge = 0;

  /**
   * The scene's CSS2DObjects, found by one traversal and then reused.
   *
   * The stock renderer walked the ENTIRE graph twice per frame -- once
   * recursing from the root to find and place labels, once more flattening it
   * to sort them -- to reach the few dozen objects that are labels at all.
   * The scene graph is static once loaded, so the list is rebuilt only for a
   * new scene, with a periodic rebuild as the backstop for anything added
   * later; a label added between rebuilds appears within two seconds.
   */
  private _labelsIn(scene: THREE.Scene): THREE.Object3D[] {
    if (scene !== this._labelScene || this._labelsAge++ % LABEL_REFRESH_FRAMES === 0) {
      this._labelScene = scene;
      this._labels = this.filterAndFlatten(scene);
      this._labelsAge = 1;
    }
    return this._labels;
  }

  /** Force the label list to be found again on the next render. */
  invalidate() {
    this._labelScene = undefined;
  }

  setSize(width, height) {
    this._width = width;
    this._height = height;
    this._widthHalf = this._width / 2;
    this._heightHalf = this._height / 2;
    this.domElement.style.width = width + "px";
    this.domElement.style.height = height + "px";
  }

  renderObject(
    object: THREE.Object3D,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    if (object instanceof CSS2DObject) {
      _vector.setFromMatrixPosition(object.matrixWorld);
      _vector.applyMatrix4(_viewProjectionMatrix);

      const visible =
        object.visible === true &&
        _vector.z >= -1 &&
        _vector.z <= 1 &&
        object.layers.test(camera.layers) === true;

      const div = object.element as HTMLDivElement; // xxx
      div.style.display = visible === true ? "" : "none";

      if (visible === true) {
        const fakeThis = this as unknown as THREE.WebGLRenderer;
        const fakeGeometry = null as unknown as THREE.BufferGeometry;
        const fakeMaterial = null as unknown as THREE.Material;
        const fakeGroup = null as unknown as THREE.Group;
        object.onBeforeRender(
          fakeThis,
          scene,
          camera,
          fakeGeometry,
          fakeMaterial,
          fakeGroup
        );
        const element = object.element;
        div.style.transform =
          "translate(-50%,-50%) translate(" +
          (_vector.x * this._widthHalf + this._widthHalf) +
          "px," +
          (-_vector.y * this._heightHalf + this._heightHalf) +
          "px)";

        if (element.parentNode !== this.domElement) {
          this.domElement.appendChild(element);
        }

        object.onAfterRender(
          fakeThis,
          scene,
          camera,
          fakeGeometry,
          fakeMaterial,
          fakeGroup
        );
      }

      const objectData = {
        distanceToCameraSquared: this.getDistanceToSquared(camera, object),
      };
      this.cache.objects.set(object, objectData);
    }
    // No recursion: render() hands this every label directly from the cached
    // flat list, so descending into children here would visit the graph again.
  }

  getDistanceToSquared(object1, object2) {
    _a.setFromMatrixPosition(object1.matrixWorld);

    _b.setFromMatrixPosition(object2.matrixWorld);

    return _a.distanceToSquared(_b);
  }

  filterAndFlatten(scene: THREE.Scene) {
    const result: THREE.Object3D<THREE.Event>[] = [];
    scene.traverse((object) => {
      if ((object as any).isCSS2DObject) result.push(object);
    });
    return result;
  }

  zOrder(labels: THREE.Object3D[]) {
    const sorted = labels.slice().sort((a, b) => {
      if (a.renderOrder !== b.renderOrder) {
        return b.renderOrder - a.renderOrder;
      }

      const distanceA = this.cache.objects.get(a).distanceToCameraSquared;
      const distanceB = this.cache.objects.get(b).distanceToCameraSquared;
      return distanceA - distanceB;
    });
    const zMax = sorted.length;

    for (let i = 0, l = sorted.length; i < l; i++) {
      (sorted[i] as any).element.style.zIndex = zMax - i;
    }
  }
}
