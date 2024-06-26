import * as vscode from "vscode";

import { PsarcUnpackCommandProvider } from "./commands/psarc";
import { WacUnpackCommandProvider } from "./commands/wac";
import { WadUnpackCommandProvider } from "./commands/wad";
import { VexxEditorProvider } from "./views/vexx/EditorProvider";
import { RcsModelEditorProvider } from "./views/rcsmodel/EditorProvider";
import { DdsModelEditorProvider } from "./views/texture/DdsModelEditorProvider";
import { GnfModelEditorProvider } from "./views/texture/GnfModelEditorProvider";
import { GtfModelEditorProvider } from "./views/texture/GtfModelEditorProvider";
import { MipModelEditorProvider } from "./views/texture/MipModelEditorProvider";
import { SceneGraphProvider, SceneGraphRefresh, SceneGraphShow, SceneGraphDump } from "./sceneGraph";
import { FntModelEditorProvider } from "./views/font/FntModelEditorProvider";
import { FEPanel } from "./views/FEPanel";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(PsarcUnpackCommandProvider.register(context));
  context.subscriptions.push(WacUnpackCommandProvider.register(context));
  context.subscriptions.push(WadUnpackCommandProvider.register(context));
  context.subscriptions.push(VexxEditorProvider.register(context));
  context.subscriptions.push(RcsModelEditorProvider.register(context));
  context.subscriptions.push(DdsModelEditorProvider.register(context));
  context.subscriptions.push(GnfModelEditorProvider.register(context));
  context.subscriptions.push(GtfModelEditorProvider.register(context));
  context.subscriptions.push(FntModelEditorProvider.register(context));
  context.subscriptions.push(MipModelEditorProvider.register(context));

  context.subscriptions.push(SceneGraphProvider.register(context));
  context.subscriptions.push(SceneGraphRefresh.register(context));
  context.subscriptions.push(SceneGraphShow.register(context));
  context.subscriptions.push(SceneGraphDump.register(context));

  context.subscriptions.push(FEPanel.register(context));
  context.subscriptions.push(FEPanel.registerCommand(context));
}

export function deactivate() {}
