#pragma once

#define WASM_EXPORT(name) __attribute__((export_name(name)))

#define WASM_IMPORT(module, name) __attribute__((import_module(module), import_name(name)))

#define PAGE_SIZE 0x10000;

typedef signed int i32;
typedef unsigned int u32;

extern const i32 __stack_pointer;
extern const i32 __heap_base;

// __builtin_wasm_memory_size(0) * PAGE_SIZE
// __builtin_wasm_memory_grow(0, (uintptr_t)increment / PAGE_SIZE);
