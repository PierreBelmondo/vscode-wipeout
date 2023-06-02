import * as vscode from "vscode";
import * as path from "path";
import { bus } from "./helpers/bus";
import { VexxDocument } from "./views/vexx/Document";

export class SceneGraphRefresh {
  static readonly commandType = "sceneGraph.refreshEntry";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(SceneGraphRefresh.commandType, async () => {
      bus.sceneRefreshEntry();
    });
  }
}

export class SceneGraphShow {
  static readonly commandType = "sceneGraph.show";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(SceneGraphShow.commandType, async (sceneObject: SceneObject) => {
      if (sceneObject instanceof SceneWorld) {
        bus.showWorld();
      }
      if (sceneObject instanceof SceneTexture) {
        bus.showTexture(sceneObject.json.name);
      }
    });
  }
}

export class SceneGraphProvider implements vscode.TreeDataProvider<SceneItem> {
  static readonly treeDataProviderType = "sceneGraph";
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const treeDataProvider = new SceneGraphProvider(context);
    //return vscode.window.registerTreeDataProvider(SceneGraphProvider.treeDataProviderType, treeDataProvider);
    const treeview = vscode.window.createTreeView(SceneGraphProvider.treeDataProviderType, { treeDataProvider });
    bus.onThreeDocumentMessage(async (message) => {
      if (message.type == "scene.selected") {
        const uuid = message.body.uuid;
        console.log(message, uuid);
        const item = await treeDataProvider.getTreeItemByUUID(uuid);
        console.log(item);
        if (item) treeview.reveal(item, { focus: true, select: true });
      }
    });
    bus.onDidChangeActiveCustomDocument((e) => {
      console.log(`Updating Scene Graph (${e.uri})`);
      treeDataProvider._currentDocument = e;
      treeDataProvider._onDidChangeTreeData.fire();
    });
    return treeview;
  }

  private _currentDocument: VexxDocument | null = null;

  private _onDidChangeTreeData: vscode.EventEmitter<SceneItem | undefined | void> = new vscode.EventEmitter<SceneItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SceneItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(_context: vscode.ExtensionContext) {}

  getTreeItem(element: SceneItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getParent?(element: SceneItem): vscode.ProviderResult<SceneItem> {
    return element.getParent();
  }

  /*
  resolveTreeItem?(item: vscode.TreeItem, element: SceneItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
    throw new Error("Method not implemented.");
  }
  */

  /**
   * Implement this to return the children for the given element or root (if no element is passed).
   *
   * @param element
   * @returns children for the given element
   */
  getChildren(element?: SceneItem): SceneItem[] {
    if (!this._currentDocument) return [];
    if (element) return element.getChildren();

    const scene = this._currentDocument.scene;
    const nodes = [] as SceneItem[];
    if ("object" in scene) nodes.push(nodesFromThreeJsScene(scene.object));
    if ("materials" in scene) nodes.push(new SceneMaterials(scene.materials, "Materials"));
    if ("textures" in scene) nodes.push(new SceneTextures(scene.textures, "Textures"));
    return nodes;
  }

  getTreeItemByUUID(uuid: string): vscode.ProviderResult<SceneItem> {
    const children = this.getChildren();
    if (children) {
      for (const child of children) {
        const sceneObject = child.getTreeItemByUUID(uuid);
        if (sceneObject) return sceneObject;
      }
    }
  }
}

interface SceneItem extends vscode.TreeItem {
  getParent(): vscode.ProviderResult<SceneItem>;
  getChildren(element?: SceneItem): SceneItem[];
  getTreeItemByUUID(uuid: string): vscode.ProviderResult<SceneItem>;
}

function nodesFromThreeJsScene(node: any, parent?: SceneItem): SceneObject {
  const typeinfo = {
    Scene: { class: SceneWorld },
    Group: { class: SceneGroup },
    DirectionalLight: { class: SceneDirectionalLight },
    AxesHelper: { class: SceneAxesHelper },
    Mesh: { class: SceneMesh },
    PerspectiveCamera: { class: ScenePerspectiveCamera },
    CameraHelper: { class: SceneCameraHelper },
    LineBasicMaterial: { class: SceneMaterial },
    MeshBasicMaterial: { class: SceneMaterial },
    MeshPhongMaterial: { class: SceneMaterial },
    ShaderMaterial: { class: SceneMaterial },
    1009: { class: SceneTexture },
  };

  const itemClass = typeinfo[node.type] ? typeinfo[node.type].class : SceneObject;
  const item = new itemClass(parent, node);

  if (node.userData) {
    if (node.userData.format == "VEXX") {
      item.description = `VEXX:${node.userData.type} (${item.description})`;
    }
  }

  return item;
}

export class SceneObject extends vscode.TreeItem implements SceneItem {
  readonly json: any;
  readonly parent: SceneItem;

  static iconPath(name: string) {
    const svg = name + ".svg";
    return {
      light: path.join(__filename, "../../resources/images", "light", svg),
      dark: path.join(__filename, "../../resources/images", "dark", svg),
    };
  }

  constructor(parent: SceneItem, json: any) {
    const label = json.name ? json.name : json.uuid;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.parent = parent;
    this.json = json;
    this.tooltip = JSON.stringify(json, undefined, 2);
    this.description = json.type ? json.type : "?";
  }

  get uuid() {
    if (this.json.uuid) return this.json.uuid;
  }

  public getParent(): vscode.ProviderResult<SceneItem> {
    return this.parent;
  }

  public getChildren(): SceneItem[] {
    const nodes = [] as SceneItem[];
    if (this.json.children) {
      for (const child of this.json.children) {
        const node = nodesFromThreeJsScene(child, this);
        if (node.label?.toString().startsWith(".")) continue;
        nodes.push(node);
      }
    }
    return nodes;
  }

  public getTreeItemByUUID(uuid: string): vscode.ProviderResult<SceneItem> {
    if (this.uuid == uuid) return this;
    const children = this.getChildren();
    for (const child of children) {
      const sceneObject = child.getTreeItemByUUID(uuid);
      if (sceneObject) return sceneObject;
    }
  }

  contextValue = "SceneObject";
}

export abstract class SceneObjects<Object> extends vscode.TreeItem implements SceneItem {
  readonly json: any[];

  constructor(json: any[], label: string) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.json = json;
    this.tooltip = JSON.stringify(json, undefined, 2);
    //this.description = this.version;
  }

  public getParent(): vscode.ProviderResult<SceneItem> {
    return;
  }

  public getChildren(): SceneObject[] {
    const nodes = [] as SceneObject[];
    for (const child of this.json) {
      if (child.type == "LineBasicMaterial") continue;
      const node = nodesFromThreeJsScene(child, this);
      nodes.push(node);
    }
    return nodes;
  }

  getTreeItemByUUID(uuid: string): vscode.ProviderResult<SceneItem> {
    return;
  }

  contextValue = "SceneObject";
}

export class SceneWorld extends SceneObject {
  iconPath = SceneObject.iconPath("world");
  contextValue = "sceneWorld";
}

export class SceneGroup extends SceneObject {
  iconPath = SceneObject.iconPath("folder");
  contextValue = "sceneGroup";
}

export class SceneDirectionalLight extends SceneObject {
  iconPath = SceneObject.iconPath("light");
  contextValue = "sceneLight";
}

export class SceneAxesHelper extends SceneObject {
  iconPath = SceneObject.iconPath("solid-cube");
  contextValue = "sceneAxesHelper";
}

export class SceneMesh extends SceneObject {
  iconPath = SceneObject.iconPath("cube");
  contextValue = "sceneMesh";

  public getChildren(): SceneItem[] {
    const children = super.getChildren();
    const child = new SceneMeshMaterial(this, this.json.material);
    children.push(child);
    return children;
  }
}

export class SceneMeshMaterial extends vscode.TreeItem implements SceneItem {
  iconPath = SceneObject.iconPath("texture");
  contextValue = "sceneMeshMaterial";
  uuid: string;
  readonly parent: SceneItem;

  constructor(parent: SceneItem, uuid: string) {
    super(uuid, vscode.TreeItemCollapsibleState.Collapsed);
    this.parent = parent;
    this.uuid = uuid;
    this.description = "Material";
  }

  getParent(): vscode.ProviderResult<SceneItem> {
    return this.parent;
  }

  getChildren(element?: SceneItem | undefined): SceneItem[] {
    return [];
  }

  getTreeItemByUUID(uuid: string): vscode.ProviderResult<SceneItem> {
    return undefined;
  }
}

export class ScenePerspectiveCamera extends SceneObject {
  iconPath = SceneObject.iconPath("camera");
  contextValue = "scenePerspectiveCamera";
}

export class SceneCameraHelper extends SceneObject {
  iconPath = SceneObject.iconPath("camera");
  contextValue = "sceneCameraHelper";
}

export class SceneTextures extends SceneObjects<SceneTexture> {
  iconPath = SceneObject.iconPath("texture");
  contextValue = "sceneTextures";
}

export class SceneTexture extends SceneObject {
  iconPath = SceneObject.iconPath("texture");
  contextValue = "sceneTexture";
}

export class SceneMaterials extends SceneObjects<SceneMaterial> {
  iconPath = SceneObject.iconPath("texture");
  contextValue = "sceneMaterials";
}

export class SceneMaterial extends SceneObject {
  iconPath = SceneObject.iconPath("texture");
  contextValue = "sceneMaterial";
}
