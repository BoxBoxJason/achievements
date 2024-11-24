export namespace webview {
  export const commands = {
    DISPLAY_ACHIEVEMENTS: 'achievements-display',
    RETRIEVE_ACHIEVEMENTS: 'achievements-select',
    RETRIEVE_ACHIEVEMENTS_FILTERS: 'achievements-select-filters',
    SET_ACHIEVEMENTS_FILTERS: 'achievements-set-filters',
  } as const;
}

export namespace queries {
  export const VALID_SORT_CRITERIA = ['achieved', 'title', 'category', '"group"', 'achievedAt', 'tier', 'points'];

}