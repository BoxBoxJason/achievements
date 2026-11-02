import * as assert from "node:assert";
import * as vscode from "vscode";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  gitListeners,
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
  readonly commitEmitter = new vscode.EventEmitter<void>();
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

  get onDidCommit() {
    return this.commitEmitter.event;
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
    const cases: [string, ReflogAction | undefined][] = [
      ["merge feat: Merge made by the 'ort' strategy.", "merge"],
      ["merge ff: Fast-forward", "merge"],
      ["commit (merge): Merge branch 'conflict'", "merge"],
      ["rebase (finish): returning to refs/heads/main", "rebase"],
      ["rebase -i (finish): returning to refs/heads/rb", "rebase"],
      ["rebase finished: returning to refs/heads/rb", "rebase"],
      ["rebase (start): checkout main", undefined],
      ["rebase (pick): some commit", undefined],
      ["rebase (abort): returning to refs/heads/rb", undefined],
      ["pull --no-rebase --no-edit: Merge made by the 'ort' strategy.", undefined],
      ["pull: Fast-forward", undefined],
      ["pull --rebase (finish): returning to refs/heads/main", undefined],
      ["commit (amend): g", "amend"],
      ["commit (amend): merge the docs", "amend"],
      ["commit: amend the docs", undefined],
      ["commit: merge the docs", undefined],
      ["commit: c", undefined],
      ["checkout: moving from main to feat", undefined],
      ["clone: from /tmp/up", undefined],
    ];
    for (const [message, expected] of cases) {
      test(`"${message}" should be ${expected ?? "ignored"}`, () => {
        assert.strictEqual(gitListeners.classifyReflogMessage(message), expected);
      });
    }
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
});
