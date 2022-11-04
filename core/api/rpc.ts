export type ThreeDocumentMessage =
  | { type: "ready" }
  | { type: "require"; body: string }
  | { type: "log"; message: string }
  | { type: "export.gltf" }
  | { type: "scene"; body: any };

export type ThreeViewMessage =
  | { type: "load"; body: { mime: string; buffer: string } }
  | { type: "import"; body: { filename: string; buffer: string } }
  | { type: "show.world" }
  | { type: "show.texture"; body: { name: string } };
