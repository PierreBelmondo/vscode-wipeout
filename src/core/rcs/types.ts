export type Material = {};

export type Vertex = {
  x: number;
  y: number;
  z: number;
};

export type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type UV = {
  u: number;
  v: number;
};

export type Object =
  | {
      type: "group";
      position: Vertex;
      scale: Vertex;
      objects: Object[];
    }
  | {
      type: "mesh";
      vertices: Vertex[];
      indices: number[];
      uvs: UV[];
    };

export type Scene = {
  materials: Material[];
  objects: Object[];
};
