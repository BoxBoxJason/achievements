import * as vscode from "vscode";
import path from "path";
import { webview } from "./viewconst";

export interface PostMessage {
  command: string;
  data: any;
}

export function getWebviewImageUri(context: vscode.ExtensionContext, webview: vscode.Webview, relativePath: string): vscode.Uri {
  const imagePath = vscode.Uri.file(
    path.join(context.extensionPath, relativePath)
  );

  return webview.asWebviewUri(imagePath);
}

export function getPackagedImages(context: vscode.ExtensionContext, view: vscode.Webview): { [key: string]: string } {
  const images: { [key: string]: string } = {};

  // Merge all flat icons maps
  let iconsMap = {
    ...webview.icons.pusheen,
    ...webview.icons.achievements.git,
    ...webview.icons.achievements.terminal,
    ...webview.icons.achievements.file,
    ...webview.icons.achievements.speaker,
    ...webview.icons.achievements.creator,
    ...webview.icons.achievements.debug,
    ...webview.icons.achievements.shortcut,
    ...webview.icons.achievements.extension,
    ...webview.icons.achievements.productivity,
  };

  for (const key in iconsMap) {
    images[key] = getWebviewImageUri(context, view, path.join('dist', ...iconsMap[key])).toString();
  }

  return images;
}
