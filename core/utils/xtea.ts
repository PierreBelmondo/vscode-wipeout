/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Sebastian Smyczynski, Simplito Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const ROUNDS = 32;
const DELTA = 0x9e3779b9;

/* XXX: Make this configurable
const R32 = Buffer.prototype.readUInt32BE;
const W32 = Buffer.prototype.writeUInt32BE;
*/
const R32 = Buffer.prototype.readUInt32LE;
const W32 = Buffer.prototype.writeUInt32LE;

type Method = (v: Uint32Array, k: Uint32Array, rounds: number) => void;

function encipher(v: Uint32Array, k: Uint32Array, rounds: number) {
  let y = v[0];
  let z = v[1];
  let sum = 0;
  let limit = (DELTA * rounds) >>> 0;

  while (sum !== limit) {
    y += ((((z << 4) >>> 0) ^ (z >>> 5)) + z) ^ (sum + k[sum & 3]);
    y = y >>> 0;
    sum = (sum + DELTA) >>> 0;
    z += ((((y << 4) >>> 0) ^ (y >>> 5)) + y) ^ (sum + k[(sum >>> 11) & 3]);
    z = z >>> 0;
  }
  v[0] = y;
  v[1] = z;
}

function decipher(v: Uint32Array, k: Uint32Array, rounds: number) {
  let y = v[0];
  let z = v[1];
  let sum = (DELTA * rounds) >>> 0;

  while (sum) {
    z -= ((((y << 4) >>> 0) ^ (y >>> 5)) + y) ^ (sum + k[(sum >> 11) & 3]);
    z = z >>> 0;
    sum = (sum - DELTA) >>> 0;
    y -= ((((z << 4) >>> 0) ^ (z >>> 5)) + z) ^ (sum + k[sum & 3]);
    y = y >>> 0;
  }
  v[0] = y;
  v[1] = z;
}

type MethodIV = (v: Uint32Array, k: Uint32Array, iv: Uint32Array, rounds: number) => void;

function encipher_ecb(v: Uint32Array, k: Uint32Array, _iv: Uint32Array, rounds: number) {
  encipher(v, k, rounds);
}

function decipher_ecb(v: Uint32Array, k: Uint32Array, _iv: Uint32Array, rounds: number) {
  decipher(v, k, rounds);
}

function encipher_cbc(v: Uint32Array, k: Uint32Array, iv: Uint32Array, rounds: number) {
  v[0] ^= iv[0];
  v[1] ^= iv[1];
  encipher(v, k, rounds);
  iv[0] = v[0];
  iv[1] = v[1];
}

function decipher_cbc(v: Uint32Array, k: Uint32Array, iv: Uint32Array, rounds: number) {
  let tmp = new Uint32Array(v);
  decipher(v, k, rounds);
  v[0] ^= iv[0];
  v[1] ^= iv[1];
  iv[0] = tmp[0];
  iv[1] = tmp[1];
}

function encipher_ctr(v: Uint32Array, k: Uint32Array, iv: Uint32Array, rounds: number) {
  let tmp = new Uint32Array(iv);
  encipher(tmp, k, rounds);
  v[0] ^= tmp[0];
  v[1] ^= tmp[1];
  iv[1] = iv[1] + 1;
}

function decipher_ctr(v: Uint32Array, k: Uint32Array, iv: Uint32Array, rounds: number) {
  let tmp = new Uint32Array(iv);
  encipher(tmp, k, rounds);
  v[0] ^= tmp[0];
  v[1] ^= tmp[1];
  iv[1] = iv[1] + 1;
}

function doBlock(method: Method, block: Buffer, key: Buffer, rounds: number = ROUNDS) {
  let k = new Uint32Array(4);
  let v = new Uint32Array(2);
  let out = Buffer.allocUnsafe(8);

  for (let i = 0; i < 4; ++i) {
    k[i] = R32.call(key, i * 4);
  }
  v[0] = R32.call(block, 0);
  v[1] = R32.call(block, 4);

  method(v, k, rounds);

  W32.call(out, v[0], 0);
  W32.call(out, v[1], 4);

  return out;
}

type Mode = "ecb" | "cbc" | "ctr";

const MODES = {
  ecb: { encrypt: encipher_ecb, decrypt: decipher_ecb },
  cbc: { encrypt: encipher_cbc, decrypt: decipher_cbc },
  ctr: { encrypt: encipher_ctr, decrypt: decipher_ctr },
};

function doBlocks(encryption: boolean, msg: Buffer, key: Buffer, mode?: Mode, iv?: Buffer, skippad?: boolean, rounds?: number) {
  if (!mode) mode = "ecb";
  if (!rounds) rounds = ROUNDS;

  if (!iv) {
    iv = Buffer.allocUnsafe(8);
    iv.fill(0);
  }

  let mode_ = MODES[mode];
  if (!mode_) throw new Error("Unimplemented mode: " + mode);

  let method: MethodIV = encryption ? mode_.encrypt : mode_.decrypt;
  let length = msg.length;
  let pad = 8 - (length & 7);

  if (skippad || !encryption) {
    if (pad !== 8) {
      throw new Error("Data not aligned to 8 bytes block boundary");
    }
    pad = 0;
  }

  let out = Buffer.allocUnsafe(length + pad);
  let k = new Uint32Array(4);
  let v = new Uint32Array(2);
  let _iv = new Uint32Array(2);

  _iv[0] = R32.call(iv, 0);
  _iv[1] = R32.call(iv, 4);

  for (let i = 0; i < 4; ++i) k[i] = R32.call(key, i * 4);

  let offset = 0;
  while (offset <= length) {
    if (length - offset < 8) {
      if (skippad || !encryption) {
        break;
      }

      let buf = Buffer.allocUnsafe(pad);
      buf.fill(pad);

      buf = Buffer.concat([msg.slice(offset), buf]);
      v[0] = R32.call(buf, 0);
      v[1] = R32.call(buf, 4);
    } else {
      v[0] = R32.call(msg, offset);
      v[1] = R32.call(msg, offset + 4);
    }

    method(v, k, _iv, rounds);

    W32.call(out, v[0], offset);
    W32.call(out, v[1], offset + 4);
    offset += 8;
  }

  if (skippad || encryption) return out;

  let pad2 = out[out.length - 1];
  return out.slice(0, out.length - pad2);
}

/**
 * Encrypts single block of data using XTEA cipher.
 *
 * @param {Buffer} block  64-bit (8-bytes) block of data to encrypt
 * @param {Buffer} key    128-bit (16-bytes) encryption key
 * @returns {Buffer}      64-bit of encrypted block
 */
export function encryptBlock(block: Buffer, key: Buffer): Buffer {
  return doBlock(encipher, block, key);
}

/**
 * Decrypts single block of data using XTEA cipher.
 *
 * @param {Buffer} block  64-bit (8-bytes) block of data to encrypt
 * @param {Buffer} key    128-bit (16-bytes) encryption key
 * @returns {Buffer}      64-bit of encrypted block
 */
export function decryptBlock(block: Buffer, key: Buffer): Buffer {
  return doBlock(decipher, block, key);
}

/**
 * Encrypts data using XTEA cipher using specified block cipher mode of operation
 * and PKCS#7 padding.
 *
 * @param {Buffer} msg         Message to encrypt
 * @param {Buffer} key         128-bit encryption key (16 bytes)
 * @param {Mode} [mode=ecb]    Block cipher mode of operation (currently only 'ecb' or 'cbc' or 'ctr')
 * @param {Buffer} [iv]        Optional IV
 * @param {boolean} [skippad]  Skip PKCS#7 padding postprocessing
 * @param {number} [rounds]    Number of rounds
 * @returns {Buffer}
 */
export function encrypt(msg: Buffer, key: Buffer, mode: Mode, iv: Buffer, skippad: boolean, rounds: number = ROUNDS): Buffer {
  return doBlocks(true, msg, key, mode, iv, skippad, rounds);
}

/**
 * Decrypts data using XTEA cipher using specified block cipher mode of operation
 * and PKCS#7 padding.
 *
 * @param {Buffer} msg         Ciphertext to decrypt
 * @param {Buffer} key         128-bit encryption key (16 bytes)
 * @param {Mode} [mode=ecb]    Block cipher mode of operation (currently only 'ecb' or 'cbc' or 'ctr')
 * @param {Buffer} [iv]        Optional IV
 * @param {boolean} [skippad]  Skip PKCS#7 padding postprocessing
 * @param {number} [rounds]    Number of rounds
 * @returns {Buffer}
 */
export function decrypt(msg: Buffer, key: Buffer, mode?: Mode, iv?: Buffer, skippad?: boolean, rounds: number = ROUNDS): Buffer {
  return doBlocks(false, msg, key, mode, iv, skippad, rounds);
}
