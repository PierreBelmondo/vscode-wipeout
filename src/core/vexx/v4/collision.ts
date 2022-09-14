import { BufferRange } from "../../../core/range";
import { Flat } from "../flat";
import { VexxNode } from "../node";
import { Vexx4NodeType } from "./type";

class Points {
  range = new BufferRange();

  type = 0;
  pointSize = 0;
  pointsCount = 0;
  points: Uint16Array | Float32Array | null = null;

  load(range: BufferRange) {
    this.type = range.getUint32(0);
    this.pointSize = range.getUint16(4);
    this.pointsCount = range.getUint16(6);

    this.range = range.slice(0, 8 + this.pointSize * this.pointsCount);

    switch (this.type) {
      case 1: // pointSize=12 (vertices)
        let vs = [] as number[];
        for (let i = 0; i < this.pointsCount * 3; i++) {
          const v = this.range.getFloat32(8 + i * 4);
          vs.push(v);
        }
        this.points = new Float32Array(vs);
        break;

      case 3: // pointSize=4 (normals?)
        break;

      case 2: // pointSize=6 (indices)
        let ps = [] as number[];
        for (let i = 0; i < this.pointsCount * 3; i++) {
          const p = this.range.getUint16(8 + i * 2);
          ps.push(p);
        }
        this.points = new Uint16Array(ps);
        break;
    }
  }
}

class Block {
  range = new BufferRange();

  blockCount = 0;
  blocks: Points[] = [];

  load(range: BufferRange) {
    this.blockCount = range.getUint32(0);

    let blockRange = range.slice(4);
    for (let i = 0; i < this.blockCount; i++) {
      const block = new Points();
      block.load(blockRange);
      this.blocks.push(block);
      blockRange = blockRange.slice(block.range.size);
    }

    let size = 4;
    for (const block of this.blocks) size += block.range.size;

    this.range = range.slice(0, size);
  }

  export(): null | Flat.MeshChunk {
    if (this.blocks.length != 3) return null;
    if (this.blocks[0].points == null) return null;
    if (this.blocks[2].points == null) return null;

    const positions = [] as number[];
    for (const index of this.blocks[2].points) {
      const points = this.blocks[0].points;
      positions.push(points[index * 3 + 0]);
      positions.push(points[index * 3 + 1]);
      positions.push(points[index * 3 + 2]);
    }

    return {
      texture: 0,
      mode: "TRIANGLES",
      positions,
    };
  }
}

abstract class VexxNodeCollision extends VexxNode {
  signature = 0xffffff;
  blockCount = 0;

  blocks: Block[] = [];

  load(range: BufferRange) {
    this.signature = range.getUint32(0);
    this.blockCount = range.getUint32(4);

    let blockRange = range.slice(8);
    for (let i = 0; i < this.blockCount; i++) {
      const block = new Block();
      block.load(blockRange);
      this.blocks.push(block);
      blockRange = blockRange.slice(block.range.size);
    }
  }

  protected genericExport(
    name: "FLOOR_COLLISION" | "WALL_COLLISION" | "RESET_COLLISION"
  ): Flat.Node {
    const node: Flat.Node = {
      type: name,
      name: this.name,
      chunks: [],
    };

    for (const block of this.blocks) {
      const chunk = block.export();
      if (chunk !== null) node.chunks.push(chunk);
    }

    return node;
  }
}

export class VexxNodeFloorCollision extends VexxNodeCollision {
  constructor() {
    super(Vexx4NodeType.FLOOR_COLLISION);
  }

  export(): Flat.Node {
    return this.genericExport("FLOOR_COLLISION");
  }
}

export class VexxNodeWallCollision extends VexxNodeCollision {
  constructor() {
    super(Vexx4NodeType.WALL_COLLISION);
  }

  export(): Flat.Node {
    return this.genericExport("WALL_COLLISION");
  }
}

export class VexxNodeResetCollision extends VexxNodeCollision {
  constructor() {
    super(Vexx4NodeType.RESET_COLLISION);
  }

  export(): Flat.Node {
    return this.genericExport("RESET_COLLISION");
  }
}
