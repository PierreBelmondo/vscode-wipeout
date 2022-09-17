import * as THREE from "three";

const vsSource = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; // optional
uniform mat4 projectionMatrix; // optional

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUV;

void main()	{
  vUV = uv;

  mat4 skyViewMatrix = modelViewMatrix;
  skyViewMatrix[3] = vec4(0.0, 0.0, 0.0, 1.0);
  skyViewMatrix[0][3] = 0.0;
  skyViewMatrix[1][3] = 0.0;
  skyViewMatrix[2][3] = 0.0;

  gl_Position = projectionMatrix * skyViewMatrix * vec4(position, 1.0);
}
`.trim();

const fsSource = `
#if __VERSION__ < 130
#define TEXTURE2D texture2D
#else
#define TEXTURE2D texture
#endif

precision mediump float;
precision mediump int;

uniform sampler2D texSampler;

varying vec2 vUV;

void main()	{
  vec4 rgba = TEXTURE2D(texSampler, vUV);
  gl_FragColor = vec4(rgba.rgb, 1.0);
}
`.trim();

export class MeshSkyMaterial extends THREE.RawShaderMaterial {
  constructor(map: THREE.Texture) {
    super({
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
