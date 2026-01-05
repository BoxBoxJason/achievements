# Contributing

Thanks for taking the time to contribute!

This project follows an **issues-first** workflow:

- Please **create an issue first** for any change.
- Please **only work on existing issues** (including documentation changes).
- Contributions must come from a **fork** and be submitted as a **pull request** (merge request).

## Prerequisites

- VS Code
- Node.js `24` (matches CI in [build workflow](.github/workflows/build.yml))
- npm
- Git

## Development setup

1. Fork the repository on GitHub.
2. Clone your fork.
3. Install dependencies:

   - `npm ci`

4. Open the project in VS Code:

   - `code .`

## Running the extension (local dev)

This repository is set up for the standard VS Code extension development workflow.

1. In VS Code, open the **Run and Debug** view.
2. Select **Run Extension**.
3. Press `F5`.

This launches an **Extension Development Host** window.

### Build/watch pipeline (what `F5` uses)

The debug launch uses the default VS Code task `watch` (see [.vscode/tasks.json](.vscode/tasks.json)). It runs:

- `npm run watch:esbuild` — bundles the extension entrypoint and the React webview bundle.
- `npm run watch:tsc` — TypeScript type-check in watch mode (no emit).

If you prefer the command line, you can run those scripts directly in separate terminals.

## Tests

- Run tests once:
  - `npm test`

This compiles with `tsc` and runs extension tests via `@vscode/test-cli`/`@vscode/test-electron`.

- Run tests with coverage:
  - `npm run test:coverage`

This instruments the compiled output with `nyc`, runs the test runner, then produces reports.

## Linting & type checking

- Type-check:
  - `npm run check-types`

- Lint:
  - `npm run lint`

## Packaging (VSIX)

- Create a VSIX locally:
  - `npm run package`

This runs the production build and then packages via `vsce`.

## Script reference

These are the most useful scripts from [package.json](package.json):

- `npm run compile`
  - Cleans `dist/`, builds Tailwind CSS, and bundles the extension + webview via `esbuild`.

- `npm run build`
  - Production build: clean + Tailwind + typecheck + lint + minified bundle.

- `npm run watch:esbuild`
  - Watch-mode bundling for the extension and webview.

- `npm run watch:tsc`
  - Watch-mode typecheck (no output files are written).

- `npm test`
  - Compiles with `tsc` and runs the VS Code integration test runner.

- `npm run test:coverage`
  - Runs tests with `nyc` coverage.

- `npm run lint`
  - Lints `src/` using ESLint.

- `npm run check-types`
  - Runs `tsc --noEmit`.

- `npm run tailwind`
  - Builds the webview CSS from [src/views/style/main.css](src/views/style/main.css) into `dist/style/main.css`.

- `npm run clean`
  - Removes build/test artifacts (`dist`, `dist-cov`, `.nyc_output`).

- `npm run changelog`
  - Regenerates [CHANGELOG.md](CHANGELOG.md) via `git-cliff`.

## Workflow: issues first

1. **Open an issue**
   - Bug: include repro steps, expected vs actual behavior, and logs if possible.
   - Feature: explain the problem, the proposed change, and any privacy implications.

2. **Wait for confirmation**
   - A maintainer should confirm the issue is valid / wanted before you start work.

3. **Implement the change in your fork**
   - Create a topic branch from your fork’s `main`.
   - Keep PRs focused to the issue.

4. **Open a pull request (merge request)**
   - Reference the issue number (e.g. `Fixes #123`).
   - Describe what changed and how it was tested.

## Coding guidelines

- Keep changes scoped to the issue.
- Avoid refactors in the same PR unless the issue explicitly calls for it.
- Prefer maintaining existing style and patterns.
- If you touch user-facing behavior, update docs if needed.

## Reporting bugs / requesting features

Please use the GitHub issue templates:

- Bug reports: [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)
- Feature requests: [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)
