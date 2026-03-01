# Belmondo's Vision - WipEout Modding Tool

WipEout modding extension for Visual Studio Code — supports PSX, PSP, PS2, PS3, and PS4 game files.

![GitHub](https://img.shields.io/github/license/PierreBelmondo/vscode-wipeout)

## Features

### Archive unpacking

| Format | Description |
|--------|-------------|
| **WAD** | WipEout PSP archive — LZSS/zlib compressed, XTEA-encrypted DLC support |
| **WAC** | Hierarchical folder/file archive |
| **PSARC** | PlayStation Archive v1.3 — deflate compressed, manifest-based (PS3/PS4) |
| **BNK** | Sony SCREAM sound bank — exports PS-ADPCM audio to WAV (PS2/PS3/PSP/Vita) |

Right-click any supported archive in the Explorer to unpack it.

### 3D scene & model viewing

| Format | Extension | Platform |
|--------|-----------|----------|
| **VEXX** | `.vex` | PSP / PS2 |
| **RCS Model** | `.rcsmodel` | PS3 / PS4 |

- Scene graph tree panel with node inspection
- Keyframe animation playback (position, rotation, scale)
- Material and texture reference browsing
- 40+ VEXX node types (meshes, transforms, lights, collisions, particles, sounds, effects, …)

### Texture viewing

| Format | Extension | Platform | Compression |
|--------|-----------|----------|-------------|
| **GTF** | `.gtf` | PS3 | DXT1–DXT5, A8R8G8B8, and more |
| **GNF** | `.gnf` | PS4 | BC7/BCn (WASM-accelerated) |
| **DDS** | `.dds` | PC | DXT1/3/5, DX10/DXGI |
| **MIP** | `.mip` | PSP | 4-bit / 8-bit indexed, swizzled |
| **PCT** | `.pct` | PS2 | 4-bit / 8-bit indexed, GIF/GS DMA stream (billboard and font textures) |
| **FNT** | `.fnt` | PSP/PS2/PS3 | Grayscale bitmap font glyphs |

## Commands

| Command | Description |
|---------|-------------|
| `WipEout: Unpack BNK` | Export sound bank waves to WAV |
| `WipEout: Unpack WAD` | Extract WAD archive |
| `WipEout: Unpack WAC` | Extract WAC archive |
| `WipEout: Unpack PSARC` | Extract PSARC archive |

## Extension Settings

Nothing yet.

## Known Issues

- DXT5 alpha channel is buggy
- Not all VEXX node types are fully parsed

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).

**Enjoy!**
