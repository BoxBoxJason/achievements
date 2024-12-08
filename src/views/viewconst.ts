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


  export enum colors  {
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
}

export namespace queries {
  export const VALID_SORT_CRITERIA = ['achieved', 'title', 'category', '"group"', 'achievedAt', 'tier', 'points'];

  export enum criteria {
    DAILY_TIME_SPENT= 'dailyTimeSpentCount',
    TWO_WEEKS_TIME_SPENT= 'twoWeeksTimeSpentCount',
    MONTHLY_TIME_SPENT= 'monthlyTimeSpentCount',
    YEARLY_TIME_SPENT= 'yearlyTimeSpentCount',
    TOTAL_TIME_SPENT= 'totalTimeSpentCount',
  }
}
