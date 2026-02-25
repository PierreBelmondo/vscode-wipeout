import { defineConfig, type Plugin } from "vite";
import checker from "vite-plugin-checker";
import path from "path";
import fs from "fs";

// Inline .wasm files as base64 data URLs, matching webpack's type: 'asset/inline'.
// The imported value is a string URL passed to fetch(), so it must be a valid URL.
function inlineWasm(): Plugin {
  return {
    name: "inline-wasm",
    load(id) {
      if (!id.endsWith(".wasm")) return;
      const buf = fs.readFileSync(id);
      const b64 = buf.toString("base64");
      const dataUrl = `data:application/wasm;base64,${b64}`;
      return `export default ${JSON.stringify(dataUrl)};`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    inlineWasm(),
    checker({ typescript: { tsconfigPath: path.resolve(__dirname, "tsconfig.webviews.json") } }),
  ],
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: false,
    target: "es2019",
    sourcemap: mode === "production" ? "hidden" : true,
    // Inline image assets (hangar.jpg if uncommented) as base64 data URLs.
    // Must be above hangar.jpg size (~433 KB) to auto-inline if that import is ever re-enabled.
    assetsInlineLimit: 500_000,
    // Single-file webview output is intentionally large; suppress the warning.
    chunkSizeWarningLimit: 2_000,
    rollupOptions: {
      input: path.resolve(__dirname, "webviews/threeView/index.ts"),
      output: {
        // Produce a single self-contained file — equivalent to webpack's
        // LimitChunkCountPlugin({ maxChunks: 1 }). Required for VSCode webviews
        // which load a single <script> tag with no module loader.
        inlineDynamicImports: true,
        entryFileNames: "webview-three.js",
        format: "iife",
        name: "WebviewThree",
      },
    },
  },
  resolve: {
    alias: {
      "@compat": path.resolve(__dirname, "compat/browser"),
      "@core": path.resolve(__dirname, "core"),
    },
  },
}));
