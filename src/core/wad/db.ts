import db041201 from "./db/041201.json";
import db050208 from "./db/050208.json";
import db050223 from "./db/050223.json";
import db050316 from "./db/050316.json";
import db050602 from "./db/050602.json";
import db050629 from "./db/050629.json";
import db050707 from "./db/050707.json";
import db050926 from "./db/050926.json";
import db051031 from "./db/051031.json";
import db070531 from "./db/070531.json";
import db070831 from "./db/070831.json";
import db071106 from "./db/071106.json";
import db071127 from "./db/071127.json";
import db071203 from "./db/071203.json";
import db080104 from "./db/080104.json";
import db080207 from "./db/080207.json";
import db080214 from "./db/080214.json";
import db080221 from "./db/080221.json";
import db080228 from "./db/080228.json";
import db090519 from "./db/090519.json";

const DBLIST = [
  db041201,
  db050208,
  db050223,
  db050316,
  db050602,
  db050629,
  db050707,
  db050926,
  db051031,
  db070531,
  db070831,
  db071106,
  db071127,
  db071203,
  db080104,
  db080207,
  db080214,
  db080221,
  db080228,
  db090519,
];

const HASH2FILENAME: { [key: number]: string } = {};

for (const db of DBLIST) {
  for (const wad of db.wads) {
    for (const file of wad.files) HASH2FILENAME[file.hash] = file.filename;
  }
}

export function hash2filename(hash: number) {
  if (!(hash in HASH2FILENAME)) return null;
  return HASH2FILENAME[hash];
}
