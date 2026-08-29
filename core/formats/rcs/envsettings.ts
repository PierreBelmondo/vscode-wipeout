/**
 * `.envsettings` -- a track's environment settings, as plain text.
 *
 * Every PS3 environment ships one beside its .rcsmodel, and it holds the values
 * the shaders read as uniforms but the material files do not carry: the fog
 * colour and density, the sun's colour and direction, the constant ambient, the
 * prelit scales. Those are exactly the constants a transcribed or generated
 * material otherwise has to invent -- `fogColour` and `SpecularColour` have
 * been viewer conventions until now precisely because nothing else states them.
 *
 * The format is one `"Section.Key"=value` per line, CRLF-terminated, with the
 * value being 1-4 space-separated floats. 38 of the 39 shipped files carry the
 * same core keys, so it is stable enough to read by name.
 */

export type EnvSettings = {
  /** Every key, verbatim, for anything this type does not name. */
  values: Map<string, number[]>;
  get(key: EnvKeyName): number[] | undefined;
  getNumber(key: EnvKeyName, fallback: number): number;
  getVec3(key: EnvKeyName, fallback: [number, number, number]): [number, number, number];
};

/**
 * Keys the shaders actually consume, named so callers do not repeat strings.
 *
 * Each is a LIST because the files come in two generations and the tracks are
 * split between them: 4 of the 7 environments spell the ambient
 * `Lighting.Constant ambient color`, the other 3 -- vineta_k, 02_track and
 * ubermall -- spell it `Lighting.Ambient color`, with the same value. Looking
 * up only the newer spelling silently missed every key on those three tracks,
 * so their materials ran on the fallbacks: `constantAmbientColour` fell to
 * black, and any fragment program that multiplies by it -- which is most of
 * them -- rendered its surface black or, where a stray term survived, tinted.
 *
 * The older prelit scale is a SCALAR (`0.500000`) where the newer one is a
 * colour, so getVec3 broadcasts a single value across all three channels.
 */
export const EnvKey = {
  fogColour: ["Fog.Fog Color"],
  fogDensity: ["Fog.Fog Density"],
  altFogColour: ["Fog.Alternate Fog Color"],
  altFogDensity: ["Fog.Alternate Fog Density"],
  constantAmbient: ["Lighting.Constant ambient color", "Lighting.Ambient color"],
  sunColour: ["Lighting.Sun color"],
  // `Physical Sun direction`, NOT `Sun direction`. The files carry both, and
  // on vineta_k they nearly coincide -- (-1.8, 0.2, 1) vs (-2, 0.8, 1) -- which
  // is how the wrong one went unnoticed: every sun-direction check had been
  // made there. On 05_ubermall they are opposite in x and z, and the inflatable
  // panda head that faces oncoming ships rendered with its face black and the
  // back of its head lit. Correlating each lightmapped vertex's baked
  // luminance with N.L for both keys settles which one the bake used:
  //   12_sol_2   0.58 vs 0.27    03_track  0.29 vs 0.18
  //   ubermall   0.16 vs 0.05    anulpha   0.19 vs 0.08   (Physical vs Sun)
  // with the positive sign in every case, and the panda's face lit. `Sun
  // direction` stays as the fallback for a file that lacks the physical key.
  sunDirection: ["Lighting.Physical Sun direction", "Lighting.Sun direction"],
  sunSpecularScale: ["Lighting.Sun specular scale"],
  prelitAmbientScale: ["Lighting.Prelit ambient colour scale", "Lighting.Prelit ambient scale"],
  // Named `bias` by the files themselves -- it is added, not an exponent.
  prelitAmbientBias: ["Lighting.Prelit ambient colour bias"],
  skyColour: ["Lighting.Sky colour"],
} as const;

export type EnvKeyName = readonly string[];

/**
 * Parse the text of a .envsettings file.
 *
 * Unknown or malformed lines are skipped rather than rejected: these are
 * authoring files and a few carry keys the rest do not.
 */
export function parseEnvSettings(text: string): EnvSettings {
  const values = new Map<string, number[]>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^"([^"]+)"\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const numbers = match[2]
      .trim()
      .split(/\s+/)
      .map((token) => Number(token))
      .filter((n) => Number.isFinite(n));
    if (numbers.length) values.set(match[1], numbers);
  }

  const lookup = (aliases: EnvKeyName) => {
    for (const key of aliases) {
      const v = values.get(key);
      if (v && v.length) return v;
    }
    return undefined;
  };

  return {
    values,
    get: lookup,
    getNumber: (key, fallback) => lookup(key)?.[0] ?? fallback,
    getVec3: (key, fallback) => {
      const v = lookup(key);
      if (!v) return fallback;
      // The older files write a scalar where the newer write a colour.
      if (v.length < 3) return [v[0], v[0], v[0]];
      return [v[0], v[1], v[2]];
    },
  };
}
