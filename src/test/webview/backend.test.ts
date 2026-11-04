import * as assert from "node:assert";
import * as path from "node:path";
import * as vscode from "vscode";
import { backendRequests } from "../../views/requests/backend";
import { webview } from "../../views/viewconst";
import { PostMessage } from "../../views/icons";
import type { AchievementChainEntry } from "../../views/components/AchievementChainCard";
import type { AchievementRow } from "../../database/model/tables/Achievement";
import { getMockContext, cleanupMockContext } from "../utils";
import { db_model } from "../../database/model/model";
import { db_lock } from "../../database/lock";

interface ChainsReply {
  chains: AchievementChainEntry[];
  count: number;
  requestId?: number;
}

/**
 * The replies the webview components rely on: the chains reply must echo the
 * request id (stale responses are dropped by it) and the tiers reply the chain
 * (each card only accepts the tiers of its own chain)
 */
suite("Webview Backend Requests Test Suite", () => {
  let context: vscode.ExtensionContext;
  let posted: PostMessage[];
  let panel: vscode.WebviewPanel;

  setup(async () => {
    context = getMockContext();
    db_lock._resetState();
    db_model._resetState();
    await db_model.activate(context, path.join(context.globalStorageUri.fsPath, "test.sqlite"));
    posted = [];
    panel = {
      webview: {
        postMessage: (message: PostMessage) => {
          posted.push(message);
          return Promise.resolve(true);
        },
      },
    } as unknown as vscode.WebviewPanel;
  });

  teardown(async () => {
    await db_model.deactivate();
    cleanupMockContext(context);
  });

  // Sends a request like the webview does: JSON through postMessage
  async function request(command: string, data?: unknown): Promise<void> {
    await backendRequests.handleMessage(
      JSON.parse(JSON.stringify({ command, data })) as PostMessage,
      panel,
    );
  }

  async function requestChains(data: Record<string, unknown>): Promise<ChainsReply> {
    posted = [];
    await request(webview.commands.RETRIEVE_ACHIEVEMENT_CHAINS, data);
    assert.strictEqual(posted.length, 1);
    assert.strictEqual(posted[0].command, webview.commands.DISPLAY_ACHIEVEMENT_CHAINS);
    return posted[0].data as ChainsReply;
  }

  test("a chains request should be answered with a page of chains, the total count and its request id", async () => {
    const first = await requestChains({ count: true, offset: 0, limit: 5, requestId: 7 });
    assert.strictEqual(first.requestId, 7);
    assert.strictEqual(first.chains.length, 5);
    assert.ok(first.count > 5);

    const second = await requestChains({ count: true, offset: 5, limit: 5, requestId: 8 });
    assert.strictEqual(second.requestId, 8);
    assert.strictEqual(second.count, first.count);
    const firstPage = new Set(first.chains.map((entry) => entry.chain));
    assert.ok(second.chains.every((entry) => !firstPage.has(entry.chain)));
  });

  test("a chains request with invalid filters should not be answered", async () => {
    // The webview then keeps showing what it had (nothing, before the first
    // response): the error is logged by the panel message handler
    await assert.rejects(
      request(webview.commands.RETRIEVE_ACHIEVEMENT_CHAINS, {
        count: true,
        status: "invalid",
        requestId: 1,
      }),
    );
    assert.deepStrictEqual(posted, []);
  });

  test("a tiers request should be answered with the tiers of the requested chain", async () => {
    const { chains } = await requestChains({ count: true, limit: 2000, requestId: 1 });
    const tiered = chains.find((entry) => entry.tierCount > 1);
    assert.ok(tiered, "the default achievements should contain a tiered chain");

    posted = [];
    await request(webview.commands.RETRIEVE_ACHIEVEMENT_CHAIN_TIERS, { chain: tiered.chain });
    assert.strictEqual(posted.length, 1);
    assert.strictEqual(posted[0].command, webview.commands.DISPLAY_ACHIEVEMENT_CHAIN_TIERS);
    const reply = posted[0].data as { chain: string; tiers: AchievementRow[] };
    assert.strictEqual(reply.chain, tiered.chain);
    assert.strictEqual(reply.tiers.length, tiered.tierCount);
    assert.ok(reply.tiers.some((tier) => tier.id === tiered.current.id));
  });

  test("a tiers request without a chain should not be answered", async () => {
    await request(webview.commands.RETRIEVE_ACHIEVEMENT_CHAIN_TIERS, {});
    await request(webview.commands.RETRIEVE_ACHIEVEMENT_CHAIN_TIERS, { chain: "" });
    await request(webview.commands.RETRIEVE_ACHIEVEMENT_CHAIN_TIERS, { chain: 3 });
    assert.deepStrictEqual(posted, []);
  });
});
