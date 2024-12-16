/**
 * constants module stores the shared constants for the achievements extension
 *
 * @author BoxBoxJason
 */

import path from 'path';

/**
 * Constants for the achievements extension
 *
 * @namespace constants
 */
export namespace constants {
  //////////////////////// CATEGORIES ////////////////////////
  export const enum category {
    FILES= 'files',
    GIT= 'git',
    PRODUCTIVITY= 'productivity',
    VSCODE= 'vscode'
  };

  //////////////////////// CRITERIAS ////////////////////////
  export enum criteria {
    // Lines of code
    LINES_OF_CODE= 'linesOfCodeCount',
    // Lines of code per language
    LINES_OF_CODE_LANGUAGE= 'linesOfCodeCount_%s',
    // Lines of comment
    LINES_OF_COMMENTS= 'linesOfCommentsCount',
    // Number of pastes
    NUMBER_OF_PASTES= 'pastesCount',
    // Errors fixed
    ERRORS_FIXED= 'errorsFixedCount',
    // Directory created
    DIRECTORY_CREATED= 'directoryCreatedCount',
    // Files created
    FILES_CREATED= 'filesCreatedCount',
    // Files created per language
    FILES_CREATED_LANGUAGE= 'filesCreatedCount_%s',
    // Resource deleted
    RESOURCE_DELETED= 'resourceDeletedCount',
    // Files renamed
    FILES_RENAMED= 'filesRenamedCount',
    // Number of commits
    COMMITS= 'commitsCount',
    BRANCHES_CREATED= 'branchesCreatedCount',
    MERGES_AND_REBASES= 'mergesAndRebasesCount',
    AMENDS= 'amendsCount',
    FORCED_PUSHES= 'forcedPushesCount',
    PUSHES= 'pushesCount',
    // Opened tabs
    NUMBER_OF_SIMULTANEOUS_TABS= 'simultaneousTabsCount',
    // Time spent (daily)
    DAILY_TIME_SPENT= 'dailyTimeSpentCount',
    // Time spent (bi-monthly)
    TWO_WEEKS_TIME_SPENT= 'twoWeeksTimeSpentCount',
    // Time spent (monthly)
    MONTHLY_TIME_SPENT= 'monthlyTimeSpentCount',
    // Time spent (yearly)
    YEARLY_TIME_SPENT= 'yearlyTimeSpentCount',
    // Time spent (total)
    TOTAL_TIME_SPENT= 'totalTimeSpentCount',
    // Extensions installed
    EXTENSIONS_INSTALLED= 'extensionsInstalledCount',
    // Outdated extensions
    EXTENSIONS_OUTDATED= 'extensionsOutdatedCount',
    // Themes installed
    THEMES_INSTALLED= 'themesInstalledCount',
    // Theme changed
    THEME_CHANGED= 'themeChangedCount',
    // Debugger sessions started
    DEBUGGER_SESSIONS= 'debuggerSessionsCount',
    // Breakpoints created
    BREAKPOINTS= 'breakpointsCount',
    // VSCode tasks commands executed
    TERMINAL_TASKS= 'taskCommandsCount',
    // VSCode tasks commands failed (exit code != 0)
    FAILED_TERMINAL_TASKS= 'failedTaskCommandsCount',
    // VSCode tasks commands successful (exit code == 0)
    SUCCESSFUL_TERMINAL_TASKS= 'successfulTaskCommandsCount',
    CODE_SNIPPETS= 'codeSnippetsCount',
    EXP= 'expCount',
  };

  //////////////////////// LABELS ////////////////////////
  export const labels = {
    LINES_OF_CODE: 'lines of code',
    LINES_OF_COMMENTS: 'lines of comments',
    NUMBER_OF_PASTES: 'number of pastes',
    ERRORS_FIXED: 'errors fixed',
    RESOURCE_CREATED: 'resource created',
    RESOURCE_DELETED: 'resource deleted',
    COMMITS: 'commits',
    BRANCHES: 'branches',
    MERGES_AND_REBASES: 'merges and rebases',
    AMENDS: 'amends',
    PUSHES: 'pushes',
    TABS: 'tabs',
    TIME: 'time',
    EXTENSIONS: 'extensions',
    THEMES: 'themes',
    DEBUGGER: 'debugger',
    TERMINAL: 'terminal',
    SNIPPETS: 'snippets',
    LANGUAGES: {
      JAVA: 'java',
      PYTHON: 'python',
      JAVASCRIPT: 'javascript',
      TYPESCRIPT: 'typescript',
      ADA: 'ada',
      C: 'c',
      CPP: 'c++',
      CSHARP: 'c#',
      RUBY: 'ruby',
      PHP: 'php',
      SWIFT: 'swift',
      KOTLIN: 'kotlin',
      GO: 'go',
      RUST: 'rust',
      HTML: 'html',
      CSS: 'css',
      SCSS: 'scss',
      LESS: 'less',
      VUE: 'vue',
      REACT: 'react',
      SQL: 'sql',
      SHELL: 'shell',
      POWERSHELL: 'powershell',
      COBOL: 'cobol',
      FORTRAN: 'fortran',
      PASCAL: 'pascal',
      PERL: 'perl',
      LUA: 'lua',
      MATLAB: 'matlab',
      OBJECTIVEC: 'objective-c',
      SCALA: 'scala',
      HASKELL: 'haskell',
      R: 'r',
      MARKDOWN: 'markdown',
    } as const,
    LANGUAGES_EXTENSIONS: {
      '.java': 'java',
      '.py': 'python',
      '.js': 'javascript',
      '.jsx': 'react',
      '.ts': 'typescript',
      '.tsx': 'react',
      '.vue': 'vue',
      '.ada': 'ada',
      '.c': 'c',
      '.h': 'c',
      '.cpp': 'c++',
      '.hpp': 'c++',
      '.cs': 'c#',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.kts': 'kotlin',
      '.go': 'go',
      '.rs': 'rust',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'scss',
      '.less': 'less',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.ps1': 'powershell',
      '.psm1': 'powershell',
      '.cbl': 'cobol',
      '.cob': 'cobol',
      '.f': 'fortran',
      '.f90': 'fortran',
      '.f95': 'fortran',
      '.pas': 'pascal',
      '.pp': 'pascal',
      '.pl': 'perl',
      '.pm': 'perl',
      '.lua': 'lua',
      '.m': 'objective-c',
      '.mat': 'matlab',
      '.scala': 'scala',
      '.sc': 'scala',
      '.hs': 'haskell',
      '.lhs': 'haskell',
      '.r': 'r',
      '.R': 'r',
      '.md': 'markdown',
    } as { [key: string]: string },
  } as const;

  export const build = {
    EXTENSION_ENTRYPOINTS: [path.join('src','extension.ts')],
    EXTENSION_OUT_FILE: path.join('dist','extension.js'),
    WEBVIEW_ENTRYPOINTS: [path.join('src','views','index.tsx')],
    WEBVIEW_OUT_FILE: path.join('dist','webview.js'),
  } as const;

  export const listeners = {
    DEBUG: 'debug',
    EXTENSIONS: 'extensions',
    FILES: 'files',
    GIT: 'git',
    TABS: 'tabs',
    TASKS: 'tasks',
    TIME: 'time',
  } as const;

}
