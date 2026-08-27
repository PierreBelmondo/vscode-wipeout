/**
 * Messages from Webview to Editor
 *
 * `require` carries an optional correlation id. When it is present the editor
 * echoes it back on the matching `import` -- or on `import.error` if the file
 * cannot be resolved -- which lets the webview await one specific dependency
 * instead of watching an untargeted broadcast. Without an id the exchange stays
 * fire-and-forget, so callers that only want the side effect need no changes.
 */
export type ThreeDocumentMessage =
  | { type: "ready" }
  | { type: "require"; filename: string; id?: number }
  | { type: "log"; message: string }
  | { type: "export.gltf"; body: any }
  | { type: "scene"; body: any }
  | { type: "scene.selected"; body: { uuid: string } }
  | { type: "scene.dump"; body: { uuid: string } };

/**
 * Messages from Editor to Webview
 */
export type ThreeViewMessageLoadBody =
  | { uri: string; webviewUri: string; mime: "model/vnd.wipeout.vexx" }
  | { uri: string; webviewUri: string; mime: "model/vnd.wipeout.rcsmodel" }
  | { uri: string; webviewUri: string; mime: "application/xml+wipeout" };

export type ThreeViewMessageImportBody =
  | { uri: string; webviewUri: string; mime: "model/vnd.wipeout.vexx"; id?: number }
  | { uri: string; webviewUri: string; mime: "model/vnd.wipeout.rcsmodel"; id?: number }
  | { uri: string; webviewUri: string; mime: "application/binary"; id?: number };

/**
 * A `require` that could not be answered. Sent only for a correlated request:
 * an uncorrelated one has nobody waiting, so it stays a host-side log.
 */
export type ThreeViewMessageImportErrorBody = { uri: string; reason: string; id: number };

export type ThreeViewMessage =
  | { type: "load"; body: ThreeViewMessageLoadBody }
  | { type: "import"; body: ThreeViewMessageImportBody }
  | { type: "import.error"; body: ThreeViewMessageImportErrorBody }
  | { type: "scene.refresh" }
  | { type: "scene.selected"; body: { uuid: string } }
  | { type: "show.world" }
  | { type: "show.texture"; body: { name: string } };

export type TextureViewMessageLoadBody = {
  mime: string;
  uri: string;
  webviewUri: string;
};

export type TextureViewMessage = { type: "empty"; body: {} } | { type: "load"; body: TextureViewMessageLoadBody };
