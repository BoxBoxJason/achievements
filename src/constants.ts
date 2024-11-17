/**
 * constants module stores the shared constants for the achievements builder
 */

import path from "path";

export namespace constants {
  //////////////////////// CATEGORIES ////////////////////////
  export const category = {
    FILES: 'files',
    GIT: 'git',
    PRODUCTIVITY: 'productivity',
    VSCODE: 'vscode'
  } as const;

  //////////////////////// CRITERIAS ////////////////////////
  export const criteria = {
    LINES_OF_CODE: 'linesOfCodeCount',
    LINES_OF_CODE_LANGUAGE: 'linesOfCodeCount_%s',
    LINES_OF_COMMENTS: 'linesOfCommentsCount',
    NUMBER_OF_PASTES: 'pastesCount',
    ERRORS_FIXED: 'errorsFixedCount',
    FILES_CREATED: 'filesCreatedCount',
    FILES_CREATED_LANGUAGE: 'filesCreatedCount_%s',
    FILES_DELETED: 'filesDeletedCount',
    FILES_MOVED: 'filesMovedCount',
    COMMITS: 'commitsCount',
    BRANCHES_CREATED: 'branchesCreatedCount',
    MERGES_AND_REBASES: 'mergesAndRebasesCount',
    AMENDS: 'amendsCount',
    FORCED_PUSHES: 'forcedPushesCount',
    PUSHES: 'pushesCount',
    NUMBER_OF_SIMULTANEOUS_TABS: 'SimultaneousTabsCount',
    TIME_SPENT: 'timeSpentCount',
    EXTENSIONS_INSTALLED: 'extensionsInstalledCount',
    EXTENSIONS_OUTDATED: 'extensionsOutdatedCount',
    THEMES_INSTALLED: 'themesInstalledCount',
    DEBUGGER_SESSIONS: 'debuggerSessionsCount',
    TERMINAL_COMMANDS: 'terminalCommandsCount',
    CODE_SNIPPETS: 'codeSnippetsCount',
  } as const;

  //////////////////////// LABELS ////////////////////////
  export const labels = {
    LINES_OF_CODE: 'lines of code',
    LINES_OF_COMMENTS: 'lines of comments',
    NUMBER_OF_PASTES: 'number of pastes',
    ERRORS_FIXED: 'errors fixed',
    FILES_CREATED: 'files created',
    FILES_DELETED: 'files deleted',
    FILES_MOVED: 'files moved',
    COMMITS: 'commits',
    BRANCHES_CREATED: 'branches created',
    MERGES_AND_REBASES: 'merges and rebases',
    AMENDS: 'amends',
    FORCED_PUSHES: 'forced pushes',
    PUSHES: 'pushes',
    NUMBER_OF_SIMULTANEOUS_TABS: 'number of simultaneous tabs',
    TIME_SPENT: 'time spent',
    EXTENSIONS_INSTALLED: 'extensions installed',
    EXTENSIONS_OUTDATED: 'extensions outdated',
    THEMES_INSTALLED: 'themes installed',
    DEBUGGER_SESSIONS: 'debugger sessions',
    TERMINAL_COMMANDS: 'terminal commands',
    CODE_SNIPPETS: 'code snippets',
    LANGUAGES: [
      'java',
      'python',
      'javascript',
      'typescript',
      'ada',
      'c',
      'c++',
      'c#',
      'ruby',
      'php',
      'swift',
      'kotlin',
      'go',
      'rust',
      'html',
      'css',
      'scss',
      'less',
      'sql',
      'shell',
      'bash',
      'powershell',
      'cobol',
      'fortran',
      'pascal',
      'perl',
      'lua',
      'matlab',
      'objective-c',
      'scala',
      'haskell',
      'r'
    ] as const
  } as const;

  export const build = {
    EXTENSION_ENTRYPOINTS: [path.join('src','extension.ts')],
    EXTENSION_OUT_FILE: path.join('dist','extension.js'),
    WEBVIEW_ENTRYPOINTS: [path.join('src','views','index.tsx')],
    WEBVIEW_OUT_FILE: path.join('dist','webview.js'),
  } as const;
}
