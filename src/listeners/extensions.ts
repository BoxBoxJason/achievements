/**
 * Extensions events listeners for achievements extension
 *
 * @namespace extensionsListeners
 * @author BoxBoxJason
 */

import * as vscode from "vscode";
import { ProgressionController } from "../database/controller/progressions";
import { constants } from "../constants";
import logger from "../utils/logger";
import { config } from "../config/config";

/**
 * Extensions and Themes related events listeners functions and handlers
 *
 * @namespace extensionsListeners
 * @function activate - Create extensions and themes related events listeners
 */
export namespace extensionsListeners {
  /**
   * Check the total number of installed extensions and themes
   *
   * @memberof extensionsListeners
   * @returns {Promise<void>}
   */
  export async function checkExtensions(): Promise<void> {
    // Check the total number of installed extensions
    const extensionCount = vscode.extensions.all.length;
    await ProgressionController.updateProgression(
      constants.criteria.EXTENSIONS_INSTALLED,
      extensionCount,
      true,
    );

    const themesExtensionsCount = vscode.extensions.all.filter((extension) => {
      const contributes = extension.packageJSON.contributes;
      return contributes?.themes;
    }).length;
    await ProgressionController.updateProgression(
      constants.criteria.THEMES_INSTALLED,
      themesExtensionsCount,
      true,
    );
  }

  /**
   * Fetch the latest versions of extensions from the VS Marketplace.
   * Throws on network or API errors (caller must handle offline scenario).
   *
   * @param extensionIds - List of "publisher.name" identifiers
   * @returns Map of lowercase "publisher.name" → latest version string
   */
  async function fetchLatestExtensionVersions(
    extensionIds: string[],
  ): Promise<Map<string, string>> {
    const response = await fetch(
      "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json;api-version=3.0-preview.1",
        },
        body: JSON.stringify({
          filters: [
            {
              criteria: extensionIds.map((id) => ({
                filterType: 7,
                value: id,
              })),
            },
          ],
          flags: 512,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Marketplace API returned ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      results?: Array<{
        extensions?: Array<{
          publisher?: { publisherName?: string };
          extensionName?: string;
          versions?: Array<{ version?: string }>;
        }>;
      }>;
    };

    const versionMap = new Map<string, string>();
    for (const ext of data.results?.[0]?.extensions ?? []) {
      const publisherName = ext.publisher?.publisherName ?? "";
      const extensionName = ext.extensionName ?? "";
      const version = ext.versions?.[0]?.version;
      if (publisherName && extensionName && version) {
        versionMap.set(
          `${publisherName}.${extensionName}`.toLowerCase(),
          version,
        );
      }
    }

    return versionMap;
  }

  /**
   * Check how many installed extensions are outdated by querying the VS Marketplace.
   * Silently skips the update when offline or if the API is unreachable.
   *
   * @memberof extensionsListeners
   * @returns {Promise<void>}
   */
  export async function checkOutdatedExtensions(): Promise<void> {
    try {
      const nonBuiltinExtensions = vscode.extensions.all.filter(
        (ext) => !ext.id.startsWith("vscode."),
      );

      if (nonBuiltinExtensions.length === 0) {
        await ProgressionController.updateProgression(
          constants.criteria.EXTENSIONS_OUTDATED,
          0,
          true,
        );
        return;
      }

      const extensionIds = nonBuiltinExtensions.map(
        (ext) =>
          `${ext.packageJSON.publisher as string}.${ext.packageJSON.name as string}`,
      );

      const latestVersions = await fetchLatestExtensionVersions(extensionIds);

      const outdatedCount = nonBuiltinExtensions.filter((ext) => {
        const id =
          `${ext.packageJSON.publisher as string}.${ext.packageJSON.name as string}`.toLowerCase();
        const latestVersion = latestVersions.get(id);
        return (
          latestVersion !== undefined &&
          latestVersion !== (ext.packageJSON.version as string)
        );
      }).length;

      await ProgressionController.updateProgression(
        constants.criteria.EXTENSIONS_OUTDATED,
        outdatedCount,
        true,
      );
    } catch (err) {
      logger.debug(`Unable to check for outdated extensions: ${String(err)}`);
    }
  }

  /**
   * Handle theme change event
   *
   * @memberof extensionsListeners
   * @param {vscode.ColorTheme} event - The theme change event
   * @returns {Promise<void>}
   */
  export async function handleThemeChange(
    _event: vscode.ColorTheme,
  ): Promise<void> {
    await ProgressionController.increaseProgression(
      constants.criteria.THEME_CHANGED,
    );
  }

  /**
   * Create extensions and themes related events listeners
   *
   * @param {vscode.ExtensionContext} context - Extension context
   * @returns {void}
   */
  export function activate(context: vscode.ExtensionContext): void {
    if (config.isListenerEnabled(constants.listeners.EXTENSIONS)) {
      logger.info("Starting extensions events listeners");

      vscode.extensions.onDidChange(
        checkExtensions,
        null,
        context.subscriptions,
      );

      vscode.extensions.onDidChange(
        () =>
          checkOutdatedExtensions().catch((err: unknown) => logger.error(err)),
        null,
        context.subscriptions,
      );

      vscode.window.onDidChangeActiveColorTheme(
        handleThemeChange,
        null,
        context.subscriptions,
      );

      logger.debug("Extensions listeners activated");

      // Check the total number of installed extensions at the boot
      checkExtensions().catch((err: unknown) => logger.error(err));
      checkOutdatedExtensions().catch((err: unknown) => logger.error(err));
    } else {
      logger.info("Extensions events listeners are disabled");
    }
  }
}
