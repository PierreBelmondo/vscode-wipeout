import { BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial, Matrix3, Vector3, GLBufferAttribute } from "three";

const _v1 = new Vector3();
const _v2 = new Vector3();
const _normalMatrix = new Matrix3();

export class VertexNormalsHelper extends LineSegments {
  size: number;
  object: THREE.Mesh;

  constructor(object: THREE.Mesh, size = 1, color = 0xff0000) {
    const geometry = new BufferGeometry();
    const nNormals = object.geometry.attributes.normal.count;
    const positions = new Float32BufferAttribute(nNormals * 2 * 3, 3);

    geometry.setAttribute("position", positions);

    super(geometry, new LineBasicMaterial({ color, toneMapped: false }));

    this.object = object;
    this.size = size;
    this.type = "VertexNormalsHelper";

    //

    this.matrixAutoUpdate = false;

    this.update();
  }

  update() {
    this.object.updateMatrixWorld(true);
    _normalMatrix.getNormalMatrix(this.object.matrixWorld);
    const matrixWorld = this.object.matrixWorld;
    const position = this.geometry.attributes.position;
    if (position instanceof GLBufferAttribute) return;

    //
    const objGeometry = this.object.geometry;

    if (objGeometry) {
      const objPos = objGeometry.attributes.position;
      if (objPos instanceof GLBufferAttribute) return;
      const objNorm = objGeometry.attributes.normal;
      if (objNorm instanceof GLBufferAttribute) return;
      let idx = 0;
      // for simplicity, ignore index and drawcalls, and render every normal
      for (let j = 0, jl = objPos.count; j < jl; j++) {
        _v1.fromBufferAttribute(objPos, j).applyMatrix4(matrixWorld);
        _v2.fromBufferAttribute(objNorm, j);
        _v2.applyMatrix3(_normalMatrix).normalize().multiplyScalar(this.size).add(_v1);
        position.setXYZ(idx, _v1.x, _v1.y, _v1.z);
        idx = idx + 1;
        position.setXYZ(idx, _v2.x, _v2.y, _v2.z);
        idx = idx + 1;
      }
    }

    position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    //this.material.dispose();
  }
}
