import path from 'path';
import * as vscode from 'vscode';
import { getPackagedImages, PostMessage } from './request';
import { backendRequests } from './requests/backend';
import logger from '../utils/logger';

/**
 * Setup methods for the Achievements webview panel
 */
export namespace AchievementsWebview {

  export function setupAchievementsPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {

    // Create and show the webview panel
    let panel: vscode.WebviewPanel | undefined = vscode.window.createWebviewPanel(
      'achievements',
      'Achievements',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    panel.webview.html = getDefaultWebviewContentReact(context, panel);

    // Receive messages from the webview event
    panel.webview.onDidReceiveMessage((message) => {
      try {
        const parsedMessage = JSON.parse(message) as PostMessage;

        backendRequests.handleMessage(parsedMessage, panel);
      } catch (e) {
        logger.error('Cannot parse message: ' + e);
      }
    },
      undefined,
      context.subscriptions
    );

    return panel;
  }

  function getDefaultWebviewContentReact(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    let reactScriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(__dirname, 'webview.js'))
    );
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Achievements</title>
  </head>
  <body>
    <div id="achievement-view"></div>
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
