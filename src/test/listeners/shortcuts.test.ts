import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
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

});
