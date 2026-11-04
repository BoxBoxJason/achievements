import * as assert from "node:assert";
import { formatUnlockDate } from "../../views/format";

suite("Webview Format Test Suite", () => {
  test("formatUnlockDate should format ISO-8601 dates without milliseconds", () => {
    assert.strictEqual(formatUnlockDate("2026-01-02T03:04:05.678Z"), "2026-01-02 @03:04:05");
  });

  test("formatUnlockDate should format SQLite CURRENT_TIMESTAMP dates", () => {
    assert.strictEqual(formatUnlockDate("2026-01-02 03:04:05"), "2026-01-02 @03:04:05");
  });

  test("formatUnlockDate should format Date objects as UTC", () => {
    assert.strictEqual(
      formatUnlockDate(new Date(Date.UTC(2026, 0, 2, 3, 4, 5, 678))),
      "2026-01-02 @03:04:05",
    );
  });

  test("formatUnlockDate should keep dates without time or unparsable values as is", () => {
    assert.strictEqual(formatUnlockDate("2026-01-02"), "2026-01-02");
    assert.strictEqual(formatUnlockDate(""), "");
  });
});
