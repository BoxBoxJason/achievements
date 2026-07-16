# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-07-16

### Added

- Add Night Owl / Early Bird time-of-day achievements by @BoxBoxJason in [#96](https://github.com/BoxBoxJason/achievements/pull/96)

### Changed

- Track remote dev sessions and multi-root workspaces by @BoxBoxJason in [#97](https://github.com/BoxBoxJason/achievements/pull/97)
- Track editor ergonomics (split editors, multi-cursor, terminals) by @BoxBoxJason in [#95](https://github.com/BoxBoxJason/achievements/pull/95)
- Create copy ninja pastes listeners by @BoxBoxJason in [#94](https://github.com/BoxBoxJason/achievements/pull/94)
- Pin dependencies by @renovate[bot] in [#91](https://github.com/BoxBoxJason/achievements/pull/91)
- Configure renovate by @BoxBoxJason
- Update changelog by @BoxBoxJason

### Fixed

- Only one early bird / nigh owl trigger per day by @BoxBoxJason in [#98](https://github.com/BoxBoxJason/achievements/pull/98)

### New Contributors

* @renovate[bot] made their first contribution in [#91](https://github.com/BoxBoxJason/achievements/pull/91)

## [0.5.1] - 2026-07-14

### Added

- Add Content-Security-Policy and remove stray script tag by @BoxBoxJason in [#86](https://github.com/BoxBoxJason/achievements/pull/86)

### Changed

- Update all dependencies by @BoxBoxJason in [#89](https://github.com/BoxBoxJason/achievements/pull/89)
- Debounce search title input and drop stale query responses by @BoxBoxJason in [#85](https://github.com/BoxBoxJason/achievements/pull/85)
- Debounce full DB export/write on hot mutation paths by @BoxBoxJason in [#84](https://github.com/BoxBoxJason/achievements/pull/84)
- Clean up dead code, misleading comments and small maintainability issues by @BoxBoxJason in [#87](https://github.com/BoxBoxJason/achievements/pull/87)
- Bump the npm_and_yarn group across 1 directory with 2 updates by @dependabot[bot] in [#53](https://github.com/BoxBoxJason/achievements/pull/53)
- Make search case insensitive by @BoxBoxJason

### Fixed

- Non clickable filters by @BoxBoxJason in [#90](https://github.com/BoxBoxJason/achievements/pull/90)
- Stop error() from always popping a modal toast by @BoxBoxJason in [#76](https://github.com/BoxBoxJason/achievements/pull/76)
- Serialize diagnostics handler instead of dropping events by @BoxBoxJason in [#77](https://github.com/BoxBoxJason/achievements/pull/77)
- Gate marketplace outdated-extensions check behind opt-in setting by @BoxBoxJason in [#88](https://github.com/BoxBoxJason/achievements/pull/88)
- Use achievement title as stable React key in AchievementsHolder by @BoxBoxJason in [#83](https://github.com/BoxBoxJason/achievements/pull/83)
- Free prepared statements on error paths by @BoxBoxJason in [#82](https://github.com/BoxBoxJason/achievements/pull/82)
- Standardize achievedAt to ISO-8601 and harden date parsing by @BoxBoxJason in [#81](https://github.com/BoxBoxJason/achievements/pull/81)
- Validate sort criteria/direction in the model layer by @BoxBoxJason in [#80](https://github.com/BoxBoxJason/achievements/pull/80)
- Dispose onDidChangeBreakpoints and batch progression update by @BoxBoxJason in [#79](https://github.com/BoxBoxJason/achievements/pull/79)
- Clear time listener intervals on deactivate by @BoxBoxJason in [#78](https://github.com/BoxBoxJason/achievements/pull/78)

### Removed

- Remove process.exit from fatal to avoid killing extension by @BoxBoxJason in [#75](https://github.com/BoxBoxJason/achievements/pull/75)

### New Contributors

* @dependabot[bot] made their first contribution in [#53](https://github.com/BoxBoxJason/achievements/pull/53)

## [0.5.0] - 2026-05-30

### Added

- Add outdated extensions achievement tracking by @BoxBoxJason in [#51](https://github.com/BoxBoxJason/achievements/pull/51)

### Changed

- Upgrade all dependencies by @BoxBoxJason in [#52](https://github.com/BoxBoxJason/achievements/pull/52)
- Correct docstrings and guides by @BoxBoxJason
- Track lines of comments by @BoxBoxJason
- Run e2e tests in CI by @BoxBoxJason in [#49](https://github.com/BoxBoxJason/achievements/pull/49)
- Update changelog by @BoxBoxJason

## [0.4.1] - 2026-03-22

### Changed

- Harden linting rules by @BoxBoxJason in [#47](https://github.com/BoxBoxJason/achievements/pull/47)

## [0.4.0] - 2026-03-22

### Changed

- Bump package version by @BoxBoxJason
- Ignore files & directories in files achievements by @BoxBoxJason in [#46](https://github.com/BoxBoxJason/achievements/pull/46)
- Update all node dependencies by @BoxBoxJason

### Fixed

- Quick open - close database erasure by @BoxBoxJason

### Removed

- Remove ignore comment by @BoxBoxJason in [#45](https://github.com/BoxBoxJason/achievements/pull/45)

## [0.3.1] - 2026-01-05

### Added

- Add contributing guide by @BoxBoxJason
- Add issues templates by @BoxBoxJason
- Add vscode custom files by @BoxBoxJason
- Add watch commands by @BoxBoxJason

## [0.3.0] - 2026-01-02

### Added

- Add git cliff configuration by @BoxBoxJason
- Add database lockfile by @BoxBoxJason

### Changed

- Optimize database & queries by @BoxBoxJason
- Upgrade all by @BoxBoxJason

### Fixed

- Code monkey progression by @BoxBoxJason

## [0.2.0] - 2025-11-24

### Added

- Add connection streak achievement by @BoxBoxJason in [#32](https://github.com/BoxBoxJason/achievements/pull/32)

## [0.1.2] - 2025-11-23

### Added

- Add icon by @BoxBoxJason
- Add license by @BoxBoxJason
- Add CHANGELOG for vsce publish by @BoxBoxJason

## [0.1.1] - 2025-11-22

### Added

- Add unit tests by @BoxBoxJason
- Add renovate configuration file

### Changed

- Migrate from better-sqlite3 to sql.js by @BoxBoxJason
- Update dependency node to v24
- Update all-dependencies
- Update all-dependencies
- Update actions/setup-node action to v6

### Fixed

- Display text alignment by @BoxBoxJason

### Removed

- Remove useless deps by @BoxBoxJason
- Remove dependabot by @BoxBoxJason in [#30](https://github.com/BoxBoxJason/achievements/pull/30)

### New Contributors

* @ made their first contribution

## [0.1.0] - 2025-09-29

### Added

- Add publish workflows by @BoxBoxJason
- Add (temporary) speaker icons by @BoxBoxJason
- Add productivity icons by @BoxBoxJason
- Add extensions icons by @BoxBoxJason
- Add shortcuts icons by @BoxBoxJason
- Add debugger icons by @BoxBoxJason
- Add files icons by @BoxBoxJason
- Add terminal tasks icons by @BoxBoxJason
- Add git achievements icons by @BoxBoxJason
- Add creator achievements logos by @BoxBoxJason
- Add new file edited listeners by @BoxBoxJason
- Add debug listeners by @BoxBoxJason
- Add extensions listeners by @BoxBoxJason
- Add tab events listeners by @BoxBoxJason
- Add terminal event listeners by @BoxBoxJason
- Add webview profile section by @BoxBoxJason
- Add time time tracking by @BoxBoxJason
- Add docstrings everywhere by @BoxBoxJason
- Add git related achievements listeners by @BoxBoxJason
- Add resource creation / deletion listeners by @BoxBoxJason
- Add containers styling by @BoxBoxJason
- Add separate module to handle frontend requests by @BoxBoxJason
- Add generic AchievementRequirement SQL script by @BoxBoxJason
- Add toggle notifications command by @BoxBoxJason
- Add proper README by @BoxBoxJason
- Add skeleton for Achievements react webview by @BoxBoxJason
- Add pusheen icons by @BoxBoxJason
- Add extensions commands by @BoxBoxJason
- Add separate database populate module by @BoxBoxJason
- Add separate db migrations manager module by @BoxBoxJason
- Add config manager module (specific to vscode) by @BoxBoxJason
- Add new achievements linked constants by @BoxBoxJason
- Add vscode specific logger module by @BoxBoxJason
- Add achievements creating classes by @BoxBoxJason

### Changed

- Update changelog and install by @BoxBoxJason
- Complete build method by @BoxBoxJason
- Upgrade all dependencies by @BoxBoxJason
- Configuration by @BoxBoxJason
- Apply code formatters by @BoxBoxJason
- Prepare release by @BoxBoxJason
- Style using tailwindcss by @BoxBoxJason
- Proper image packaging by @BoxBoxJason
- Condition listeners setup by @BoxBoxJason
- Move settings from raw JSON to VSCode by @BoxBoxJason
- Update project description by @BoxBoxJason
- Replace terminal by tasks by @BoxBoxJason
- Rename points to EXP by @BoxBoxJason
- Cleanup db init to iterate over StackingTemplates by @BoxBoxJason
- UX by @BoxBoxJason
- Update logger module to accept any length / type arguments by @BoxBoxJason
- First UI release by @BoxBoxJason
- Upgrade progressions model (100x speedup) by @BoxBoxJason
- Yet another achievements model rework by @BoxBoxJason
- Upgrade achievements model (100x speedup) by @BoxBoxJason
- Move communication / requests to proper spots by @BoxBoxJason
- Move logger module by @BoxBoxJason
- Create Achievement webview page by @BoxBoxJason
- Upgrade Achievements controller by @BoxBoxJason
- Upgrade achievement model by @BoxBoxJason
- House cleaning by @BoxBoxJason
- House cleaning by @BoxBoxJason
- Create proper achievements workflow controller by @BoxBoxJason
- Standardize StackingTemplates by @BoxBoxJason
- Create progression management model by @BoxBoxJason
- Move and upgrade Achievements model by @BoxBoxJason
- Update model to use better-sqlite3 by @BoxBoxJason
- Housekeeping by @BoxBoxJason
- Prepare build & config for better-sqlite3 by @BoxBoxJason
- Replace Python achievements builder with typescript by @BoxBoxJason
- Standardize points attribution by @BoxBoxJason
- Create files stacking templates by @BoxBoxJason
- Create all productivity stacking templates by @BoxBoxJason
- Default vscode extension setup by @BoxBoxJason

### Fixed

- Issues fix by @BoxBoxJason
- Change some constants to enums & fix awarder by @BoxBoxJason
- Errors in some default achievements by @BoxBoxJason
- Fix progressions model & controller workflow by @BoxBoxJason
- Leave error messages in lowercase by @BoxBoxJason

### New Contributors

* @BoxBoxJason made their first contribution

[0.6.0]: https://github.com/BoxBoxJason/achievements/compare/0.5.1...0.6.0
[0.5.1]: https://github.com/BoxBoxJason/achievements/compare/0.5.0...0.5.1
[0.5.0]: https://github.com/BoxBoxJason/achievements/compare/0.4.1...0.5.0
[0.4.1]: https://github.com/BoxBoxJason/achievements/compare/0.4.0...0.4.1
[0.4.0]: https://github.com/BoxBoxJason/achievements/compare/0.3.1...0.4.0
[0.3.1]: https://github.com/BoxBoxJason/achievements/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/BoxBoxJason/achievements/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/BoxBoxJason/achievements/compare/0.1.2...0.2.0
[0.1.2]: https://github.com/BoxBoxJason/achievements/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/BoxBoxJason/achievements/compare/0.1.0...0.1.1

<!-- generated by git-cliff -->
