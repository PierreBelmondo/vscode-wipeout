import * as vscode from 'vscode';

import { PsarcUnpackCommandProvider } from './commands/psarc';
import { WacUnpackCommandProvider } from './commands/wac';
import { WadUnpackCommandProvider } from './commands/wad';
import { VexxEditorProvider } from './views/vexx/EditorProvider';
import { RcsModelEditorProvider } from './views/rcsmodel/EditorProvider';
import { DdsModelEditorProvider } from './views/texture/DdsModelEditorProvider';
import { GtfModelEditorProvider } from './views/texture/GtfModelEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(PsarcUnpackCommandProvider.register(context));
	context.subscriptions.push(WacUnpackCommandProvider.register(context));
	context.subscriptions.push(WadUnpackCommandProvider.register(context));
	context.subscriptions.push(VexxEditorProvider.register(context));
	context.subscriptions.push(RcsModelEditorProvider.register(context));
	context.subscriptions.push(DdsModelEditorProvider.register(context));
	context.subscriptions.push(GtfModelEditorProvider.register(context));
}

export function deactivate() {}
