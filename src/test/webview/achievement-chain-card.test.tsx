import * as assert from "node:assert";
import AchievementChainCard from "../../views/components/AchievementChainCard";
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
} from "./dom";
import { makeEntry, makeTier } from "./fixtures";

const { RETRIEVE_ACHIEVEMENT_CHAIN_TIERS, DISPLAY_ACHIEVEMENT_CHAIN_TIERS } = webview.commands;
const LOADING = "Loading tiers…";

// A 3 tiers chain, currently on its second tier
function tieredEntry(overrides: Partial<AchievementChainEntry> = {}): AchievementChainEntry {
  return makeEntry("Creator %d", {
    tierCount: 3,
    achievedCount: 1,
    lastAchievedAt: "2026-01-02 03:04:05",
    progress: 0.456,
    current: makeTier(2, { title: "Creator 2", chain: "Creator %d", description: "Create 20 files" }),
    ...overrides,
  });
}

const TIERS = [
  makeTier(1, { title: "Creator 1", achieved: true, achievedAt: "2026-01-02T03:04:05.000Z" }),
  makeTier(2, { title: "Creator 2" }),
  makeTier(3, { title: "Creator 3" }),
];

function toggle(rendered: Rendered): HTMLButtonElement {
  const button = rendered.query<HTMLButtonElement>("button[aria-expanded]");
  assert.ok(button, "the card should have an expand button");
  return button;
}

function tierRequests(): unknown[] {
  return postedFor(RETRIEVE_ACHIEVEMENT_CHAIN_TIERS).map((message) => message.data);
}

suite("Webview AchievementChainCard Test Suite", () => {
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

  test("a tiered chain should render its current tier, tier count, pips and progress", () => {
    rendered = render(<AchievementChainCard entry={tieredEntry()} />);

    assert.strictEqual(rendered.query("h3")?.textContent, "Creator 2");
    assert.ok(rendered.text.includes("Create 20 files"));
    assert.ok(rendered.text.includes("1 / 3 tiers"));
    assert.strictEqual(rendered.queryAll(".tier-pips span").length, 3);

    const progress = rendered.query('[role="progressbar"]');
    assert.ok(progress);
    assert.strictEqual(progress.getAttribute("aria-valuenow"), "45");
    assert.strictEqual(progress.getAttribute("aria-label"), "Next tier");
    assert.ok(rendered.text.includes("Next tier: 45%"));
    assert.ok(rendered.text.includes("Last unlocked: 2026-01-02 @03:04:05"));

    const icon = rendered.query<HTMLImageElement>("img");
    assert.strictEqual(icon?.getAttribute("src"), "test-icon.png");
    assert.strictEqual(icon?.getAttribute("alt"), "Creator 2 Icon");

    // Collapsed by default: nothing requested yet
    assert.strictEqual(toggle(rendered).getAttribute("aria-expanded"), "false");
    assert.deepStrictEqual(tierRequests(), []);
  });

  test("a single tier chain should not be expandable nor show tier counts", () => {
    rendered = render(<AchievementChainCard entry={makeEntry("Solo", { progress: 0.5 })} />);

    assert.strictEqual(rendered.query("button"), null);
    assert.strictEqual(rendered.query(".tier-pips"), null);
    assert.ok(!rendered.text.includes("tiers"));
    assert.ok(rendered.text.includes("Progress: 50%"));
    assert.ok(rendered.text.includes("Not Achieved"));
  });

  test("the chain status should reflect the unlocked tiers", () => {
    rendered = render(
      <AchievementChainCard entry={makeEntry("Solo", { achievedCount: 1, lastAchievedAt: "2026-03-04T05:06:07.890Z" })} />,
    );
    assert.ok(rendered.text.includes("Unlocked: 2026-03-04 @05:06:07"));

    rendered.render(
      <AchievementChainCard entry={tieredEntry({ achievedCount: 3, progress: null, lastAchievedAt: null })} />,
    );
    assert.ok(rendered.text.includes("Completed: Date not available"));
    // Completed chains have no progress bar
    assert.strictEqual(rendered.query('[role="progressbar"]'), null);
  });

  test("long chains should not render one pip per tier", () => {
    rendered = render(<AchievementChainCard entry={tieredEntry({ tierCount: 21 })} />);
    assert.strictEqual(rendered.query(".tier-pips"), null);
    assert.ok(rendered.text.includes("1 / 21 tiers"));
  });

  test("a missing icon should fall back to the error icon", () => {
    rendered = render(
      <AchievementChainCard entry={makeEntry("Unknown", { current: makeTier(1, { icon: "MISSING" }) })} />,
    );
    assert.strictEqual(rendered.query("img")?.getAttribute("src"), "error.png");
  });

  test("expanding should request the tiers and show a loading state until they arrive", () => {
    rendered = render(<AchievementChainCard entry={tieredEntry()} />);
    click(toggle(rendered));

    assert.strictEqual(toggle(rendered).getAttribute("aria-expanded"), "true");
    assert.deepStrictEqual(tierRequests(), [{ chain: "Creator %d" }]);
    assert.ok(rendered.text.includes(LOADING));
    assert.strictEqual(rendered.query(".tier-list"), null);

    receive(DISPLAY_ACHIEVEMENT_CHAIN_TIERS, { chain: "Creator %d", tiers: TIERS });
    assert.ok(!rendered.text.includes(LOADING));
    const items = rendered.queryAll(".tier-list li");
    assert.strictEqual(items.length, 3);
    assert.ok(items[0].textContent?.includes("Creator 1"));
    assert.ok(items[0].textContent?.includes("2026-01-02 @03:04:05"));
    assert.ok(items[1].textContent?.includes("Not Achieved"));
    // The current tier of the chain is highlighted
    assert.deepStrictEqual(
      items.map((item) => item.getAttribute("data-current")),
      ["false", "true", "false"],
    );
  });

  test("tiers of another chain should be ignored", () => {
    rendered = render(<AchievementChainCard entry={tieredEntry()} />);
    click(toggle(rendered));

    receive(DISPLAY_ACHIEVEMENT_CHAIN_TIERS, {
      chain: "Speaker %d",
      tiers: [makeTier(9, { title: "Speaker 1" })],
    });
    assert.ok(rendered.text.includes(LOADING));
    assert.ok(!rendered.text.includes("Speaker 1"));

    receive(DISPLAY_ACHIEVEMENT_CHAIN_TIERS, { chain: "Creator %d", tiers: TIERS });
    assert.strictEqual(rendered.queryAll(".tier-list li").length, 3);

    receive(DISPLAY_ACHIEVEMENT_CHAIN_TIERS, {
      chain: "Speaker %d",
      tiers: [makeTier(9, { title: "Speaker 1" })],
    });
    assert.strictEqual(rendered.queryAll(".tier-list li").length, 3);
    assert.ok(!rendered.text.includes("Speaker 1"));
  });

  test("unlocking a tier while expanded should request the tiers again", () => {
    rendered = render(<AchievementChainCard entry={tieredEntry()} />);
    click(toggle(rendered));
    receive(DISPLAY_ACHIEVEMENT_CHAIN_TIERS, { chain: "Creator %d", tiers: TIERS });
    assert.strictEqual(tierRequests().length, 1);

    // Same entry content, new object: no new request
    rendered.render(<AchievementChainCard entry={tieredEntry()} />);
    assert.strictEqual(tierRequests().length, 1);

    rendered.render(<AchievementChainCard entry={tieredEntry({ achievedCount: 2 })} />);
    assert.deepStrictEqual(tierRequests(), [{ chain: "Creator %d" }, { chain: "Creator %d" }]);

    const updated = TIERS.map((tier) => (tier.id === 2 ? { ...tier, achieved: true, achievedAt: "2026-02-03 04:05:06" } : tier));
    receive(DISPLAY_ACHIEVEMENT_CHAIN_TIERS, { chain: "Creator %d", tiers: updated });
    assert.ok(rendered.queryAll(".tier-list li")[1].textContent?.includes("2026-02-03 @04:05:06"));
  });

  test("unlocking a tier while collapsed should not request the tiers", () => {
    rendered = render(<AchievementChainCard entry={tieredEntry()} />);
    rendered.render(<AchievementChainCard entry={tieredEntry({ achievedCount: 2 })} />);
    assert.deepStrictEqual(tierRequests(), []);
  });

  test("collapsing and unmounting should remove the message listener", () => {
    rendered = render(<AchievementChainCard entry={tieredEntry()} />);
    assert.strictEqual(env.messageListeners.size, 0);

    click(toggle(rendered));
    assert.strictEqual(env.messageListeners.size, 1);

    // Re-requesting the tiers replaces the listener rather than adding one
    rendered.render(<AchievementChainCard entry={tieredEntry({ achievedCount: 2 })} />);
    assert.strictEqual(env.messageListeners.size, 1);

    click(toggle(rendered));
    assert.strictEqual(toggle(rendered).getAttribute("aria-expanded"), "false");
    assert.strictEqual(env.messageListeners.size, 0);
    assert.strictEqual(rendered.query(".tier-list"), null);

    click(toggle(rendered));
    assert.strictEqual(env.messageListeners.size, 1);
    assert.strictEqual(tierRequests().length, 3);

    rendered.unmount();
    rendered = undefined;
    assert.strictEqual(env.messageListeners.size, 0);
  });
});
