import { mat4 } from "gl-matrix";
import { Vexx4NodeType } from "./type";
import { VexxNodeMesh } from "./mesh";

export class VexxNodeSkycube extends VexxNodeMesh {
  constructor() {
    super(Vexx4NodeType.SKYCUBE);
  }

  /*
  glPrepare(engine: Engine) {
    engine.createVertexShader(vsSource, "vs-skyshape");
    engine.createFragmentShader(fsSource, "fs-skyshape");
    engine.createProgram(["vs-skyshape", "fs-skyshape"], "skyshape");

    for (const smesh of this.chunks) {
      const mesh = smesh.createMesh(engine.gl);
      this.meshes.push(mesh);
    }
  }

  glDraw(engine: Engine): void {
    if (engine.renderSky) {
      const projectionMatrix = mat4.clone(engine.camera.projectionMatrix);
      const viewMatrix = mat4.clone(engine.camera.viewMatrix);
      viewMatrix[3] = 0.0;
      viewMatrix[7] = 0.0;
      viewMatrix[11] = 0.0;
      viewMatrix[12] = 0.0;
      viewMatrix[13] = 0.0;
      viewMatrix[14] = 0.0;
      viewMatrix[15] = 1.0;

      engine.useProgram("skyshape");
      engine.setUniformMatrix4fv("view", viewMatrix);
      engine.setUniformMatrix4fv("projection", projectionMatrix);

      engine.gl.depthMask(false);
      for (let i = 0; i < this.meshes.length; i++) {
        const smesh = this.chunks[i].header;
        const textureId = this.meshInfo.meshes[smesh.id].textureId;
        const mesh = this.meshes[i];

        engine.bindTexture("" + textureId);
        mesh.draw();
      }
      engine.gl.depthMask(true);
    }
  }
  */
}
