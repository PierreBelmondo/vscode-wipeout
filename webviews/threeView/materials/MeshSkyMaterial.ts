import * as THREE from "three";

const vsSource = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 position;
in vec2 uv;

out vec2 vUV;

void main() {
  vUV = uv;

  mat4 skyViewMatrix = modelViewMatrix;
  skyViewMatrix[3] = vec4(0.0, 0.0, 0.0, 1.0);

  gl_Position = projectionMatrix * skyViewMatrix * vec4(position, 1.0);
}
`.trim();

const fsSource = `
precision mediump float;
precision mediump int;

uniform sampler2D texSampler;

in vec2 vUV;
out vec4 fragColor;

void main() {
  vec4 rgba = texture(texSampler, vUV);
  fragColor = vec4(rgba.rgb, 1.0);
}
`.trim();

export class MeshSkyMaterial extends THREE.RawShaderMaterial {
  constructor(map: THREE.Texture) {
    super({
      glslVersion: THREE.GLSL3,
      depthTest: false,
      depthWrite: false,
      vertexShader: vsSource,
      fragmentShader: fsSource,
      uniforms: {
        texSampler: {
          value: map,
        },
      },
    });
  }
}
