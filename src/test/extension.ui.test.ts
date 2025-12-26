import * as assert from "node:assert";
import * as vscode from "vscode";
import { showReadOnlyUI } from "../extension";
import { getMockContext, cleanupMockContext } from "./utils";

suite("Extension UI Test Suite", () => {
  let context: vscode.ExtensionContext;
  let originalShowWarning: any;

  setup(() => {
    context = getMockContext();
    // Backup original
    originalShowWarning = (vscode.window as any).showWarningMessage;
  });

  teardown(() => {
    // Restore
    (vscode.window as any).showWarningMessage = originalShowWarning;
    cleanupMockContext(context);
  });

  test("showReadOnlyUI should show a warning and create a status bar item", async () => {
    let called = false;
    (vscode.window as any).showWarningMessage = (
      msg: string,
      ...items: any[]
    ) => {
      called = true;
      assert.ok(msg.includes("read-only"), "Message should mention read-only");
      // Return a resolved promise to mimic user not selecting an action
      return Promise.resolve(undefined) as any;
    };

    showReadOnlyUI(context);

    // Allow microtasks to run
    await new Promise((resolve) => setImmediate(resolve));

    assert.ok(called, "showWarningMessage should be called");

    const found = context.subscriptions.find(
      (s: any) =>
        s &&
        typeof s.text === "string" &&
        s.text.includes("Achievements (read-only)")
    );
    assert.ok(found, "A status bar item should be present in subscriptions");
  });
});
