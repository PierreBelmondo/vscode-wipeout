import * as THREE from "three";
import { Pass, FullScreenQuad } from "./Pass";

/**
 * The WipEout HD front-end renders its background scene as a white page with
 * dark outlines, not as shaded geometry. The look is a screen-space edge
 * detector driven by three values the game reads from
 * `Data/plugins/frontend/gui/skin.xml`:
 *
 *     <Main edge_level="0.3" fill_level="0.1" edge_width="1.5">
 *
 * - `fill_level` — how dark the flat interior of a surface is (0.1 = very pale)
 * - `edge_level` — how dark a detected edge is (0.3)
 * - `edge_width` — sampling radius of the detector, in pixels (1.5)
 *
 * Edges come from **vertex colour**, not from depth. `VertexColour1` is a
 * per-face ID, not a colour: every one of the 9184 triangles in
 * frontendscene_hd_atg is filled with a single flat value, and the palette is
 * saturated (mean 0.73) in a way that never appears on screen. The scene's
 * material samples a 32x32 all-white texture, so `texture * VertexColour1`
 * just passes the ID through for this pass to difference.
 *
 * That is what separates *adjacent coplanar faces*: they have no depth
 * discontinuity to find, but they do carry different IDs. Depth is still
 * differenced as well, to catch silhouettes where two faces share an ID but
 * are far apart.
 */
export class FrontEndEdgePass extends Pass {
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;

  constructor(camera: THREE.Camera, width: number, height: number) {
    super();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        resolution: { value: new THREE.Vector2(width, height) },
        cameraNear: { value: (camera as THREE.PerspectiveCamera).near ?? 0.1 },
        cameraFar: { value: (camera as THREE.PerspectiveCamera).far ?? 5000 },
        edgeLevel: { value: 0.3 },
        fillLevel: { value: 0.1 },
        edgeWidth: { value: 1.5 },
        // Smallest colour step that counts as a different face ID.
        //
        // The IDs are NOT well separated: frontendscene uses 23 of them and the
        // closest pair differs by only 6/255 in its largest channel. A threshold
        // of 0.02 (5.1/255) left under one quantisation step of headroom, so
        // rounding in the 8-bit buffer was enough to fake an edge inside a flat
        // face — the diagonal artefacts followed triangle edges because that is
        // where interpolation puts the rounding.
        //
        // 3/255 sits halfway: above the 1/255 rounding floor, below the 6/255
        // real minimum.
        idThreshold: { value: 3 / 255 },
        // Scale applied to the linearised-depth gradient. 0 = ID edges only.
        depthWeight: { value: 0 },
        paperColour: { value: new THREE.Color(0xffffff) },
        inkColour: { value: new THREE.Color(0x000000) },
      },
      vertexShader,
      fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  /**
   * Render the scene as flat face IDs for one frame.
   *
   * The detector differences `VertexColour1`, so anything that perturbs the
   * sampled colour invents edges. Two things do, and both bite hardest at
   * distance:
   *
   * - mipmapping. `basic_emissive.gtf` is not uniformly white — its 8x8 and
   *   2x2 levels carry (255,222,255) endpoints — so a minified sample tints
   *   the ID and the difference against a nearer neighbour reads as an edge.
   * - texture filtering across a face boundary, which blends two IDs.
   *
   * Swapping to an untextured flat material for the pass removes both: the ID
   * is then written verbatim from the vertex attribute. The scene's material
   * is already unlit (MeshBasicMaterial), so no lighting term is involved.
   */
  /**
   * Applied through scene.overrideMaterial, so it covers every mesh in the
   * scene rather than the ones a manual traverse happened to reach.
   *
   * `flatShading` is irrelevant here (no lighting), but `vertexColors` is read
   * for *every* mesh the override touches — including any that carries no
   * `color` attribute, where the shader then reads undefined data.
   */
  readonly idMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });

  /**
   * Depth linearisation needs the *current* camera clip planes; the world (and
   * with it the camera) is swapped whenever a new file is loaded.
   */
  setCamera(camera: THREE.Camera) {
    const persp = camera as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      this.material.uniforms.cameraNear.value = persp.near;
      this.material.uniforms.cameraFar.value = persp.far;
    }
  }

  /** Weight of the depth gradient; 0 uses face IDs alone. */
  setDepthWeight(w: number) {
    this.material.uniforms.depthWeight.value = w;
  }

  /** skin.xml <Main edge_level fill_level edge_width> */
  setScreenSetting(edgeLevel: number, fillLevel: number, edgeWidth: number) {
    this.material.uniforms.edgeLevel.value = edgeLevel;
    this.material.uniforms.fillLevel.value = fillLevel;
    this.material.uniforms.edgeWidth.value = edgeWidth;
  }

  setSize(width: number, height: number) {
    this.material.uniforms.resolution.value.set(width, height);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    this.material.uniforms.tDepth.value = readBuffer.depthTexture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
#include <packing>

varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;
uniform float edgeLevel;
uniform float fillLevel;
uniform float edgeWidth;
uniform float idThreshold;
uniform float depthWeight;
uniform vec3 paperColour;
uniform vec3 inkColour;

float linearDepth(vec2 uv) {
  float fragCoordZ = texture2D(tDepth, uv).x;
  float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
  return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
}

void main() {
  vec2 texel = edgeWidth / resolution;

  // Roberts cross over the face-ID colour. Any change of ID is an edge,
  // including between two coplanar faces that depth cannot separate.
  vec3 c00 = texture2D(tDiffuse, vUv).rgb;
  vec3 c10 = texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb;
  vec3 c01 = texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb;
  vec3 c11 = texture2D(tDiffuse, vUv + texel).rgb;

  // Any channel differing at all means a different ID, so take the largest
  // component rather than a length: neighbouring IDs may differ in one channel.
  vec3 dc = max(abs(c11 - c00), abs(c01 - c10));
  float idEdge = step(idThreshold, max(max(dc.r, dc.g), dc.b));

  float d00 = linearDepth(vUv);

  // Depth can catch silhouettes where two surfaces share an ID, but the
  // gradient is also non-zero across any face seen at an angle, so it draws
  // lines inside flat surfaces. depthWeight = 0 disables it.
  float depthEdge = 0.0;
  if (depthWeight > 0.0) {
    float d10 = linearDepth(vUv + vec2(texel.x, 0.0));
    float d01 = linearDepth(vUv + vec2(0.0, texel.y));
    float d11 = linearDepth(vUv + texel);
    depthEdge = clamp(length(vec2(d11 - d00, d01 - d10)) * depthWeight, 0.0, 1.0);
  }

  float edge = max(idEdge, depthEdge);

  // Background (nothing drawn) stays pure paper.
  float isScene = step(d00, 0.9999);

  float ink = mix(fillLevel, edgeLevel, edge) * isScene;
  gl_FragColor = vec4(mix(paperColour, inkColour, ink), 1.0);
}
`;
