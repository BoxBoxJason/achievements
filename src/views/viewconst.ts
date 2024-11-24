export namespace webview {
  export const commands = {
    DISPLAY_ACHIEVEMENTS: 'achievements-display',
    RETRIEVE_ACHIEVEMENTS: 'achievements-select',
    RETRIEVE_ACHIEVEMENTS_FILTERS: 'achievements-select-filters',
    SET_ACHIEVEMENTS_FILTERS: 'achievements-set-filters',
  } as const;


  export const colors = {
    HOLDER_BACKGROUND_DARK_BLUE: '#0e141b',
    ACHIEVEMENT_BACKGROUND_GREY: '#23262e',
    FILTER_INPUT_GRAY: '#252a31',
    GRAY_TEXT: '#7d7e7f',
    RED_TEXT: '#820000',
    COMPLETION_LIGHT_BLUE: '#179efb',
  } as const;
}

export namespace queries {
  export const VALID_SORT_CRITERIA = ['achieved', 'title', 'category', '"group"', 'achievedAt', 'tier', 'points'];

}