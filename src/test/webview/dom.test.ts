import * as assert from "node:assert";
import { installDom, uninstallDom } from "./dom";

const GLOBALS = ["window", "document", "navigator", "IS_REACT_ACT_ENVIRONMENT"];

suite("Webview DOM Environment Test Suite", () => {
  test("uninstalling the DOM should restore the globals of the extension host", () => {
    const before = GLOBALS.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));

    installDom();
    try {
      assert.strictEqual(typeof document.createElement, "function");
      assert.strictEqual(window.document, document);
    } finally {
      uninstallDom();
    }

    // Other suites rely on there being no DOM in the extension host
    assert.strictEqual(typeof window, "undefined");
    assert.strictEqual(typeof document, "undefined");
    assert.deepStrictEqual(
      GLOBALS.map((key) => Object.getOwnPropertyDescriptor(globalThis, key)),
      before,
    );
  });
});
