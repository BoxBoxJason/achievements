import { constants } from "./src/constants";
import * as esbuild from "esbuild";

const production = process.argv.includes("--production");
/**
 * An esbuild plugin to match and log problems during the build.
 * @type {esbuild.Plugin}
 */
const esbuildProblemMatcherPlugin: esbuild.Plugin = {
  name: "esbuild-problem-matcher",
  setup(build: esbuild.PluginBuild) {
    build.onStart(() => {
      console.log("build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(
            `    ${location.file}:${location.line}:${location.column}:`
          );
        }
      });
      console.log("build finished");
    });
  },
};

async function main() {
  // Build for webview React code
  const ctxWebview = await esbuild.context({
    entryPoints: [...constants.build.WEBVIEW_ENTRYPOINTS],
    bundle: true,
    format: "iife", // Output format suitable for webviews
    minify: production,
    sourcemap: !production,
    platform: "browser",
    outfile: constants.build.WEBVIEW_OUT_FILE,
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });

  // Build for main extension
  const ctxExtension = await esbuild.context({
    entryPoints: [...constants.build.EXTENSION_ENTRYPOINTS],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: constants.build.EXTENSION_OUT_FILE,
    external: ["vscode", "better-sqlite3"],
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  });

  // Single builds
  await ctxWebview.rebuild();
  await ctxWebview.dispose();
  await ctxExtension.rebuild();
  await ctxExtension.dispose();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
