import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    checker({ typescript: { tsconfigPath: path.resolve(__dirname, "tsconfig.json") } }),
  ],
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "node18",
    sourcemap: mode === "production" ? "hidden" : true,
    // ssr mode tells Vite this is a Node.js build: Node built-ins (util, zlib, fs, …)
    // are resolved as real Node modules instead of being swapped for browser stubs.
    ssr: path.resolve(__dirname, "src/extension.ts"),
    rollupOptions: {
      external: [
        "vscode",
        "applicationinsights-native-metrics",
        "@opentelemetry/tracing",
        // Externalize all Node built-ins (bare names and node: protocol)
        /^node:/,
        /^(fs|path|os|crypto|util|zlib|stream|buffer|events|net|http|https|url|querystring|string_decoder|tls|child_process|worker_threads|readline|assert|perf_hooks|v8|vm)$/,
      ],
      output: {
        entryFileNames: "extension.js",
        format: "cjs",
        exports: "named",
      },
    },
  },
  resolve: {
    alias: {
      "@compat": path.resolve(__dirname, "compat/node"),
      "@core": path.resolve(__dirname, "core"),
    },
    conditions: ["node", "module", "import", "default"],
    mainFields: ["main", "module"],
  },
}));
