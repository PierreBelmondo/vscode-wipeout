export type Mipmap = {
  width: number;
  height: number;
  rgba: number[];
};

export type Texture = {
  id: number;
  filename: string;
  mipmaps: Mipmap[];
};

export type Material = {
  id: number;
  filename: string;
  textures: Texture[];
};

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

export type Mesh = {
  vertices: Vertex[];
  indices: number[];
  uvs: UV[];
};

export type Object = {
  position: Vertex;
  scale: Vertex;
  meshes: Mesh[];
  material_id: number;
};

export type Scene = {
  materials: Material[];
  objects: Object[];
};
