import path from "path";
import * as vscode from "vscode";
import { getPackagedImages, PostMessage } from "./icons";
import { backendRequests } from "./requests/backend";
import logger from "../utils/logger";

/**
 * Setup methods for the Achievements webview panel
 */
export namespace AchievementsWebview {
  export function setupAchievementsPanel(
    context: vscode.ExtensionContext,
  ): vscode.WebviewPanel {
    // Create and show the webview panel
    const panel: vscode.WebviewPanel | undefined =
      vscode.window.createWebviewPanel(
        "achievements",
        "Achievements",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "assets")),
            vscode.Uri.file(path.join(context.extensionPath, "dist", "style")),
            vscode.Uri.file(path.join(context.extensionPath, "dist")),
          ],
        },
      );
    panel.webview.html = getDefaultWebviewContentReact(context, panel);

    // Receive messages from the webview event
    panel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          const parsedMessage = JSON.parse(message) as PostMessage;

          await backendRequests.handleMessage(parsedMessage, panel);
        } catch (e) {
          logger.error("Cannot parse message: " + e);
        }
      },
      undefined,
      context.subscriptions,
    );

    return panel;
  }

  function getNonce(): string {
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";
    for (let i = 0; i < 32; i++) {
      nonce += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return nonce;
  }

  function getDefaultWebviewContentReact(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel,
  ): string {
    const reactScriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(__dirname, "webview.js")),
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource}; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';">
    <title>Achievements</title>
    <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(context.extensionPath, "dist", "style", "main.css"),
      ),
    )}">
  </head>
  <body>
    <div id="achievement-view"></div>
    <script nonce="${nonce}">
      window.imageUris = ${JSON.stringify(
        getPackagedImages(context, panel.webview),
      )}
      window.vscode = acquireVsCodeApi();
    </script>
    <script nonce="${nonce}" src="${reactScriptUri}"></script>
  </body>
</html>` as const;
  }
}
