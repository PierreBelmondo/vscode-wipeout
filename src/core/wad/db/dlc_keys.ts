/*
 * WipEout Pure DLC Keys
 * Copyright 2021 Thomas Perl <m@thp.io>
 *
 * Permission to usecopymodifyand/or distribute this software for any
 * purpose with or without fee is hereby grantedprovided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIALDIRECT,
 * INDIRECTOR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USEDATA OR PROFITSWHETHER IN AN ACTION OF CONTRACTNEGLIGENCE OR
 * OTHER TORTIOUS ACTIONARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 * 
 * See also: https://github.com/thp/wipeout-pure-dlc2dlc/blob/master/keys.txt
 */

/*
 * Each DLC has a unique encryption key that is stored in the
 * 256-byte signature at the end of the file. This signature is
 * encrypted with a region-specific key embedded in BOOT.BIN.
 */
export const DLC_KEYS = [
  {
    serial: "UCES00001DA7MUSIC",
    key: "\x7e\x0d\x06\xda\x8c\x7e\x01\xf8\xe0\x4e\xe2\x0f\x65\x48\x58\x06",
  },
  {
    serial: "UCES00001DCLASSICMPAK1",
    key: "\x6b\x90\x98\xeb\xcd\x93\x65\x9d\xee\xbe\x40\x02\xa2\x95\x91\xc4",
  },
  {
    serial: "UCES00001DCLASSICMPAK2",
    key: "\x73\xe3\x51\xf5\x3f\x5c\x01\xe1\x82\x8d\xbe\x6e\xf2\x72\x80\x48",
  },
  {
    serial: "UCES00001DCLASSICPAK1",
    key: "\xc4\x57\x66\x5e\xf9\x6a\xb5\x21\xfc\x3a\xdc\x21\x94\x5b\xcc\x5a",
  },
  {
    serial: "UCES00001DCLASSICPAK2",
    key: "\x11\x35\x49\xd5\x6f\x7c\x10\x2e\x59\xd8\xcd\x4e\xff\xb5\x5d\xaa",
  },
  {
    serial: "UCES00001DDELTAPAK",
    key: "\x5e\xf5\xef\x90\x4c\xa4\x80\x91\x78\xc2\xd3\x63\xa5\x9e\x2c\xb4",
  },
  {
    serial: "UCES00001DGAMESRADAR",
    key: "\x66\x0b\x15\xca\x95\xee\xe5\x47\x91\x21\x0a\xee\x9f\x0d\x63\x47",
  },
  {
    serial: "UCES00001DGAMMAPAK",
    key: "\x10\x70\x53\xaf\xaa\xd9\x76\x88\x72\x3e\x13\xcb\xf1\x19\xa4\xcb",
  },
  {
    serial: "UCES00001DMSCSLOT1",
    key: "\xb1\xa1\xed\xcb\xc9\x01\xaf\xe2\x70\x91\x01\x98\xcc\xe4\x4e\x45",
  },
  {
    serial: "UCES00001DOBLIVION",
    key: "\xfa\x8d\xa9\x35\x6e\x10\x7a\x39\xe1\x7c\x23\x22\xd9\x26\x7f\x36",
  },
  {
    serial: "UCES00001DOMEGAPAK",
    key: "\xfc\x00\x9f\x75\x4e\x85\x56\xa8\x28\x58\x12\x1b\x29\x0d\x9a\x50",
  },
  {
    serial: "UCES00001DOMEGAPAKS",
    key: "\x34\xa8\xfc\x8c\x24\x15\xb8\xf1\x79\x44\x3c\xa5\xb6\x5c\xd5\xb0",
  },
  {
    serial: "UCES00001DSCIFIPAK",
    key: "\xd8\xd2\x90\xc6\x80\x24\x22\x83\xe3\x69\x9e\x7d\x1c\x67\xba\x34",
  },
  {
    serial: "UCES00001DURBANBENELUX",
    key: "\x9e\xc8\xa9\xdc\xaa\x10\xe3\xd8\x4e\xe4\xef\x24\xb8\xa7\x4a\x10",
  },
  {
    serial: "UCES00001DURBANFRANCE",
    key: "\x55\x82\xe2\x27\x23\x00\xe3\xc4\x76\xf5\xe7\x8f\x9a\x6e\xed\xdf",
  },
  {
    serial: "UCES00001DURBANGERMANY",
    key: "\x45\x01\xaf\x33\xfe\xfb\x17\x33\x92\x58\xf0\xa1\xba\xf7\xf5\xe1",
  },
  {
    serial: "UCES00001DURBANITALY",
    key: "\xf1\xe3\x4c\x30\x28\xd9\xa5\x6c\xac\x9e\x99\x28\xba\x3a\x9c\x7c",
  },
  {
    serial: "UCES00001DURBANSPAIN",
    key: "\x9b\xa6\x67\xbd\x04\x9e\x67\x5d\x05\x35\xe0\xb8\x64\xaf\x37\x39",
  },
  {
    serial: "UCES00001DURBANUK",
    key: "\xc0\x0e\x4f\x0f\xec\x39\x94\x91\x77\xd8\xc1\x47\xb7\xc8\xd8\x65",
  },
  {
    serial: "UCES00001DVOCMUSIC",
    key: "\x8e\x7d\xd6\xcf\x1b\xd8\x66\xe1\x20\x9e\x7c\x5c\xd9\xe3\x66\x2e",
  },
  {
    serial: "UCJS10007DCLASSICPACK1",
    key: "\x0b\xcf\x8e\xff\xd1\x45\xef\xbc\x7e\x70\xf3\x40\x5b\x65\x12\x97",
  },
  {
    serial: "UCJS10007DCLASSICPACK2",
    key: "\x2b\xab\x0a\x02\xa0\x5c\xf3\x92\x0c\x9b\x4b\x1b\x92\xa8\xbf\xd9",
  },
  {
    serial: "UCJS10007DCLASSICPACK3",
    key: "\x16\xdb\x58\x45\x9e\x82\x7e\x3d\xce\x2f\x42\xa9\x28\xd1\xfe\xb6",
  },
  {
    serial: "UCJS10007DCLASSICPACK4",
    key: "\x82\x3a\x30\x7f\x99\xb9\xea\xd1\xda\x9f\x07\x7e\x98\x1d\xc0\x1b",
  },
  {
    serial: "UCJS10007DCOCACOLA1",
    key: "\x50\xc8\x48\x08\xa9\xb2\xaa\x35\x71\xfb\x71\x03\x8b\xcb\xba\x65",
  },
  {
    serial: "UCJS10007DCOCACOLA2",
    key: "\x47\x24\x1a\x28\x41\xbc\xe8\xed\x69\xa0\xfe\x8a\xfd\x9f\xf8\xa5",
  },
  {
    serial: "UCJS10007DCOCACOLA3",
    key: "\xb2\x84\xe7\xb9\x8a\x6e\x4a\xf5\x3a\xf5\xbc\x6b\xc7\xcc\xef\x4e",
  },
  {
    serial: "UCJS10007DCOCACOLA4",
    key: "\xe9\x80\xd4\x58\x76\x1f\x5d\xa0\x31\x8f\xfa\x38\x13\xbc\x3e\x52",
  },
  {
    serial: "UCJS10007DCOCACOLA5",
    key: "\x72\x1f\xff\xc4\xa1\xe7\x44\xbb\xcc\x19\x06\xc4\x7b\x68\x8d\x05",
  },
  {
    serial: "UCJS10007DCOCACOLA5S",
    key: "\x9c\x18\xa3\x30\x4b\xbc\xee\xfa\xe4\x3e\xb0\xfa\x62\x57\x6c\x02",
  },
  {
    serial: "UCJS10007DCOCACOLAS4",
    key: "\xe1\x48\x3f\x66\x9c\x1d\x58\xd3\xff\x34\xaa\xa1\xc9\xd2\x6a\x61",
  },
  {
    serial: "UCJS10007DCONTINUE",
    key: "\x95\xb7\xb7\xcf\xa6\xa3\x50\x88\x7c\x7b\x92\x75\x5e\x8a\x72\xf8",
  },
  {
    serial: "UCJS10007DDELTAPACK1",
    key: "\xfd\x68\xd4\x58\x84\x67\x73\x2b\xc5\xb4\xc4\xb0\xf3\x2d\x7c\xb4",
  },
  {
    serial: "UCJS10007DDELTAPACK2",
    key: "\x81\x2a\x70\x27\x8f\x8e\xe4\x30\x2f\x4d\xa2\xbe\x2d\xec\x4e\x39",
  },
  {
    serial: "UCJS10007DGAMMAPACK1",
    key: "\x6e\xd6\x71\xc6\x1a\xa8\x18\xcf\x4e\x32\x94\x8e\x9b\xde\xed\xf1",
  },
  {
    serial: "UCJS10007DGAMMAPACK2",
    key: "\xb9\xb6\x0f\x23\xb5\x37\xe9\xb1\xdf\x18\xf6\x86\x0b\x0a\xed\xc9",
  },
  {
    serial: "UCJS10007DGAMMAPACK3",
    key: "\x99\xfd\x32\x63\x25\xe0\x6e\xb3\x0c\x03\x04\x5b\x78\x86\x3d\x44",
  },
  {
    serial: "UCJS10007DWIRE05",
    key: "\x77\x7f\xa3\x31\x22\xf1\x2f\x76\x4b\xc6\x01\xae\x72\x8b\x81\x16",
  },
  {
    serial: "UCUS98612DCLASSICPACK1",
    key: "\x0b\x3c\x37\x5e\x6b\x0c\x5b\x28\x05\x27\x26\x03\xcf\x93\x2a\x8b",
  },
  {
    serial: "UCUS98612DCLASSICPACK2",
    key: "\xdf\x48\x75\x01\x2e\x23\x7d\x93\x94\x9f\x96\x87\xa1\x14\x82\x09",
  },
  {
    serial: "UCUS98612DCLASSICPACK3",
    key: "\x02\x86\x46\x8a\xcc\x83\xd2\xab\xaf\xae\xbf\x6f\x80\xf0\x87\xac",
  },
  {
    serial: "UCUS98612DDELTAPACK1",
    key: "\xaa\x3c\x8f\x73\x9e\xd7\x11\xfe\x7b\x6c\x03\xae\x0f\x0b\xdf\x4c",
  },
  {
    serial: "UCUS98612DDELTAPACK2",
    key: "\xfd\xf0\x0b\x1b\xad\x5b\xdc\x08\x9b\xeb\x45\x55\x75\x2d\x3a\x19",
  },
  {
    serial: "UCUS98612DGAMMAPACK1",
    key: "\xc9\xe5\xb9\xc9\x7b\x63\xa2\xb9\xb8\xff\xcc\x1a\xa8\x6a\x35\x46",
  },
  {
    serial: "UCUS98612DGAMMAPACK2",
    key: "\x10\xb2\x46\xc6\x24\xb1\xcf\x69\x7b\x15\x0d\x90\x35\xd8\xd0\x27",
  },
  {
    serial: "UCUS98612DGAMMAPACK3",
    key: "\x63\x29\x4f\x13\x9c\x1f\xeb\x69\x06\x7a\xd9\x7a\x0d\x31\x52\x12",
  },
  {
    serial: "UCUS98612DPAKDAXTER",
    key: "\x2b\x44\x66\x68\xa2\xb9\x15\xaa\x98\x8d\x0f\x1c\x6f\x38\x17\x9a",
  },
  {
    serial: "UCUS98612DPAKJAKX",
    key: "\xa3\x32\x05\xc4\xbb\x72\xdf\xb8\x11\x96\x48\x58\x9b\x90\x05\x60",
  },
  {
    serial: "UCUS98612DPAKSOCOM3",
    key: "\x11\x2b\xaf\x4d\x70\x3f\xf3\x34\xe0\xf2\xb1\x79\x9e\x13\xa4\x7c",
  },
  {
    serial: "UCUS98612DPAKSOCOMFTB",
    key: "\x18\xbe\x94\x11\xd2\xe8\x2e\x4d\x12\xf5\x1e\x21\xb2\xe1\x6c\x29",
  },
];
