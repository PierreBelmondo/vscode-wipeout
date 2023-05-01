import * as vscode from "vscode";
import * as path from "path";
import { bus } from "./helpers/bus";
import { VexxDocument } from "./views/vexx/Document";

export class SceneGraphShow {
  static readonly commandType = "sceneGraph.show";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand(SceneGraphShow.commandType, async (sceneNode: SceneNode) => {
      if (sceneNode instanceof SceneWorld) {
        bus.showWorld();
      }
      if (sceneNode instanceof SceneTexture) {
        bus.showTexture(sceneNode.json.name);
      }
    });
  }
}

export class SceneGraphProvider implements vscode.TreeDataProvider<SceneNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<SceneNode | undefined | void> = new vscode.EventEmitter<SceneNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<SceneNode | undefined | void> = this._onDidChangeTreeData.event;

  private _currentDocument: VexxDocument | null;

  constructor() {
    this._currentDocument = null;
    bus.onDidChangeActiveCustomDocument((e) => {
      console.log("Updating the TreeView");
      this._currentDocument = e;
      this._onDidChangeTreeData.fire();
      console.log(this._currentDocument.scene);
    });
  }

  getTreeItem(element: SceneNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SceneNode): Thenable<SceneNode[]> {
    if (this._currentDocument) {
      return Promise.resolve(this.getSceneGraphInDocument(element));
    } else {
      return Promise.resolve([]);
    }
  }

  private getSceneGraphInDocument(element?: SceneNode): SceneNode[] {
    if (this._currentDocument === null) {
      return [];
    }

    const scene = this._currentDocument.scene;

    if (element === undefined) {
      const nodes = [] as SceneNode[];
      if ("object" in scene) {
        nodes.push(new SceneWorld(scene.object));
      }
      if ("materials" in scene) {
        nodes.push(new SceneMaterials(scene.materials));
      }
      if ("textures" in scene) {
        nodes.push(new SceneTextures(scene.textures));
      }
      return nodes;
    } else {
      return element.getChildren();
    }
  }
}

export class SceneNode extends vscode.TreeItem {
  json: any;

  constructor(label: string, json: any) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.json = json;
    //this.tooltip = `Anti-gravity rocks!`;
    //this.description = this.version;
  }

  public getChildren(): SceneNode[] {
    return [];
  }

  contextValue = "sceneNode";
}

export class SceneWorld extends SceneNode {
  constructor(json: any) {
    super("World", json);
  }

  iconPath = {
    light: path.join(__filename, "../../resources/images", "light", "world.svg"),
    dark: path.join(__filename, "../../resources/images", "dark", "world.svg"),
  };

  public override getChildren(): SceneNode[] {
    const nodes = [] as SceneNode[];
    for (const child of this.json.children) {
      if (child.type == "Group" && child.name == "world") {
        for (const object of child.children)
          nodes.push(new SceneObject3D(object));
      }
    }
    return nodes;
  }

  contextValue = "sceneWorld";
}

export class SceneObject3D extends SceneNode {
  constructor(json: any) {
    super(json.name, json);
    this.description = json.type;
    if ("userData" in json) {
      if ("format" in json.userData) {
        if ((json.userData.format == "VEXX")) {
          this.description = json.userData.type;
        }
      }
    }

    if (json.type == "Mesh") {
      this.iconPath = {
        light: path.join(__filename, "../../resources/images", "light", "cube.svg"),
        dark: path.join(__filename, "../../resources/images", "dark", "cube.svg"),
      };          
    }
  }

  iconPath = {
    light: path.join(__filename, "../../resources/images", "light", "folder.svg"),
    dark: path.join(__filename, "../../resources/images", "dark", "folder.svg"),
  };

  public override getChildren(): SceneNode[] {
    if (!("children" in this.json)) {
      return [];
    }

    const nodes = [] as SceneNode[];
    for (const object of this.json.children) {
      nodes.push(new SceneObject3D(object));
    }
    return nodes;
  }
}

export class SceneTextures extends SceneNode {
  constructor(json: any) {
    super("Textures", json);
  }

  iconPath = {
    light: path.join(__filename, "../../resources/images", "light", "texture.svg"),
    dark: path.join(__filename, "../../resources/images", "dark", "texture.svg"),
  };

  public override getChildren(): SceneNode[] {
    const nodes = [] as SceneNode[];
    for (const object of this.json) {
      nodes.push(new SceneTexture(object));
    }
    return nodes;
  }
}

export class SceneTexture extends SceneNode {
  constructor(json: any) {
    super(json.name, json);
  }

  iconPath = {
    light: path.join(__filename, "../../resources/images", "light", "texture.svg"),
    dark: path.join(__filename, "../../resources/images", "dark", "texture.svg"),
  };

  public override getChildren(): SceneNode[] {
    return [];
  }

  contextValue = "sceneTexture";
}

export class SceneMaterials extends SceneNode {
  constructor(json: any) {
    super("Materials", json);
  }

  iconPath = {
    light: path.join(__filename, "../../resources/images", "light", "light.svg"),
    dark: path.join(__filename, "../../resources/images", "dark", "light.svg"),
  };

  public override getChildren(): SceneNode[] {
    const nodes = [] as SceneNode[];
    for (const object of this.json) {
      if (object.type == "LineBasicMaterial") continue;
      nodes.push(new SceneMaterial(object));
    }
    return nodes;
  }
}

export class SceneMaterial extends SceneNode {
  constructor(json: any) {
    super(json.name, json);
    this.description = json.type
  }

  iconPath = {
    light: path.join(__filename, "../../resources/images", "light", "texture.svg"),
    dark: path.join(__filename, "../../resources/images", "dark", "texture.svg"),
  };

  public override getChildren(): SceneNode[] {
    return [];
  }

  contextValue = "sceneMaterial";
}
