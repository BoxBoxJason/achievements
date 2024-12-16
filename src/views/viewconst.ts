export namespace webview {
  export enum commands {
    // Responses sent from the extension to the webview
    DISPLAY_ACHIEVEMENTS = 'achievements-display',
    DISPLAY_ACHIEVEMENTS_FILTERS = 'achievements-set-filters',
    SET_PROGRESSIONS = 'progressions-set',
    SET_PROFILE = 'profile-set',
    // Requests sent from the webview to the extension
    RETRIEVE_ACHIEVEMENTS = 'achievements-select',
    RETRIEVE_ACHIEVEMENTS_FILTERS = 'achievements-select-filters',
    RETRIEVE_PROGRESSIONS = 'progressions-select',
    RETRIEVE_PROFILE = 'profile-select',
  };


  export enum colors {
    HOLDER_BACKGROUND_DARK_BLUE = '#0e141b',
    ACHIEVEMENT_BACKGROUND_GRAY = '#23262e',
    FILTER_INPUT_GRAY = '#252a31',
    GRAY_TEXT = '#7d7e7f',
    RED_TEXT = '#820000',
    COMPLETION_LIGHT_BLUE = '#179efb',
    BUTTON_GRAY = '#777777',
  };

  export enum fonts {
    HEADER_FONT = 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
    TEXT_FONT = 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
  }

  export const DEFAULT_USER = 'Guest';

  export namespace icons {

    export const pusheen: { [key: string]: string[] } = {
      PUSHEEN_BASE: ['icons', 'pusheen', 'base.png'],
      PUSHEEN_ERROR: ['icons', 'pusheen', 'error.png'],
      PUSHEEN_HEART: ['icons', 'pusheen', 'holding_heart.png'],
      PUSHEEN_TROPHY: ['icons', 'pusheen', 'holding_trophy.png'],
      PUSHEEN_LOAF: ['icons', 'pusheen', 'loaf_base.png'],
      PUSHEEN_LOAF_HAT: ['icons', 'pusheen', 'loaf_hat.png'],
    } as const;

    export namespace achievements {

      export const speaker: { [key: string]: string[] } = {
        JAVA: ['icons', 'achievements', 'speaker', 'java.png'],
        PYTHON: ['icons', 'achievements', 'speaker', 'python.png'],
        JAVASCRIPT: ['icons', 'achievements', 'speaker', 'javascript.png'],
        TYPESCRIPT: ['icons', 'achievements', 'speaker', 'typescript.png'],
        ADA: ['icons', 'achievements', 'speaker', 'ada.png'],
        C: ['icons', 'achievements', 'speaker', 'c.png'],
        'C++': ['icons', 'achievements', 'speaker', 'cpp.png'],
        'C#': ['icons', 'achievements', 'speaker', 'csharp.png'],
        RUBY: ['icons', 'achievements', 'speaker', 'ruby.png'],
        PHP: ['icons', 'achievements', 'speaker', 'php.png'],
        SWIFT: ['icons', 'achievements', 'speaker', 'swift.png'],
        KOTLIN: ['icons', 'achievements', 'speaker', 'kotlin.png'],
        GO: ['icons', 'achievements', 'speaker', 'go.png'],
        RUST: ['icons', 'achievements', 'speaker', 'rust.png'],
        HTML: ['icons', 'achievements', 'speaker', 'html.png'],
        CSS: ['icons', 'achievements', 'speaker', 'css.png'],
        SCSS: ['icons', 'achievements', 'speaker', 'scss.png'],
        LESS: ['icons', 'achievements', 'speaker', 'less.png'],
        VUE: ['icons', 'achievements', 'speaker', 'vue.png'],
        REACT: ['icons', 'achievements', 'speaker', 'react.png'],
        SQL: ['icons', 'achievements', 'speaker', 'sql.png'],
        SHELL: ['icons', 'achievements', 'speaker', 'shell.png'],
        POWERSHELL: ['icons', 'achievements', 'speaker', 'powershell.png'],
        COBOL: ['icons', 'achievements', 'speaker', 'cobol.png'],
        FORTRAN: ['icons', 'achievements', 'speaker', 'fortran.png'],
        PASCAL: ['icons', 'achievements', 'speaker', 'pascal.png'],
        PERL: ['icons', 'achievements', 'speaker', 'perl.png'],
        LUA: ['icons', 'achievements', 'speaker', 'lua.png'],
        MATLAB: ['icons', 'achievements', 'speaker', 'matlab.png'],
        'OBJECTIVE-C': ['icons', 'achievements', 'speaker', 'objectivec.png'],
        SCALA: ['icons', 'achievements', 'speaker', 'scala.png'],
        HASKELL: ['icons', 'achievements', 'speaker', 'haskell.png'],
        R: ['icons', 'achievements', 'speaker', 'r.png'],
        MARKDOWN: ['icons', 'achievements', 'speaker', 'markdown.png'],
      } as const;

      export const creator: { [key: string]: string[] } = {
        JAVA: ['icons', 'achievements', 'creator', 'java.png'],
        PYTHON: ['icons', 'achievements', 'creator', 'python.png'],
        JAVASCRIPT: ['icons', 'achievements', 'creator', 'javascript.png'],
        TYPESCRIPT: ['icons', 'achievements', 'creator', 'typescript.png'],
        ADA: ['icons', 'achievements', 'creator', 'ada.png'],
        C: ['icons', 'achievements', 'creator', 'c.png'],
        'C++': ['icons', 'achievements', 'creator', 'cpp.png'],
        'C#': ['icons', 'achievements', 'creator', 'csharp.png'],
        RUBY: ['icons', 'achievements', 'creator', 'ruby.png'],
        PHP: ['icons', 'achievements', 'creator', 'php.png'],
        SWIFT: ['icons', 'achievements', 'creator', 'swift.png'],
        KOTLIN: ['icons', 'achievements', 'creator', 'kotlin.png'],
        GO: ['icons', 'achievements', 'creator', 'go.png'],
        RUST: ['icons', 'achievements', 'creator', 'rust.png'],
        HTML: ['icons', 'achievements', 'creator', 'html.png'],
        CSS: ['icons', 'achievements', 'creator', 'css.png'],
        SCSS: ['icons', 'achievements', 'creator', 'scss.png'],
        LESS: ['icons', 'achievements', 'creator', 'less.png'],
        VUE: ['icons', 'achievements', 'creator', 'vue.png'],
        REACT: ['icons', 'achievements', 'creator', 'react.png'],
        SQL: ['icons', 'achievements', 'creator', 'sql.png'],
        SHELL: ['icons', 'achievements', 'creator', 'shell.png'],
        POWERSHELL: ['icons', 'achievements', 'creator', 'powershell.png'],
        COBOL: ['icons', 'achievements', 'creator', 'cobol.png'],
        FORTRAN: ['icons', 'achievements', 'creator', 'fortran.png'],
        PASCAL: ['icons', 'achievements', 'creator', 'pascal.png'],
        PERL: ['icons', 'achievements', 'creator', 'perl.png'],
        LUA: ['icons', 'achievements', 'creator', 'lua.png'],
        MATLAB: ['icons', 'achievements', 'creator', 'matlab.png'],
        'OBJECTIVE-C': ['icons', 'achievements', 'creator', 'objectivec.png'],
        SCALA: ['icons', 'achievements', 'creator', 'scala.png'],
        HASKELL: ['icons', 'achievements', 'creator', 'haskell.png'],
        R: ['icons', 'achievements', 'creator', 'r.png'],
        MARKDOWN: ['icons', 'achievements', 'creator', 'markdown.png'],
      } as const;

    }
  }
}

export namespace queries {
  export const VALID_SORT_CRITERIA = ['achieved', 'title', 'category', '"group"', 'achievedAt', 'tier', 'exp'];

  export enum criteria {
    DAILY_TIME_SPENT = 'dailyTimeSpentCount',
    TWO_WEEKS_TIME_SPENT = 'twoWeeksTimeSpentCount',
    MONTHLY_TIME_SPENT = 'monthlyTimeSpentCount',
    YEARLY_TIME_SPENT = 'yearlyTimeSpentCount',
    TOTAL_TIME_SPENT = 'totalTimeSpentCount',
  }
}
