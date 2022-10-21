import * as vscode from 'vscode';

import { PsarcUnpackCommandProvider } from './commands/psarc';
import { WacUnpackCommandProvider } from './commands/wac';
import { WadUnpackCommandProvider } from './commands/wad';
import { VexxEditorProvider } from './views/vexx/EditorProvider';
import { RcsModelEditorProvider } from './views/rcsmodel/EditorProvider';
import { DdsModelEditorProvider } from './views/texture/DdsModelEditorProvider';
import { GtfModelEditorProvider } from './views/texture/GtfModelEditorProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "wipeout" is now active!');

	context.subscriptions.push(PsarcUnpackCommandProvider.register(context));
	context.subscriptions.push(WacUnpackCommandProvider.register(context));
	context.subscriptions.push(WadUnpackCommandProvider.register(context));
	context.subscriptions.push(VexxEditorProvider.register(context));
	context.subscriptions.push(RcsModelEditorProvider.register(context));
	context.subscriptions.push(DdsModelEditorProvider.register(context));
	context.subscriptions.push(GtfModelEditorProvider.register(context));
}

// this method is called when your extension is deactivated
export function deactivate() {}
