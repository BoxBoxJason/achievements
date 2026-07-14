import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { constants } from "../constants";

suite("Constants Test Suite", () => {
  // Assuming the tests are running from dist/test
  const projectRoot = path.resolve(__dirname, "../../");

  test("ignore.files/directories defaults match package.json configuration defaults", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8"),
    ) as {
      contributes: {
        configuration: { properties: Record<string, { default?: unknown }> }[];
      };
    };
    const properties = packageJson.contributes.configuration[0].properties;

    assert.deepStrictEqual(
      properties["achievements.ignore.files"].default,
      [...constants.ignore.DEFAULT_FILES],
    );
    assert.deepStrictEqual(
      properties["achievements.ignore.directories"].default,
      [...constants.ignore.DEFAULT_DIRECTORIES],
    );
  });
});
