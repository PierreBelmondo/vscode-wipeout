/*
 * WipEout Pure DLC Region Converter
 * Copyright 2021 Thomas Perl <m@thp.io>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 *
 * See also: https://github.com/thp/wipeout-pure-dlc2dlc/blob/master/dlc2dlc.c
 */

import { decrypt } from "@core/utils/xtea";
import { DLC_KEYS } from "./dlc_keys";

const SIG_SIZE = 256;

export function xtea8_ctr_bruteforce(buffer: Buffer): { serial: string; key: string } | null {
  for (const dk of DLC_KEYS) {
    const testbuf = xtea8_ctr_decrypt(buffer, dk.key);
    if (testbuf.length > 4 && testbuf.readUint32LE(0) == 1) {
      console.log(`Found matching key ${dk.serial}`);
      return dk;
    }
  }
  return null;
}

export function xtea8_ctr_decrypt(buffer: Buffer, key: string): Buffer {
  const k = Buffer.from(key, "ascii");
  const iv = Buffer.alloc(8);
  iv.writeInt32LE(0x12345678, 0);
  return decrypt(buffer, k, "ctr", iv, false, 8);
}
