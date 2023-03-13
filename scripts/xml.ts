import * as fs from "fs";
import { parseStringPromise } from "xml2js";

const basePath = "../project-example/ps3/hdf/data";

function cleanPath(path: string): string {
  path = path.toLowerCase();
  path = path.replace(/\\/g, "/");
  path = path.replace(/data\//g, "");
  return "/" + path;
}

function cleanXml(content: string): string {
  content = content.replace(/<\?[^>]*>/g, "");
  content = content.replace(/<[^>]*\?>/g, "");
  content = content.replace(/<!--.*-->/g, "");
  content = content.replace(/ & /g, " &amp; ");
  //process.stderr.write((content);
  return content;
}

async function loadDocument(filename: string) {
  const path = basePath + filename;
  process.stderr.write(`Loading document ${path}\n`);
  const content = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
  const contentClean = cleanXml(content);
  return await parseStringPromise(contentClean);
}

async function loadFragment(filename: string) {
  const path = basePath + cleanPath(filename);
  process.stderr.write(`Loading fragment ${path}\n`);
  const content = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
  const contentClean = cleanXml(`<FRAGMENT>${content}</FRAGMENT>`);
  const obj = await parseStringPromise(contentClean);
  return await obj;
}

async function loadMore(obj: any) {
  for (const tagName in obj) {
    process.stderr.write(tagName);
    if (tagName == "LoadXML") {
      for (const i in obj[tagName]) {
        const loadXML = obj[tagName][i];
        const values = await transformValues(loadXML["Values"]);
        const fragment = loadFragment(values["Src"]);
        for (const ftagName in fragment["FRAGMENT"]) {
          obj[ftagName] += fragment["FRAGMENT"][ftagName];
        }
      }
      obj[tagName] = undefined;
    } else {
      for (let i = 0; i < obj[tagName].length; i++) {
        obj[tagName][i] = loadMore(obj[tagName][i]);
      }
    }
  }
  return obj;
}

async function transformValues(obj: any) {
  let dict = {} as any;
  for (const attrName in obj["$"]) {
    dict[attrName] = obj["$"][attrName];
  }
  return dict;
}

async function transformPISkin(obj: any) {
  for (const tagName in obj) {
    if (tagName == "Values") {
      obj[tagName] = obj[tagName][0];
      const values = await transformValues(obj[tagName]);
      const fragment = await loadFragment(values.location + "/skin.xml");
      const fragment2 = await loadMore(fragment);
      //obj["$"]["location"] = values.location;
      obj[tagName] = undefined;
      for (const ftagName in fragment2["FRAGMENT"]) {
        obj[ftagName] = await fragment2["FRAGMENT"][ftagName];
      }
    }
  }
  return obj;
}

async function transformScreen(obj: any) {
  process.stderr.write("Transforming screen\n")
  if ("PI_Skin" in obj) {
    obj["PI_Skin"] = await Promise.all(obj["PI_Skin"].map(transformPISkin));
  }
  return obj;
}

async function transformDocument(obj: any) {
  process.stderr.write("Transforming document\n")
  if ("Screen" in obj) {
    obj["Screen"] = await transformScreen(obj["Screen"]);
  }
  process.stderr.write(JSON.stringify(obj, undefined, 2) + "\n")
  return obj;
}

async function main() {
  let obj = await loadDocument("/plugins/frontend/definition.xml");
  obj = await transformDocument(obj);
  console.log(JSON.stringify(obj, undefined, 2));
}

main();
