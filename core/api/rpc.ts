export type ThreeDocumentMessage =
  | { type: "ready" }
  | { type: "require"; body: string }
  | { type: "log"; message: string }
  | { type: "export.gltf" }
  | { type: "scene"; body: any };

export type ThreeViewMessageLoadBody =
  | { mime: "model/vnd.wipeout.vexx"; buffer: string }
  | { mime: "model/vnd.wipeout.rcsmodel"; buffer: string }
  | { mime: "application/xml+wipeout"; buffer: string };

export type ThreeViewMessage =
  | { type: "load"; body: ThreeViewMessageLoadBody }
  | { type: "import"; body: { filename: string; buffer: string } }
  | { type: "show.world" }
  | { type: "show.texture"; body: { name: string } };
