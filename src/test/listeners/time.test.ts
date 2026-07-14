import * as assert from "node:assert";
import * as vscode from "vscode";
import { timeListeners } from "../../listeners/time";
import { ProgressionController } from "../../database/controller/progressions";
import { constants } from "../../constants";

suite("Time Listeners Test Suite", () => {
  test("trackTimeOfDaySession should increase NIGHT_OWL_SESSIONS for late-night hours", async () => {
    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };

    try {
      const midnight = new Date(2026, 0, 1, 2, 30, 0);
      await timeListeners.trackTimeOfDaySession(midnight);

      assert.ok(increasedCriteria.includes(constants.criteria.NIGHT_OWL_SESSIONS));
      assert.ok(
        !increasedCriteria.includes(constants.criteria.EARLY_BIRD_SESSIONS),
      );
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("trackTimeOfDaySession should increase EARLY_BIRD_SESSIONS for early-morning hours", async () => {
    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };

    try {
      const earlyMorning = new Date(2026, 0, 1, 6, 0, 0);
      await timeListeners.trackTimeOfDaySession(earlyMorning);

      assert.ok(
        increasedCriteria.includes(constants.criteria.EARLY_BIRD_SESSIONS),
      );
      assert.ok(!increasedCriteria.includes(constants.criteria.NIGHT_OWL_SESSIONS));
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("trackTimeOfDaySession should not increase either criteria during regular daytime hours", async () => {
    const increasedCriteria: string[] = [];
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (criteria: string) => {
      increasedCriteria.push(criteria);
    };

    try {
      const noon = new Date(2026, 0, 1, 12, 0, 0);
      await timeListeners.trackTimeOfDaySession(noon);

      assert.strictEqual(increasedCriteria.length, 0);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
    }
  });

  test("trackRemoteTimeSpent should increase REMOTE_TIME_SPENT progression when running in a remote environment", async () => {
    const originalRemoteName = Object.getOwnPropertyDescriptor(
      vscode.env,
      "remoteName",
    );
    Object.defineProperty(vscode.env, "remoteName", {
      value: "ssh-remote",
      configurable: true,
    });

    let increasedCriteria: string | undefined;
    let increasedValue: unknown;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async (
      criteria: string,
      increase: number | string = 1,
    ) => {
      increasedCriteria = criteria;
      increasedValue = increase;
    };

    try {
      await timeListeners.trackRemoteTimeSpent(42);
      assert.strictEqual(
        increasedCriteria,
        constants.criteria.REMOTE_TIME_SPENT,
      );
      assert.strictEqual(increasedValue, 42);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
      if (originalRemoteName) {
        Object.defineProperty(vscode.env, "remoteName", originalRemoteName);
      }
    }
  });

  test("trackRemoteTimeSpent should not increase REMOTE_TIME_SPENT progression when running locally", async () => {
    const originalRemoteName = Object.getOwnPropertyDescriptor(
      vscode.env,
      "remoteName",
    );
    Object.defineProperty(vscode.env, "remoteName", {
      value: undefined,
      configurable: true,
    });

    let called = false;
    const originalIncrease = ProgressionController.increaseProgression;
    ProgressionController.increaseProgression = async () => {
      called = true;
    };

    try {
      await timeListeners.trackRemoteTimeSpent(42);
      assert.strictEqual(called, false);
    } finally {
      ProgressionController.increaseProgression = originalIncrease;
      if (originalRemoteName) {
        Object.defineProperty(vscode.env, "remoteName", originalRemoteName);
      }
    }
  });
});
