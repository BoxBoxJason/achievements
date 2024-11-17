import path from 'path';
import * as vscode from 'vscode';
import logger from '../logger/logger';



/**
 * Setup methods for the Achievements webview panel
 */
export namespace AchievementsWebview {

  export function setupAchievementsPanel(subscriptions : vscode.Disposable[]): vscode.WebviewPanel {

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
    panel.webview.html = getDefaultWebviewContentReact(panel);

    // Handle requests from the webview
    panel.webview.onDidReceiveMessage(
      message => {
        logger.error('Not implemented yet');
        },
      undefined,
      subscriptions,
    );

    // Handle the webview panel being disposed
    panel.onDidDispose(
      () => {
        panel = undefined;
      },
      null,
      subscriptions
    );
    return panel;
  }

  function getDefaultWebviewContentReact(panel : vscode.WebviewPanel): string {
    let reactScriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(path.dirname(__dirname),'dist','webview.js'))
    );
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Achievements</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="${panel.webview.cspSource}"></script>
    <script src="${reactScriptUri}"></script>
  </body>
</html>` as const;
  }
}
