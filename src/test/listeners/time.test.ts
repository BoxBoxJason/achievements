import * as assert from "node:assert";
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
});
