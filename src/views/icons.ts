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
  };

  for (const key in iconsMap) {
    images[key] = getWebviewImageUri(context, view, path.join('dist', ...iconsMap[key])).toString();
  }

  // Add language speaker achievements icons
  for (const key in webview.icons.achievements.speaker) {
    images[key + "_SPEAKER"] = getWebviewImageUri(context, view, path.join('dist', ...webview.icons.achievements.speaker[key])).toString();
  }

  // Add language creator achievements icons
  for (const key in webview.icons.achievements.creator) {
    images[key + "_CREATOR"] = getWebviewImageUri(context, view, path.join('dist', ...webview.icons.achievements.creator[key])).toString();
  }
  return images;
}
