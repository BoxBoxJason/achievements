import * as assert from "node:assert";
import AchievementHolder from "../../views/components/AchievementsHolder";
import type { AchievementChainEntry } from "../../views/components/AchievementChainCard";
import { webview } from "../../views/viewconst";
import {
  WebviewDom,
  Rendered,
  installDom,
  uninstallDom,
  render,
  receive,
  click,
  postedFor,
  lastPostedFor,
} from "./dom";
import { makeEntry } from "./fixtures";

const { RETRIEVE_ACHIEVEMENT_CHAINS, DISPLAY_ACHIEVEMENT_CHAINS } = webview.commands;
const EMPTY_MESSAGE = "No achievements match these filters.";

interface ChainsRequest {
  count: boolean;
  offset: number;
  limit: number;
  requestId: number;
  [filter: string]: unknown;
}

function lastRequest(): ChainsRequest {
  return lastPostedFor<ChainsRequest>(RETRIEVE_ACHIEVEMENT_CHAINS);
}

// Replies to a chains request like the extension does, echoing its requestId
function reply(requestId: number, chains: AchievementChainEntry[], count = chains.length): void {
  receive(DISPLAY_ACHIEVEMENT_CHAINS, { chains, count, requestId });
}

function titles(rendered: Rendered): string[] {
  return rendered.queryAll("h3").map((title) => title.textContent ?? "");
}

function pageLabel(rendered: Rendered): string {
  return rendered.query(".action-buttons span")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

suite("Webview AchievementsHolder Test Suite", () => {
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

  test("mounting should request the first page of chains with the filters and a request id", () => {
    const filters = { title: "copy", status: "unlocked", sortCriteria: "title" };
    rendered = render(<AchievementHolder filters={filters} limit={10} />);

    const requests = postedFor(RETRIEVE_ACHIEVEMENT_CHAINS);
    assert.strictEqual(requests.length, 1);
    const request = lastRequest();
    assert.strictEqual(request.count, true);
    assert.strictEqual(request.offset, 0);
    assert.strictEqual(request.limit, 10);
    assert.strictEqual(request.title, "copy");
    assert.strictEqual(request.status, "unlocked");
    assert.strictEqual(request.sortCriteria, "title");
    assert.strictEqual(typeof request.requestId, "number");
  });

  test("before any response, neither chains nor the empty message should be shown", () => {
    rendered = render(<AchievementHolder filters={{}} limit={10} />);

    // This is also what stays on screen when the extension never replies
    // (e.g. it failed to query the chains): an empty list paged "1 / 1"
    assert.ok(!rendered.text.includes(EMPTY_MESSAGE));
    assert.deepStrictEqual(titles(rendered), []);
    assert.strictEqual(pageLabel(rendered), "1 / 1");
    assert.strictEqual(rendered.button("Previous page").disabled, true);
    assert.strictEqual(rendered.button("Next page").disabled, true);
  });

  test("a response without chains should show the empty message, until chains arrive", () => {
    rendered = render(<AchievementHolder filters={{}} limit={10} />);

    reply(lastRequest().requestId, [], 0);
    assert.ok(rendered.text.includes(EMPTY_MESSAGE));
    assert.strictEqual(pageLabel(rendered), "1 / 1");
    assert.strictEqual(rendered.button("Next page").disabled, true);

    rendered.render(<AchievementHolder filters={{ title: "a" }} limit={10} />);
    reply(lastRequest().requestId, [makeEntry("A")]);
    assert.ok(!rendered.text.includes(EMPTY_MESSAGE));
    assert.deepStrictEqual(titles(rendered), ["A title"]);
  });

  test("a response should render one card per chain and the page count", () => {
    rendered = render(<AchievementHolder filters={{}} limit={10} />);

    reply(lastRequest().requestId, [makeEntry("A"), makeEntry("B"), makeEntry("C")], 25);
    assert.deepStrictEqual(titles(rendered), ["A title", "B title", "C title"]);
    assert.strictEqual(pageLabel(rendered), "1 / 3");
    assert.strictEqual(rendered.button("Previous page").disabled, true);
    assert.strictEqual(rendered.button("Next page").disabled, false);
  });

  test("the page buttons should move the offset by the limit and stop at the last page", () => {
    rendered = render(<AchievementHolder filters={{}} limit={10} />);
    reply(lastRequest().requestId, [makeEntry("A")], 30);

    click(rendered.button("Next page"));
    assert.strictEqual(lastRequest().offset, 10);
    reply(lastRequest().requestId, [makeEntry("B")], 30);
    assert.strictEqual(pageLabel(rendered), "2 / 3");
    assert.strictEqual(rendered.button("Previous page").disabled, false);
    assert.strictEqual(rendered.button("Next page").disabled, false);

    click(rendered.button("Next page"));
    assert.strictEqual(lastRequest().offset, 20);
    reply(lastRequest().requestId, [makeEntry("C")], 30);
    // offset + limit === count: there is no next page
    assert.strictEqual(pageLabel(rendered), "3 / 3");
    assert.strictEqual(rendered.button("Next page").disabled, true);

    click(rendered.button("Previous page"));
    assert.strictEqual(lastRequest().offset, 10);
    reply(lastRequest().requestId, [makeEntry("B")], 30);
    assert.strictEqual(pageLabel(rendered), "2 / 3");
  });

  test("changing the filters should request the first page again", () => {
    const filters = { status: "remaining" };
    rendered = render(<AchievementHolder filters={filters} limit={10} />);
    reply(lastRequest().requestId, [makeEntry("A")], 50);
    click(rendered.button("Next page"));
    click(rendered.button("Next page"));
    assert.strictEqual(lastRequest().offset, 20);
    reply(lastRequest().requestId, [makeEntry("C")], 50);
    assert.strictEqual(pageLabel(rendered), "3 / 5");

    // Re-rendering with the same filters keeps the page
    const before = postedFor(RETRIEVE_ACHIEVEMENT_CHAINS).length;
    rendered.render(<AchievementHolder filters={filters} limit={10} />);
    assert.strictEqual(postedFor(RETRIEVE_ACHIEVEMENT_CHAINS).length, before);
    assert.strictEqual(pageLabel(rendered), "3 / 5");

    rendered.render(<AchievementHolder filters={{ status: "completed" }} limit={10} />);
    const request = lastRequest();
    assert.strictEqual(request.offset, 0);
    assert.strictEqual(request.status, "completed");
    assert.strictEqual(pageLabel(rendered), "1 / 5");
    assert.strictEqual(rendered.button("Previous page").disabled, true);

    // The next page is counted from the first page of the new filters
    reply(request.requestId, [makeEntry("D")], 50);
    click(rendered.button("Next page"));
    assert.strictEqual(lastRequest().offset, 10);
    assert.strictEqual(lastRequest().status, "completed");
  });

  test("responses to outdated requests should be ignored", () => {
    rendered = render(<AchievementHolder filters={{ title: "a" }} limit={10} />);
    const first = lastRequest().requestId;
    rendered.render(<AchievementHolder filters={{ title: "ab" }} limit={10} />);
    const second = lastRequest().requestId;
    assert.notStrictEqual(first, second);

    // The outdated response arrives first: nothing is displayed yet
    reply(first, [makeEntry("Stale")], 1);
    assert.deepStrictEqual(titles(rendered), []);
    assert.ok(!rendered.text.includes(EMPTY_MESSAGE));

    reply(second, [makeEntry("Fresh")], 1);
    assert.deepStrictEqual(titles(rendered), ["Fresh title"]);

    // An outdated response arriving last doesn't replace the current one
    reply(first, [makeEntry("Stale")], 40);
    assert.deepStrictEqual(titles(rendered), ["Fresh title"]);
    assert.strictEqual(pageLabel(rendered), "1 / 1");

    // Nor does a response without request id
    receive(DISPLAY_ACHIEVEMENT_CHAINS, { chains: [makeEntry("Unknown")], count: 1 });
    assert.deepStrictEqual(titles(rendered), ["Fresh title"]);
  });

  test("messages for other commands should be ignored", () => {
    rendered = render(<AchievementHolder filters={{}} limit={10} />);
    reply(lastRequest().requestId, [makeEntry("A")], 1);

    receive(webview.commands.DISPLAY_ACHIEVEMENT_CHAIN_TIERS, { chain: "A", tiers: [] });
    receive(webview.commands.DISPLAY_ACHIEVEMENTS_FILTERS, { categories: [], labels: [] });
    assert.deepStrictEqual(titles(rendered), ["A title"]);
  });

  test("unmounting should remove the message listener", () => {
    rendered = render(<AchievementHolder filters={{}} limit={10} />);
    assert.strictEqual(env.messageListeners.size, 1);
    rendered.unmount();
    rendered = undefined;
    assert.strictEqual(env.messageListeners.size, 0);
  });
});
