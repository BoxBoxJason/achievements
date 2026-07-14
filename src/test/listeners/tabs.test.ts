import * as assert from "node:assert";
import * as vscode from "vscode";
import { tabListeners } from "../../listeners/tabs";
import { ProgressionController } from "../../database/controller/progressions";
import { constants } from "../../constants";

suite("Tab Listeners Test Suite", () => {
  test("handleTabsChangedEvent should update simultaneous tabs and editor groups progressions", async () => {
    const updatedCriteria: Record<string, string | number | Date | boolean> =
      {};
    const originalUpdate = ProgressionController.updateProgression;
    ProgressionController.updateProgression = async (
      criteria: string,
      value: string | number | Date | boolean,
    ) => {
      updatedCriteria[criteria] = value;
    };

    try {
      await tabListeners.handleTabsChangedEvent();

      const expectedTabCount = vscode.window.tabGroups.all.reduce(
        (count, group) => count + group.tabs.length,
        0,
      );
      const expectedGroupCount = vscode.window.tabGroups.all.length;

      assert.strictEqual(
        updatedCriteria[constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS],
        expectedTabCount,
      );
      assert.strictEqual(
        updatedCriteria[
          constants.criteria.NUMBER_OF_SIMULTANEOUS_EDITOR_GROUPS
        ],
        expectedGroupCount,
      );
    } finally {
      ProgressionController.updateProgression = originalUpdate;
    }
  });

  test("handleWorkspaceFoldersChangedEvent should update NUMBER_OF_SIMULTANEOUS_WORKSPACE_FOLDERS progression", async () => {
    let updatedCriteria: string | undefined;
    let updatedValue: unknown;
    const originalUpdate = ProgressionController.updateProgression;
    ProgressionController.updateProgression = async (
      criteria: string,
      value: string | number | Date | boolean,
    ) => {
      updatedCriteria = criteria;
      updatedValue = value;
    };

    try {
      await tabListeners.handleWorkspaceFoldersChangedEvent();
      assert.strictEqual(
        updatedCriteria,
        constants.criteria.NUMBER_OF_SIMULTANEOUS_WORKSPACE_FOLDERS,
      );
      assert.strictEqual(typeof updatedValue, "number");
    } finally {
      ProgressionController.updateProgression = originalUpdate;
    }
  });

  test("handleSelectionChangedEvent should count only the transition to multi-cursor", async () => {
    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };

    const makeEvent = (selectionCount: number) =>
      ({
        selections: Array.from({ length: selectionCount }),
      }) as unknown as vscode.TextEditorSelectionChangeEvent;

    try {
      // Ensure we start from a known single-cursor state
      await tabListeners.handleSelectionChangedEvent(makeEvent(1));

      // Transition to multi-cursor: should count
      await tabListeners.handleSelectionChangedEvent(makeEvent(2));
      // Still multi-cursor: should NOT count again
      await tabListeners.handleSelectionChangedEvent(makeEvent(3));

      assert.strictEqual(
        increasedCriteria.filter(
          (criteria) => criteria === constants.criteria.MULTI_CURSOR_SESSIONS,
        ).length,
        1,
      );

      // Back to single cursor
      await tabListeners.handleSelectionChangedEvent(makeEvent(1));
      // Transition to multi-cursor again: should count a second time
      await tabListeners.handleSelectionChangedEvent(makeEvent(2));

      assert.strictEqual(
        increasedCriteria.filter(
          (criteria) => criteria === constants.criteria.MULTI_CURSOR_SESSIONS,
        ).length,
        2,
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("handleTerminalOpenedEvent should increase TERMINALS_OPENED progression", async () => {
    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };

    try {
      await tabListeners.handleTerminalOpenedEvent();
      assert.ok(
        increasedCriteria.includes(constants.criteria.TERMINALS_OPENED),
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });
});
