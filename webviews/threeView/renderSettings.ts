import * as THREE from "three";

/**
 * The tunables behind how the scene is lit and graded.
 *
 * These are *viewer conventions*, not values read out of the game files. The
 * engine's own numbers live in uniforms the .rcsmaterial does not ship
 * (`prelitScaleSpecular`, `prelitBias`) because they are set per node at
 * runtime, so nothing here can be derived from the data. They are collected in
 * one place, and exposed in the toolbox, so they can be judged by eye against
 * the real game rather than guessed at in source.
 *
 * TODO: if `prelitScaleSpecular` ever becomes reachable per node, the specular
 *   pair below should be replaced by the real values rather than tuned.
 */
export const DEFAULT_RENDER_SETTINGS = {
  /** Scene ambient. Flat and unshadowed: too much of it flattens all contrast. */
  ambientIntensity: 0.25,
  /** The key light, which does the actual shading. */
  directionalIntensity: 1.1,
  /** Tone-mapping exposure. Raise to brighten, lower to darken. */
  exposure: 1.0,
  /**
   * Convert the final image to sRGB.
   *
   * Off restores the pre-existing behaviour exactly. See the note in app.ts.
   */
  srgbOutput: true,
  /** Tone-mapping curve. See TONE_MAPPINGS. */
  toneMapping: "ACESFilmic",
  /**
   * Apply tone mapping and sRGB inside the bloom composite.
   *
   * The composite is a bare ShaderMaterial, so Three injects neither its
   * tonemapping nor its encoding chunk into it -- unlike the bloom-off path,
   * where the scene is drawn straight to the canvas and the renderer applies
   * both. Without this the two paths are graded differently; with it they
   * match. Exposed as a toggle so the composite can be taken out of the
   * picture when diagnosing the bloom path.
   */
  bloomGrading: true,
  /** Multiplies every baked lightmap. */
  lightmapIntensity: 1.0,
  /** Default specular colour, as a hex string so lil-gui can show a swatch. */
  specularColor: "#4c4c4c",
  /** Default Phong exponent: higher is a tighter, glossier highlight. */
  specularShininess: 60,
};

export type RenderSettings = typeof DEFAULT_RENDER_SETTINGS;

/** The curves offered in the toolbox, by name. */
export const TONE_MAPPINGS: { [name: string]: THREE.ToneMapping } = {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  Cineon: THREE.CineonToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping,
};
