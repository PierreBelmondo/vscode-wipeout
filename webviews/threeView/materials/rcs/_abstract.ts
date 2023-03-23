
export type MaterialFactory = {
  name: string;
  minTextures: number;
  maxTextures: number;
  make: (textures: THREE.Texture[]) => THREE.Material;
};
