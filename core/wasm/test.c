
#include "wasm.h"

WASM_IMPORT("env", "print_num")
extern void print_num(u32 n);

void bcdec_bc7(const void *compressedBlock, void *decompressedBlock,
               int destinationPitch) {
  unsigned char *decompressed = decompressedBlock;

  for (int i = 0; i < 4; ++i) {
    for (int j = 0; j < 4; ++j) {
      decompressed[j * 4 + 0] = (j + 1) * 50;
      decompressed[j * 4 + 1] = (i + 1) * 50;
      decompressed[j * 4 + 2] = 0;
      decompressed[j * 4 + 3] = 100;
    }
    decompressed += destinationPitch;
  }
}

WASM_EXPORT("bcdec_bc7_full")
void bcdec_bc7_full(void *compressedImage, void *decompressedImage, int width,
                    int height) {
  unsigned int blocksW = width / 4;
  unsigned int blocksH = height / 4;
  unsigned int destinationPitch = width * 4;
  for (unsigned int j = 0; j < blocksH; j++) {
    for (unsigned int i = 0; i < blocksW; i++) {
      bcdec_bc7(compressedImage, decompressedImage, destinationPitch);
      compressedImage += 16;
      decompressedImage += 16;
    }
    decompressedImage += destinationPitch * 3;
  }
}
