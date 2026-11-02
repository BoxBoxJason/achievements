/**
 * Git events listeners for achievements extension
 *
 * @namespace gitListeners
 * @author BoxBoxJason
 */

import * as fs from "node:fs";
import * as nodePath from "node:path";
import * as vscode from "vscode";
import logger from "../utils/logger";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import { config } from "../config/config";

// ==================== GIT EXTENSION API TYPES ====================
// Subset of the built-in git extension API (extensions/git/src/api/git.d.ts)
// used by these listeners. Kept local so the extension does not depend on a
// copy of the full declaration file.

/** Ref types, mirrors the git extension RefType const enum */
export const enum GitRefType {
  Head = 0,
  RemoteHead = 1,
  Tag = 2,
}

export interface GitRef {
  readonly type: GitRefType;
  readonly name?: string;
  readonly commit?: string;
  readonly remote?: string;
}

export interface GitRemote {
  readonly name: string;
}

export interface GitRepositoryState {
  readonly HEAD: GitRef | undefined;
  readonly remotes?: readonly GitRemote[];
  readonly onDidChange: vscode.Event<void>;
}

export interface GitRepository {
  readonly rootUri: vscode.Uri;
  readonly state: GitRepositoryState;
  readonly onDidCommit: vscode.Event<void>;
  getBranches(query: { remote?: boolean }): Promise<GitRef[]>;
}

interface GitAPI {
  readonly repositories: GitRepository[];
  readonly onDidOpenRepository: vscode.Event<GitRepository>;
  readonly onDidCloseRepository: vscode.Event<GitRepository>;
  readonly onDidPublish: vscode.Event<unknown>;
}

/** Kind of HEAD update recorded in the reflog that progresses an achievement */
export type ReflogAction = "amend" | "merge" | "rebase";

/**
 * How a local branch came to be, according to its own reflog: "created" by
 * the user, "checkout" of a remote branch (or a clone/fetch), "renamed" from
 * another branch, or "unknown" when it has no reflog (reflogs disabled).
 */
export type BranchOrigin = "created" | "checkout" | "renamed" | "unknown";

/** Location of a repository's git directories */
export interface GitDirectories {
  /** Per-worktree git directory (holds HEAD and its reflog) */
  gitDir: vscode.Uri;
  /** Directory shared by every worktree of the repository (holds the refs) */
  commonDir: vscode.Uri;
}

/**
 * Git related events listeners functions and handlers
 *
 * @namespace gitListeners
 * @function activate - Create git related events listeners
 */
export namespace gitListeners {
  /** Delay before inspecting a repository once its state stops changing */
  const REFRESH_DEBOUNCE_MS = 1000;

  /**
   * Local branch names already seen, per repository common directory.
   * Shared by every tracker of the same repository (a main checkout and its
   * worktrees share their branches) so a branch is only counted once. Names
   * are never removed: deleting and recreating a branch does not count twice.
   */
  const knownBranches = new Map<string, Set<string>>();

  /**
   * Linked worktrees already counted, as `<repository key>\n<name>`. The name
   * is the worktree's directory under `<common dir>/worktrees`, which is
   * unique per repository and kept by `git worktree move`. A worktree is seen
   * by its main checkout and by the other worktrees opened as repositories,
   * so it is only counted once. Entries are never removed: removing a
   * worktree and adding it back under the same name does not count twice.
   */
  const countedWorktrees = new Set<string>();

  /**
   * Create git related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.GIT)) {
      logger.info("Starting git events listeners");

      const gitExtension =
        vscode.extensions.getExtension("vscode.git")?.exports;
      if (!gitExtension) {
        logger.error(
          "Git extension not found, git listeners will not be created",
        );
        return;
      }

      const gitAPI: GitAPI = gitExtension.getAPI(1);
      const trackers = new Map<GitRepository, RepositoryTracker>();

      const trackRepository = (repository: GitRepository) => {
        if (trackers.has(repository)) {
          return;
        }
        repository.onDidCommit(handleCommit, null, context.subscriptions);
        trackers.set(repository, new RepositoryTracker(repository));
      };

      // Handle current workspace repositories
      for (const repository of gitAPI.repositories) {
        trackRepository(repository);
      }

      // Handle new repositories
      gitAPI.onDidOpenRepository(trackRepository, null, context.subscriptions);
      gitAPI.onDidCloseRepository(
        (repository: GitRepository) => {
          trackers.get(repository)?.dispose();
          trackers.delete(repository);
        },
        null,
        context.subscriptions,
      );

      // Handle push event
      gitAPI.onDidPublish(handlePublish, null, context.subscriptions);

      context.subscriptions.push({
        dispose: () => {
          for (const tracker of trackers.values()) {
            tracker.dispose();
          }
          trackers.clear();
        },
      });

      logger.debug("Git listeners activated");
    } else {
      logger.info("Git listeners are disabled");
    }
  }

  export async function handleCommit() {
    await ProgressionController.increaseProgression(constants.criteria.COMMITS);
  }

  export async function handlePublish() {
    await ProgressionController.increaseProgression(constants.criteria.PUSHES);
  }

  /**
   * Find the git directories of a repository. Handles regular checkouts
   * (`.git` directory) as well as worktrees and submodules (`.git` file
   * pointing to the actual git directory).
   *
   * @param {vscode.Uri} rootUri - Repository root
   * @returns {Promise<GitDirectories | undefined>} undefined when they cannot be resolved
   */
  export async function resolveGitDirectories(
    rootUri: vscode.Uri,
  ): Promise<GitDirectories | undefined> {
    if (rootUri.scheme !== "file") {
      return undefined;
    }
    const dotGit = vscode.Uri.joinPath(rootUri, ".git");
    let gitDir: vscode.Uri;
    try {
      const stat = await vscode.workspace.fs.stat(dotGit);
      if (stat.type & vscode.FileType.Directory) {
        gitDir = dotGit;
      } else {
        const content = await readText(dotGit);
        const match = /^gitdir:\s*(.+?)\s*$/m.exec(content);
        if (!match) {
          return undefined;
        }
        gitDir = resolvePath(rootUri, match[1]);
      }
    } catch {
      return undefined;
    }

    let commonDir = gitDir;
    try {
      const content = (
        await readText(vscode.Uri.joinPath(gitDir, "commondir"))
      ).trim();
      if (content) {
        commonDir = resolvePath(gitDir, content);
      }
    } catch {
      // No commondir file: the git directory is the common directory
    }
    return { gitDir, commonDir };
  }

  /**
   * Tell how a branch came to be from the messages of its own reflog
   * (`<common dir>/logs/refs/heads/<name>`), as written by git 2.56.
   *
   * A renamed or copied branch keeps the reflog of its source and appends
   * "Branch: renamed refs/heads/old to refs/heads/new". Renaming a branch
   * that was already known does not create one, but a branch created and
   * renamed since the last inspection was still created.
   *
   * @param {string} name - Branch name
   * @param {string[]} messages - Messages of the branch reflog, oldest first
   * @param {readonly string[]} remotes - Names of the repository remotes
   * @param {(name: string) => boolean} wasKnown - Whether a branch name was seen before
   * @returns {BranchOrigin} How the branch was made
   */
  export function classifyBranchReflog(
    name: string,
    messages: string[],
    remotes: readonly string[],
    wasKnown: (name: string) => boolean = () => true,
  ): BranchOrigin {
    for (const message of messages) {
      const renamed = /^Branch: (renamed|copied) refs\/heads\/(.+) to refs\/heads\/(.+)$/.exec(message);
      if (renamed && wasKnown(renamed[2])) {
        return renamed[1] === "copied" ? "created" : "renamed";
      }
    }
    const first = messages[0];
    if (first === undefined) {
      return "unknown";
    }
    // "branch: Created from HEAD" / "from main" / "from origin/x" /
    // "from refs/remotes/origin/x" (checkout of a remote branch by name)
    const from = /^branch: Created from (.+)$/.exec(first);
    if (from) {
      const qualified = from[1].startsWith("refs/remotes/");
      const source = qualified ? from[1].slice("refs/remotes/".length) : from[1];
      const fromNamesake =
        remotes.some((remote) => source === `${remote}/${name}`) ||
        (qualified && source.endsWith(`/${name}`));
      return fromNamesake ? "checkout" : "created";
    }
    // First commit of an orphan branch (the very first branch of a
    // repository is never counted, see collectCreatedBranches)
    if (first.startsWith("commit (initial):")) {
      return "created";
    }
    // "clone: from <url>", "fetch origin x:x: storing head"...
    return "checkout";
  }

  /**
   * Find the local branches that were not known before and were created
   * locally, then remember them.
   * Their own reflog tells whether they were created, renamed or checked out
   * from a remote branch. Without one, a local branch pointing at the same
   * commit as the remote branch of the same name is taken as checked out
   * from it. The first branches of a repository that had none (`git init`)
   * are not counted.
   *
   * @param {Set<string>} known - Branch names already seen, updated in place
   * @param {GitRef[]} localBranches - Current local branches
   * @param {() => Promise<GitRef[]>} getRemoteBranches - Lazily lists remote branches
   * @param {(name: string, wasKnown: (name: string) => boolean) => Promise<BranchOrigin>} getOrigin - Reads how a branch was made
   * @returns {Promise<number>} Number of branches created
   */
  export async function collectCreatedBranches(
    known: Set<string>,
    localBranches: GitRef[],
    getRemoteBranches: () => Promise<GitRef[]>,
    getOrigin: (
      name: string,
      wasKnown: (name: string) => boolean,
    ) => Promise<BranchOrigin> = async () => "unknown",
  ): Promise<number> {
    const hadBranches = known.size > 0;
    const knownBefore = new Set(known);
    const wasKnown = (name: string) => knownBefore.has(name);
    const newBranches = localBranches.filter(
      (branch) =>
        branch.type === GitRefType.Head &&
        branch.name !== undefined &&
        !known.has(branch.name),
    );
    if (newBranches.length === 0) {
      return 0;
    }
    // Remember them before awaiting so a concurrent refresh cannot count them
    for (const branch of newBranches) {
      known.add(branch.name as string);
    }
    if (!hadBranches) {
      return 0;
    }

    try {
      let remoteBranches: GitRef[] | undefined;
      let created = 0;
      for (const branch of newBranches) {
        const origin = await getOrigin(branch.name as string, wasKnown);
        if (origin === "unknown") {
          remoteBranches ??= await getRemoteBranches();
          const fromRemote = remoteBranches.some(
            (remote) =>
              remote.type === GitRefType.RemoteHead &&
              remote.commit === branch.commit &&
              remote.name === `${remote.remote}/${branch.name}`,
          );
          if (!fromRemote) {
            created++;
          }
        } else if (origin === "created") {
          created++;
        }
      }
      return created;
    } catch (error) {
      // Let the next inspection try them again
      for (const branch of newBranches) {
        known.delete(branch.name as string);
      }
      throw error;
    }
  }

  /**
   * Count the worktrees that were not counted before, then remember them.
   *
   * @param {Set<string>} counted - Worktrees already counted, updated in place
   * @param {string[]} ids - Worktrees newly seen by a tracker
   * @returns {number} Number of worktrees created
   */
  export function collectCreatedWorktrees(
    counted: Set<string>,
    ids: string[],
  ): number {
    let created = 0;
    for (const id of new Set(ids)) {
      if (!counted.has(id)) {
        counted.add(id);
        created++;
      }
    }
    return created;
  }

  /**
   * List the names of the linked worktrees of a repository, the way the git
   * extension does: one directory per worktree under `<common dir>/worktrees`.
   *
   * @param {vscode.Uri} commonDir - Repository common directory
   * @returns {Promise<string[]>} Worktree names
   */
  export async function listWorktreeNames(
    commonDir: vscode.Uri,
  ): Promise<string[]> {
    const worktreesDir = nodePath.join(commonDir.fsPath, "worktrees");
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(worktreesDir, { withFileTypes: true });
    } catch {
      return []; // No linked worktree
    }
    const names: string[] = [];
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        fs.existsSync(nodePath.join(worktreesDir, entry.name, "gitdir"))
      ) {
        names.push(entry.name);
      }
    }
    return names;
  }

  /**
   * Summarize the local branch refs of a repository, so that branches are
   * only listed (with `git for-each-ref`, which shows a progress indicator in
   * the Source Control view) when one may have been created.
   *
   * @param {vscode.Uri} commonDir - Repository common directory
   * @returns {Promise<string>} A value that changes when a branch is added, removed or renamed
   */
  export async function branchRefsFingerprint(
    commonDir: vscode.Uri,
  ): Promise<string> {
    const parts: string[] = [];
    const walk = async (dir: string, prefix: string): Promise<void> => {
      for (const entry of await fs.promises.readdir(dir, {
        withFileTypes: true,
      })) {
        if (entry.isDirectory()) {
          await walk(nodePath.join(dir, entry.name), `${prefix}${entry.name}/`);
        } else {
          parts.push(`${prefix}${entry.name}`);
        }
      }
    };
    try {
      await walk(nodePath.join(commonDir.fsPath, "refs", "heads"), "");
    } catch {
      parts.push("\0no-loose-refs");
    }
    // Packed refs, and the reftable ref storage (no loose refs at all)
    for (const file of ["packed-refs", nodePath.join("reftable", "tables.list")]) {
      try {
        const { mtimeMs, size } = await fs.promises.stat(
          nodePath.join(commonDir.fsPath, file),
        );
        parts.push(`\0${file}:${mtimeMs}:${size}`);
      } catch {
        parts.push(`\0${file}:-`);
      }
    }
    return parts.sort().join("\n");
  }

  /**
   * Classify a HEAD reflog entry message (the part after the tab), as written
   * by git whether the operation ran from VS Code or from a terminal.
   * Pulls are deliberately ignored: integrating upstream changes is routine
   * syncing, not a merge or rebase made by the user.
   *
   * @param {string} message - Reflog entry message
   * @returns {ReflogAction | undefined} undefined when the entry is not tracked
   */
  export function classifyReflogMessage(
    message: string,
  ): ReflogAction | undefined {
    // "commit (amend): message"
    if (message.startsWith("commit (amend):")) {
      return "amend";
    }
    // "merge feature: Merge made by the 'ort' strategy." / "merge x: Fast-forward"
    // "commit (merge): Merge branch 'x'" (merge concluded after conflicts)
    if (/^merge\s/.test(message) || message.startsWith("commit (merge):")) {
      return "merge";
    }
    // "rebase (finish): returning to refs/heads/x", "rebase -i (finish): ..."
    // or "rebase finished: returning to ..." (older apply backend)
    if (/^rebase(?: -i)? (?:\(finish\)|finished): /.test(message)) {
      return "rebase";
    }
    return undefined;
  }

  /**
   * Extract the messages of complete reflog lines.
   * Line format: `<old> <new> <name> <<email>> <timestamp> <tz>\t<message>`
   *
   * @param {string} text - Reflog content made of complete lines
   * @returns {string[]} Messages of the entries
   */
  export function parseReflogMessages(text: string): string[] {
    return text
      .split("\n")
      .filter((line) => line.includes("\t"))
      .map((line) => line.slice(line.indexOf("\t") + 1));
  }

  /**
   * Watches a single repository and turns its state changes into progressions.
   * State changes are debounced and inspections are serialized.
   *
   * @class RepositoryTracker
   */
  export class RepositoryTracker implements vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private timer: ReturnType<typeof setTimeout> | undefined;
    private queue: Promise<void> = Promise.resolve();
    private directories: Promise<GitDirectories | undefined> | undefined;
    /** Key of the repository shared by its worktrees (resolved common dir) */
    private key: Promise<string> | undefined;
    /** Bytes of the HEAD reflog already processed, undefined until the baseline */
    private reflogOffset: number | undefined;
    /** Branch refs at the last branch inspection, see branchRefsFingerprint */
    private branchesFingerprint: string | undefined;
    /** Worktrees this tracker saw, undefined until the baseline */
    private seenWorktrees: Set<string> | undefined;
    private watchingCommonDir = false;
    private disposed = false;

    constructor(
      private readonly repository: GitRepository,
      private readonly debounceMs = REFRESH_DEBOUNCE_MS,
    ) {
      this.disposables.push(
        repository.state.onDidChange(() => this.schedule()),
      );
      // Record the initial state (baseline) without counting anything
      this.schedule();
    }

    /** Debounce a refresh of the repository */
    private schedule(): void {
      if (this.disposed) {
        return;
      }
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        void this.refresh();
      }, this.debounceMs);
    }

    /**
     * Inspect the repository and update the progressions. Calls are
     * serialized so two inspections never interleave.
     *
     * @returns {Promise<void>}
     */
    refresh(): Promise<void> {
      this.queue = this.queue
        .then(() => this.inspect())
        .catch((error: unknown) => {
          logger.error(
            `Failed to inspect git repository ${this.repository.rootUri.fsPath}: ${String(error)}`,
          );
        });
      return this.queue;
    }

    private async inspect(): Promise<void> {
      // HEAD is unset until the git extension ran its first status
      if (this.disposed || !this.repository.state.HEAD) {
        return;
      }
      this.directories ??= resolveGitDirectories(this.repository.rootUri);
      const directories = await this.directories;
      if (!directories) {
        return;
      }
      this.key ??= repositoryKey(directories.commonDir);
      const key = await this.key;
      if (this.disposed) {
        return;
      }
      this.watchCommonDir(directories);

      await this.inspectBranches(directories.commonDir, key);
      await this.inspectReflog(directories.gitDir);
      await this.inspectWorktrees(directories.commonDir, key);
    }

    /**
     * The git extension only watches the git directory of the worktree a
     * repository was opened from. When that is a linked worktree, branches
     * and worktrees created from a terminal (they live in the common
     * directory) would go unnoticed until an unrelated status refresh.
     */
    private watchCommonDir(directories: GitDirectories): void {
      if (
        this.watchingCommonDir ||
        directories.gitDir.toString() === directories.commonDir.toString()
      ) {
        return;
      }
      this.watchingCommonDir = true;
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
          directories.commonDir,
          // `git worktree add` writes worktrees/<name>/gitdir right after
          // creating its directory, and the watcher often misses that file:
          // the directory itself is reported reliably
          "{worktrees/*,worktrees/*/gitdir,refs/heads/**,packed-refs}",
        ),
      );
      this.disposables.push(
        watcher,
        watcher.onDidCreate(() => this.schedule()),
        watcher.onDidChange(() => this.schedule()),
        watcher.onDidDelete(() => this.schedule()),
      );
    }

    /**
     * Count the linked worktrees that appeared since the first inspection.
     * Each tracker keeps its own baseline: a worktree opened as a repository
     * lists itself at its first inspection, which must not keep the main
     * checkout from counting it.
     */
    private async inspectWorktrees(
      commonDir: vscode.Uri,
      key: string,
    ): Promise<void> {
      const ids = (await listWorktreeNames(commonDir)).map(
        (name) => `${key}\n${name}`,
      );

      if (!this.seenWorktrees) {
        this.seenWorktrees = new Set(ids);
        return;
      }

      const newlySeen = ids.filter((id) => !this.seenWorktrees?.has(id));
      for (const id of newlySeen) {
        this.seenWorktrees.add(id);
      }
      const created = collectCreatedWorktrees(countedWorktrees, newlySeen);
      if (created > 0) {
        await ProgressionController.increaseProgression(
          constants.criteria.WORKTREES_CREATED,
          created,
        );
      }
    }

    /**
     * Read the HEAD reflog entries appended since the last inspection.
     * The first inspection only records the current size, so past history is
     * never counted.
     */
    private async inspectReflog(gitDir: vscode.Uri): Promise<void> {
      const reflogUri = vscode.Uri.joinPath(gitDir, "logs", "HEAD");
      let size: number;
      try {
        size = (await vscode.workspace.fs.stat(reflogUri)).size;
      } catch {
        // No reflog yet (fresh repository): count everything once it appears
        this.reflogOffset ??= 0;
        return;
      }

      if (this.reflogOffset === undefined || size < this.reflogOffset) {
        // Baseline, or the reflog was rewritten (expired / deleted entries)
        this.reflogOffset = size;
        return;
      }
      if (size === this.reflogOffset) {
        return;
      }

      const content = await vscode.workspace.fs.readFile(reflogUri);
      const appended = content.subarray(this.reflogOffset);
      // Keep a partially written last line for the next inspection
      const end = appended.lastIndexOf(0x0a) + 1;
      if (end === 0) {
        return;
      }
      this.reflogOffset += end;

      const counts: Record<ReflogAction, number> = {
        amend: 0,
        merge: 0,
        rebase: 0,
      };
      for (const message of parseReflogMessages(
        new TextDecoder().decode(appended.subarray(0, end)),
      )) {
        const action = classifyReflogMessage(message);
        if (action) {
          counts[action]++;
        }
      }

      const mergesAndRebases = counts.merge + counts.rebase;
      if (mergesAndRebases > 0) {
        await ProgressionController.increaseProgression(
          constants.criteria.MERGES_AND_REBASES,
          mergesAndRebases,
        );
      }
      if (counts.amend > 0) {
        await ProgressionController.increaseProgression(
          constants.criteria.AMENDS,
          counts.amend,
        );
      }
    }

    private async inspectBranches(
      commonDir: vscode.Uri,
      key: string,
    ): Promise<void> {
      const fingerprint = await branchRefsFingerprint(commonDir);
      if (fingerprint === this.branchesFingerprint) {
        return;
      }
      const localBranches = await this.repository.getBranches({
        remote: false,
      });
      const known = knownBranches.get(key);
      if (!known) {
        knownBranches.set(
          key,
          new Set(
            localBranches.flatMap((branch) =>
              branch.name ? [branch.name] : [],
            ),
          ),
        );
        this.branchesFingerprint = fingerprint;
        return;
      }

      const remotes = (this.repository.state.remotes ?? []).map(
        (remote) => remote.name,
      );
      const created = await collectCreatedBranches(
        known,
        localBranches,
        async () =>
          (await this.repository.getBranches({ remote: true })).filter(
            (branch) => branch.type === GitRefType.RemoteHead,
          ),
        async (name, wasKnown) =>
          classifyBranchReflog(
            name,
            await readBranchReflog(commonDir, name),
            remotes,
            wasKnown,
          ),
      );
      this.branchesFingerprint = fingerprint;
      if (created > 0) {
        await ProgressionController.increaseProgression(
          constants.criteria.BRANCHES_CREATED,
          created,
        );
      }
    }

    dispose(): void {
      this.disposed = true;
      clearTimeout(this.timer);
      for (const disposable of this.disposables) {
        disposable.dispose();
      }
      this.disposables.length = 0;
    }
  }

  /**
   * Forget every known branch and worktree. Only meant for tests.
   */
  export function _resetState(): void {
    knownBranches.clear();
    countedWorktrees.clear();
  }

  /**
   * Identify a repository by its common directory, resolved so that a
   * checkout opened through a symlink and its worktrees (whose `.git` file
   * holds the real path) share the same key.
   */
  async function repositoryKey(commonDir: vscode.Uri): Promise<string> {
    try {
      return await fs.promises.realpath(commonDir.fsPath);
    } catch {
      return commonDir.fsPath;
    }
  }

  /**
   * Read the reflog messages of a local branch, oldest first. Empty when the
   * branch has no reflog (reflogs disabled, e.g. in a bare repository).
   */
  async function readBranchReflog(
    commonDir: vscode.Uri,
    name: string,
  ): Promise<string[]> {
    try {
      return parseReflogMessages(
        await fs.promises.readFile(
          nodePath.join(commonDir.fsPath, "logs", "refs", "heads", ...name.split("/")),
          "utf8",
        ),
      );
    } catch {
      return [];
    }
  }

  async function readText(uri: vscode.Uri): Promise<string> {
    return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
  }

  /**
   * Resolve a path read from a git file, relative to a base directory.
   */
  function resolvePath(base: vscode.Uri, target: string): vscode.Uri {
    const isAbsolute = target.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(target);
    return isAbsolute
      ? vscode.Uri.file(target)
      : vscode.Uri.joinPath(base, target);
  }
}
