import { BufferRange } from "@core/utils/range";
import { vec3 } from "gl-matrix";

export class AABB {
  min = vec3.fromValues(-1.0, -1.0, -1.0);
  max = vec3.fromValues(1.0, 1.0, 1.0);

  static loadFromFloat32(range: BufferRange): AABB {
    const ret = new AABB();
    ret.min = range.getFloat32Array(0, 3);
    ret.max = range.getFloat32Array(4 * 4, 3);
    return ret;
  }

  static loadFromInt16(range: BufferRange): AABB {
    const ret = new AABB();
    ret.min = Float32Array.from(range.getInt16Array(0, 3));
    ret.max = Float32Array.from(range.getInt16Array(4 * 2, 3));
    return ret;
  }

  static fromVertices(vertices: vec3[]) {
    const ret = new AABB();
    ret.min = vertices.reduce((m, v) => {
      const r = vec3.create();
      vec3.min(r, m, v);
      return r;
    }, ret.min);
    ret.max = vertices.reduce((m, v) => {
      const r = vec3.create();
      vec3.max(r, m, v);
      return r;
    }, ret.max);
    return ret;
  }

  add(other: AABB) {
    vec3.min(this.min, this.min, other.min);
    vec3.max(this.max, this.max, other.max);
  }

  scaling(other: AABB) {
    const ret = vec3.create();
    vec3.div(ret, this.size, other.size);
    return ret;
  }

  get center(): vec3 {
    return vec3.fromValues(
      (this.min[0] + this.max[0]) / 2.0,
      (this.min[1] + this.max[1]) / 2.0,
      (this.min[2] + this.max[2]) / 2.0
    );
  }

  get size(): vec3 {
    const ret = vec3.create();
    vec3.sub(ret, this.max, this.min);
    return ret;
  }
}
