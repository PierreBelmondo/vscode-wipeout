import { api } from "../api";

import * as THREE from "three";
import { Loader } from ".";
import { World } from "../worlds";

import { mipmapsToTexture } from "../utils";
import { GTF } from "@core/formats/gtf";

/** One front-end image and the quads that draw it. */
class FEImage {
  filename: string;
  objects: THREE.Mesh[] = [];

  private _texture?: THREE.Texture;
  private _loading?: Promise<void>;

  constructor(filename: string) {
    this.filename = filename;
  }

  addObject(object: THREE.Mesh) {
    this.objects.push(object);
    if (this._texture) this.applyTo(object);
    // Started once and shared: several quads name the same image, and the
    // request used to be guarded by a flag whose reply then went to a lookup
    // that never matched -- so the texture was fetched and silently dropped.
    if (!this._loading) this._loading = this.load();
    this._loading.catch(() => {});
  }

  private async load() {
    try {
      const gtf = GTF.load(await api.fetchFile(this.filename));
      this._texture = mipmapsToTexture(gtf.mipmaps);
    } catch (e) {
      api.log(`[fe] ${this.filename} failed: ${(e as Error).message}`);
      return;
    }
    for (const object of this.objects) this.applyTo(object);
  }

  applyTo(object: THREE.Mesh) {
    api.log("TODO: need implementation");
  }
}

export class FELoader extends Loader {
  images: { [path: string]: FEImage } = {};

  override loadFromString(world: World, content: string): void {
    // Encapsulate the document into one tag to handle partial-documents
    content = `<FAKE_ROOT>${content}</FAKE_ROOT>`;

    // Fix comments and crap
    content = content.replace(/<\?[^>]*>/g, "");
    content = content.replace(/<[^>]*\?>/g, "");
    content = content.replace(/<!--.*-->/g, "");
    content = content.replace(/ & /g, " &amp; ");

    // Parse XML
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(content, "text/xml");
    console.log(doc);

    // Add some light
    const hemiLight = new THREE.HemisphereLight(0xa0a0a0, 0x080808, 1);
    world.scene.add(hemiLight);

    // Load it
    const object = this.loadDocument(world, doc);
    world.scene.add(object);
  }

  requireImage(world: World, filename: string, object: THREE.Mesh) {
    let image = this.images[filename];
    if (!image) {
      image = new FEImage(filename);
      this.images[filename] = image;
    }
    image.addObject(object);
  }

  loadDocument(world: World, doc: Document) {
    api.log("Loading document");

    const group = new THREE.Group();
    for (const child of doc.children[0].children) {
      api.log("Loading document" + child.tagName);

      switch (child.tagName) {
        case "Screen": {
          const object = this.loadScreen(world, child);
          group.add(object);
          break;
        }
        default:
          api.log(`Unexpected element ${child.tagName}`);
      }
    }
    return group;
  }

  loadNode(world: World, node: Element) {
    switch (node.tagName) {
      case "Screen":
        return this.loadScreen(world, node);
      case "Item":
        return this.loadItem(world, node);
      // TODO: handle other node types
      default:
        api.log(`Unexpected element ${node.tagName}`);
        // pretend it's an item ?
        return this.loadItem(world, node);
    }
  }

  loadItem(world: World, node: Element) {
    api.log("Loading item");

    const offsetX = node.getAttribute("OffsetX");
    const offsetY = node.getAttribute("OffsetY");
    const group = new THREE.Group();
    group.position.x = offsetX ? parseInt(offsetX) : 0;
    group.position.y = offsetY ? parseInt(offsetY) : 0;
    return group;
  }

  loadScreen(world: World, node: Element) {
    api.log("Loading screen");

    const geometry = new THREE.PlaneGeometry(1920, 1080);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, wireframe: true });
    const plane = new THREE.Mesh(geometry, material);

    for (const child of node.children) {
      const object = this.loadNode(world, child);
      plane.add(object);
    }

    return plane;
  }
}
