/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-dynamic-require */

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const execFile = require("child_process").execFile;
const path = require("path");
const { EsbuildPlugin } = require("esbuild-loader");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const JSON5 = require("json5");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

async function resolveTSConfig(/** @type {string} */ configFile) {
  const data = await new Promise((resolve, reject) => {
    execFile("yarn", ["tsc", `-p ${configFile}`, "--showConfig"], { cwd: __dirname, encoding: "utf8", shell: true }, function (error, stdout) {
      if (error != null) {
        reject(error);
      }
      resolve(stdout);
    });
  });

  const index = data.indexOf("{\n");
  const endIndex = data.indexOf("Done in");
  const substr = data.substring(index, endIndex > index ? endIndex : undefined);
  const json = JSON5.parse(substr);
  return json;
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @param {{ esbuild?: boolean; }} env
 * @param { WebpackConfig['entry'] } entry
 * @returns { Promise<WebpackConfig> }
 */
async function getWebviewConfig(mode, env, entry) {
  const basePath = path.join(__dirname, "webviews");
  const corePath = path.join(__dirname, "core");
  const ts_config = path.join(__dirname, "tsconfig.webviews.json");

  /**
   * @type WebpackConfig['plugins'] | any
   */
  const plugins = [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new ForkTsCheckerPlugin({
      async: false,
      /*
      eslint: {
        enabled: true,
        files: path.join(basePath, "**", "*.ts"),
        options: {
          cache: true,
          configFile: path.join(__dirname, ".eslintrc.webviews.json"),
        },
      },
      */
      formatter: "basic",
      typescript: {
        configFile: ts_config,
      },
    }),
  ];

  return {
    name: "webviews",
    entry: entry,
    mode: mode,
    target: "web",
    devtool: mode !== "production" ? "source-map" : undefined,
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "dist"),
    },
    performance: {
      hints: false,
      maxEntrypointSize: 2048000,
      maxAssetSize: 2048000,
    },
    optimization: {
      minimizer: [
        // @ts-ignore
        env.esbuild
          ? new EsbuildPlugin({
              format: "cjs",
              minify: true,
              treeShaking: true,
              // Keep the class names
              keepNames: true,
              target: "es2019",
            })
          : new TerserPlugin({
              extractComments: false,
              parallel: true,
              terserOptions: {
                ecma: 2019,
                keep_classnames: /^AbortSignal$/,
                module: true,
              },
            }),
      ],
    },
    module: {
      rules: [
        {
          exclude: /node_modules/,
          include: [corePath, basePath],
          test: /\.tsx?$/,
          use: env.esbuild
            ? {
                loader: "esbuild-loader",
                options: {
                  loader: "tsx",
                  target: "es2019",
                  tsconfigRaw: await resolveTSConfig(ts_config),
                },
              }
            : {
                loader: "ts-loader",
                options: {
                  configFile: ts_config,
                  transpileOnly: true,
                },
              },
        },
        {
          test: /\.css/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.svg/,
          use: ["svg-inline-loader"],
        },
        {
          test: /\.jpg/,
          type: 'asset/inline',
        },
        {
          test: /\.wasm/,
          type: 'asset/inline',
          /*
          generator: {
            dataUrl: content => {
              content = content.toString();
              return new Uint8Array(content);
            }
          }
          */
        }
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".jpg", ".js", ".jsx", ".json", ".svg", ".wasm"],
      fallback: {
        /*
        crypto: require.resolve("crypto-browserify"),
        path: require.resolve("path-browserify"),
        stream: require.resolve("stream-browserify"),
        */
      },
      alias: {
        "@compat": path.join(__dirname, "compat/browser"),
        "@core": path.join(__dirname, "core"),
      },
    },
    plugins: plugins,
  };
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @param {{ esbuild?: boolean; }} env
 * @returns { Promise<WebpackConfig> }
 */
async function getExtensionConfig(mode, env) {
  const basePath = path.join(__dirname, "src");
  const corePath = path.join(__dirname, "core");
  const ts_config = path.join(__dirname, "tsconfig.json");

  /**
   * @type WebpackConfig['plugins'] | any
   */
  const plugins = [
    new ForkTsCheckerPlugin({
      async: false,
      /*
      eslint: {
        enabled: true,
        files: path.join(basePath, "**", "*.ts"),
        options: {
          cache: true,
          configFile: path.join(
            __dirname,
            target === "webworker"
              ? ".eslintrc.browser.json"
              : ".eslintrc.node.json"
          ),
        },
      },
      */
      formatter: "basic",
      typescript: {
        configFile: ts_config,
      },
    }),
  ];

  const entry = {
    extension: "./src/extension.ts",
  };

  return {
    name: `extension:node`,
    entry,
    mode: mode,
    target: "node",
    devtool: mode !== "production" ? "source-map" : undefined,
    output: {
      path: path.join(__dirname, "dist"),
      libraryTarget: "commonjs2",
      filename: "[name].js",
      chunkFilename: "feature-[name].js",
    },
    optimization: {
      minimizer: [
        // @ts-ignore
        env.esbuild
          ? new EsbuildPlugin({
              format: "cjs",
              minify: true,
              treeShaking: true,
              // Keep the class names
              // keepNames: true,
              target: "es2019",
            })
          : new TerserPlugin({
              extractComments: false,
              parallel: true,
              terserOptions: {
                ecma: 2019,
                // Keep the class names
                // keep_classnames: true,
                module: true,
              },
            }),
      ],
    },
    module: {
      rules: [
        {
          exclude: [/node_modules/],
          include: [basePath, corePath],
          test: /\.tsx?$/,
          use: env.esbuild
            ? {
                loader: "esbuild-loader",
                options: {
                  loader: "ts",
                  target: "es2019",
                  tsconfigRaw: await resolveTSConfig(ts_config),
                },
              }
            : {
                loader: "ts-loader",
                options: {
                  configFile: ts_config,
                  transpileOnly: true,
                },
              },
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      symlinks: false,
      alias: {
        "@compat": path.join(__dirname, "compat/node"),
        "@core": path.join(__dirname, "core"),
      },
    },
    externals: {
      vscode: "commonjs vscode",
      // 'utf-8-validate': 'utf-8-validate',
      // 'bufferutil': 'bufferutil',
      // 'encoding': 'encoding',
      "applicationinsights-native-metrics": "applicationinsights-native-metrics",
      "@opentelemetry/tracing": "@opentelemetry/tracing",
      fs: "fs",
    },
    plugins: plugins,
    stats: {
      preset: "errors-warnings",
      assets: true,
      colors: true,
      env: true,
      errorsCount: true,
      warningsCount: true,
      timings: true,
    },
  };
}

module.exports =
  /**
   * @param {{ esbuild?: boolean; } | undefined } env
   * @param {{ mode: 'production' | 'development' | 'none' | undefined; }} argv
   * @returns { Promise<WebpackConfig[]> }
   */
  async function (env, argv) {
    const mode = argv.mode || "none";

    env = {
      esbuild: false,
      ...env,
    };

    return Promise.all([
      getExtensionConfig(mode, env),
      getWebviewConfig(mode, env, {
        "webview-three": "./webviews/threeView/index.ts",
        "webview-texture": "./webviews/textureView/index.ts",
      }),
    ]);
  };
