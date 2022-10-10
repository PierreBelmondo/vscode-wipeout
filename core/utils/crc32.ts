export function crc32(s: string, polynomial = 0x04c11db7, initialValue = 0, finalXORValue = 0xffffffff): number {
  let crc = initialValue;
  let table: number[] = [];
  let i: number;
  let j: number;

  function reflect(x: number, n: number) {
    let b = 0;
    while (n) {
      b = b * 2 + (x % 2);
      x = Math.floor(x / 2);
      n--;
    }
    return b;
  }

  for (i = 0; i < 256; i++) {
    table[i] = reflect(i, 8) * (1 << 24);
    for (j = 0; j < 8; j++) {
      table[i] = ((table[i] * 2) ^ (((table[i] >>> 31) % 2) * polynomial)) >>> 0;
    }
    table[i] = reflect(table[i], 32);
  }

  for (i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 255)
      throw new RangeError();
    j = crc % 256 ^ s.charCodeAt(i);
    crc = ((crc >>> 8) ^ table[j]) >>> 0;
  }

  return (crc ^ finalXORValue) >>> 0;
}
