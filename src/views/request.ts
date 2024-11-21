import * as vscode from "vscode";
import path from "path";

export interface PostMessage {
  command: string;
  data: any;
}

export function getWebviewImageUri(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  relativePath: string
): vscode.Uri {
  const imagePath = vscode.Uri.file(
      path.join(context.extensionPath, relativePath)
  );

  return webview.asWebviewUri(imagePath);
}

const PACKAGED_IMAGES : {[key : string] : string} = {
  PUSHEEN_BASE: path.join('assets','icons','pusheen_base.png'),
  PUSHEEN_ERROR: path.join('assets','icons','pusheen_error.png'),
  PUSHEEN_HEART: path.join('assets','icons','pusheen_holding_heart.png'),
  PUSHEEN_TROPHY: path.join('assets','icons','pusheen_holding_trophy.png'),
  PUSHEEN_LOAF: path.join('assets','icons','pusheen_loaf_base.png'),
  PUSHEEN_LOAF_HAT: path.join('assets','icons','pusheen_loaf_hat.png'),
};

export function getPackagedImages(context: vscode.ExtensionContext, webview: vscode.Webview) : {[key: string]: string} {
  const images: {[key: string]: string} = {};
  for (const key in PACKAGED_IMAGES) {
    images[key] = getWebviewImageUri(context, webview, PACKAGED_IMAGES[key]).toString();
  }
  return images;
}
