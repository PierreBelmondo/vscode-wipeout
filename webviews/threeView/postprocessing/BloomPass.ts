import * as THREE from "three";
import { Pass, FullScreenQuad } from "./Pass";
import { ConvolutionShader } from "../shaders/ConvolutionShader";

class BloomPass extends Pass {
  static blurX = new THREE.Vector2(0.001953125, 0.0);
  static blurY = new THREE.Vector2(0.0, 0.001953125);

  renderTargetX: THREE.WebGLRenderTarget;
  renderTargetY: THREE.WebGLRenderTarget;
  combineUniforms: { [uniform: string]: THREE.IUniform };
  convolutionUniforms: { [uniform: string]: THREE.IUniform };
  materialCombine: THREE.ShaderMaterial;
  materialConvolution: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;

  constructor(strength = 1, kernelSize = 25, sigma = 4) {
    super();

    // render targets

    this.renderTargetX = new THREE.WebGLRenderTarget(); // will be resized later
    this.renderTargetX.texture.name = "BloomPass.x";
    this.renderTargetY = new THREE.WebGLRenderTarget(); // will be resized later
    this.renderTargetY.texture.name = "BloomPass.y";

    // combine material

    this.combineUniforms = THREE.UniformsUtils.clone(CombineShader.uniforms);

    this.combineUniforms["strength"].value = strength;

    this.materialCombine = new THREE.ShaderMaterial({
      uniforms: this.combineUniforms,
      vertexShader: CombineShader.vertexShader,
      fragmentShader: CombineShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    // convolution material

    const convolutionShader = ConvolutionShader;

    this.convolutionUniforms = THREE.UniformsUtils.clone(convolutionShader.uniforms);
    this.convolutionUniforms["uImageIncrement"].value = BloomPass.blurX;
    this.convolutionUniforms["cKernel"].value = ConvolutionShader.buildKernel(sigma);

    this.materialConvolution = new THREE.ShaderMaterial({
      uniforms: this.convolutionUniforms,
      vertexShader: convolutionShader.vertexShader,
      fragmentShader: convolutionShader.fragmentShader,
      defines: {
        KERNEL_SIZE_FLOAT: kernelSize.toFixed(1),
        KERNEL_SIZE_INT: kernelSize.toFixed(0),
      },
    });

    this.needsSwap = false;

    this.fsQuad = new FullScreenQuad(null);
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    if (maskActive) renderer.state.buffers.stencil.setTest(false);

    // Render quad with blured scene into texture (convolution pass 1)

    this.fsQuad.material = this.materialConvolution;

    this.convolutionUniforms["tDiffuse"].value = readBuffer.texture;
    this.convolutionUniforms["uImageIncrement"].value = BloomPass.blurX;

    renderer.setRenderTarget(this.renderTargetX);
    renderer.clear();
    this.fsQuad.render(renderer);

    // Render quad with blured scene into texture (convolution pass 2)

    this.convolutionUniforms["tDiffuse"].value = this.renderTargetX.texture;
    this.convolutionUniforms["uImageIncrement"].value = BloomPass.blurY;

    renderer.setRenderTarget(this.renderTargetY);
    renderer.clear();
    this.fsQuad.render(renderer);

    // Render original scene with superimposed blur to texture

    this.fsQuad.material = this.materialCombine;

    this.combineUniforms["tDiffuse"].value = this.renderTargetY.texture;

    if (maskActive) renderer.state.buffers.stencil.setTest(true);

    renderer.setRenderTarget(readBuffer);
    if (this.clear) renderer.clear();
    this.fsQuad.render(renderer);
  }

  setSize(width: number, height: number) {
    this.renderTargetX.setSize(width, height);
    this.renderTargetY.setSize(width, height);
  }

  dispose() {
    this.renderTargetX.dispose();
    this.renderTargetY.dispose();

    this.materialCombine.dispose();
    this.materialConvolution.dispose();

    this.fsQuad.dispose();
  }
}

const CombineShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 1.0 },
  },

  vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

  fragmentShader: /* glsl */ `
		uniform float strength;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;
		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = strength * texel;
		}`,
};

export { BloomPass };
