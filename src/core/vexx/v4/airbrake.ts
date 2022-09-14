import { mat4 } from "gl-matrix";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

export class VexxNodeAirbrake extends VexxNode {
  private _angle = 0.0;
  private _matrix = mat4.create();

  constructor() {
    super(Vexx4NodeType.ENGINE_FLARE);
    this.angle = 0.7;
  }

  get angle() : number {
    return this.angle;
  }

  set angle(value: number) {
    this._angle = value;
    mat4.fromXRotation(this._matrix, this._angle);
  }

  /*
  glDraw(engine: Engine): void {
    engine.pushModelMatrix();
    mat4.multiply(engine.modelMatrix, engine.modelMatrix, this._matrix);
    super.glDraw(engine);
    engine.popModelMatrix();
  }
  */
}
