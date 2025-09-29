export namespace webview {
  export enum commands {
    // Responses sent from the extension to the webview
    DISPLAY_ACHIEVEMENTS = "achievements-display",
    DISPLAY_ACHIEVEMENTS_FILTERS = "achievements-set-filters",
    SET_PROGRESSIONS = "progressions-set",
    SET_PROFILE = "profile-set",
    // Requests sent from the webview to the extension
    RETRIEVE_ACHIEVEMENTS = "achievements-select",
    RETRIEVE_ACHIEVEMENTS_FILTERS = "achievements-select-filters",
    RETRIEVE_PROGRESSIONS = "progressions-select",
    RETRIEVE_PROFILE = "profile-select",
  }

  export enum fonts {
    HEADER_FONT = "Impact, Haettenschweiler, Arial Narrow Bold, sans-serif",
    TEXT_FONT = "Impact, Haettenschweiler, Arial Narrow Bold, sans-serif",
  }

  export const DEFAULT_USER = "Guest";

  export namespace icons {
    export const pusheen: { [key: string]: string[] } = {
      PUSHEEN_BASE: ["icons", "pusheen", "base.png"],
      PUSHEEN_ERROR: ["icons", "pusheen", "error.png"],
      PUSHEEN_HEART: ["icons", "pusheen", "holding_heart.png"],
      PUSHEEN_TROPHY: ["icons", "pusheen", "holding_trophy.png"],
      PUSHEEN_LOAF: ["icons", "pusheen", "loaf_base.png"],
      PUSHEEN_LOAF_HAT: ["icons", "pusheen", "loaf_hat.png"],
    } as const;

    export namespace achievements {
      export const speaker: { [key: string]: string[] } = {
        JAVA_SPEAKER: ["icons", "achievements", "speaker", "java.png"],
        PYTHON_SPEAKER: ["icons", "achievements", "speaker", "python.png"],
        JAVASCRIPT_SPEAKER: [
          "icons",
          "achievements",
          "speaker",
          "javascript.png",
        ],
        TYPESCRIPT_SPEAKER: [
          "icons",
          "achievements",
          "speaker",
          "typescript.png",
        ],
        ADA_SPEAKER: ["icons", "achievements", "speaker", "ada.png"],
        C_SPEAKER: ["icons", "achievements", "speaker", "c.png"],
        "C++_SPEAKER": ["icons", "achievements", "speaker", "cpp.png"],
        "C#_SPEAKER": ["icons", "achievements", "speaker", "csharp.png"],
        RUBY_SPEAKER: ["icons", "achievements", "speaker", "ruby.png"],
        PHP_SPEAKER: ["icons", "achievements", "speaker", "php.png"],
        SWIFT_SPEAKER: ["icons", "achievements", "speaker", "swift.png"],
        KOTLIN_SPEAKER: ["icons", "achievements", "speaker", "kotlin.png"],
        GO_SPEAKER: ["icons", "achievements", "speaker", "go.png"],
        RUST_SPEAKER: ["icons", "achievements", "speaker", "rust.png"],
        HTML_SPEAKER: ["icons", "achievements", "speaker", "html.png"],
        CSS_SPEAKER: ["icons", "achievements", "speaker", "css.png"],
        SCSS_SPEAKER: ["icons", "achievements", "speaker", "scss.png"],
        LESS_SPEAKER: ["icons", "achievements", "speaker", "less.png"],
        VUE_SPEAKER: ["icons", "achievements", "speaker", "vue.png"],
        REACT_SPEAKER: ["icons", "achievements", "speaker", "react.png"],
        SQL_SPEAKER: ["icons", "achievements", "speaker", "sql.png"],
        SHELL_SPEAKER: ["icons", "achievements", "speaker", "shell.png"],
        POWERSHELL_SPEAKER: [
          "icons",
          "achievements",
          "speaker",
          "powershell.png",
        ],
        COBOL_SPEAKER: ["icons", "achievements", "speaker", "cobol.png"],
        FORTRAN_SPEAKER: ["icons", "achievements", "speaker", "fortran.png"],
        PASCAL_SPEAKER: ["icons", "achievements", "speaker", "pascal.png"],
        PERL_SPEAKER: ["icons", "achievements", "speaker", "perl.png"],
        LUA_SPEAKER: ["icons", "achievements", "speaker", "lua.png"],
        MATLAB_SPEAKER: ["icons", "achievements", "speaker", "matlab.png"],
        "OBJECTIVE-C_SPEAKER": [
          "icons",
          "achievements",
          "speaker",
          "objective-c.png",
        ],
        SCALA_SPEAKER: ["icons", "achievements", "speaker", "scala.png"],
        HASKELL_SPEAKER: ["icons", "achievements", "speaker", "haskell.png"],
        R_SPEAKER: ["icons", "achievements", "speaker", "r.png"],
        MARKDOWN_SPEAKER: ["icons", "achievements", "speaker", "markdown.png"],
        YAML_SPEAKER: ["icons", "achievements", "speaker", "yaml.png"],
        TOML_SPEAKER: ["icons", "achievements", "speaker", "toml.png"],
        ASSEMBLY_SPEAKER: ["icons", "achievements", "speaker", "assembly.png"],
      } as const;

      export const creator: { [key: string]: string[] } = {
        JAVA_CREATOR: ["icons", "achievements", "creator", "java.png"],
        PYTHON_CREATOR: ["icons", "achievements", "creator", "python.png"],
        JAVASCRIPT_CREATOR: [
          "icons",
          "achievements",
          "creator",
          "javascript.png",
        ],
        TYPESCRIPT_CREATOR: [
          "icons",
          "achievements",
          "creator",
          "typescript.png",
        ],
        ADA_CREATOR: ["icons", "achievements", "creator", "ada.png"],
        C_CREATOR: ["icons", "achievements", "creator", "c.png"],
        "C++_CREATOR": ["icons", "achievements", "creator", "cpp.png"],
        "C#_CREATOR": ["icons", "achievements", "creator", "csharp.png"],
        RUBY_CREATOR: ["icons", "achievements", "creator", "ruby.png"],
        PHP_CREATOR: ["icons", "achievements", "creator", "php.png"],
        SWIFT_CREATOR: ["icons", "achievements", "creator", "swift.png"],
        KOTLIN_CREATOR: ["icons", "achievements", "creator", "kotlin.png"],
        GO_CREATOR: ["icons", "achievements", "creator", "go.png"],
        RUST_CREATOR: ["icons", "achievements", "creator", "rust.png"],
        HTML_CREATOR: ["icons", "achievements", "creator", "html.png"],
        CSS_CREATOR: ["icons", "achievements", "creator", "css.png"],
        SCSS_CREATOR: ["icons", "achievements", "creator", "scss.png"],
        LESS_CREATOR: ["icons", "achievements", "creator", "less.png"],
        VUE_CREATOR: ["icons", "achievements", "creator", "vue.png"],
        REACT_CREATOR: ["icons", "achievements", "creator", "react.png"],
        SQL_CREATOR: ["icons", "achievements", "creator", "sql.png"],
        SHELL_CREATOR: ["icons", "achievements", "creator", "shell.png"],
        POWERSHELL_CREATOR: [
          "icons",
          "achievements",
          "creator",
          "powershell.png",
        ],
        COBOL_CREATOR: ["icons", "achievements", "creator", "cobol.png"],
        FORTRAN_CREATOR: ["icons", "achievements", "creator", "fortran.png"],
        PASCAL_CREATOR: ["icons", "achievements", "creator", "pascal.png"],
        PERL_CREATOR: ["icons", "achievements", "creator", "perl.png"],
        LUA_CREATOR: ["icons", "achievements", "creator", "lua.png"],
        MATLAB_CREATOR: ["icons", "achievements", "creator", "matlab.png"],
        "OBJECTIVE-C_CREATOR": [
          "icons",
          "achievements",
          "creator",
          "objective-c.png",
        ],
        SCALA_CREATOR: ["icons", "achievements", "creator", "scala.png"],
        HASKELL_CREATOR: ["icons", "achievements", "creator", "haskell.png"],
        R_CREATOR: ["icons", "achievements", "creator", "r.png"],
        MARKDOWN_CREATOR: ["icons", "achievements", "creator", "markdown.png"],
        YAML_CREATOR: ["icons", "achievements", "creator", "yaml.png"],
        TOML_CREATOR: ["icons", "achievements", "creator", "toml.png"],
        ASSEMBLY_CREATOR: ["icons", "achievements", "creator", "assembly.png"],
      } as const;

      export const git: { [key: string]: string[] } = {
        GIT_AMEND: ["icons", "achievements", "git", "amend.png"],
        GIT_BRANCH: ["icons", "achievements", "git", "branch.png"],
        GIT_COMMIT: ["icons", "achievements", "git", "commit.png"],
        GIT_MERGE: ["icons", "achievements", "git", "merge.png"],
        GIT_PUSH: ["icons", "achievements", "git", "push.png"],
      } as const;

      export const terminal: { [key: string]: string[] } = {
        TERMINAL_TASK: ["icons", "achievements", "terminal", "task.jpg"],
        TERMINAL_TASK_SUCCESS: [
          "icons",
          "achievements",
          "terminal",
          "success.jpg",
        ],
        TERMINAL_TASK_FAIL: ["icons", "achievements", "terminal", "fail.jpg"],
      } as const;

      export const file: { [key: string]: string[] } = {
        FILE_CREATOR: ["icons", "achievements", "file", "file.png"],
        FILE_RENAMED: ["icons", "achievements", "file", "renamed.png"],
        DIRECTORY_CREATOR: ["icons", "achievements", "file", "directory.png"],
        RESOURCE_DELETED: ["icons", "achievements", "file", "deleted.png"],
      } as const;

      export const debug: { [key: string]: string[] } = {
        DEBUGGER_SESSION: ["icons", "achievements", "debug", "session.png"],
        DEBUGGER_BREAKPOINT: [
          "icons",
          "achievements",
          "debug",
          "breakpoint.png",
        ],
      } as const;

      export const shortcut: { [key: string]: string[] } = {
        COPY_NINJA: ["icons", "achievements", "shortcut", "copy_ninja.png"],
        CODE_SNIPPETS: ["icons", "achievements", "shortcut", "snippet.png"],
      } as const;

      export const extension: { [key: string]: string[] } = {
        PIMP_MY_RIDE: ["icons", "achievements", "extension", "theme.jpg"],
        CHAMELEON: ["icons", "achievements", "extension", "chameleon.png"],
        EXTENSION_MASTER: [
          "icons",
          "achievements",
          "extension",
          "extension.png",
        ],
        EXTENSION_OUTDATED: [
          "icons",
          "achievements",
          "extension",
          "deprecated.png",
        ],
      } as const;

      export const productivity: { [key: string]: string[] } = {
        CODE_MONKEY: [
          "icons",
          "achievements",
          "productivity",
          "code_monkey.png",
        ],
        CODE_COMMENTATOR: [
          "icons",
          "achievements",
          "productivity",
          "comment.png",
        ],
        TAB_HOARDER: ["icons", "achievements", "productivity", "tab.png"],
        ERROR_FIXER: ["icons", "achievements", "productivity", "fix.png"],
        SHOWER_AVOIDER: ["icons", "achievements", "productivity", "shower.png"],
      } as const;
    }
  }
}

export namespace queries {
  export const VALID_SORT_CRITERIA = [
    "achieved",
    "title",
    "category",
    '"group"',
    "achievedAt",
    "tier",
    "exp",
  ];

  export enum criteria {
    DAILY_TIME_SPENT = "dailyTimeSpentCount",
    TWO_WEEKS_TIME_SPENT = "twoWeeksTimeSpentCount",
    MONTHLY_TIME_SPENT = "monthlyTimeSpentCount",
    YEARLY_TIME_SPENT = "yearlyTimeSpentCount",
    TOTAL_TIME_SPENT = "totalTimeSpentCount",
  }
}
