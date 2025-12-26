import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileListeners } from "../../listeners/files";
import { ProgressionController } from "../../database/controller/progressions";
import { constants } from "../../constants";

suite("File Listeners Test Suite", () => {
  const tempDir = path.join(__dirname, "temp_files_test");

  suiteSetup(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
  });

  suiteTeardown(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("handleCreateEvent should increase FILES_CREATED progression", async () => {
    const testFile = path.join(tempDir, "test.ts"); // Use .ts for language detection
    fs.writeFileSync(testFile, "content");
    const uri = vscode.Uri.file(testFile);

    let increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };

    try {
      await fileListeners.handleCreateEvent(uri);
      assert.ok(increasedCriteria.includes(constants.criteria.FILES_CREATED));
      // Check for language specific criteria if .ts is mapped
      // constants.labels.LANGUAGES_EXTENSIONS['.ts'] should be 'TypeScript'
      // So criteria: FILES_CREATED_TypeScript
      const langCriteria = constants.criteria.FILES_CREATED_LANGUAGE.replace(
        "%s",
        "TypeScript"
      );
      if (constants.labels.LANGUAGES_EXTENSIONS[".ts"] === "TypeScript") {
        assert.ok(increasedCriteria.includes(langCriteria));
      }
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleCreateEvent should increase DIRECTORY_CREATED progression", async () => {
    const testDir = path.join(tempDir, "test_dir");
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    const uri = vscode.Uri.file(testDir);

    let increasedCriteria: string | undefined;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      if (criteria === constants.criteria.DIRECTORY_CREATED) {
        increasedCriteria = criteria;
      }
    };

    try {
      await fileListeners.handleCreateEvent(uri);
      assert.strictEqual(
        increasedCriteria,
        constants.criteria.DIRECTORY_CREATED
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleDeleteEvent should increase RESOURCE_DELETED progression", async () => {
    const testFile = path.join(tempDir, "test_del.txt");
    // File doesn't need to exist
    const uri = vscode.Uri.file(testFile);

    let increasedCriteria: string | undefined;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      if (criteria === constants.criteria.RESOURCE_DELETED) {
        increasedCriteria = criteria;
      }
    };

    try {
      await fileListeners.handleDeleteEvent(uri);
      assert.strictEqual(
        increasedCriteria,
        constants.criteria.RESOURCE_DELETED
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTextChangedEvent should batch line updates", async () => {
    const testFile = path.join(tempDir, "test.ts");
    const uri = vscode.Uri.file(testFile);
    const document = {
      fileName: testFile,
      uri: uri,
    } as vscode.TextDocument;

    const event = {
      document: document,
      reason: undefined,
      contentChanges: [
        {
          range: new vscode.Range(0, 0, 0, 0),
          rangeOffset: 0,
          rangeLength: 0,
          text: "\n", // 1 line
        },
        {
          range: new vscode.Range(1, 0, 1, 0),
          rangeOffset: 1,
          rangeLength: 0,
          text: "line1\nline2\n", // 2 lines
        },
      ],
    } as vscode.TextDocumentChangeEvent;

    let callCount = 0;
    let totalLines = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (
      criteria: string,
      amount: number | string = 1
    ) => {
      if (criteria === constants.criteria.LINES_OF_CODE) {
        callCount++;
        totalLines += Number(amount);
      }
    };

    try {
      await fileListeners.handleTextChangedEvent(event);
      assert.strictEqual(
        callCount,
        1,
        "Should call increaseProgression once for generic lines"
      );
      assert.strictEqual(totalLines, 3, "Should sum up all lines (1 + 2)");
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });
});
