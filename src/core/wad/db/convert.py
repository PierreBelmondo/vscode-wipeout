#!/usr/bin/python3

import pprint
import json

lines = open('hashes.csv', 'r').read().split("\n")

current = None
final = {}

for line in lines:
    if line == "":
        continue
    if line.startswith("# "):
        line = line[2:]
        v1 = line.split('-', 1)
        v2 = v1[1].split('/', 1)
        code = v1[0]
        name = v2[0]
        wad = v2[1]

        if not current is None:
            if not code in final:
                final[code] = {
                    "code": code,
                    "name": name,
                    "wads": []
                }
            final[code]["wads"].append(current)
        current = {"path":v2[1], "files":[]}
        continue
    v = line.split(",")
    current["files"].append({
        "hash": int(v[0],16),
        "filename": v[2],
        "confidence": int(v[1]),
    })
final[code]["wads"].append(current)

for code, one in final.items():
    j = json.dumps(one, indent=2)
    fname = "%s.json" % code
    print("Writing into %s" % fname)
    open(fname, 'w').write(j)
