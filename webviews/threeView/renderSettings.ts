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
  /**
   * Scene ambient.
   *
   * Zero, because the engine does not light this way: its own
   * `constantAmbientColour` is a small term and the *baked lightmap* carries
   * the indirect light. Adding flat fill on top double-counts the indirect
   * that is already in the bake, and being unshadowed it flattens contrast
   * everywhere.
   */
  ambientIntensity: 0.0,
  /** The key light, which does the actual shading. */
  directionalIntensity: 1.1,
  /**
   * The six ±X/±Y/±Z fill lights World creates.
   *
   * An omnidirectional wash — ambient light by another name — which used to
   * sit at 0.1 each (0.6 total) and could not be turned down, since the
   * Directional slider deliberately skips them. Off by default for the same
   * reason as `ambientIntensity`: the baked lightmap already carries the
   * indirect.
   */
  fillIntensity: 0.0,
  /**
   * Tone-mapping exposure. Raise to brighten, lower to darken.
   *
   * Low, which pushes Reinhard's knee well above the usual range: below scene
   * ~1.0 the curve stays within a few percent of linear, and only starts
   * compressing hard (≈30–38%) around scene 2–3. That keeps midtone contrast
   * the default settings flattened, while still rolling off real highlights.
   */
  exposure: 0.2,
  /**
   * Convert the final image to sRGB.
   *
   * Off restores the pre-existing behaviour exactly. See the note in app.ts.
   */
  srgbOutput: true,
  /**
   * Tone-mapping curve. See TONE_MAPPINGS.
   *
   * Reinhard rather than ACES: ACES lifts midtones hard, which washed the
   * scene out once the baked lightmaps were carrying the indirect light.
   */
  toneMapping: "Reinhard",
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
  /**
   * Multiplies every baked lightmap.
   *
   * The lightmaps are dark on their own — 60 of them measure a mean luminance
   * of 0.19 — because the engine only ever uses them scaled:
   *
   *     TEXR H4.xyzw, f[TEX3], TEX1            ; sample the lightmap
   *     MADH H4.xyz,  H4, <prelitScale>, H6    ; x scale + bias
   *
   * so this is the viewer's stand-in for `prelitScale`. At 1.0 a lightmap
   * contributes 0.19 irradiance and the surface reads as unlit; at 4.0 it
   * contributes 0.78, which is a plausible lit surface.
   *
   * TODO: read the real `prelitScale`/`prelitBias` per material — they ship no
   *   value in the .rcsmaterial, so this factor stands in for both.
   */
  lightmapIntensity: 4.0,
  /** Default specular colour, as a hex string so lil-gui can show a swatch. */
  specularColor: "#4c4c4c",
  /**
   * Default Phong exponent: higher is a tighter, glossier highlight.
   *
   * Tight, so the highlight reads as a distinct glint rather than a broad
   * sheen. Like the specular colour this is a viewer convention — the engine's
   * real exponent comes from `prelitScaleSpecular`, which ships no value.
   */
  specularShininess: 200,
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
