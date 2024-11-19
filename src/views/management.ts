import path from 'path';
import * as vscode from 'vscode';
import { getPackagedImages } from './request';

/**
 * Setup methods for the Achievements webview panel
 */
export namespace AchievementsWebview {

  export function setupAchievementsPanel(context : vscode.ExtensionContext): vscode.WebviewPanel {

    // Create and show the webview panel
    let panel : vscode.WebviewPanel | undefined = vscode.window.createWebviewPanel(
      'achievements',
      'Achievements',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    panel.webview.html = getDefaultWebviewContentReact(context, panel);

    return panel;
  }

  function getDefaultWebviewContentReact(context : vscode.ExtensionContext, panel : vscode.WebviewPanel): string {
    let reactScriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(__dirname,'webview.js'))
    );
    let cssUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(path.dirname(__dirname),'src','views','styles','containers.css'))
    );
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Achievements</title>
    <link rel="stylesheet" href="${cssUri}">
  </head>
  <body>
    <div id="root"></div>
    <script src="${panel.webview.cspSource}"></script>
    <script>
      window.imageUris = ${JSON.stringify(getPackagedImages(context, panel.webview))}
      window.vscode = acquireVsCodeApi();
    </script>
    <script src="${reactScriptUri}"></script>
  </body>
</html>` as const;
  }
}
