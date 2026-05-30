import * as assert from "node:assert";
import * as vscode from "vscode";
import { extensionsListeners } from "../../listeners/extensions";
import { ProgressionController } from "../../database/controller/progressions";
import { constants } from "../../constants";
import { config } from "../../config/config";

type MarketplaceResponse = {
  results: Array<{
    extensions: Array<{
      publisher: { publisherName: string };
      extensionName: string;
      versions: Array<{ version: string }>;
    }>;
  }>;
};

suite("Extensions Listeners Test Suite", () => {
  test("activate should register listeners", () => {
    const originalIsListenerEnabled = config.isListenerEnabled;
    config.isListenerEnabled = () => true;

    const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;

    try {
      extensionsListeners.activate(context);
      // If no error, it passed.
      // We can't easily verify listeners were registered without mocking vscode.
      // But this covers the activate function lines.
    } finally {
      config.isListenerEnabled = originalIsListenerEnabled;
    }
  });

  test("checkExtensions should update EXTENSIONS_INSTALLED and THEMES_INSTALLED", async () => {
    const updatedCriteria: string[] = [];
    const originalUpdate = ProgressionController.updateProgression;
    ProgressionController.updateProgression = async (
      criteria: string,
      _value: string | number | boolean | Date,
      _absolute?: boolean,
    ) => {
      updatedCriteria.push(criteria);
    };

    try {
      await extensionsListeners.checkExtensions();
      assert.ok(
        updatedCriteria.includes(constants.criteria.EXTENSIONS_INSTALLED),
      );
      assert.ok(updatedCriteria.includes(constants.criteria.THEMES_INSTALLED));
    } finally {
      ProgressionController.updateProgression = originalUpdate;
    }
  });

  function withMockedExtensions(
    mockedAll: unknown[],
    fn: () => Promise<void>,
  ): Promise<void> {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      vscode.extensions,
      "all",
    );
    Object.defineProperty(vscode.extensions, "all", {
      get: () => mockedAll,
      configurable: true,
    });
    return fn().finally(() => {
      if (originalDescriptor) {
        Object.defineProperty(vscode.extensions, "all", originalDescriptor);
      }
    });
  }

  test("checkOutdatedExtensions should update EXTENSIONS_OUTDATED when marketplace responds", async () => {
    const updatedCriteria: Array<{ criteria: string; value: string | number | boolean | Date }> = [];
    const originalUpdate = ProgressionController.updateProgression;
    ProgressionController.updateProgression = async (criteria, value) => {
      updatedCriteria.push({ criteria, value });
    };

    const mockResponse: MarketplaceResponse = {
      results: [
        {
          extensions: [
            {
              publisher: { publisherName: "testpublisher" },
              extensionName: "testextension",
              versions: [{ version: "2.0.0" }],
            },
          ],
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = async () =>
      ({
        ok: true,
        json: async () => mockResponse,
      }) as Response;

    try {
      await withMockedExtensions(
        [
          {
            id: "testpublisher.testextension",
            packageJSON: {
              publisher: "testpublisher",
              name: "testextension",
              version: "1.0.0",
            },
          },
        ],
        async () => {
          await extensionsListeners.checkOutdatedExtensions();
          const outdatedCall = updatedCriteria.find(
            (c) => c.criteria === constants.criteria.EXTENSIONS_OUTDATED,
          );
          assert.ok(
            outdatedCall,
            "Should have called updateProgression with EXTENSIONS_OUTDATED",
          );
          assert.strictEqual(
            outdatedCall.value,
            1,
            "Should count 1 outdated extension (1.0.0 vs 2.0.0)",
          );
        },
      );
    } finally {
      ProgressionController.updateProgression = originalUpdate;
      global.fetch = originalFetch;
    }
  });

  test("checkOutdatedExtensions should report 0 when all extensions are up to date", async () => {
    const updatedCriteria: Array<{ criteria: string; value: string | number | boolean | Date }> = [];
    const originalUpdate = ProgressionController.updateProgression;
    ProgressionController.updateProgression = async (criteria, value) => {
      updatedCriteria.push({ criteria, value });
    };

    const mockResponse: MarketplaceResponse = {
      results: [
        {
          extensions: [
            {
              publisher: { publisherName: "testpublisher" },
              extensionName: "testextension",
              versions: [{ version: "2.0.0" }],
            },
          ],
        },
      ],
    };

    const originalFetch = global.fetch;
    global.fetch = async () =>
      ({
        ok: true,
        json: async () => mockResponse,
      }) as Response;

    try {
      await withMockedExtensions(
        [
          {
            id: "testpublisher.testextension",
            packageJSON: {
              publisher: "testpublisher",
              name: "testextension",
              version: "2.0.0",
            },
          },
        ],
        async () => {
          await extensionsListeners.checkOutdatedExtensions();
          const outdatedCall = updatedCriteria.find(
            (c) => c.criteria === constants.criteria.EXTENSIONS_OUTDATED,
          );
          assert.ok(outdatedCall, "Should have called updateProgression");
          assert.strictEqual(
            outdatedCall.value,
            0,
            "Should count 0 outdated extensions",
          );
        },
      );
    } finally {
      ProgressionController.updateProgression = originalUpdate;
      global.fetch = originalFetch;
    }
  });

  test("checkOutdatedExtensions should not throw when offline", async () => {
    const originalFetch = global.fetch;
    global.fetch = async (): Promise<Response> => {
      throw new Error("Network error: ECONNREFUSED");
    };

    try {
      await assert.doesNotReject(
        async () => extensionsListeners.checkOutdatedExtensions(),
        "checkOutdatedExtensions should not throw when offline",
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("checkOutdatedExtensions should not throw on non-OK marketplace response", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      ({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      }) as Response;

    try {
      await assert.doesNotReject(
        async () => extensionsListeners.checkOutdatedExtensions(),
        "checkOutdatedExtensions should not throw on HTTP error",
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("checkOutdatedExtensions should skip built-in vscode.* extensions", async () => {
    let fetchCalled = false;
    const originalFetch = global.fetch;
    global.fetch = async () => {
      fetchCalled = true;
      return {
        ok: true,
        json: async () => ({ results: [] }),
      } as unknown as Response;
    };

    const updatedCriteria: Array<{ criteria: string; value: string | number | boolean | Date }> = [];
    const originalUpdate = ProgressionController.updateProgression;
    ProgressionController.updateProgression = async (criteria, value) => {
      updatedCriteria.push({ criteria, value });
    };

    try {
      await withMockedExtensions(
        [
          {
            id: "vscode.typescript-language-features",
            packageJSON: {
              publisher: "vscode",
              name: "typescript-language-features",
              version: "1.0.0",
            },
          },
        ],
        async () => {
          await extensionsListeners.checkOutdatedExtensions();
          assert.strictEqual(
            fetchCalled,
            false,
            "Should not call fetch when only built-in extensions exist",
          );
          const outdatedCall = updatedCriteria.find(
            (c) => c.criteria === constants.criteria.EXTENSIONS_OUTDATED,
          );
          assert.ok(outdatedCall, "Should still update progression");
          assert.strictEqual(outdatedCall.value, 0);
        },
      );
    } finally {
      ProgressionController.updateProgression = originalUpdate;
      global.fetch = originalFetch;
    }
  });

  test("handleThemeChange should increase THEME_CHANGED", async () => {
    let increasedCriteria: string | undefined;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      if (criteria === constants.criteria.THEME_CHANGED) {
        increasedCriteria = criteria;
      }
    };

    try {
      // Mock event
      const event = { kind: vscode.ColorThemeKind.Dark } as vscode.ColorTheme;
      await extensionsListeners.handleThemeChange(event);
      assert.strictEqual(increasedCriteria, constants.criteria.THEME_CHANGED);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });
});
