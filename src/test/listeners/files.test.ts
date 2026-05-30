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

    const increasedCriteria: string[] = [];
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
        "TypeScript",
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
        constants.criteria.DIRECTORY_CREATED,
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
        constants.criteria.RESOURCE_DELETED,
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleCreateEvent should ignore files under .git and node_modules", async () => {
    const ignoredGitUri = vscode.Uri.file(
      path.join(tempDir, ".git", "objects", "tmp"),
    );
    const ignoredNodeModulesUri = vscode.Uri.file(
      path.join(tempDir, "node_modules", "pkg", "index.js"),
    );

    let callCount = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async () => {
      callCount++;
    };

    try {
      await fileListeners.handleCreateEvent(ignoredGitUri);
      await fileListeners.handleCreateEvent(ignoredNodeModulesUri);
      assert.strictEqual(callCount, 0);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleDeleteEvent should ignore lock files", async () => {
    const ignoredUri = vscode.Uri.file(path.join(tempDir, "package-lock.json"));

    let callCount = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async () => {
      callCount++;
    };

    try {
      await fileListeners.handleDeleteEvent(ignoredUri);
      assert.strictEqual(callCount, 0);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleRenameEvent should only count non-ignored paths", async () => {
    const event: vscode.FileRenameEvent = {
      files: [
        {
          oldUri: vscode.Uri.file(path.join(tempDir, "src", "a.ts")),
          newUri: vscode.Uri.file(path.join(tempDir, "src", "b.ts")),
        },
        {
          oldUri: vscode.Uri.file(path.join(tempDir, ".git", "tmpA")),
          newUri: vscode.Uri.file(path.join(tempDir, ".git", "tmpB")),
        },
      ],
    };

    const calls: Array<{ criteria: string; amount: number | string }> = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (
      criteria: string,
      amount: number | string = 1,
    ) => {
      calls.push({ criteria, amount });
    };

    try {
      await fileListeners.handleRenameEvent(event);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0]?.criteria, constants.criteria.FILES_RENAMED);
      assert.strictEqual(Number(calls[0]?.amount), 1);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTextChangedEvent should ignore files in generated folders", async () => {
    const testFile = path.join(tempDir, "node_modules", "bundle.ts");
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
          text: "new line\n",
        },
      ],
    } as vscode.TextDocumentChangeEvent;

    let callCount = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async () => {
      callCount++;
    };

    try {
      await fileListeners.handleTextChangedEvent(event);
      assert.strictEqual(callCount, 0);
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
      lineAt: (_line: number) => ({ text: "const x = 1;" }),
    } as unknown as vscode.TextDocument;

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
    } as unknown as vscode.TextDocumentChangeEvent;

    let callCount = 0;
    let totalLines = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (
      criteria: string,
      amount: number | string = 1,
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
        "Should call increaseProgression once for generic lines",
      );
      assert.strictEqual(totalLines, 3, "Should sum up all lines (1 + 2)");
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTextChangedEvent should increase LINES_OF_COMMENTS for pasted comment lines", async () => {
    const testFile = path.join(tempDir, "test_comment.ts");
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
          text: "// single line comment\n",
        },
        {
          range: new vscode.Range(1, 0, 1, 0),
          rangeOffset: 1,
          rangeLength: 0,
          text: "/*\n * block comment\n */\n",
        },
      ],
    } as vscode.TextDocumentChangeEvent;

    let commentLinesTotal = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (
      criteria: string,
      amount: number | string = 1,
    ) => {
      if (criteria === constants.criteria.LINES_OF_COMMENTS) {
        commentLinesTotal += Number(amount);
      }
    };

    try {
      await fileListeners.handleTextChangedEvent(event);
      assert.strictEqual(
        commentLinesTotal,
        4,
        "Should count: //, /*, * block comment, */",
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTextChangedEvent should increase LINES_OF_COMMENTS when Enter is pressed after typing a comment", async () => {
    const testFile = path.join(tempDir, "test_typed_comment.ts");
    const uri = vscode.Uri.file(testFile);
    // Simulate pressing Enter at the end of a comment line already in the document
    const document = {
      fileName: testFile,
      uri: uri,
      lineAt: (_line: number) => ({ text: "// typed comment line" }),
    } as unknown as vscode.TextDocument;

    const event = {
      document: document,
      reason: undefined,
      contentChanges: [
        {
          range: new vscode.Range(0, 21, 0, 21),
          rangeOffset: 21,
          rangeLength: 0,
          text: "\n",
        },
      ],
    } as vscode.TextDocumentChangeEvent;

    let commentLinesTotal = 0;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (
      criteria: string,
      amount: number | string = 1,
    ) => {
      if (criteria === constants.criteria.LINES_OF_COMMENTS) {
        commentLinesTotal += Number(amount);
      }
    };

    try {
      await fileListeners.handleTextChangedEvent(event);
      assert.strictEqual(
        commentLinesTotal,
        1,
        "Pressing Enter at end of a comment line should count 1 comment line",
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTextChangedEvent should not count Enter after a non-comment line as LINES_OF_COMMENTS", async () => {
    const testFile = path.join(tempDir, "test_enter_code.ts");
    const uri = vscode.Uri.file(testFile);
    const document = {
      fileName: testFile,
      uri: uri,
      lineAt: (_line: number) => ({ text: "const x = 42;" }),
    } as unknown as vscode.TextDocument;

    const event = {
      document: document,
      reason: undefined,
      contentChanges: [
        {
          range: new vscode.Range(0, 13, 0, 13),
          rangeOffset: 13,
          rangeLength: 0,
          text: "\n",
        },
      ],
    } as vscode.TextDocumentChangeEvent;

    let commentLinesCalled = false;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      if (criteria === constants.criteria.LINES_OF_COMMENTS) {
        commentLinesCalled = true;
      }
    };

    try {
      await fileListeners.handleTextChangedEvent(event);
      assert.strictEqual(
        commentLinesCalled,
        false,
        "Pressing Enter after a code line should not count as a comment",
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTextChangedEvent should not count non-comment lines as LINES_OF_COMMENTS", async () => {
    const testFile = path.join(tempDir, "test_no_comment.ts");
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
          text: "const x = 1;\nconst y = 2;\n",
        },
      ],
    } as vscode.TextDocumentChangeEvent;

    let commentLinesCalled = false;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      if (criteria === constants.criteria.LINES_OF_COMMENTS) {
        commentLinesCalled = true;
      }
    };

    try {
      await fileListeners.handleTextChangedEvent(event);
      assert.strictEqual(
        commentLinesCalled,
        false,
        "Should not count code lines as comments",
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTextChangedEvent should recognize various comment styles", async () => {
    const testFile = path.join(tempDir, "test_comment_styles.ts");
    const uri = vscode.Uri.file(testFile);
    const document = {
      fileName: testFile,
      uri: uri,
    } as vscode.TextDocument;

    const commentStyles = [
      "// C-style single-line\n",
      "/* C-style block open\n",
      " * block continuation\n",
      " */\n",
      "# hash style\n",
      "-- SQL style\n",
      "% matlab style\n",
      "<!-- HTML comment\n",
    ];

    for (const commentLine of commentStyles) {
      const event = {
        document: document,
        reason: undefined,
        contentChanges: [
          {
            range: new vscode.Range(0, 0, 0, 0),
            rangeOffset: 0,
            rangeLength: 0,
            text: commentLine,
          },
        ],
      } as vscode.TextDocumentChangeEvent;

      let counted = false;
      const originalIncrease = ProgressionController.increaseProgression;
      ProgressionController.increaseProgression = async (criteria: string) => {
        if (criteria === constants.criteria.LINES_OF_COMMENTS) {
          counted = true;
        }
      };

      try {
        await fileListeners.handleTextChangedEvent(event);
        assert.strictEqual(
          counted,
          true,
          `Should count as comment: ${JSON.stringify(commentLine)}`,
        );
      } finally {
        ProgressionController.increaseProgression = originalIncrease;
      }
    }
  });

  test("handleDiagnosticChangedEvent should ignore configured URIs", async () => {
    const ignoredUri = vscode.Uri.file(
      path.join(tempDir, "node_modules", "broken.ts"),
    );

    const originalIncrease = ProgressionController.increaseProgression;
    const originalGetDiagnostics = vscode.languages.getDiagnostics;
    let progressionCalls = 0;

    ProgressionController.increaseProgression = async () => {
      progressionCalls++;
    };

    (vscode.languages as any).getDiagnostics = () => [
      { severity: vscode.DiagnosticSeverity.Error },
    ];

    try {
      await fileListeners.handleDiagnosticChangedEvent({
        uris: [ignoredUri],
      } as vscode.DiagnosticChangeEvent);

      await fileListeners.handleDiagnosticChangedEvent({
        uris: [ignoredUri],
      } as vscode.DiagnosticChangeEvent);

      assert.strictEqual(progressionCalls, 0);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
      (vscode.languages as any).getDiagnostics = originalGetDiagnostics;
    }
  });
});
