import { api } from "../api";

import * as THREE from "three";
import { Loader, World } from ".";

export class FELoader extends Loader {
  override loadFromString(world: World, content: string): void {
    // Encapsulate the document into one tag to handle partial-documents
    content = `<FAKE_ROOT>${content}</FAKE_ROOT>`;

    // Fix comments
    content = content.replace(/<\?/g, "<!--");
    content = content.replace(/\?>/g, "-->");

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
