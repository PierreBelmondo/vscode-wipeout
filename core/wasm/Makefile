
# -Wl,--max-memory=1310720"
# -Wl,--initial-memory=131072"

MAX_MEMORY=$(shell echo 8192*65536|bc)
WASM_FEATURES=-mbulk-memory -matomics -mmutable-globals

LD=$(type wasm-ld)
CC=clang
LDFLAGS=--no-entry,--export=__stack_pointer,--export=__heap_base,--import-memory,--shared-memory,--max-memory=$(MAX_MEMORY)
CFLAGS=--target=wasm32 --no-standard-libraries ${WASM_FEATURES} -fuse-ld=$(LD) -Wl,${LDFLAGS}

TARGETS=bcdec.wasm test.wasm

all: $(TARGETS)

bcdec.c: wasm.h

bcdec.wasm: bcdec.c
	$(CC) $(CFLAGS) -o $@ $?

test.c: wasm.h

test.wasm: test.c
	$(CC) $(CFLAGS) -o $@ $?

.PHONY: clean

clean:
	rm -f $(TARGETS)

