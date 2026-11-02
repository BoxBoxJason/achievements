import * as assert from "node:assert";
import * as vscode from "vscode";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import {
  gitListeners,
  GitAPI,
  GitRef,
  GitRefType,
  GitRepository,
  ReflogAction,
} from "../../listeners/git";
import { ProgressionController } from "../../database/controller/progressions";
import { constants } from "../../constants";

/** Fake repository driven by the tests */
class FakeRepository implements GitRepository {
  readonly stateEmitter = new vscode.EventEmitter<void>();
  head: GitRef | undefined = { type: GitRefType.Head, name: "main" };
  localBranches: GitRef[] = [];
  remoteBranches: GitRef[] = [];
  branchListings = 0;

  /**
   * @param rootUri - Repository root
   * @param commonDir - Where its refs live (defaults to `<root>/.git`)
   */
  constructor(
    readonly rootUri: vscode.Uri,
    readonly commonDir = path.join(rootUri.fsPath, ".git"),
  ) {}

  get state() {
    const repository = this;
    return {
      get HEAD() {
        return repository.head;
      },
      onDidChange: repository.stateEmitter.event,
    };
  }

  /** Replace the local branches, on disk too (like git would) */
  setBranches(branches: GitRef[]): void {
    this.localBranches = branches;
    const heads = path.join(this.commonDir, "refs", "heads");
    fs.rmSync(heads, { recursive: true, force: true });
    for (const branch of branches) {
      const file = path.join(heads, ...(branch.name as string).split("/"));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `${branch.commit ?? "c0"}\n`);
    }
  }

  addBranch(branch: GitRef): void {
    this.setBranches([...this.localBranches, branch]);
  }

  async getBranches(query: { remote?: boolean }): Promise<GitRef[]> {
    this.branchListings++;
    return query.remote
      ? [...this.localBranches, ...this.remoteBranches]
      : [...this.localBranches];
  }
}

/** Wait until a condition holds (e.g. a debounced refresh ran) */
async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for the condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function localBranch(name: string, commit = "c0"): GitRef {
  return { type: GitRefType.Head, name, commit };
}

function remoteBranch(remote: string, name: string, commit: string): GitRef {
  return { type: GitRefType.RemoteHead, name: `${remote}/${name}`, commit, remote };
}

suite("Git Listeners Test Suite", () => {
  let tempDir: string;
  let increases: [string, number | string][];
  const originalIncrease = ProgressionController.increaseProgression;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "achievements-git-"));
    gitListeners._resetState();
    increases = [];
    ProgressionController.increaseProgression = async (
      criteria: string,
      increase: number | string = 1,
    ) => {
      increases.push([criteria, increase]);
    };
  });

  teardown(() => {
    ProgressionController.increaseProgression = originalIncrease;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Create a regular checkout (with a .git directory) and return its root */
  function createCheckout(name = "repo"): vscode.Uri {
    const root = path.join(tempDir, name);
    fs.mkdirSync(path.join(root, ".git", "logs"), { recursive: true });
    return vscode.Uri.file(root);
  }

  /**
   * Add a linked worktree to a checkout, the way `git worktree add` lays it
   * out, and return its root.
   */
  function addWorktree(
    main: vscode.Uri,
    name: string,
    worktreeRoot = path.join(tempDir, name),
  ): vscode.Uri {
    const adminDir = path.join(main.fsPath, ".git", "worktrees", name);
    fs.mkdirSync(path.join(adminDir, "logs"), { recursive: true });
    fs.writeFileSync(path.join(adminDir, "commondir"), "../..\n");
    fs.writeFileSync(
      path.join(adminDir, "gitdir"),
      `${path.join(worktreeRoot, ".git")}\n`,
    );
    fs.mkdirSync(worktreeRoot, { recursive: true });
    fs.writeFileSync(path.join(worktreeRoot, ".git"), `gitdir: ${adminDir}\n`);
    return vscode.Uri.file(worktreeRoot);
  }

  function total(criteria: string): number {
    return increases
      .filter(([name]) => name === criteria)
      .reduce((sum, [, value]) => sum + Number(value), 0);
  }

  suite("resolveGitDirectories", () => {
    test("should use the .git directory of a regular checkout", async () => {
      const root = createCheckout();
      const directories = await gitListeners.resolveGitDirectories(root);
      assert.ok(directories);
      assert.strictEqual(
        directories.gitDir.fsPath,
        path.join(root.fsPath, ".git"),
      );
      assert.strictEqual(directories.commonDir.fsPath, directories.gitDir.fsPath);
    });

    test("should follow the .git file and commondir of a worktree", async () => {
      const main = createCheckout("main");
      const worktreeGitDir = path.join(main.fsPath, ".git", "worktrees", "wt");
      fs.mkdirSync(worktreeGitDir, { recursive: true });
      fs.writeFileSync(path.join(worktreeGitDir, "commondir"), "../..\n");
      const worktree = path.join(tempDir, "wt");
      fs.mkdirSync(worktree);
      fs.writeFileSync(
        path.join(worktree, ".git"),
        `gitdir: ${worktreeGitDir}\n`,
      );

      const directories = await gitListeners.resolveGitDirectories(
        vscode.Uri.file(worktree),
      );
      assert.ok(directories);
      assert.strictEqual(directories.gitDir.fsPath, worktreeGitDir);
      assert.strictEqual(
        directories.commonDir.fsPath,
        path.join(main.fsPath, ".git"),
      );
    });

    test("should resolve a relative gitdir (submodule)", async () => {
      const parent = createCheckout("parent");
      const moduleGitDir = path.join(parent.fsPath, ".git", "modules", "sub");
      fs.mkdirSync(moduleGitDir, { recursive: true });
      const submodule = path.join(parent.fsPath, "sub");
      fs.mkdirSync(submodule);
      fs.writeFileSync(
        path.join(submodule, ".git"),
        "gitdir: ../.git/modules/sub\n",
      );

      const directories = await gitListeners.resolveGitDirectories(
        vscode.Uri.file(submodule),
      );
      assert.ok(directories);
      assert.strictEqual(directories.gitDir.fsPath, moduleGitDir);
    });

    test("should return undefined outside of a repository", async () => {
      const directories = await gitListeners.resolveGitDirectories(
        vscode.Uri.file(tempDir),
      );
      assert.strictEqual(directories, undefined);
    });
  });

  suite("collectCreatedBranches", () => {
    test("should count only unknown local branches and remember them", async () => {
      const known = new Set(["main"]);
      const created = await gitListeners.collectCreatedBranches(
        known,
        [localBranch("main"), localBranch("feature"), localBranch("fix")],
        async () => [],
      );
      assert.strictEqual(created, 2);
      assert.deepStrictEqual([...known].sort(), ["feature", "fix", "main"]);
    });

    test("should not count branches checked out from a remote branch", async () => {
      const known = new Set(["main"]);
      const created = await gitListeners.collectCreatedBranches(
        known,
        [localBranch("theirs", "abc"), localBranch("mine", "abc")],
        async () => [remoteBranch("origin", "theirs", "abc")],
      );
      assert.strictEqual(created, 1);
      assert.ok(known.has("theirs"), "Checked out branches are still remembered");
    });

    test("should count a branch whose remote namesake points elsewhere", async () => {
      const created = await gitListeners.collectCreatedBranches(
        new Set(["main"]),
        [localBranch("feature", "local")],
        async () => [remoteBranch("origin", "feature", "remote")],
      );
      assert.strictEqual(created, 1);
    });

    test("should not count the first branch of a repository that had none", async () => {
      // `git init` then a first commit: `main` appears, nobody created it
      const known = new Set<string>();
      const created = await gitListeners.collectCreatedBranches(
        known,
        [localBranch("main")],
        async () => [],
        async () => "created",
      );
      assert.strictEqual(created, 0);
      assert.ok(known.has("main"));
    });

    test("should trust the branch reflog over the remote branches", async () => {
      const created = await gitListeners.collectCreatedBranches(
        new Set(["main"]),
        [
          localBranch("renamed"),
          localBranch("checked-out", "abc"),
          // Created and pushed before the inspection: its remote namesake
          // already points at the same commit
          localBranch("pushed", "abc"),
        ],
        async () => [remoteBranch("origin", "pushed", "abc")],
        async (name) =>
          name === "renamed"
            ? "renamed"
            : name === "checked-out"
              ? "checkout"
              : "created",
      );
      assert.strictEqual(created, 1);
    });

    test("should forget the new branches if they cannot be classified", async () => {
      const known = new Set(["main"]);
      await assert.rejects(
        gitListeners.collectCreatedBranches(
          known,
          [localBranch("main"), localBranch("feature")],
          async () => {
            throw new Error("git failed");
          },
        ),
      );
      assert.deepStrictEqual([...known], ["main"], "Retried next time");
    });
  });

  suite("classifyBranchReflog", () => {
    // Messages as written by git 2.56
    const cases: [string, string[], string][] = [
      ["switch -c / checkout -b", ["branch: Created from HEAD"], "created"],
      ["branch x main", ["branch: Created from main"], "created"],
      [
        "checkout of a remote branch by name",
        ["branch: Created from refs/remotes/origin/feat"],
        "checkout",
      ],
      ["checkout --track", ["branch: Created from origin/feat"], "checkout"],
      [
        "new name from a remote branch",
        ["branch: Created from origin/other"],
        "created",
      ],
      [
        "rename",
        [
          "branch: Created from main",
          "Branch: renamed refs/heads/old to refs/heads/feat",
        ],
        "renamed",
      ],
      [
        "copy",
        [
          "branch: Created from origin/feat",
          "Branch: copied refs/heads/old to refs/heads/feat",
        ],
        "created",
      ],
      ["clone", ["clone: from /tmp/up"], "checkout"],
      ["orphan branch", ["commit (initial): root"], "created"],
      ["no reflog", [], "unknown"],
    ];
    for (const [label, messages, expected] of cases) {
      test(`${label} should be ${expected}`, () => {
        assert.strictEqual(
          gitListeners.classifyBranchReflog("feat", messages, ["origin"]),
          expected,
        );
      });
    }

    test("a branch created and renamed since the last inspection was created", () => {
      assert.strictEqual(
        gitListeners.classifyBranchReflog(
          "feat",
          [
            "branch: Created from HEAD",
            "Branch: renamed refs/heads/wip to refs/heads/feat",
          ],
          ["origin"],
          (name) => name === "main", // "wip" was never seen
        ),
        "created",
      );
    });

    test("should not list remote branches when nothing is new", async () => {
      let listed = false;
      const created = await gitListeners.collectCreatedBranches(
        new Set(["main"]),
        [localBranch("main")],
        async () => {
          listed = true;
          return [];
        },
      );
      assert.strictEqual(created, 0);
      assert.strictEqual(listed, false);
    });
  });

  suite("RepositoryTracker", () => {
    test("should count branches created after the baseline only", async () => {
      const repository = new FakeRepository(createCheckout());
      repository.setBranches([localBranch("main"), localBranch("old")]);
      const tracker = new gitListeners.RepositoryTracker(repository, 60_000);
      try {
        await tracker.refresh(); // baseline
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 0);

        repository.addBranch(localBranch("new"));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 1);

        await tracker.refresh();
        assert.strictEqual(
          total(constants.criteria.BRANCHES_CREATED),
          1,
          "A branch is only counted once",
        );
      } finally {
        tracker.dispose();
      }
    });

    test("should not inspect a repository before its first status", async () => {
      const repository = new FakeRepository(createCheckout());
      repository.head = undefined;
      const tracker = new gitListeners.RepositoryTracker(repository, 60_000);
      try {
        await tracker.refresh(); // ignored: no baseline recorded
        repository.head = { type: GitRefType.Head, name: "main" };
        repository.setBranches([localBranch("main")]);
        await tracker.refresh(); // baseline
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 0);
      } finally {
        tracker.dispose();
      }
    });

    test("should share branches between worktrees of the same repository", async () => {
      const main = createCheckout("main");
      const worktreeRoot = addWorktree(main, "wt");

      const mainRepository = new FakeRepository(main);
      const worktreeRepository = new FakeRepository(
        worktreeRoot,
        mainRepository.commonDir,
      );
      mainRepository.setBranches([localBranch("main")]);
      // Both see the same branches, like a real worktree
      worktreeRepository.localBranches = mainRepository.localBranches;
      const trackers = [
        new gitListeners.RepositoryTracker(mainRepository, 60_000),
        new gitListeners.RepositoryTracker(worktreeRepository, 60_000),
      ];
      try {
        await Promise.all(trackers.map((tracker) => tracker.refresh()));
        mainRepository.addBranch(localBranch("shared"));
        worktreeRepository.localBranches = mainRepository.localBranches;
        await Promise.all(trackers.map((tracker) => tracker.refresh()));
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 1);
      } finally {
        trackers.forEach((tracker) => tracker.dispose());
      }
    });

    test("should share branches when the checkout is opened through a symlink", async function () {
      const main = createCheckout("main");
      const link = path.join(tempDir, "link");
      try {
        fs.symlinkSync(main.fsPath, link, "dir");
      } catch {
        this.skip(); // No symlink permission (Windows)
      }
      const worktreeRoot = addWorktree(main, "wt");
      const viaLink = new FakeRepository(vscode.Uri.file(link));
      viaLink.setBranches([localBranch("main")]);
      const worktree = new FakeRepository(worktreeRoot, viaLink.commonDir);
      worktree.localBranches = viaLink.localBranches;
      const trackers = [viaLink, worktree].map(
        (repository) => new gitListeners.RepositoryTracker(repository, 60_000),
      );
      try {
        await Promise.all(trackers.map((tracker) => tracker.refresh()));
        viaLink.addBranch(localBranch("feature"));
        worktree.localBranches = viaLink.localBranches;
        await Promise.all(trackers.map((tracker) => tracker.refresh()));
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 1);
      } finally {
        trackers.forEach((tracker) => tracker.dispose());
      }
    });

    test("should only list branches when the branch refs changed", async () => {
      const repository = new FakeRepository(createCheckout());
      repository.setBranches([localBranch("main")]);
      const tracker = new gitListeners.RepositoryTracker(repository, 60_000);
      try {
        await tracker.refresh(); // baseline
        const listings = repository.branchListings;
        // A status after saving a file: nothing changed
        await tracker.refresh();
        await tracker.refresh();
        assert.strictEqual(repository.branchListings, listings);

        repository.addBranch(localBranch("feature"));
        await tracker.refresh();
        assert.ok(repository.branchListings > listings);
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should still read the reflog when listing branches fails", async () => {
      const root = createCheckout();
      const repository = new FakeRepository(root);
      repository.setBranches([localBranch("main")]);
      const reflog = path.join(root.fsPath, ".git", "logs", "HEAD");
      fs.writeFileSync(reflog, "");
      const tracker = new gitListeners.RepositoryTracker(repository, 60_000);
      try {
        await tracker.refresh(); // baseline
        repository.getBranches = async () => {
          throw new Error("git for-each-ref failed");
        };
        repository.addBranch(localBranch("feature"));
        fs.appendFileSync(
          reflog,
          `${"a".repeat(40)} ${"b".repeat(40)} t <t@t> 1700000000 +0100\tcommit: c\n`,
        );
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.COMMITS), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should refresh on its own once the repository state settles", async () => {
      const repository = new FakeRepository(createCheckout());
      repository.setBranches([localBranch("main")]);
      const tracker = new gitListeners.RepositoryTracker(repository, 10);
      try {
        await waitFor(() => repository.branchListings > 0); // baseline
        repository.addBranch(localBranch("feature"));
        repository.stateEmitter.fire();
        await waitFor(
          () => total(constants.criteria.BRANCHES_CREATED) === 1,
        );
      } finally {
        tracker.dispose();
      }
    });
  });

  suite("classifyReflogMessage", () => {
    // Messages as written by git 2.56
    const cases: [string, ReflogAction[]][] = [
      ["merge feat: Merge made by the 'ort' strategy.", ["merge"]],
      ["merge ff: Fast-forward", ["merge"]],
      ["commit (merge): Merge branch 'conflict'", ["commit", "merge"]],
      ["rebase (finish): returning to refs/heads/main", ["rebase"]],
      ["rebase -i (finish): returning to refs/heads/rb", ["rebase"]],
      ["rebase finished: returning to refs/heads/rb", ["rebase"]],
      ["rebase (start): checkout main", []],
      ["rebase (pick): some commit", []],
      ["rebase (abort): returning to refs/heads/rb", []],
      ["pull --no-rebase --no-edit: Merge made by the 'ort' strategy.", []],
      ["pull: Fast-forward", []],
      ["pull --rebase (finish): returning to refs/heads/main", []],
      ["commit (amend): g", ["amend"]],
      ["commit (amend): merge the docs", ["amend"]],
      ["commit: amend the docs", ["commit"]],
      ["commit: merge the docs", ["commit"]],
      ["commit: c", ["commit"]],
      ["commit:", ["commit"]], // empty message
      ["commit (initial): init", ["commit"]],
      ["commit: fixup! squash", ["commit"]],
      // Concluding conflicted operations counts like their clean version
      ["commit (cherry-pick): X", []],
      ["commit: Revert \"b\"", []],
      ["commit (merge): Merge branch 'main' of github.com:me/repo", []],
      ["commit (merge): Merge branches 'a' and 'b' of /tmp/up", []],
      ["cherry-pick: c", []],
      ["revert: Revert \"X\"", []],
      ["merge side: updating HEAD", ["merge"]],
      ["reset: moving to HEAD~1", []],
      ["checkout: moving from main to feat", []],
      ["clone: from /tmp/up", []],
    ];
    for (const [message, expected] of cases) {
      test(`"${message}" should be ${expected.join(" + ") || "ignored"}`, () => {
        assert.deepStrictEqual(gitListeners.classifyReflogMessage(message), expected);
      });
    }
  });

  suite("tallyReflog", () => {
    test("should not count commits replayed by a stopped rebase", () => {
      const { counts, inRebase } = gitListeners.tallyReflog(
        [
          "commit: before",
          "rebase (start): checkout main",
          "commit: resolved", // `git commit` instead of `rebase --continue`
          "commit (amend): reworded", // `edit` stop: a real amend
          "rebase (finish): returning to refs/heads/side",
          "commit: after",
        ],
        false,
      );
      assert.deepStrictEqual(counts, { amend: 1, commit: 2, merge: 0, rebase: 1 });
      assert.strictEqual(inRebase, false);
    });

    test("should carry a rebase in progress over to the next entries", () => {
      const first = gitListeners.tallyReflog(
        ["pull --rebase (start): checkout origin/main"],
        false,
      );
      assert.strictEqual(first.inRebase, true);
      const second = gitListeners.tallyReflog(
        ["commit: resolved", "rebase (abort): returning to refs/heads/main"],
        first.inRebase,
      );
      assert.strictEqual(second.counts.commit, 0);
      assert.strictEqual(second.inRebase, false);
    });
  });

  suite("parseReflogMessages", () => {
    test("should extract the message after the tab of each line", () => {
      const text =
        "0000 1111 t <t@t> 1700000000 +0100\tcommit (initial): init\n" +
        "1111 2222 t <t@t> 1700000001 +0100\tmerge feat: Fast-forward\n";
      assert.deepStrictEqual(gitListeners.parseReflogMessages(text), [
        "commit (initial): init",
        "merge feat: Fast-forward",
      ]);
    });
  });

  suite("RepositoryTracker reflog", () => {
    function reflogLine(message: string): string {
      return `${"a".repeat(40)} ${"b".repeat(40)} t <t@t> 1700000000 +0100\t${message}\n`;
    }

    function reflogPath(root: vscode.Uri): string {
      return path.join(root.fsPath, ".git", "logs", "HEAD");
    }

    test("should count merges and rebases appended after the baseline", async () => {
      const root = createCheckout();
      fs.writeFileSync(
        reflogPath(root),
        reflogLine("merge old: Fast-forward"), // history, not counted
      );
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        fs.appendFileSync(
          reflogPath(root),
          reflogLine("merge feat: Merge made by the 'ort' strategy.") +
            reflogLine("rebase (start): checkout main") +
            reflogLine("rebase (pick): e") +
            reflogLine("rebase (finish): returning to refs/heads/rb") +
            reflogLine("pull: Merge made by the 'ort' strategy.") +
            reflogLine("commit: c"),
        );
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 2);

        await tracker.refresh();
        assert.strictEqual(
          total(constants.criteria.MERGES_AND_REBASES),
          2,
          "Entries are only read once",
        );
      } finally {
        tracker.dispose();
      }
    });

    test("should wait for a partially written line to be complete", async () => {
      const root = createCheckout();
      fs.writeFileSync(reflogPath(root), "");
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        const line = reflogLine("merge feat: Fast-forward");
        fs.appendFileSync(reflogPath(root), line.slice(0, 50));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 0);

        fs.appendFileSync(reflogPath(root), line.slice(50));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should not count anything when the reflog is rewritten", async () => {
      const root = createCheckout();
      fs.writeFileSync(
        reflogPath(root),
        reflogLine("commit: a") + reflogLine("commit: b"),
      );
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        // Expired entries: the file shrinks and keeps old merges
        fs.writeFileSync(reflogPath(root), reflogLine("merge x: Fast-forward"));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 0);

        fs.appendFileSync(reflogPath(root), reflogLine("merge y: Fast-forward"));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should only count new entries when the reflog was rewritten and grew", async () => {
      const root = createCheckout();
      const old = reflogLine("merge old: Fast-forward");
      const last = reflogLine("merge last: Fast-forward");
      fs.writeFileSync(reflogPath(root), old + old + last);
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        // `git gc` expired the oldest entry right after more were appended
        fs.writeFileSync(
          reflogPath(root),
          old +
            last +
            reflogLine("merge new1: Fast-forward") +
            reflogLine("merge new2: Fast-forward"),
        );
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 2);
      } finally {
        tracker.dispose();
      }
    });

    test("should not count commits made while a rebase is stopped", async () => {
      const root = createCheckout();
      fs.writeFileSync(reflogPath(root), "");
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        fs.mkdirSync(path.join(root.fsPath, ".git", "rebase-merge"));
        fs.appendFileSync(
          reflogPath(root),
          reflogLine("rebase (start): checkout main"),
        );
        await tracker.refresh();
        fs.appendFileSync(reflogPath(root), reflogLine("commit: resolved"));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.COMMITS), 0);

        // `git rebase --quit`: the rebase is over without an end entry
        fs.rmSync(path.join(root.fsPath, ".git", "rebase-merge"), {
          recursive: true,
        });
        fs.appendFileSync(reflogPath(root), reflogLine("commit: new"));
        await tracker.refresh();
        fs.appendFileSync(reflogPath(root), reflogLine("commit: newer"));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.COMMITS), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should count entries of a reflog created after the baseline", async () => {
      const root = createCheckout(); // no logs/HEAD yet
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        fs.writeFileSync(
          reflogPath(root),
          reflogLine("commit (initial): init") +
            reflogLine("merge feat: Fast-forward"),
        );
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should count amends separately from merges and rebases", async () => {
      const root = createCheckout();
      fs.writeFileSync(reflogPath(root), reflogLine("commit (amend): old"));
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        fs.appendFileSync(
          reflogPath(root),
          reflogLine("commit: g") +
            reflogLine("commit (amend): g") +
            reflogLine("commit (amend): g again") +
            reflogLine("merge feat: Fast-forward"),
        );
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.AMENDS), 2);
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should count commits from VS Code and the terminal alike", async () => {
      const root = createCheckout();
      fs.writeFileSync(reflogPath(root), reflogLine("commit (initial): init"));
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline: the initial commit is history
        assert.strictEqual(total(constants.criteria.COMMITS), 0);

        fs.appendFileSync(
          reflogPath(root),
          reflogLine("commit: b") +
            reflogLine("commit (amend): b") + // rewrite, not a new commit
            reflogLine("cherry-pick: c") + // not made with git commit
            reflogLine("commit (cherry-pick): X") +
            reflogLine("merge side: Merge made by the 'ort' strategy.") +
            reflogLine("commit (merge): Merge branch 'conflict'"),
        );
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.COMMITS), 2);
        assert.strictEqual(total(constants.criteria.AMENDS), 1);
        assert.strictEqual(total(constants.criteria.MERGES_AND_REBASES), 2);
      } finally {
        tracker.dispose();
      }
    });
  });

  suite("collectCreatedWorktrees", () => {
    test("should count unknown worktrees once and remember them", () => {
      const counted = new Set(["repo\nwt1"]);
      const created = gitListeners.collectCreatedWorktrees(counted, [
        "repo\nwt1",
        "repo\nwt2",
        "repo\nwt2",
        "repo\nwt3",
      ]);
      assert.strictEqual(created, 2);
      assert.strictEqual(
        gitListeners.collectCreatedWorktrees(counted, ["repo\nwt2", "repo\nwt3"]),
        0,
      );
    });
  });

  suite("RepositoryTracker worktrees", () => {
    test("should count linked worktrees created after the baseline", async () => {
      const root = createCheckout();
      addWorktree(root, "existing");
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        assert.strictEqual(total(constants.criteria.WORKTREES_CREATED), 0);

        addWorktree(root, "agent-1");
        addWorktree(root, "agent-2");
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.WORKTREES_CREATED), 2);

        // Removing a worktree is not counted, and neither is adding it back
        fs.rmSync(path.join(root.fsPath, ".git", "worktrees", "agent-1"), {
          recursive: true,
        });
        await tracker.refresh();
        addWorktree(root, "agent-1");
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.WORKTREES_CREATED), 2);
      } finally {
        tracker.dispose();
      }
    });

    test("should not count a moved worktree again", async () => {
      const root = createCheckout();
      const tracker = new gitListeners.RepositoryTracker(
        new FakeRepository(root),
        60_000,
      );
      try {
        await tracker.refresh(); // baseline
        addWorktree(root, "wt", path.join(tempDir, "before"));
        await tracker.refresh();
        // `git worktree move` keeps the name, only the path changes
        addWorktree(root, "wt", path.join(tempDir, "after"));
        await tracker.refresh();
        assert.strictEqual(total(constants.criteria.WORKTREES_CREATED), 1);
      } finally {
        tracker.dispose();
      }
    });

    test("should count a worktree once when its checkout and worktrees see it", async () => {
      const main = createCheckout("main");
      const other = addWorktree(main, "other");
      const repositories = [
        new FakeRepository(main),
        new FakeRepository(other, path.join(main.fsPath, ".git")),
      ];
      const trackers = repositories.map(
        (repository) => new gitListeners.RepositoryTracker(repository, 60_000),
      );
      try {
        await Promise.all(trackers.map((tracker) => tracker.refresh()));
        addWorktree(main, "shared");
        await Promise.all(trackers.map((tracker) => tracker.refresh()));
        assert.strictEqual(total(constants.criteria.WORKTREES_CREATED), 1);
      } finally {
        trackers.forEach((tracker) => tracker.dispose());
      }
    });

    test("should count a worktree that is opened before the checkout notices it", async () => {
      const main = createCheckout("main");
      const mainTracker = new gitListeners.RepositoryTracker(
        new FakeRepository(main),
        60_000,
      );
      let newTracker: gitListeners.RepositoryTracker | undefined;
      try {
        await mainTracker.refresh(); // baseline
        // git.detectWorktrees opens the new worktree as a repository, and
        // its tracker records its baseline (listing itself) first
        const created = addWorktree(main, "feat");
        newTracker = new gitListeners.RepositoryTracker(
          new FakeRepository(created, path.join(main.fsPath, ".git")),
          60_000,
        );
        await newTracker.refresh();
        await mainTracker.refresh();
        assert.strictEqual(total(constants.criteria.WORKTREES_CREATED), 1);
      } finally {
        mainTracker.dispose();
        newTracker?.dispose();
      }
    });
  });

  suite("watchRepositories", () => {
    class FakeGitAPI implements GitAPI {
      readonly openEmitter = new vscode.EventEmitter<GitRepository>();
      readonly closeEmitter = new vscode.EventEmitter<GitRepository>();
      readonly publishEmitter = new vscode.EventEmitter<unknown>();
      readonly onDidOpenRepository = this.openEmitter.event;
      readonly onDidCloseRepository = this.closeEmitter.event;
      readonly onDidPublish = this.publishEmitter.event;
      constructor(readonly repositories: GitRepository[] = []) {}
    }

    test("should track repositories opened later until they are closed", async () => {
      const api = new FakeGitAPI();
      const subscriptions: vscode.Disposable[] = [];
      gitListeners.watchRepositories(api, subscriptions, 10);
      try {
        const repository = new FakeRepository(createCheckout());
        repository.setBranches([localBranch("main")]);
        api.openEmitter.fire(repository);
        await waitFor(() => repository.branchListings > 0); // baseline

        repository.addBranch(localBranch("feature"));
        repository.stateEmitter.fire();
        await waitFor(() => total(constants.criteria.BRANCHES_CREATED) === 1);

        api.closeEmitter.fire(repository);
        const listings = repository.branchListings;
        repository.addBranch(localBranch("after-close"));
        repository.stateEmitter.fire();
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.strictEqual(repository.branchListings, listings, "No longer tracked");
      } finally {
        subscriptions.forEach((subscription) => subscription.dispose());
      }
    });

    test("should count pushes and stop everything on dispose", async () => {
      const repository = new FakeRepository(createCheckout());
      repository.setBranches([localBranch("main")]);
      const api = new FakeGitAPI([repository]);
      const subscriptions: vscode.Disposable[] = [];
      gitListeners.watchRepositories(api, subscriptions, 10);
      await waitFor(() => repository.branchListings > 0); // baseline

      api.publishEmitter.fire(undefined);
      await waitFor(() => total(constants.criteria.PUSHES) === 1);

      subscriptions.forEach((subscription) => subscription.dispose());
      const listings = repository.branchListings;
      repository.addBranch(localBranch("after-dispose"));
      repository.stateEmitter.fire();
      api.publishEmitter.fire(undefined);
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.strictEqual(repository.branchListings, listings);
      assert.strictEqual(total(constants.criteria.PUSHES), 1);
    });
  });

  suite("with real git", () => {
    const env = {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: os.devNull,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@t",
      GIT_EDITOR: "true",
    };

    function git(cwd: string, ...args: string[]): string {
      const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
      if (result.error) {
        throw result.error;
      }
      return result.stdout;
    }

    /** Repository backed by a real git checkout, like the git extension */
    class GitCliRepository implements GitRepository {
      readonly stateEmitter = new vscode.EventEmitter<void>();
      branchListings = 0;
      constructor(readonly rootUri: vscode.Uri) {}

      get state() {
        const root = this.rootUri.fsPath;
        return {
          HEAD: { type: GitRefType.Head, name: "main" },
          get remotes() {
            return git(root, "remote")
              .split("\n")
              .filter(Boolean)
              .map((name) => ({ name }));
          },
          onDidChange: this.stateEmitter.event,
        };
      }

      async getBranches(query: { remote?: boolean }): Promise<GitRef[]> {
        this.branchListings++;
        const refs = query.remote ? "refs/remotes" : "refs/heads";
        return git(
          this.rootUri.fsPath,
          "for-each-ref",
          "--format=%(refname:short) %(objectname)",
          refs,
        )
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [name, commit] = line.split(" ");
            return query.remote
              ? {
                  type: GitRefType.RemoteHead,
                  name,
                  commit,
                  remote: name.split("/")[0],
                }
              : { type: GitRefType.Head, name, commit };
          });
      }
    }

    let upstream: string;
    let work: string;
    let tracker: gitListeners.RepositoryTracker;

    setup(async function () {
      if (spawnSync("git", ["--version"]).error) {
        this.skip();
      }
      upstream = path.join(tempDir, "upstream");
      work = path.join(tempDir, "work");
      fs.mkdirSync(upstream);
      git(upstream, "init", "-q", "-b", "main");
      fs.writeFileSync(path.join(upstream, "f"), "a\n");
      git(upstream, "add", "f");
      git(upstream, "commit", "-qm", "a");
      git(upstream, "branch", "theirs");
      git(tempDir, "clone", "-q", upstream, work);
      tracker = new gitListeners.RepositoryTracker(
        new GitCliRepository(vscode.Uri.file(work)),
        60_000,
      );
      await tracker.refresh(); // baseline
    });

    teardown(() => {
      tracker?.dispose();
    });

    test("branches: created, renamed and checked out", async () => {
      git(work, "switch", "-q", "-c", "mine");
      git(work, "branch", "-m", "mine", "renamed");
      git(work, "checkout", "-q", "theirs"); // from origin/theirs
      git(work, "switch", "-q", "-c", "pushed");
      git(work, "push", "-q", "-u", "origin", "pushed");
      await tracker.refresh();
      // "mine" was renamed before the inspection: "renamed" still is the
      // branch created with `switch -c`
      assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 2);

      git(work, "branch", "-m", "renamed", "again");
      await tracker.refresh();
      assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 2);
    });

    test("commits: conflicted pull, rebase and revert", async () => {
      // Diverge from upstream on the same line
      fs.writeFileSync(path.join(upstream, "f"), "theirs\n");
      git(upstream, "commit", "-qam", "theirs");
      fs.writeFileSync(path.join(work, "f"), "mine\n");
      git(work, "commit", "-qam", "mine");
      git(work, "commit", "-q", "--allow-empty", "--allow-empty-message", "-m", "");
      await tracker.refresh();
      assert.strictEqual(total(constants.criteria.COMMITS), 2);

      // Conflicted pull, concluded with a commit
      git(work, "pull", "-q", "--no-rebase");
      fs.writeFileSync(path.join(work, "f"), "both\n");
      git(work, "add", "f");
      git(work, "commit", "-q", "--no-edit"); // keeps git's merge message
      // Conflicted rebase, resolved with `git commit` before continuing
      git(work, "switch", "-q", "-c", "side", "HEAD~1");
      fs.writeFileSync(path.join(work, "f"), "side\n");
      git(work, "commit", "-qam", "side");
      git(work, "rebase", "main");
      fs.writeFileSync(path.join(work, "f"), "rebased\n");
      git(work, "add", "f");
      git(work, "commit", "-qm", "replayed");
      await tracker.refresh(); // rebase still stopped
      git(work, "rebase", "--continue");
      await tracker.refresh();

      assert.strictEqual(total(constants.criteria.COMMITS), 3, "+ side");
      assert.strictEqual(
        total(constants.criteria.MERGES_AND_REBASES),
        1,
        "The rebase only, not the pull",
      );
    });

    test("worktrees: added and moved", async () => {
      git(work, "worktree", "add", "-q", path.join(tempDir, "wt"));
      await tracker.refresh();
      git(work, "worktree", "move", path.join(tempDir, "wt"), path.join(tempDir, "moved"));
      await tracker.refresh();
      assert.strictEqual(total(constants.criteria.WORKTREES_CREATED), 1);
      assert.strictEqual(
        total(constants.criteria.BRANCHES_CREATED),
        1,
        "worktree add created a branch",
      );
    });

    /**
     * The git extension only refreshes a linked worktree when its own git
     * directory changes: these tests never fire `onDidChange`, so only the
     * tracker's watcher on the common directory can notice the changes.
     * They use the real file watcher, spied on to tell which ones are made.
     */
    suite("common directory watcher", () => {
      const workspace = vscode.workspace as {
        createFileSystemWatcher: typeof vscode.workspace.createFileSystemWatcher;
      };
      const createWatcher = workspace.createFileSystemWatcher;
      let watchers: { pattern: vscode.GlobPattern; disposed: boolean }[];
      let linked: string;
      const trackers: gitListeners.RepositoryTracker[] = [];

      setup(async () => {
        watchers = [];
        workspace.createFileSystemWatcher = (pattern, ...ignore) => {
          const watcher = createWatcher(pattern, ...ignore);
          const watch = { pattern, disposed: false };
          watchers.push(watch);
          const dispose = watcher.dispose.bind(watcher);
          watcher.dispose = () => {
            watch.disposed = true;
            dispose();
          };
          return watcher;
        };
        linked = path.join(tempDir, "linked");
        git(work, "worktree", "add", "-q", linked);
        await tracker.refresh(); // knows the "linked" branch and worktree
        increases = [];
      });

      teardown(() => {
        trackers.splice(0).forEach((started) => started.dispose());
        workspace.createFileSystemWatcher = createWatcher;
      });

      /** Track a repository, reacting quickly, and record its baseline */
      async function track(repository: GitCliRepository) {
        const started = new gitListeners.RepositoryTracker(repository, 20);
        trackers.push(started);
        // Its first (scheduled) refresh must not see the changes made next
        await waitFor(() => repository.branchListings > 0);
        await started.refresh();
        return started;
      }

      /**
       * Wait until the watcher delivers events: it misses the changes made
       * while it starts. Rewriting packed-refs (same refs, new mtime) makes
       * the tracker list the branches again once it notices.
       */
      async function waitForWatcher(repository: GitCliRepository) {
        const packedRefs = path.join(work, ".git", "packed-refs");
        const content = fs.readFileSync(packedRefs);
        const listings = repository.branchListings;
        const deadline = Date.now() + 10_000;
        while (repository.branchListings === listings) {
          if (Date.now() > deadline) {
            throw new Error("The common directory watcher delivered no event");
          }
          fs.writeFileSync(packedRefs, content);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      test("should count a branch created from the main checkout", async function () {
        this.timeout(30_000);
        const repository = new GitCliRepository(vscode.Uri.file(linked));
        await track(repository);
        assert.strictEqual(watchers.length, 1);
        const { pattern } = watchers[0];
        assert.ok(pattern instanceof vscode.RelativePattern);
        assert.strictEqual(pattern.baseUri.fsPath, path.join(work, ".git"));
        await waitForWatcher(repository);

        git(work, "branch", "feature");
        await waitFor(
          () => total(constants.criteria.BRANCHES_CREATED) === 1,
          5000,
        );
      });

      test("should count a worktree added from the main checkout", async function () {
        this.timeout(30_000);
        const repository = new GitCliRepository(vscode.Uri.file(linked));
        await track(repository);
        await waitForWatcher(repository);

        // Also creates the "second" branch
        git(work, "worktree", "add", "-q", path.join(tempDir, "second"));
        await waitFor(
          () =>
            total(constants.criteria.WORKTREES_CREATED) === 1 &&
            total(constants.criteria.BRANCHES_CREATED) === 1,
          5000,
        );
      });

      test("should count a detached worktree added from the main checkout", async function () {
        this.timeout(30_000);
        const repository = new GitCliRepository(vscode.Uri.file(linked));
        await track(repository);
        await waitForWatcher(repository);

        // No new branch: only the worktrees directory changes
        git(work, "worktree", "add", "-q", "--detach", path.join(tempDir, "detached"));
        await waitFor(
          () => total(constants.criteria.WORKTREES_CREATED) === 1,
          5000,
        );
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 0);
      });

      test("should not watch the git directory of a regular checkout", async function () {
        this.timeout(30_000);
        // The git extension already watches it
        const repository = new GitCliRepository(vscode.Uri.file(work));
        await track(repository);
        assert.strictEqual(watchers.length, 0);

        git(work, "branch", "feature");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        assert.strictEqual(total(constants.criteria.BRANCHES_CREATED), 0);

        repository.stateEmitter.fire();
        await waitFor(() => total(constants.criteria.BRANCHES_CREATED) === 1);
      });

      test("should stop watching once disposed", async function () {
        this.timeout(30_000);
        const repository = new GitCliRepository(vscode.Uri.file(linked));
        const disposed = await track(repository);
        await waitForWatcher(repository);
        disposed.dispose();
        assert.deepStrictEqual(
          watchers.map((watch) => watch.disposed),
          [true],
        );

        const listings = repository.branchListings;
        git(work, "branch", "feature");
        git(work, "worktree", "add", "-q", path.join(tempDir, "second"));
        await new Promise((resolve) => setTimeout(resolve, 1000));
        assert.strictEqual(repository.branchListings, listings);
        assert.deepStrictEqual(increases, []);
      });
    });
  });
});
