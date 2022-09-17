export namespace Flat {
  export type Vector3 = {
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

  export type AABB = {
    min: Vector3;
    max: Vector3;
  };

  export type Attributes = {
    type:
      | "Int8"
      | "Uint8"
      | "Int16"
      | "Uint16"
      | "Int32"
      | "Uint32"
      | "Float32";
    size: 1 | 2 | 3 | 4;
    data: number[];
  };

  export type MeshChunk = {
    texture: number;
    mode:
      | "POINTS"
      | "LINES"
      | "LINE_STRIP"
      | "TRIANGLES"
      | "TRIANGLE_STRIP"
      | "TRIANGLE_FAN"
      | "SPRITES"
      | "UNKNOWN";
    positions?: number[];
    normals?: number[];
    uvs?: Attributes;
    colors?: Uint8Array;
  };

  export type Node =
    | {
        type: string;
        name: string;
        children: Node[];
      }
    | {
        type: "MESH" | "SKYCUBE";
        name: string;
        aabb: AABB;
        chunks: MeshChunk[];
      }
    | {
        type: "FLOOR_COLLISION" | "WALL_COLLISION" | "RESET_COLLISION";
        name: string;
        chunks: MeshChunk[];
      }
    | {
        type: "TRANSFORM";
        name: string;
        children: Node[];
        matrix: number[];
      }
    | {
        type: "TEXTURE";
        name: string;
        id: number;
        width: number;
        height: number;
        bpp: number;
        format: number;
        alphaMode: number;
        alphaTest: number;
        diffuse: RGBA;
        rgba: number[];
      }
    | {
        type:
          | "SHIP_COLLISION_FX"
          | "SHIP_MUZZLE"
          | "ENGINE_FLARE"
          | "ENGINE_FIRE"
          | "TRAIL";
        name: string;
        matrix: number[];
      }
    | {
        type: "CAMERA" | "SOUND";
        name: string;
      }
    | {
        type: "START_POSITION";
        name: string;
        matrix: number[];
      }
}
