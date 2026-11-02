/**
 * Shortcut events listeners for achievements extension.
 * Tracks paste operations (Copy Ninja), including pastes into several
 * cursors at once (Shadow Clone Jutsu).
 *
 * @namespace shortcutsListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import logger from "../utils/logger";
import { config } from "../config/config";
import { shouldIgnoreUri } from "./files";

/**
 * Shortcut related events listeners functions and handlers
 *
 * @namespace shortcutsListeners
 * @function activate - Create shortcut related events listeners
 */
export namespace shortcutsListeners {
  /** How long the user may take to pick an option of "Paste As..." */
  const PASTE_AS_TIMEOUT_MS = 60000;

  /** A "Paste As..." whose options were listed, waiting for the user's pick */
  interface PendingPaste {
    uri: string;
    text: string;
    cursors: number;
    expires: number;
  }
  let pendingPasteAs: PendingPaste | undefined;

  /**
   * Count a paste, and a multi-cursor paste when it lands on several cursors.
   *
   * @param {number} cursors - Number of cursors the text is pasted on
   */
  function countPaste(cursors: number): void {
    ProgressionController.increaseProgression(
      constants.criteria.NUMBER_OF_PASTES,
    ).catch((err: unknown) => logger.error(err));
    // One range per cursor: the paste lands on several cursors at once
    if (cursors > 1) {
      ProgressionController.increaseProgression(
        constants.criteria.MULTI_CURSOR_PASTES,
      ).catch((err: unknown) => logger.error(err));
    }
  }

  /**
   * Compare pasted text ignoring what the editor may adjust on the way in
   * (line endings, indentation).
   */
  function normalize(text: string): string {
    return text
      .split(/\r\n?|\n/)
      .map((line) => line.trim())
      .join("\n")
      .trim();
  }

  /**
   * Whether text inserted at one cursor is the clipboard text: all of it, or
   * one of its lines when it is spread over as many cursors as it has lines.
   */
  function isPastedText(inserted: string, clipboard: string): boolean {
    const text = normalize(inserted);
    return (
      text === normalize(clipboard) ||
      (text !== "" &&
        clipboard.split(/\r\n?|\n/).some((line) => normalize(line) === text))
    );
  }

  /**
   * Document paste edit provider used only for its side effect of tracking
   * paste operations. It never replaces the default paste behavior.
   *
   * @memberof shortcutsListeners
   */
  export class AchievementsPasteEditProvider
    implements vscode.DocumentPasteEditProvider
  {
    provideDocumentPasteEdits(
      document: vscode.TextDocument,
      ranges: readonly vscode.Range[],
      dataTransfer: vscode.DataTransfer,
      context: vscode.DocumentPasteEditContext,
      _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.DocumentPasteEdit[]> {
      // Returning undefined lets VS Code perform the default, unmodified
      // paste - this handler never alters editor content.
      if (shouldIgnoreUri(document.uri)) {
        return undefined;
      }
      if (context.triggerKind === vscode.DocumentPasteTriggerKind.PasteAs) {
        // "Paste As..." lists every provider's options before the user
        // picks one, and picking none (Esc) cancels the paste: only count
        // it once the text lands in the document.
        const item = dataTransfer.get("text/plain");
        if (!item) {
          return undefined;
        }
        return item.asString().then((text) => {
          pendingPasteAs = {
            uri: document.uri.toString(),
            text,
            cursors: ranges.length,
            expires: Date.now() + PASTE_AS_TIMEOUT_MS,
          };
          return undefined;
        });
      }
      countPaste(ranges.length);
      return undefined;
    }
  }

  /**
   * Count a "Paste As..." once the document receives the pasted text. The
   * first edit of the document after the options were listed decides: if it
   * is not the paste, the user cancelled it (or typed instead).
   *
   * @param {vscode.TextDocumentChangeEvent} event - Document change
   */
  export function handleTextDocumentChange(
    event: vscode.TextDocumentChangeEvent,
  ): void {
    const pending = pendingPasteAs;
    if (
      !pending ||
      event.contentChanges.length === 0 ||
      event.document.uri.toString() !== pending.uri
    ) {
      return;
    }
    pendingPasteAs = undefined;
    if (
      Date.now() <= pending.expires &&
      event.reason === undefined && // not an undo / redo
      event.contentChanges.length === pending.cursors &&
      event.contentChanges.every((change) =>
        isPastedText(change.text, pending.text),
      )
    ) {
      countPaste(pending.cursors);
    }
  }

  /**
   * Create shortcut related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.SHORTCUTS)) {
      logger.info("Starting shortcuts events listeners");

      context.subscriptions.push(
        vscode.languages.registerDocumentPasteEditProvider(
          { scheme: "file" },
          new AchievementsPasteEditProvider(),
          {
            providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Text],
            pasteMimeTypes: ["text/plain"],
          },
        ),
        vscode.workspace.onDidChangeTextDocument(handleTextDocumentChange),
      );

      logger.debug("Shortcuts listeners activated");
    } else {
      logger.info("Shortcuts listeners are disabled");
    }
  }
}
