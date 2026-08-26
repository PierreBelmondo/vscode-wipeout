import * as THREE from "three";

/**
 * The engine's shared vertex-constant bank, slots 454..467.
 *
 * A generated vertex program addresses its constants as `c[N]` into a bank the
 * engine fills per draw. The bank is NOT a fixed table of engine globals: the
 * same slot holds a different uniform in different permutations --
 *
 *   c[464] = quakePointA (4507x), zoneOrigin (3370x), prelitScaleSpecular (1960x)
 *
 * -- and each permutation declares only the contiguous run it owns, with a base
 * that slides. Measured across the corpus, `(prelitBias, prelitScaleSpecular)`
 * lands on (463,464) 1960 times, (459,460) 540, (461,462) 48. So a slot->name
 * table baked in here would be wrong for most permutations; the mapping has to
 * come from the permutation's own uniform table, which rcsdump --json exports.
 *
 * A program also reads slots it never declares -- perm 5 of base_diffusespecular
 * declares 463..467 and reads 462 -- picking up whatever the previous draw left
 * there. Those reads are real: in perm 5 the value reaches the colour as an
 * additive term. Since we have no previous draw, an undeclared slot resolves to
 * this bank's default for whatever the neighbouring run implies, and failing
 * that to zero, which is the identity for the additive and scale-and-bias uses.
 *
 * The full vocabulary ever seen in the bank is these 14 names, so the bank is
 * small and closed rather than open-ended.
 */

/** Lowest and highest bank slot a program has been seen to address. */
export const BANK_FIRST = 454;
export const BANK_LAST = 467;
export const BANK_SIZE = BANK_LAST - BANK_FIRST + 1;

/**
 * What the viewer supplies for each name the bank can hold.
 *
 * `positionScale`/`positionBias` dequantize packed vertex attributes and are
 * the only two declared by every permutation; the geometry the loader hands us
 * is already unpacked, so they are identity here. The quake and zone terms
 * belong to effects the viewer does not run, and are neutral rather than
 * omitted so a program reading them still computes something sane.
 */
export type BankValues = {
  time: number;
  eyePositionWorldSpace: THREE.Vector3;
  prelitBias: THREE.Vector4;
  prelitScaleSpecular: THREE.Vector4;
};

function defaultFor(name: string, v: BankValues): THREE.Vector4 {
  switch (name) {
    // Identity for `attr * scale + bias`: the loader already unpacks geometry.
    case "positionScale":
    case "uvScale":
      return new THREE.Vector4(1, 1, 1, 1);
    case "positionBias":
    case "uvOffset":
      return new THREE.Vector4(0, 0, 0, 0);
    case "eyePositionWorldSpace": {
      const e = v.eyePositionWorldSpace;
      return new THREE.Vector4(e.x, e.y, e.z, 1);
    }
    case "time":
      return new THREE.Vector4(v.time, v.time, v.time, v.time);
    case "prelitBias":
      return v.prelitBias.clone();
    case "prelitScaleSpecular":
      return v.prelitScaleSpecular.clone();
    // Effects the viewer does not run. Zero leaves the terms they feed inert:
    // the quake displacement adds nothing and the zone tint stays untinted.
    case "quakePointA":
    case "quakePointB":
    case "quakeOffset":
    case "quakeTrackUpNormal":
    case "zoneOrigin":
    case "Constant1":
      return new THREE.Vector4(0, 0, 0, 0);
    default:
      // An unnamed slot: the hash table has no name for it, so there is nothing
      // to reason from. Zero is the dangerous choice -- these are usually
      // scales, and water_test_2 scrolls its uv with `time * c[2]` where c[2]
      // is exactly such a slot, so zero froze the water no matter how fast the
      // clock ran. A small value keeps a term alive without dominating it;
      // 4% of bank entries across the corpus are unnamed.
      return new THREE.Vector4(1, 1, 1, 1);
  }
}

/**
 * Where a shader's `c[]` array starts, and how long it is.
 *
 * The GLSL emitter rebases the bank onto the LOWEST slot a given program reads,
 * so a shader reading only slot 462 declares `uniform vec4 c[1]` and addresses
 * it as `c[0]` -- not `c[462]`, and not offset from BANK_FIRST either. Passing
 * the wrong base lines the array up against the wrong slots, which is silent
 * whenever the misread slots happen to be zero. The emitter states the range in
 * a comment beside the declaration (`// engine bank slots 462..462`), which is
 * where these come from.
 */
export type BankWindow = { base: number; size: number };

/** One permutation's bank layout: which slot holds which uniform. */
export type BankLayout = { slot: number; name: string; rows: number }[];

/**
 * Default constants embedded in the vertex program's own preamble.
 *
 * The SHO carries, before its bytecode, the values the shader was compiled
 * against for bank slots it reads but the permutation does not declare:
 * the tangent unpack's (2, 1), the byte-normal unpack's (255, 128), a wave
 * program's pi/2. rcsdump exports them and they are the ONE source for these
 * values -- there is no engine at runtime to feed the slot, and zero (the old
 * fill) multiplied the tangent away and collapsed every TBN that used it.
 */
export type BankDefaults = { slot: number; value: [number, number, number, number] }[];

/**
 * Build the `c[]` array a generated vertex program reads.
 *
 * Slots the permutation declares get their named value; everything else stays
 * zero. A matrix occupies `rows` consecutive slots, so it is expanded here the
 * same way the GLSL emitter names its rows.
 */
export function buildBank(
  layout: BankLayout,
  values: BankValues,
  base = BANK_FIRST,
  size = BANK_SIZE,
  defaults: BankDefaults = []
): THREE.Vector4[] {
  const bank: THREE.Vector4[] = [];
  for (let i = 0; i < size; i++) bank.push(new THREE.Vector4(0, 0, 0, 0));

  // The program's own embedded defaults first; the named layout below
  // overrides them where the viewer has a live value (time, the eye).
  const seeded = new Set<number>();
  for (const d of defaults) {
    const index = d.slot - base;
    if (index < 0 || index >= size) continue;
    bank[index].set(d.value[0], d.value[1], d.value[2], d.value[3]);
    seeded.add(index);
  }

  for (const entry of layout) {
    // An UNNAMED layout entry has only an invented neutral to offer; the
    // program's own embedded value is authoritative where one exists.
    if (entry.name === "?" && seeded.has(entry.slot - base)) continue;
    for (let row = 0; row < Math.max(1, entry.rows); row++) {
      const slot = entry.slot + row;
      const index = slot - base;
      if (index < 0 || index >= size) continue;
      bank[index] = defaultFor(entry.name, values);
    }
  }
  return bank;
}
