import { crc32 } from "@core/utils/crc32";

if (process.argv.length != 3) {
}

console.log(process.argv[2]);
console.log(crc32(process.argv[2].replace("\\", "/").toLowerCase()).toString(16));
