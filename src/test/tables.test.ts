import * as assert from "node:assert";
import * as vscode from "vscode";
import * as path from "node:path";
import { db_model } from "../database/model/model";
import { db_lock } from "../database/lock";
import Progression from "../database/model/tables/Progression";
import Achievement, {
  StackingAchievementTemplate,
} from "../database/model/tables/Achievement";
import { DailySession } from "../database/model/tables/DailySession";
import { getMockContext, cleanupMockContext } from "./utils";

suite("Tables Test Suite", () => {
  let context: vscode.ExtensionContext;
  let dbPath: string;

  setup(async () => {
    context = getMockContext();
    dbPath = path.join(context.globalStorageUri.fsPath, "test.sqlite");
    db_lock._resetState();
    db_model._resetState();
    await db_model.activate(context, dbPath);
  });

  teardown(async () => {
    await db_model.deactivate();
    cleanupMockContext(context);
  });

  test("DailySession: should insert and retrieve", async () => {
    const today = new Date().toISOString().split("T")[0];
    await DailySession.getOrCreate(today, 100);

    const duration = await DailySession.calculateDuration(today, today);
    assert.strictEqual(duration, 100);
  });

  test("Progression: should insert and retrieve", async () => {
    const p = new Progression({
      name: "test_progression",
      value: 10,
      type: "number",
    });
    await p.toRow();

    const all = await Progression.fromDB();
    const found = all.find((x) => x.name === "test_progression");
    assert.ok(found);
    assert.strictEqual(found.value, 10);
    assert.strictEqual(found.type, "number");
  });

  test("Progression: should handle different types", async () => {
    const pString = new Progression({
      name: "p_string",
      value: "hello",
      type: "string",
    });
    const pBool = new Progression({
      name: "p_bool",
      value: true,
      type: "boolean",
    });
    const date = new Date();
    const pDate = new Progression({
      name: "p_date",
      value: date,
      type: "date",
    });

    await Progression.toDB([pString, pBool, pDate]);

    const all = await Progression.fromDB();

    const foundString = all.find((x) => x.name === "p_string");
    assert.strictEqual(foundString?.value, "hello");

    const foundBool = all.find((x) => x.name === "p_bool");
    assert.strictEqual(foundBool?.value, true);

    const foundDate = all.find((x) => x.name === "p_date");
    assert.ok(foundDate?.value instanceof Date);
    assert.strictEqual((foundDate?.value as Date).getTime(), date.getTime());
  });

  test("Achievement: should create from template", async () => {
    // Create the progression first
    const p = new Progression({
      name: "test_progression",
      value: 0,
      type: "number",
    });
    await p.toRow();

    const template: StackingAchievementTemplate = {
      title: "Test Achievement %d",
      icon: "test-icon",
      category: "test-category",
      group: "test-group",
      labels: ["test-label"],
      criterias: ["test_progression"],
      criteriasFunctions: [(tier: number) => tier * 10],
      description: "Test Description",
      minTier: 1,
      maxTier: 3,
      expFunction: (tier: number) => tier * 100,
      hidden: false,
      requires: [],
    };

    await Achievement.fromStackingTemplateToDB(template);

    const result = await Achievement.getAchievements({});
    const all = result.achievements;

    const myAchievements = all.filter((x: any) => x.group === "test-group");
    assert.strictEqual(myAchievements.length, 3);

    const tier1 = myAchievements.find((x: any) => x.tier === 1);
    assert.ok(tier1);
    assert.strictEqual(tier1.title, "Test Achievement 1");

    // criteria is a dictionary
    assert.strictEqual(tier1.criteria["test_progression"], 10);
  });

  /**
   * Creates a 3 tier chain ("Chain Test %d", requiring 10, 20 then 30) and
   * returns the ids of its tiers, lowest first
   */
  async function createTestChain(): Promise<number[]> {
    await new Progression({
      name: "chain_progression",
      value: 0,
      type: "number",
    }).toRow();
    await Achievement.fromStackingTemplateToDB({
      title: "Chain Test %d",
      icon: "test-icon",
      category: "chain-category",
      group: "chain-group",
      labels: ["chain-label"],
      criterias: ["chain_progression"],
      criteriasFunctions: [(tier: number) => tier * 10],
      description: "Reach chain_progression",
      minTier: 1,
      maxTier: 3,
      expFunction: (tier: number) => tier * 100,
      hidden: false,
      requires: [],
    });
    const tiers = await Achievement.getChainTiersRawFormat("Chain Test %d");
    return tiers.map((tier) => tier.id);
  }

  test("Achievement: getChainTiersRawFormat should return every tier of a chain in order", async () => {
    await createTestChain();
    const tiers = await Achievement.getChainTiersRawFormat("Chain Test %d");
    assert.deepStrictEqual(
      tiers.map((tier) => tier.title),
      ["Chain Test 1", "Chain Test 2", "Chain Test 3"],
    );
    for (const tier of tiers) {
      assert.strictEqual(tier.chain, "Chain Test %d");
      assert.deepStrictEqual(tier.labels, ["chain-label"]);
      assert.strictEqual(tier.criteria.length, 1);
    }
    // Tiers after the first require the previous one
    assert.deepStrictEqual(tiers[0].requirements, []);
    assert.deepStrictEqual(tiers[1].requirements, [tiers[0].id]);
  });

  /** Insert an achievement row the way an older version left it: no chain */
  async function insertChainlessAchievement(
    title: string,
    tier: number,
    category = "old-category",
  ) {
    const db = await db_model.getDB();
    db.run(
      `INSERT INTO achievements
        (title, icon, category, "group", description, tier, exp, hidden, repeatable, achieved)
       VALUES (?, 'icon', ?, 'old-group', 'old', ?, 10, 0, 0, 0)`,
      [title, category, tier],
    );
  }

  test("Achievement: chains should still be listed before the chain column exists", async () => {
    await createTestChain();
    // A read-only window opening a database not migrated yet
    const db = await db_model.getDB();
    db.run("DROP INDEX idx_achievements_chain_key");
    db.run("ALTER TABLE achievements DROP COLUMN chain");

    const { chains } = await Achievement.getAchievementChainsRawFormat({
      category: "chain-category",
      count: true,
    });
    assert.deepStrictEqual(
      chains.map((chain) => chain.chain).sort(),
      ["Chain Test 1", "Chain Test 2", "Chain Test 3"],
      "Every tier is its own chain",
    );
    const tiers = await Achievement.getChainTiersRawFormat("Chain Test 2");
    assert.deepStrictEqual(
      tiers.map((tier) => tier.title),
      ["Chain Test 2"],
    );
  });

  test("Achievement: assignMissingChains should group leftover tiers", async () => {
    await createTestChain();
    // A tier past the end of a shrunk template, and a removed template
    await insertChainlessAchievement("Chain Test 4", 4, "chain-category");
    await insertChainlessAchievement("Old 1", 1);
    await insertChainlessAchievement("Old 2", 2);

    assert.strictEqual(await Achievement.assignMissingChains(), 3);
    assert.deepStrictEqual(
      (await Achievement.getChainTiersRawFormat("Chain Test %d")).map(
        (tier) => tier.title,
      ),
      ["Chain Test 1", "Chain Test 2", "Chain Test 3", "Chain Test 4"],
    );
    const { chains } = await Achievement.getAchievementChainsRawFormat({
      category: "old-category",
    });
    assert.deepStrictEqual(
      chains.map((chain) => [chain.chain, chain.tierCount]),
      [["Old %d", 2]],
    );
    assert.strictEqual(await Achievement.assignMissingChains(), 0);
  });

  test("Achievement: getAchievementChainsRawFormat should run every sort option", async () => {
    await createTestChain();
    // The options of the webview sort dropdown (SearchBar SORT_OPTIONS)
    for (const sortCriteria of ["achieved", "achievedAt", "tier", "title", "category", '"group"', "exp"]) {
      for (const sortDirection of ["ASC", "DESC"]) {
        const { chains } = await Achievement.getAchievementChainsRawFormat({
          category: "chain-category",
          sortCriteria,
          sortDirection,
        });
        assert.strictEqual(chains.length, 1, `${sortCriteria} ${sortDirection}`);
      }
    }
  });

  test("Achievement: getChainTiersRawFormat should apply the hidden filter", async () => {
    await createTestChain();
    assert.strictEqual(
      (await Achievement.getChainTiersRawFormat("Chain Test %d", true)).length,
      0,
    );
    assert.strictEqual(
      (await Achievement.getChainTiersRawFormat("Chain Test %d", false)).length,
      3,
    );
  });

  test("Achievement: tiers of a chain should be looked up through the chain index", async () => {
    const db = await db_model.getDB();
    const plan = db
      .exec(
        `EXPLAIN QUERY PLAN SELECT a.* FROM achievements a
         WHERE COALESCE(a.chain, a.title) = 'Chain Test %d'`,
      )[0]
      .values.map((row) => String(row[3]))
      .join("\n");
    assert.match(plan, /idx_achievements_chain_key/);
  });

  test("Achievement: every default achievement should belong to a chain", async () => {
    const db = await db_model.getDB();
    const row = db_model.get<{ missing: number }>(
      db,
      "SELECT COUNT(*) AS missing FROM achievements WHERE chain IS NULL",
    );
    assert.strictEqual(row?.missing, 0);
  });

  test("Achievement: getAchievementChainsRawFormat should return one entry per chain", async () => {
    const ids = await createTestChain();
    await Achievement.updateAchievedFromId(ids[0]);

    const { count, chains } = await Achievement.getAchievementChainsRawFormat({
      group: "chain-group",
      count: true,
    });
    assert.strictEqual(count, 1);
    assert.strictEqual(chains.length, 1);
    const [chain] = chains;
    assert.strictEqual(chain.chain, "Chain Test %d");
    assert.strictEqual(chain.tierCount, 3);
    assert.strictEqual(chain.achievedCount, 1);
    assert.ok(chain.lastAchievedAt);
    // The current tier is the lowest one not achieved yet
    assert.strictEqual(chain.current.title, "Chain Test 2");
    assert.deepStrictEqual(chain.current.labels, ["chain-label"]);
    assert.deepStrictEqual(chain.current.requirements, [ids[0]]);

    // Chains are counted once, not once per tier
    const all = await Achievement.getAchievementChainsRawFormat({ count: true });
    const stats = await Achievement.getAchievementStats();
    assert.ok(all.count !== null && all.count > 0);
    assert.ok(all.count < stats.totalAchievements);
    assert.strictEqual(new Set(all.chains.map((c) => c.chain)).size, all.chains.length);
  });

  test("Achievement: getAchievementChainsRawFormat should filter chains by status and title", async () => {
    const ids = await createTestChain();
    const countFor = async (
      filters: Parameters<typeof Achievement.getAchievementChainsRawFormat>[0],
    ) =>
      (
        await Achievement.getAchievementChainsRawFormat({
          group: "chain-group",
          count: true,
          ...filters,
        })
      ).count;

    assert.strictEqual(await countFor({ status: "unlocked" }), 0);
    assert.strictEqual(await countFor({ status: "remaining" }), 1);
    assert.strictEqual(await countFor({ status: "completed" }), 0);

    await Achievement.updateAchievedFromId(ids[0]);
    assert.strictEqual(await countFor({ status: "unlocked" }), 1);
    assert.strictEqual(await countFor({ status: "remaining" }), 1);

    await Achievement.updateAchievedFromId(ids[1]);
    await Achievement.updateAchievedFromId(ids[2]);
    assert.strictEqual(await countFor({ status: "remaining" }), 0);
    assert.strictEqual(await countFor({ status: "completed" }), 1);

    // Once completed, the current tier is the top one
    const { chains } = await Achievement.getAchievementChainsRawFormat({
      group: "chain-group",
    });
    assert.strictEqual(chains[0].current.title, "Chain Test 3");

    // A chain matches the title search when any of its tiers does, and is
    // still summarized by its current tier with every tier counted
    const byTitle = await Achievement.getAchievementChainsRawFormat({
      title: "chain test 1",
    });
    assert.strictEqual(byTitle.chains.length, 1);
    assert.strictEqual(byTitle.chains[0].tierCount, 3);
    assert.strictEqual(byTitle.chains[0].current.title, "Chain Test 3");

    await assert.rejects(
      Achievement.getAchievementChainsRawFormat({ sortCriteria: "invalid" }),
    );
  });

  test("Achievement: getAchievementChainsRawFormat should paginate chains", async () => {
    const first = await Achievement.getAchievementChainsRawFormat({
      limit: 5,
      offset: 0,
      sortCriteria: "title",
      sortDirection: "ASC",
    });
    const second = await Achievement.getAchievementChainsRawFormat({
      limit: 5,
      offset: 5,
      sortCriteria: "title",
      sortDirection: "ASC",
    });
    assert.strictEqual(first.chains.length, 5);
    assert.strictEqual(second.chains.length, 5);
    const firstKeys = new Set(first.chains.map((c) => c.chain));
    for (const chain of second.chains) {
      assert.ok(!firstKeys.has(chain.chain));
    }
  });

  test("DailySession: getStatsSummary should return correct stats", async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
    const lastMonth = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split("T")[0];

    await DailySession.getOrCreate(today, 100);
    await DailySession.getOrCreate(yesterday, 50);
    await DailySession.getOrCreate(lastMonth, 200);

    const stats = await DailySession.getStatsSummary(
      today,
      yesterday, // twoWeeksAgo
      today, // monthStart (so yesterday is excluded from monthly)
      today // yearStart
    );

    assert.strictEqual(stats.daily, 100);
    assert.strictEqual(stats.twoWeeks, 150); // today + yesterday
    assert.strictEqual(stats.monthly, 100); // only today
    assert.strictEqual(stats.total, 350);
  });
});
