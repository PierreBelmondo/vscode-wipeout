import { getEnabledCategories } from "trace_events";
import { GU } from "../src/core/utils/pspgu";

if (process.argv.length != 3) {
  console.error("Usage: ts-node pspgu.ts <vtxdef>");
  process.exit();
}

const arg = process.argv[2];

let vtxdef = 0;
if (arg.startsWith("0x")) vtxdef = parseInt(arg.slice(2), 16);
else vtxdef = parseInt(arg);

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

const bin = vtxdef.toString(2);
const hex = vtxdef.toString(16).toUpperCase();

console.log(`VTXDEF = ${vtxdef.toString(10)} = 0x${hex} = ${bin}`);

function pad(n: string, width: number) {
  return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
}

const debug = pad(bin, 24);

const texture = (vtxdef & GU.TEXTURE_BITS) >> GU.TEXTURE_BIT;
const color = (vtxdef & GU.COLOR_BITS) >> GU.COLOR_BIT;
const normal = (vtxdef & GU.NORMAL_BITS) >> GU.NORMAL_BIT;
const vertex = (vtxdef & GU.VERTEX_BITS) >> GU.VERTEX_BIT;
const weight = (vtxdef & GU.WEIGHT_BITS) >> GU.WEIGHT_BIT;
const index = (vtxdef & GU.INDEX_BITS) >> GU.INDEX_BIT;
const weights = (vtxdef & GU.WEIGHTS_BITS) >> GU.WEIGHTS_BIT;
const vertices = (vtxdef & GU.VERTICES_BITS) >> GU.VERTICES_BIT;

const bin_texture = pad(texture.toString(2), 2);
const bin_color = pad(color.toString(2), 3);
const bin_normal = pad(normal.toString(2), 2);
const bin_vertex = pad(vertex.toString(2), 2);
const bin_weight = pad(weight.toString(2), 2);
const bin_index = pad(index.toString(2), 2);
const bin_weights = pad(weights.toString(2), 3);
const bin_vertices = pad(vertices.toString(2), 3);

console.log(`${bin_vertices} ${bin_weights} ${bin_index} ${bin_weight} ${bin_vertex} ${bin_normal} ${bin_color} ${bin_texture}`);
console.log('  |   |  |  |  |  |   |  |');
console.log(`  |   |  |  |  |  |   |  +--- texture    = ${texture}`);
console.log(`  |   |  |  |  |  |   +------ color      = ${color}`);
console.log(`  |   |  |  |  |  +---------- normal     = ${normal}`);
console.log(`  |   |  |  |  +------------- vertex     = ${vertex}`);
console.log(`  |   |  |  +---------------- weigth     = ${weight}`);
console.log(`  |   |  +------------------- index      = ${index}`);
console.log(`  |   +---------------------- weights(n) = ${weights}`);
console.log(`  +-------------------------- vertex(n)  = ${vertices}`);

const strideInfo = GU.strideInfo(vtxdef);
const strideSize = GU.strideSize(vtxdef, 4);
console.log(strideInfo);
console.log(strideSize);
