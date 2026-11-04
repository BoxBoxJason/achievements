import * as assert from "node:assert";
import { webview } from "../../views/viewconst";
import {
  WebviewDom,
  Rendered,
  installDom,
  uninstallDom,
  requireWithDom,
  render,
  receive,
  click,
  changeValue,
  wait,
  postedFor,
  lastPostedFor,
} from "./dom";
import { makeEntry } from "./fixtures";

const {
  RETRIEVE_ACHIEVEMENT_CHAINS,
  DISPLAY_ACHIEVEMENT_CHAINS,
  RETRIEVE_ACHIEVEMENTS_FILTERS,
  DISPLAY_ACHIEVEMENTS_FILTERS,
} = webview.commands;

// Longer than the 250ms debounce of the search input
const SEARCH_DEBOUNCE = 300;

interface ChainsRequest {
  offset: number;
  limit: number;
  requestId: number;
  [filter: string]: unknown;
}

function lastRequest(): ChainsRequest {
  return lastPostedFor<ChainsRequest>(RETRIEVE_ACHIEVEMENT_CHAINS);
}

function chainRequestCount(): number {
  return postedFor(RETRIEVE_ACHIEVEMENT_CHAINS).length;
}

function searchInput(rendered: Rendered): HTMLInputElement {
  const input = rendered.query<HTMLInputElement>('input[aria-label="Search achievements by title"]');
  assert.ok(input);
  return input;
}

// The select of the filter field with the given label
function select(rendered: Rendered, label: string): HTMLSelectElement {
  const field = rendered
    .queryAll(".filter-field")
    .find((candidate) => candidate.textContent?.startsWith(label));
  const element = field?.querySelector("select");
  assert.ok(element, `No "${label}" select`);
  return element;
}

function perPageInput(rendered: Rendered): HTMLInputElement {
  const input = rendered.query<HTMLInputElement>('input[type="number"]');
  assert.ok(input);
  return input;
}

suite("Webview SearchBar and App Test Suite", () => {
  let env: WebviewDom;
  let App: React.FC;
  let rendered: Rendered | undefined;

  suiteSetup(() => {
    env = installDom();
    // index.tsx looks for its container as soon as it is loaded
    App = requireWithDom<typeof import("../../views/index")>("../../views/index").default;
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

  function renderApp(): Rendered {
    rendered = render(<App />);
    receive(DISPLAY_ACHIEVEMENTS_FILTERS, {
      categories: ["git", "files"],
      groups: [],
      labels: ["language", "creator"],
    });
    return rendered;
  }

  // Moves the list to its second page, 50 chains per page by default
  function goToSecondPage(app: Rendered): void {
    receive(DISPLAY_ACHIEVEMENT_CHAINS, {
      chains: [makeEntry("A")],
      count: 200,
      requestId: lastRequest().requestId,
    });
    click(app.button("Next page"));
    assert.strictEqual(lastRequest().offset, 50);
  }

  test("the search bar should request the filter options and list them sorted", () => {
    const app = renderApp();
    assert.strictEqual(postedFor(RETRIEVE_ACHIEVEMENTS_FILTERS).length, 1);

    const options = (element: HTMLSelectElement) =>
      Array.from(element.options).map((option) => option.value);
    assert.deepStrictEqual(options(select(app, "Category")), ["", "files", "git"]);
    assert.deepStrictEqual(options(select(app, "Label")), ["", "creator", "language"]);
  });

  test("the first chains request should use the default filters", () => {
    renderApp();
    const request = lastRequest();
    assert.strictEqual(request.offset, 0);
    assert.strictEqual(request.limit, 50);
    assert.strictEqual(request.title, "");
    assert.strictEqual(request.sortCriteria, "achieved");
    assert.strictEqual(request.sortDirection, "desc");
    // Unset filters are left out of the message
    assert.ok(!("status" in request));
    assert.ok(!("category" in request));
    assert.ok(!("labels" in request));
  });

  const FILTER_CHANGES: ReadonlyArray<{
    name: string;
    change: (app: Rendered) => void | Promise<void>;
    expected: Record<string, unknown>;
  }> = [
    {
      name: "search title",
      change: async (app) => {
        changeValue(searchInput(app), "copy");
        await wait(SEARCH_DEBOUNCE);
      },
      expected: { title: "copy" },
    },
    {
      name: "status",
      change: (app) => click(app.button("Completed")),
      expected: { status: "completed" },
    },
    {
      name: "category",
      change: (app) => changeValue(select(app, "Category"), "git"),
      expected: { category: "git" },
    },
    {
      name: "label",
      change: (app) => changeValue(select(app, "Label"), "creator"),
      expected: { labels: ["creator"] },
    },
    {
      name: "sort criteria",
      change: (app) => changeValue(select(app, "Sort by"), "title"),
      expected: { sortCriteria: "title" },
    },
    {
      name: "sort direction",
      change: (app) => click(app.button("Descending, switch to ascending")),
      expected: { sortDirection: "asc" },
    },
    {
      name: "page size",
      change: (app) => changeValue(perPageInput(app), "20"),
      expected: { limit: 20 },
    },
  ];

  for (const { name, change, expected } of FILTER_CHANGES) {
    test(`changing the ${name} should go back to the first page`, async () => {
      const app = renderApp();
      goToSecondPage(app);

      await change(app);

      const request = lastRequest();
      assert.strictEqual(request.offset, 0);
      for (const [key, value] of Object.entries(expected)) {
        assert.deepStrictEqual(request[key], value, `${key} of the last request`);
      }
      assert.strictEqual(app.button("Previous page").disabled, true);
    });
  }

  test("the search title should only be sent once typing pauses", async () => {
    const app = renderApp();
    const before = chainRequestCount();

    // Keystrokes closer together than the debounce
    for (const value of ["c", "co", "cop"]) {
      changeValue(searchInput(app), value);
      await wait(100);
    }
    assert.strictEqual(chainRequestCount(), before);

    await wait(SEARCH_DEBOUNCE);
    assert.strictEqual(chainRequestCount(), before + 1);
    assert.strictEqual(lastRequest().title, "cop");
  });

  test("the page size should be clamped between 1 and 2000", () => {
    const app = renderApp();

    changeValue(perPageInput(app), "0");
    assert.strictEqual(lastRequest().limit, 1);

    changeValue(perPageInput(app), "5000");
    assert.strictEqual(lastRequest().limit, 2000);
  });

  test("a response to the filters before a change should not be displayed", () => {
    const app = renderApp();
    const outdated = lastRequest().requestId;

    click(app.button("Unlocked"));
    const current = lastRequest().requestId;
    assert.notStrictEqual(outdated, current);

    receive(DISPLAY_ACHIEVEMENT_CHAINS, { chains: [makeEntry("Stale")], count: 1, requestId: outdated });
    assert.strictEqual(app.query("h3"), null);

    receive(DISPLAY_ACHIEVEMENT_CHAINS, { chains: [makeEntry("Fresh")], count: 1, requestId: current });
    assert.strictEqual(app.query("h3")?.textContent, "Fresh title");
  });
});
