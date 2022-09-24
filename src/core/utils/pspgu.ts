// See https://github.com/pspdev/pspsdk/blob/master/src/gu/GU.h

export namespace GU {
  export enum PrimitiveType {
    POINTS = 0,
    LINES = 1,
    LINE_STRIP = 2,
    TRIANGLES = 3,
    TRIANGLE_STRIP = 4,
    TRIANGLE_FAN = 5,
    SPRITES = 6,
  }

  export enum States {
    ALPHA_TEST = 0,
    DEPTH_TEST = 1,
    SCISSOR_TEST = 2,
    STENCIL_TEST = 3,
    BLEND = 4,
    CULL_FACE = 5,
    DITHER = 6,
    FOG = 7,
    CLIP_PLANES = 8,
    TEXTURE_2D = 9,
    LIGHTING = 10,
    LIGHT0 = 11,
    LIGHT1 = 12,
    LIGHT2 = 13,
    LIGHT3 = 14,
    LINE_SMOOTH = 15,
    PATCH_CULL_FACE = 16,
    COLOR_TEST = 17,
    COLOR_LOGIC_OP = 18,
    FACE_NORMAL_REVERSE = 19,
    PATCH_FACE = 20,
    FRAGMENT_2X = 21,
  }

  export enum Modes {
    PROJECTION = 0,
    VIEW = 1,
    MODEL = 2,
    TEXTURE = 3,
  }

  /* Vertex Declarations */
  export const TEXTURE_BIT = 0;
  export const TEXTURE_SHIFT = (n: number) => n << TEXTURE_BIT;
  export const TEXTURE_8BIT = TEXTURE_SHIFT(1);
  export const TEXTURE_16BIT = TEXTURE_SHIFT(2);
  export const TEXTURE_32BITF = TEXTURE_SHIFT(3);
  export const TEXTURE_BITS = TEXTURE_SHIFT(3);

  export const COLOR_BIT = 2;
  export const COLOR_SHIFT = (n: number) => n << COLOR_BIT;
  export const COLOR_5650 = COLOR_SHIFT(4);
  export const COLOR_5551 = COLOR_SHIFT(5);
  export const COLOR_4444 = COLOR_SHIFT(6);
  export const COLOR_8888 = COLOR_SHIFT(7);
  export const COLOR_BITS = COLOR_SHIFT(7);

  export const NORMAL_BIT = 5;
  export const NORMAL_SHIFT = (n: number) => n << NORMAL_BIT;
  export const NORMAL_8BIT = NORMAL_SHIFT(1);
  export const NORMAL_16BIT = NORMAL_SHIFT(2);
  export const NORMAL_32BITF = NORMAL_SHIFT(3);
  export const NORMAL_BITS = NORMAL_SHIFT(3);

  export const VERTEX_BIT = 7;
  export const VERTEX_SHIFT = (n: number) => n << VERTEX_BIT;
  export const VERTEX_8BIT = VERTEX_SHIFT(1);
  export const VERTEX_16BIT = VERTEX_SHIFT(2);
  export const VERTEX_32BITF = VERTEX_SHIFT(3);
  export const VERTEX_BITS = VERTEX_SHIFT(3);

  export const WEIGHT_BIT = 9;
  export const WEIGHT_SHIFT = (n: number) => n << WEIGHT_BIT;
  export const WEIGHT_8BIT = WEIGHT_SHIFT(1);
  export const WEIGHT_16BIT = WEIGHT_SHIFT(2);
  export const WEIGHT_32BITF = WEIGHT_SHIFT(3);
  export const WEIGHT_BITS = WEIGHT_SHIFT(3);

  export const INDEX_BIT = 11;
  export const INDEX_SHIFT = (n: number) => n << INDEX_BIT;
  export const INDEX_8BIT = INDEX_SHIFT(1);
  export const INDEX_16BIT = INDEX_SHIFT(2);
  export const INDEX_BITS = INDEX_SHIFT(3);

  export const WEIGHTS_BIT = 14;
  export const WEIGHTS = (n: number) => ((n - 1) & 7) << WEIGHTS_BIT;
  export const WEIGHTS_BITS = WEIGHTS(8);

  export const VERTICES_BIT = 18;
  export const VERTICES = (n: number) => ((n - 1) & 7) << VERTICES_BIT;
  export const VERTICES_BITS = VERTICES(8);

  const TRANSFORM_SHIFT = (n: number) => n << 23;
  export const TRANSFORM_3D = TRANSFORM_SHIFT(0);
  export const TRANSFORM_2D = TRANSFORM_SHIFT(1);
  export const TRANSFORM_BITS = TRANSFORM_SHIFT(1);

  export enum PixelFormat {
    PSM_5650 = 0 /* Display, Texture, Palette */,
    PSM_5551 = 1 /* Display, Texture, Palette */,
    PSM_4444 = 2 /* Display, Texture, Palette */,
    PSM_8888 = 3 /* Display, Texture, Palette */,
    PSM_T4 = 4 /* Texture */,
    PSM_T8 = 5 /* Texture */,
    PSM_T16 = 6 /* Texture */,
    PSM_T32 = 7 /* Texture */,
    PSM_DXT1 = 8 /* Texture */,
    PSM_DXT3 = 9 /* Texture */,
    PSM_DXT5 = 10 /* Texture */,
  }

  export enum SplineMode {
    FILL_FILL = 0,
    OPEN_FILL = 1,
    FILL_OPEN = 2,
    OPEN_OPEN = 3,
  }

  export enum ShadingModel {
    FLAT = 0,
    SMOOTH = 1,
  }

  export enum LogicalOperation {
    CLEAR = 0,
    AND = 1,
    AND_REVERSE = 2,
    COPY = 3,
    AND_INVERTED = 4,
    NOOP = 5,
    XOR = 6,
    OR = 7,
    NOR = 8,
    EQUIV = 9,
    INVERTED = 10,
    OR_REVERSE = 11,
    COPY_INVERTED = 12,
    OR_INVERTED = 13,
    NAND = 14,
    SET = 15,
  }

  export enum TextureFilter {
    NEAREST = 0,
    LINEAR = 1,
    NEAREST_MIPMAP_NEAREST = 4,
    LINEAR_MIPMAP_NEAREST = 5,
    NEAREST_MIPMAP_LINEAR = 6,
    LINEAR_MIPMAP_LINEAR = 7,
  }

  export enum TextureMapMode {
    TEXTURE_COORDS = 0,
    TEXTURE_MATRIX = 1,
    ENVIRONMENT_MAP = 2,
  }

  export enum TextureLevelMode {
    TEXTURE_AUTO = 0,
    TEXTURE_CONST = 1,
    TEXTURE_SLOPE = 2,
  }

  export enum TextureProjectionMapMode {
    POSITION = 0,
    UV = 1,
    NORMALIZED_NORMAL = 2,
    NORMAL = 3,
  }

  export enum WrapMode {
    REPEAT = 0,
    CLAMP = 1,
  }

  export enum FrontFaceDirection {
    CW = 0,
    CCW = 1,
  }

  export enum TestFunction {
    NEVER = 0,
    ALWAYS = 1,
    EQUAL = 2,
    NOTEQUAL = 3,
    LESS = 4,
    LEQUAL = 5,
    GREATER = 6,
    GEQUAL = 7,
  }

  export enum ClearBufferMask {
    COLOR_BUFFER_BIT = 1,
    STENCIL_BUFFER_BIT = 2,
    DEPTH_BUFFER_BIT = 4,
    FAST_CLEAR_BIT = 16,
  }

  export enum TextureEffect {
    TFX_MODULATE = 0,
    TFX_DECAL = 1,
    TFX_BLEND = 2,
    TFX_REPLACE = 3,
    TFX_ADD = 4,
  }

  export enum TextureColorComponent {
    TCC_RGB = 0,
    TCC_RGBA = 1,
  }

  export enum BlendingOp {
    ADD = 0,
    SUBTRACT = 1,
    REVERSE_SUBTRACT = 2,
    MIN = 3,
    MAX = 4,
    ABS = 5,
  }

  export enum BlendingFactor {
    SRC_COLOR = 0,
    ONE_MINUS_SRC_COLOR = 1,
    SRC_ALPHA = 2,
    ONE_MINUS_SRC_ALPHA = 3,
    DST_COLOR = 0,
    ONE_MINUS_DST_COLOR = 1,
    DST_ALPHA = 4,
    ONE_MINUS_DST_ALPHA = 5,
    FIX = 10,
  }

  export enum StencilOperation {
    KEEP = 0,
    ZERO = 1,
    REPLACE = 2,
    INVERT = 3,
    INCR = 4,
    DECR = 5,
  }

  export enum LightComponents {
    AMBIENT = 1,
    DIFFUSE = 2,
    SPECULAR = 4,
    AMBIENT_AND_DIFFUSE = AMBIENT | DIFFUSE,
    DIFFUSE_AND_SPECULAR = DIFFUSE | SPECULAR,
    UNKNOWN_LIGHT_COMPONENT = 8,
  }

  export enum Lightmodes {
    SINGLE_COLOR = 0,
    SEPARATE_SPECULAR_COLOR = 1,
  }

  export enum LightType {
    DIRECTIONAL = 0,
    POINTLIGHT = 1,
    SPOTLIGHT = 2,
  }

  export enum Context {
    DIRECT = 0,
    CALL = 1,
    SEND = 2,
  }

  export enum ListQueue {
    TAIL = 0,
    HEAD = 1,
  }

  export enum SyncBehaviorMode {
    SYNC_FINISH = 0,
    SYNC_SIGNAL = 1,
    SYNC_DONE = 2,
    SYNC_LIST = 3,
    SYNC_SEND = 4,
  }

  export enum SyncBehavior {
    SYNC_WAIT = 0,
    SYNC_NOWAIT = 1,
  }

  export enum SyncWhat {
    SYNC_WHAT_DONE = 0,
    SYNC_WHAT_QUEUED = 1,
    SYNC_WHAT_DRAW = 2,
    SYNC_WHAT_STALL = 3,
    SYNC_WHAT_CANCEL = 4,
  }

  export enum Signals {
    CALLBACK_SIGNAL = 1,
    CALLBACK_FINISH = 4,
  }

  export enum SignalBehavior {
    BEHAVIOR_SUSPEND = 1,
    BEHAVIOR_CONTINUE = 2,
  }

  /* Color Macros, maps 8 bit unsigned channels into one 32-bit value */
  export function ABGR(a: number, b: number, g: number, r: number) {
    return (a << 24) | (b << 16) | (g << 8) | r;
  }
  export function ARGB(a: number, r: number, g: number, b: number) {
    return ABGR(a, b, g, r);
  }
  export function RGBA(r: number, g: number, b: number, a: number) {
    return ARGB(a, r, g, b);
  }

  /* Color Macro, maps floating point channels (0..1) into one 32-bit value */
  export function GU_COLOR(r: number, g: number, b: number, a: number) {
    RGBA(Math.floor(r * 255.0), Math.floor(g * 255.0), Math.floor(b * 255.0), Math.floor(a * 255.0));
  }

  type AttributeInfo = {
    type: number;
    size: number;
    offset: number;
    padding: number;
    count: number;
  };

  type StideInfo = {
    texture: AttributeInfo;
    color: AttributeInfo;
    normal: AttributeInfo;
    vertex: AttributeInfo;
    /*
    weight: AttributeInfo;
    index: AttributeInfo;
    */
  };

  /**
   * C CC CCC   BBB   BB BB BA AA AAA AA
   * 0 .. 000 . 000 . 00 00 00 00 000 00
   * |    |     |     |  |  |  |  |   +-- texture
   * |    |     |     |  |  |  |  +------ color
   * |    |     |     |  |  |  +--------- normal
   * |    |     |     |  |  +------------ vertex
   * |    |     |     |  +--------------- weigth
   * |    |     |     +------------------ index
   * |    |     +------------------------ weights(n)
   * |    +------------------------------ vertex(n)
   * +----------------------------------- transform
   */
  export function strideInfo(vtxdef: number): StideInfo {
    const textureBits = (vtxdef & TEXTURE_BITS) >> 0;
    const texture = {
      padding: 0,
      type: textureBits,
      size: textureBits == 0 ? 0 : textureBits == 3 ? 4 : textureBits,
      offset: 0,
      count: 2,
    };
    const textureEnd = texture.offset + texture.size * texture.count;

    const colorBits = (vtxdef & COLOR_BITS) >> 2;
    const colorSize = colorBits == 0 ? 0 : colorBits == 7 ? 4 : 2;
    let colorPadding = 0;
    if (colorSize > 1) colorPadding = textureEnd % colorSize == 0 ? 0 : colorSize - (textureEnd % colorSize);
    const color = {
      padding: colorPadding,
      type: colorBits,
      size: colorSize,
      offset: textureEnd + colorPadding,
      count: 1,
    };
    const colorEnd = color.offset + color.size * color.count;

    const normalBits = (vtxdef & NORMAL_BITS) >> 5;
    const normalSize = normalBits == 0 ? 0 : normalBits == 3 ? 4 : normalBits;
    let normalPadding = 0;
    if (normalSize > 1) normalPadding = colorEnd % normalSize == 0 ? 0 : normalSize - (colorEnd % normalSize);
    const normal = {
      padding: normalPadding,
      type: normalBits,
      size: normalSize,
      offset: colorEnd + normalPadding,
      count: 3,
    };
    const normalEnd = normal.offset + normal.size * normal.count;

    const vertexBits = (vtxdef & VERTEX_BITS) >> 7;
    const vertexSize = vertexBits == 0 ? 0 : vertexBits == 3 ? 4 : vertexBits;
    const vertexCount = (vtxdef & VERTICES_BITS) >> 18;
    let vertexPadding = 0;
    if (vertexSize > 1) vertexPadding = normalEnd % vertexSize == 0 ? 0 : vertexSize - (normalEnd % vertexSize);
    const vertex = {
      padding: vertexPadding,
      type: vertexBits,
      size: vertexSize,
      offset: normalEnd + vertexPadding,
      count: vertexCount != 0 ? vertexCount : vertexSize == 0 ? 0 : 3,
    };
    const vertexEnd = vertex.offset + vertex.size * vertex.count;

    /*
    const weightBits = (vtxdef & (0x3 << 9)) >> 9;
    const weightSize = weightBits == 0 ? 0 : weightBits == 3 ? 4 : weightBits;
    const weightsCount = (vtxdef & (0x7 << 14)) >> 14;
    let weigthPadding = 0;
    if (weightSize > 1) weigthPadding = vertexEnd % weightSize == 0 ? 0 : weightSize - (vertexEnd % weightSize);
    const weight = {
      padding: weigthPadding,
      type: weightBits,
      size: weightSize,
      offset: vertexEnd + weigthPadding,
      count: weightsCount,
    };
    const weightEnd = weight.offset + weight.size * weight.count;

    const indexBits = (vtxdef & (0x3 << 11)) >> 11;
    const indexSize = indexBits == 0 ? 0 : indexBits == 3 ? 4 : indexBits;
    let indexPadding = 0;
    if (indexSize > 1) indexPadding = weightEnd % indexSize == 0 ? 0 : weightSize - (weightEnd % indexSize);
    const index = {
      padding: indexPadding,
      type: indexBits,
      size: indexSize,
      offset: weightEnd + indexPadding,
      count: 1,
    };
    */
    return { texture, color, normal, vertex /*, weight, index*/ };
  }

  export function strideSize(vtxdef: number, align: number): number {
    const strideInfo = GU.strideInfo(vtxdef);
    let size = strideInfo.vertex.offset + strideInfo.vertex.size * strideInfo.vertex.count;
    //let size = this.strideInfo.index.offset + this.strideInfo.index.size * this.strideInfo.index.count;
    if (align > 1) size += size % align == 0 ? 0 : align - (size % align);
    return size;
  }
}
