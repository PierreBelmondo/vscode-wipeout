
export type MaterialFactory = {
  name: string;
  textures: number;
  make: (textures: THREE.Texture[]) => THREE.Material;
};
