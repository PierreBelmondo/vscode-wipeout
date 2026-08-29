# .POB — Particle OBject

Particle-system definitions used by Studio Liverpool's WipEout engine, from
WipEout Fusion (PS2) through WipEout 2048 (Vita). Files live in `Data/Psys/`
(`data/particles/` on Vita).

## Provenance

Confirmed from strings in the PSP executable (`ida-purepsp/boot.bin`):

- The loader path template is `Data\Psys\%s.POB`, sitting next to
  `c:/Work/Wipeout/Code/System/Render/ParticleSystem_Importer.cpp` / `.h`
  and the symbol `ParticleSystem_ImportNode`.
- Related symbols nearby: `ParticleSystem`, `Emitter`, `EnvPsys`, `ScreenPsys`,
  `PluginEmitterNode`, `DynEmitterManip`. The last two are Maya plugin node
  names — these are authored in Maya and exported per target platform.
- `TrackStartup.xml` references them by path, e.g.
  `<Weather ScreenPsys="data\psys\WO_RAIN_LENS.POB" EnvPsys="data\psys\WO_RAIN.POB" .../>`.

## Corpus

632 files in `../project-example`, all parsed successfully by this loader.

| Platform | Path | Files |
|---|---|---|
| PSP (Pure, 3 revisions + `psp/us`) | `psp/*/Data/Psys/` | 154 |
| PSP (Pulse, 3 revisions) | `psp/pulse/*/Data/Psys/` | 119 |
| PS2 (Pulse) | `ps2/pulse/Data/Psys/` | 44 |
| PS2 (Fusion) | `ps2/fusion_unpacked/.../Data/Psys/` | 41 |
| PS3 (HD / Fury) | `ps3/*/data/psys/` | 123 |
| Vita (2048) | `psvita/2048/data/particles*/` | 151 |

## Container format

```
struct POBHeader {
    char     magic[4];      // "SYSP" on LE targets, "PSYS" on PS3 (BE)
    uint32   dataSize;      // == fileSize - sizeof(header)
    uint16   offsetCount;   // N, always a multiple of 4
    uint16   version;       // always 1
    uint32   unknown0C;     // always 1
    uint32   offsets[N];    // absolute file offsets, 0xFFFFFFFF = unused slot
    char     name[16];      // NUL-terminated, e.g. "WO_MINE_EXPLO"
};
// payload follows; header size == 0x10 + 4*N + 16
```

### Verified invariants (all 632 files, zero exceptions)

- **Magic doubles as an endianness marker.** The FourCC is written in native
  byte order, so raw bytes `53 59 53 50` ("SYSP") mean little-endian
  (PSP / PS2 / Vita) and `50 53 59 53` ("PSYS") mean big-endian (PS3).
- `fileSize - dataSize == 0x10 + 4*N + 16` — exactly, in every file.
- `offsetCount` is always a multiple of 4. The table is padded to a 16-byte
  boundary with `0xFFFFFFFF`; between 0 and 3 padding slots occur, always
  trailing.
- Every non-sentinel offset is a valid payload offset, and the used offsets are
  **monotonically increasing**.

### The offset table is a relocation table

Confirmed in the PSP executable (`Pob_RelocatePointers`, `0x00145020`):

```c
payload = header + 0x10 + u16_at(header + 8) * 4;   // == POBHeader.payloadBase
for (i = 0; i < offsetCount; i++)
    if (offsets[i] != 0xFFFFFFFF)
        *(u32 *)(payload + offsets[i]) += payload;
```

An entry is therefore **the location of a pointer inside the payload**, not a
block delimiter, and every pointer stored in the file -- `dataPtr`, `clutPtr`
and the rest -- is **payload-relative**. Reading one means adding
`payloadBase`. The "blocks" a naive parser sees between consecutive entries are
an artifact of the table happening to be sorted.
- `version` (`0x0A`) and `unknown0C` are `1` in every known file.
- **`offsets[0] == 0x4c4` in all 632 files** — every platform, both
  endiannesses, every game. Read as a payload offset this says the first
  relocated pointer always sits `0x4c4` bytes into the payload, so a
  fixed-size structure of that length opens every system.
- `name` matches the filename in every sample.

## Payload "blocks"

`POBBlock` is a **convenience, not a structure the format defines**. The offset
table is a relocation table (above), but its entries are sorted, so consecutive
ones bracket usable spans of payload and make the file walkable. Treat a block
boundary as "somewhere a pointer happens to live", not as a record boundary.

Span sizes, for orientation only:

| Size | Count | Notes |
|---|---|---|
| `0x488` (1160) | 631 | Almost exactly once per file |
| `0x4` (4) | 797 | A lone relocated pointer |
| `0x14` (20), `0xc` (12), `0x24` (36), `0x5c` (92), `0x68` (104) | ~1150 total | Short spans |
| `0x47c`–`0x504` (1148–1284) | ~700 | Emitter records; carry the animation paths |
| `0x850`–`0x8d0` (2128–2256) | ~400 | Roughly double the above |
| trailing span | 1/file | Runs to EOF, typically the largest — bulk texel and palette data |

## Animation paths (decoded)

Emitter records carry **animation paths**: `PsysPath`, a fixed 0xE0-byte struct.
Reversed from `PsysPath_Init` (boot.bin `0x00145398`) and
`PsysPath_ComputeSlopes` (`0x00145408`):

```c
struct PsysPath {           // 0xE0 bytes
    u32   unknown00;
    u32   unknown04;        // 2 by default; files override it
    u32   keyCount;         // +0x08
    f32   minValue;         // +0x0c  what a key value of 0 means
    f32   maxValue;         // +0x10  what a key value of 1 means
    struct { f32 time; f32 value; } keys[keyCount];   // +0x14
    f32   slopes[keyCount - 1];                       // +0x9c
    f32   range;            // +0xdc == maxValue - minValue
};
```

**Both axes are normalised.** Every key time and every key value in the corpus
lies in `[0, 1]` (26497 keys, no exceptions); the curve is mapped onto
`[minValue, maxValue]` when sampled. `PsysPath_ComputeSlopes` multiplying each
slope by `range` is what shows `+0x0c`/`+0x10` to be a value range and not a
time span, and `PsysDef_CreateEmitter`'s defaults land on exactly these fields
(`+0x4e4`/`+0x4e8`/`+0x5b4` = path[0] `+0x0c`/`+0x10`/`+0xdc`).

### What the five slots drive

Read off the value ranges across 1925 five-path emitters:

| Slot | Evidence | Meaning |
|---|---|---|
| 0 | small positives, never negative; default range 0..3 | **size** — `WO_MINE_EXPLO` uses `[4 .. 18]`, an explosion growing over its life |
| 1 | `0..255` in 1031 of 1925 emitters; default 0..255 | **alpha** (8-bit) |
| 2 | the only slot that goes negative (314 emitters) | signed — velocity or drift. *Not identified* |
| 3 | overwhelmingly `0..1` | normalised factor. *Not identified* |
| 4 | overwhelmingly `0..1` | normalised factor. *Not identified* |

`PsysPath_ComputeSlopes` writes the terminator **`1e7f` (`0x4B189680`)** at
`+0x14 + keyCount * 8` — which is what makes a path findable in the file — and
derives each slope as `(v[i+1] - v[i]) * duration / (t[i+1] - t[i])`. That
arithmetic is what proves the pairs are `[time, value]` and that `time` is
normalised over the particle lifetime.

`keyCount` at `+0x08` gives the length directly, so a path is read by locating a
terminator and taking the one start offset whose count field agrees with its own
distance from it.

Across the corpus: **9809 paths in 632 files, every key time within `[0,1]`.**

### The payload is an array of emitter records

`POBHeader.payloadBase` is where the **first emitter record** begins -- exact in
all 632 files. Each record is the engine's `PsysDef` emitter (0xC90 bytes when
resident), laid out as:

```
+0x000  .. 1240 bytes   emitter parameters        NOT DECODED
+0x4d8  .. 5 x 0xE0     animation paths           decoded
+0x938  ..  856 bytes   emitter parameters        NOT DECODED
```

Records are **variable-length on disk**: the stride between consecutive emitters
is constant within only 42 of 341 multi-emitter files, because each emitter's
assets -- texture descriptor, CLUT, texels -- are packed in around it.

Note what is *not* in the file: the **particle pool**. A running system keeps its
instances (position, velocity, age) in RAM; a `.pob` only carries the definition
the engine instantiates from, plus the sprites it draws with.

### Emitters

`PsysDef_CreateEmitter` (`0x001495d4`) allocates a **0xC90-byte** emitter and
initialises **five** paths at `+0x4d8`, `+0x5b8`, `+0x698`, `+0x778`, `+0x858` —
consecutive, `0xE0` apart. Grouping a file's paths on that stride recovers the
emitters: **1925 of 2105 runs are exactly five long**, and 9631 of 9809 paths
fall inside such a run. `POB.emitters` does this.

Example — `WO_MINE_EXPLO`, a curve easing out over the particle's life:

```
0.00@0.00  0.50@0.05  0.77@0.13  0.88@0.26  0.93@0.46  0.98@0.67  1.00@1.00
```

**Still open:** slots 2, 3 and 4. The viewer applies size and alpha and leaves
those three read-but-unused rather than guessing.

### Sprite-sheet frame grids -- NOT decoded

Many sheets are frame grids rather than single sprites: `fire_8x8_256x1024` is
64 frames in an 8x8 layout, `dc_circle_rich_anim_4x2` is 8, and several embedded
PSP sheets are visibly 4x4 or 2x2 when decoded. A particle must therefore pick a
cell by UV offset, but **where the grid dimensions are stored is unknown**:

- Not in the emitter record. For the three files whose texture name states 8x8,
  the values 8 and 64 appear at scattered, inconsistent offsets across emitters
  (`0x5b4`, `0x634`, `0x5c`, `0x714`, …) -- coincidence, not a field.
- Not in the texture descriptor. `+0x00` is `1` in **276 of 276** first
  textures; the non-1 values only appear on later indices, which is also where
  101 of 718 "textures" share a payload with an earlier one -- i.e. those are
  false-positive descriptor matches from the whole-file scan, not real sheets.
- The grid is stated only in the artist's **filename** (`..._8x8_...`,
  `..._4x2`), which the exporter preserved but which the engine cannot parse.

So it is likely carried in one of the still-grey emitter regions, or derived at
runtime. Until it is found the viewer draws the **whole sheet** on each
particle, which is wrong for a grid but honest -- picking a cell would require
inventing the layout.

## Coverage

Measured by marking every byte the parser can name (header, offset table, name,
`PsysPath` records, texture descriptors, CLUTs, texels) across all 632 files:

| | |
|---|---|
| **named fields** | **75.7%** |
| **structurally accounted for** | **89.6%** — every byte inside a struct whose size and layout are known |

The jump from an earlier 51.5% came from the emitter's **0x400-byte colour
gradient** at `+0xc4` (1024 bytes per emitter, 22 points on its own) and the
five 16-byte per-slot state groups after the paths.

What is left is the interior of the emitter record: individual fields in
`+0x00..+0xc4` and `+0x9a4..+0xC90`. The tail is 61% zero bytes and entirely
zero in 19% of emitters, so much of it is reserved rather than meaningful.

So the container, the assets and the animation curves are done; **most emitter
parameters are not**. Roughly 85% of the unknown bytes sit in the two undecoded
regions of the emitter record.

### Emitter fields identified so far

`PsysDef_CreateEmitter` (`0x001495d4`) and its helper (`0x00149a78`) initialise
these, which both names them and gives their defaults; the corpus values cluster
on those defaults (e.g. `+0xa0` is 2000 in 617 of 1925 emitters).

| Offset | Default | Evidence | Meaning |
|---|---|---|---|
| `+0x34` | 1.0 | 50 for `WO_RAIN`, 100 for `WO_SNOW`, ~0 for one-shot bursts; 37x higher for continuous systems than bursts | **emission rate** |
| `+0x50` | 0 | 0 in 60% of emitters; nonzero range 0..8 with **270 of 743 exactly pi/2**, others at pi/3, pi/4, pi/6 | **emission cone angle** (radians) |
| `+0x58` | 30.0 | exactly 30.0 for every explosion; 180 for `WO_SNOW`, 1.82 for `WO_RAIN` | lifetime or particle count — *not resolved* |
| `+0x74` | -0.1 | float in `[-1.37 .. 8.00]`, tightly clustered near the default | **gravity** |
| `+0xc4` | memset 0xFF, 0x400 | 256 RGBA entries; 1797 of 1925 hold a smooth ramp, e.g. `ff ff ff 01`, `ff ff ff 04` … | **colour/alpha gradient over particle life** |
| `+0x4c4` | handle of `psysed_default_glow.tga` | set from a texture-name lookup | **texture handle** |
| `+0x4c8`..`+0x4d0` | 1.0, 1.0, 1.0 | | **tint RGB** |
| `+0x950` + n×0x10 | seeded float, 3, 1.0, 0 | five groups, one per path slot; 7500 of 9625 hold the defaults | **per-slot runtime state** |

The remaining head fields (`+0x00`..`+0x4d8`) and the whole tail
(`+0x938`..`+0xC90`) are still grey. Note the engine reads them with VFPU
instructions that Ghidra's MIPS decompiler renders as `halt_baddata()`, so the
update loop could not be read directly -- these were identified from the
constructor's defaults plus how the values separate known systems.

**Not bytecode.** The blocks were tested for an instruction stream: across the
corpus all four byte lanes of a 4-byte word use 242-256 of 256 possible values,
with no small opcode vocabulary in any lane, and 44% of words are plausible
floats. These are parameter structs, not code.

Block `[0]` is a **colour/alpha ramp**: tightly packed RGBA8 quads with a smooth
gradient. Confirmed by inspection across many files, and the values match the
effect's appearance:

- `WO_SNOW` (PSP): `ff ff ff 64 …` — opaque white at ~39% alpha.
- `WO_RAIN` (PSP): `ff ff ff 15 …` — white at ~8% alpha.
- `WO_SHIP_COLL_SPARK` (PSP): `ff 85 07 1f, ff 84 07 1d, ff 83 06 1b …` —
  orange sparks fading out.
- `WO_MINE_EXPLO` (PS3, BE): `05 e6 a2 53 …` — byte-reversed relative to LE, so
  the quad is a `uint32` field, not a `uint8[4]`. Reversed it reads
  R=`53` G=`a2` B=`e6` A=`05`.

`POBBlock.asRGBA()` exposes this; note it does **not** byte-swap, so on PS3 data
you must reverse each quad yourself.

## Embedded textures (decoded)

PSP builds embed their particle sprite sheets as palettised textures. **718
textures across 276 of the 632 files** decode cleanly. PS3 and Vita builds embed
none — they reference textures externally — and only 3 PS2 files carry one.

Descriptor, 24 bytes, native endianness:

```c
struct POBTextureDesc {
    uint32 unknown00;       // 0 or 1
    float  unknown04;       // always 1.0
    uint32 unknown08;
    uint16 width;           // power of two, 32..256 observed
    uint16 height;
    uint8  bitsPerPixel;    // 4 = 16-colour, 8 = 256-colour
    uint8  unknown11;       // 3 or 4 -- possibly CLUT pixel format
    uint16 unknown12;       // uninitialised (0xBB) in some files
    uint32 clutSize;        // 64 when bpp=4, 1024 when bpp=8
    uint32 vramAddr;        // GE VRAM address; fixed per size class
    uint32 dataPtr;         // texels at dataPtr + payloadBase
    uint32 clutPtr;         // CLUT   at clutPtr + payloadBase
};
```

Both pointers are payload-relative and relocated at load time (see above), so
they resolve as `POBHeader.payloadBase + ptr`. The apparent "+0x20" of an
earlier reading was a coincidence: `payloadBase` is `0x10 + 4 * offsetCount`,
which equals `0x20` only when `offsetCount == 4`.

- The CLUT is **RGBA8888**, `clutSize / 4` entries.
- The texel data starts **exactly where the CLUT ends** (`clutPtr + clutSize ==
  dataPtr`). This holds in all 718 and is the strongest validity check.
- Texel data is **GE-swizzled** — see `GE.unswizzle` in `core/utils/pspge.ts`.
  Swizzling is a hardware layout, selected per texture by bit 0 of the GE TMODE
  command (`0xC2`), which `Gu_BindTextureToDisplayList` (boot.bin `0x0007acc8`)
  emits from a flag on its texture record. The .pob descriptor has no field that
  tracks it, and every sheet in the corpus is swizzled, so the decoder applies it
  unconditionally: all **718 textures across 632 files decode non-blank**.

  (An earlier note here claimed the data was linear. That reading came from
  resolving the pointers against the wrong base, which shifted the texels; with
  the relocation applied, unswizzling is plainly correct.)
- Indices are little-nibble-first for 4bpp (`x` even → low nibble).
- Descriptors are **not** at a fixed offset within a span, so `POB.load` scans
  the whole file on a
  4-byte stride. The validity checks are strict enough that this yields no false
  positives across the corpus.
- Texture count and order match the embedded `.tga` path count and order, which
  is how the mapping between the two was confirmed.

Decoded examples (all PSP Pulse):

| File | Texture | Source asset | Content |
|---|---|---|---|
| `WO_SNOW` | 128x64 4bpp | `snow128x64x4.tga` | scattered snowflake dots |
| `WO_RAIN` | 128x64 4bpp | `rain_4x4_128x64x4.tga` | 4x4 grid of rain streaks |
| `WO_SHURIKEN_HEAD` | 64x64 8bpp | — | 2x2 sheet of glow crescents |
| `WO_MODESTO_STEAM_A` | 32x32 8bpp | — | soft steam puff |
| `WO_MINE_EXPLO` | 64x64 8bpp, 64x64 8bpp, 128x64 4bpp | `smoke_01.tga`, `mine_bang.tga`, `debris007_128x64x4.tga` | |

`POBTexture.toMipmap()` returns an `RGBA` `Mipmap`, which feeds
`mipmapsToTexture()` in `webviews/threeView/utils.ts` directly.

## Embedded source paths

The exporter leaves absolute artist paths in the data — useful for identifying
which texture an emitter uses, and the sheet dimensions are usually in the
filename (`snow128x64x4.tga`, `debris006_128x128x4.tga`, `DC_Circle_rich_anim_4x2.tga`).
`POB.texturePaths` extracts them. Root prefixes by project:

| Prefix | Project |
|---|---|
| `Z:\Art_Resources\Psys\` | WipEout Pure (PSP) |
| `Z:\WipeoutPSP\X2\Data\Psys\` | WipEout Pulse (`X2` was its codename) |
| `Z:\WipeoutPSP\HD\Data\Psys\` | WipEout HD (PS3) |
| `Z:\WipeoutHD\Data\Source\Common\DLC3\Psys\` | WipEout HD Fury DLC |
| `D:\WorkNGP\Games\Branches\Wipeout\Wipeout\Data\particles*\` | WipEout 2048 (`NGP` = Vita codename) |
| `E:\Games\Branches\Wipeout\Wipeout\Data\particles*\` | WipEout 2048, second build machine |

## The file is a raw memory image

Several tells:

- `0xCDCDCDCD` fill — MSVC debug-heap "uninitialised" marker.
- `0xBB` and `0xAB` padding runs.
- Absolute `Z:\…` build-machine paths baked in.
- Fields land on natural alignment; floats read as sane values (`0.1`, `1.0`, `12.0`).

So the on-disk layout *is* the C++ struct layout. There is no compression and no
bit-packing, which is what makes the remaining decode tractable.

## Open questions

1. ~~**What are the blocks?**~~ *Answered.* They are not records at all: the
   offset table is a relocation table, so a "block" is just the span between two
   relocated pointers. That also explains why an embedded path appears at a
   varying offset and is often absent — it is referenced **by pointer**, and the
   pointer is what the table relocates.
2. **Emitter count.** `offsetCount / 4` is *not* it. `WO_MINE_EXPLO` has N=20 on
   PSP but N=16 on PS3, and per-group offset strides are irregular
   (`0x508` is the single most common, but `0x8fc`, `0xa48`, `0x10f8` also occur).
   The count is likely a field in the undecoded prologue.
3. **The `name[16]` field overflows.** `WO_SHIP_COLL_SPARK_TRAIL_SMOKE` is 30
   characters, yet `fileSize - dataSize` still equals `0x10 + 4*N + 16` for that
   file. Either the name is variable-length and `dataSize` is defined
   independently of it, or long names genuinely overrun the field and clobber the
   first payload bytes. Not resolved.
4. **The prologue** (header end → `0x4c4`) is undecoded. It is 1172 bytes in
   `WO_SNOW` (N=4) and 1108 bytes in PSP `WO_MINE_EXPLO` (N=20) — it shrinks as
   the header grows, confirming it is padded to a fixed end offset.
5. **Emitter parameters** -- spawn rate, lifetime, velocity, gravity, blend mode
   -- are still undecoded. These are what a real particle simulation would need;
   the ramps and sprite sheets above cover appearance only.

### Next step

Disassemble the importer in `ida-purepsp/boot.bin` around the
`ParticleSystem_Importer.cpp` string references. The PSP ELF is not stripped of
its assert strings, so the file/line anchors locate the parse function, and MIPS
load offsets read straight off as struct field offsets. That turns questions 1–4
from inference into ground truth. (The PS2 ELF `ida-pulseps2/SCES_547.48` is
fully stripped — 0 symbols — but carries the same assert strings.)

## Usage

```bash
npx tsx --tsconfig scripts/tsconfig.json scripts/pob.ts dump <files...>
npx tsx --tsconfig scripts/tsconfig.json scripts/pob.ts scan [dir]
```

`scan` re-checks every invariant above across a directory tree and reports block
size statistics — run it after any change to the parser.
