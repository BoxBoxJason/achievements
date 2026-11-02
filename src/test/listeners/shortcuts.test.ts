import * as assert from "node:assert";
import * as vscode from "vscode";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { config } from "../../config/config";
import { shortcutsListeners } from "../../listeners/shortcuts";
import { ProgressionController } from "../../database/controller/progressions";
import { constants } from "../../constants";

suite("Shortcuts Listeners Test Suite", () => {
  const tempDir = path.join(__dirname, "temp_shortcuts_test");

  test("provideDocumentPasteEdits should increase NUMBER_OF_PASTES and let the default paste proceed", () => {
    const uri = vscode.Uri.file(path.join(tempDir, "test.ts"));
    const document = { uri } as vscode.TextDocument;

    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };

    try {
      const provider = new shortcutsListeners.AchievementsPasteEditProvider();
      const result = provider.provideDocumentPasteEdits(
        document,
        [],
        {} as vscode.DataTransfer,
        {} as vscode.DocumentPasteEditContext,
        {} as vscode.CancellationToken,
      );

      assert.strictEqual(
        result,
        undefined,
        "Provider should never replace the default paste behavior",
      );
      assert.ok(increasedCriteria.includes(constants.criteria.NUMBER_OF_PASTES));
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("provideDocumentPasteEdits should ignore configured files", () => {
    const uri = vscode.Uri.file(
      path.join(tempDir, "node_modules", "bundle.ts"),
    );
    const document = { uri } as vscode.TextDocument;

    let callCount = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async () => {
      callCount++;
    };

    try {
      const provider = new shortcutsListeners.AchievementsPasteEditProvider();
      provider.provideDocumentPasteEdits(
        document,
        [],
        {} as vscode.DataTransfer,
        {} as vscode.DocumentPasteEditContext,
        {} as vscode.CancellationToken,
      );
      assert.strictEqual(callCount, 0);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  function pasteInto(ranges: vscode.Range[], fileName = "test.ts"): string[] {
    const document = {
      uri: vscode.Uri.file(path.join(tempDir, fileName)),
    } as vscode.TextDocument;
    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };
    try {
      new shortcutsListeners.AchievementsPasteEditProvider().provideDocumentPasteEdits(
        document,
        ranges,
        {} as vscode.DataTransfer,
        {} as vscode.DocumentPasteEditContext,
        {} as vscode.CancellationToken,
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
    return increasedCriteria;
  }

  test("provideDocumentPasteEdits should count a paste into several cursors", () => {
    const increasedCriteria = pasteInto([
      new vscode.Range(0, 0, 0, 0),
      new vscode.Range(1, 0, 1, 0),
      new vscode.Range(2, 0, 2, 0),
    ]);
    assert.deepStrictEqual(increasedCriteria, [
      constants.criteria.NUMBER_OF_PASTES,
      constants.criteria.MULTI_CURSOR_PASTES,
    ]);
  });

  test("provideDocumentPasteEdits should not count a single cursor paste as multi-cursor", () => {
    const increasedCriteria = pasteInto([new vscode.Range(0, 0, 0, 0)]);
    assert.deepStrictEqual(increasedCriteria, [
      constants.criteria.NUMBER_OF_PASTES,
    ]);
  });

  test("provideDocumentPasteEdits should ignore multi-cursor pastes in configured files", () => {
    const increasedCriteria = pasteInto(
      [new vscode.Range(0, 0, 0, 0), new vscode.Range(1, 0, 1, 0)],
      path.join("node_modules", "bundle.ts"),
    );
    assert.deepStrictEqual(increasedCriteria, []);
  });
  suite("Paste As...", () => {
    const uri = vscode.Uri.file(path.join(tempDir, "paste-as.ts"));
    let increasedCriteria: string[];
    const originalIncrease = ProgressionController.increaseProgression;

    setup(() => {
      increasedCriteria = [];
      ProgressionController.increaseProgression = async (criteria: string) => {
        increasedCriteria.push(criteria);
      };
    });

    teardown(() => {
      ProgressionController.increaseProgression = originalIncrease;
    });

    /** List the "Paste As..." options for a clipboard text on some cursors */
    async function listPasteAsOptions(text: string, cursors: number) {
      const dataTransfer = new vscode.DataTransfer();
      dataTransfer.set("text/plain", new vscode.DataTransferItem(text));
      await new shortcutsListeners.AchievementsPasteEditProvider().provideDocumentPasteEdits(
        { uri } as vscode.TextDocument,
        Array.from({ length: cursors }, (_, line) => new vscode.Range(line, 0, line, 0)),
        dataTransfer,
        {
          only: undefined,
          triggerKind: vscode.DocumentPasteTriggerKind.PasteAs,
        },
        {} as vscode.CancellationToken,
      );
    }

    function change(...texts: string[]): vscode.TextDocumentChangeEvent {
      return {
        document: { uri } as vscode.TextDocument,
        contentChanges: texts.map(
          (text) => ({ text }) as vscode.TextDocumentContentChangeEvent,
        ),
        reason: undefined,
      };
    }

    test("should only count once the pasted text lands in the document", async () => {
      await listPasteAsOptions("hello", 1);
      assert.deepStrictEqual(increasedCriteria, [], "Nothing picked yet");

      shortcutsListeners.handleTextDocumentChange(change("hello"));
      assert.deepStrictEqual(increasedCriteria, [
        constants.criteria.NUMBER_OF_PASTES,
      ]);
    });

    test("should not count a cancelled Paste As", async () => {
      await listPasteAsOptions("hello", 1);
      // Esc, then the user types
      shortcutsListeners.handleTextDocumentChange(change("h"));
      shortcutsListeners.handleTextDocumentChange(change("hello"));
      assert.deepStrictEqual(increasedCriteria, []);
    });

    test("should count text spread over several cursors", async () => {
      await listPasteAsOptions("one\r\ntwo", 2);
      // One line per cursor, re-indented by the editor
      shortcutsListeners.handleTextDocumentChange(change("  one", "  two"));
      assert.deepStrictEqual(increasedCriteria, [
        constants.criteria.NUMBER_OF_PASTES,
        constants.criteria.MULTI_CURSOR_PASTES,
      ]);
    });
  });

  test("pasting into several cursors of an editor should be counted", async function () {
    this.timeout(20000);
    const file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "achievements-paste-")),
      "paste.ts",
    );
    fs.writeFileSync(file, "a\nb\nc\n");
    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    const originalIsListenerEnabled = config.isListenerEnabled;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };
    config.isListenerEnabled = () => true;
    const context = { subscriptions: [] as vscode.Disposable[] };
    try {
      await vscode.env.clipboard.writeText("X");
      if ((await vscode.env.clipboard.readText()) !== "X") {
        this.skip(); // No clipboard in this environment
      }
      shortcutsListeners.activate(context as unknown as vscode.ExtensionContext);
      const editor = await vscode.window.showTextDocument(
        await vscode.workspace.openTextDocument(file),
      );
      editor.selections = [
        new vscode.Selection(0, 0, 0, 0),
        new vscode.Selection(1, 0, 1, 0),
      ];
      await vscode.commands.executeCommand("editor.action.clipboardPasteAction");

      const deadline = Date.now() + 5000;
      while (
        !increasedCriteria.includes(constants.criteria.MULTI_CURSOR_PASTES) &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      assert.strictEqual(editor.document.getText(), "Xa\nXb\nc\n");
      assert.deepStrictEqual(increasedCriteria, [
        constants.criteria.NUMBER_OF_PASTES,
        constants.criteria.MULTI_CURSOR_PASTES,
      ]);
    } finally {
      context.subscriptions.forEach((disposable) => disposable.dispose());
      ProgressionController.increaseProgression = originalIncrease;
      config.isListenerEnabled = originalIsListenerEnabled;
      await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });
});
