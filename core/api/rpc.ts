/**
 * Messages from Webview to Editor
 */
export type ThreeDocumentMessage =
  | { type: "ready" }
  | { type: "require"; filename: string }
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
  | { uri: string; webviewUri: string; mime: "model/vnd.wipeout.vexx" }
  | { uri: string; webviewUri: string; mime: "model/vnd.wipeout.rcsmodel" }
  | { uri: string; webviewUri: string; mime: "application/binary" };

export type ThreeViewMessage =
  | { type: "load"; body: ThreeViewMessageLoadBody }
  | { type: "import"; body: ThreeViewMessageImportBody }
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
