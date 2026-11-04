import * as assert from "node:assert";
import UserStats from "../../views/components/UserStats";
import { queries, webview } from "../../views/viewconst";
import {
  WebviewDom,
  Rendered,
  installDom,
  uninstallDom,
  render,
  receive,
  postedFor,
} from "./dom";

const { RETRIEVE_PROFILE, SET_PROFILE } = webview.commands;

function profile(achievedCount: number) {
  return {
    username: "dev",
    totalAchievements: 10,
    totalExp: 1234,
    achievedCount,
    timeSpent: { [queries.criteria.TOTAL_TIME_SPENT]: 7200 },
  };
}

suite("Webview UserStats Test Suite", () => {
  let env: WebviewDom;
  let rendered: Rendered | undefined;

  suiteSetup(() => {
    env = installDom();
  });

  suiteTeardown(() => {
    uninstallDom();
  });

  setup(() => {
    env.posted.length = 0;
  });

  teardown(() => {
    rendered?.unmount();
    rendered = undefined;
  });

  test("should request the profile once and show the reply", () => {
    rendered = render(<UserStats />);
    assert.strictEqual(postedFor(RETRIEVE_PROFILE).length, 1);

    receive(SET_PROFILE, profile(4));
    receive(SET_PROFILE, profile(5));
    assert.strictEqual(
      postedFor(RETRIEVE_PROFILE).length,
      1,
      "A reply must not trigger another request",
    );
    const text = rendered.container.textContent ?? "";
    assert.match(text, /5 of 10 achievements earned/);
    assert.match(text, /2\.0h/);
  });

  test("should stop listening once unmounted", () => {
    rendered = render(<UserStats />);
    rendered.unmount();
    rendered = undefined;
    receive(SET_PROFILE, profile(4)); // must not update an unmounted component
    assert.strictEqual(postedFor(RETRIEVE_PROFILE).length, 1);
  });
});
