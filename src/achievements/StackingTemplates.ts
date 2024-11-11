/**
 * stackingTemplates module contains the templates definitions for the achievements
 */

import { constants } from './constants';
import {StackingAchievementTemplate} from './Achievement';

export namespace StackingTemplates {
  //////////////////////// CRITERIA FUNCTIONS ////////////////////////
  export const STANDARD_EASY_CRITERIA_FUNCTION = (x: number) => 10 ** x;
  export const STANDARD_MEDIUM_CRITERIA_FUNCTION = (x: number) => 2 ** ((x + 2) >> 1) * 5 ** ((x + 1) >> 1);
  export const STANDARD_HARD_CRITERIA_FUNCTION = (x: number) => 2 ** (x >> 1) * 5 ** ((x + 1) >> 1);
  export const STANDARD_INFERNAL_CRITERIA_FUNCTION = (x: number) => (2 ** Math.max(0, (x - 1) >> 1)) * (3 ** (x === 1 ? 1 : 0)) * (5 ** (x >> 1));
  export const STANDARD_POINTS_FUNCTION = STANDARD_INFERNAL_CRITERIA_FUNCTION;

  export namespace files {
    //////////////////////// FILES STACKING TEMPLATES ////////////////////////
    export const filesCreatedTemplate = (): StackingAchievementTemplate => ({
      name: 'Creator %d',
      iconDir: 'creator',
      category: constants.category.FILES,
      group: 'Files Created',
      labels: [constants.category.FILES, constants.labels.FILES_CREATED],
      criterias: [constants.criteria.FILES_CREATED],
      criteriasFunctions: [STANDARD_MEDIUM_CRITERIA_FUNCTION],
      description: `Create ${constants.criteria.FILES_CREATED} files`,
      minTier: 0,
      maxTier: 15,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const filesCreatedLanguageTemplates = (): StackingAchievementTemplate[] =>
      constants.labels.LANGUAGES.map(language => ({
        name: `LANGUAGE Creator %d`.replace('LANGUAGE', language),
        iconDir: `%s_creator`.replace('%s', language),
        category: constants.category.FILES,
        group: 'Files Created',
        labels: [constants.category.FILES, constants.labels.FILES_CREATED],
        criterias: [constants.criteria.FILES_CREATED_LANGUAGE.replace('%s', language)],
        criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
        description: `Create FILES files in LANGUAGE`.replace('LANGUAGE', language).replace('FILES', constants.criteria.FILES_CREATED_LANGUAGE.replace('%s', language)),
        minTier: 0,
        maxTier: 11,
        pointsFunction: STANDARD_POINTS_FUNCTION,
        hidden: false,
        requires: [],
      }));

    export const filesDeletedTemplate = (): StackingAchievementTemplate => ({
      name: 'Deleter %d',
      iconDir: 'deleter',
      category: constants.category.FILES,
      group: 'Files Deleted',
      labels: [constants.category.FILES, constants.labels.FILES_DELETED],
      criterias: [constants.criteria.FILES_DELETED],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Delete ${constants.criteria.FILES_DELETED} files`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const filesMovedTemplate = (): StackingAchievementTemplate => ({
      name: 'Please bro just one more refactor %d',
      iconDir: 'mover',
      category: constants.category.FILES,
      group: 'Files Moved',
      labels: [constants.category.FILES, constants.labels.FILES_MOVED],
      criterias: [constants.criteria.FILES_MOVED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Move (or rename) ${constants.criteria.FILES_MOVED} files`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

  export namespace git {
    //////////////////////// GIT STACKING TEMPLATES ////////////////////////
    export const commitsTemplate = (): StackingAchievementTemplate => ({
      name: 'Committer %d',
      iconDir: 'committer',
      category: constants.category.GIT,
      group: 'Commits',
      labels: [constants.category.GIT, constants.labels.COMMITS],
      criterias: [constants.criteria.COMMITS],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Commit ${constants.criteria.COMMITS} times`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const branchesCreatedTemplate = (): StackingAchievementTemplate => ({
      name: 'Friend of the Trees %d',
      iconDir: 'brancher',
      category: constants.category.GIT,
      group: 'Branches Created',
      labels: [constants.category.GIT, constants.labels.BRANCHES_CREATED],
      criterias: [constants.criteria.BRANCHES_CREATED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Create ${constants.criteria.BRANCHES_CREATED} branches`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const mergesAndRebasesTemplate = (): StackingAchievementTemplate => ({
      name: 'Merger %d',
      iconDir: 'merger',
      category: constants.category.GIT,
      group: 'Merges and Rebases',
      labels: [constants.category.GIT, constants.labels.MERGES_AND_REBASES],
      criterias: [constants.criteria.MERGES_AND_REBASES],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Merge or rebase ${constants.criteria.MERGES_AND_REBASES} times`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const amendsTemplate = (): StackingAchievementTemplate => ({
      name: 'Amender %d',
      iconDir: 'amender',
      category: constants.category.GIT,
      group: 'Amends',
      labels: [constants.category.GIT, constants.labels.AMENDS],
      criterias: [constants.criteria.AMENDS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Amend ${constants.criteria.AMENDS} times`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const forcedPushesTemplate = (): StackingAchievementTemplate => ({
      name: 'Good Luck Everyone %d',
      iconDir: 'forcer',
      category: constants.category.GIT,
      group: 'Forced Pushes',
      labels: [constants.category.GIT, constants.labels.FORCED_PUSHES],
      criterias: [constants.criteria.FORCED_PUSHES],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Force push ${constants.criteria.FORCED_PUSHES} times`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const pushesTemplate = (): StackingAchievementTemplate => ({
      name: 'Ship fast, talk later %d',
      iconDir: 'pusher',
      category: constants.category.GIT,
      group: 'Pushes',
      labels: [constants.category.GIT, constants.labels.PUSHES],
      criterias: [constants.criteria.PUSHES],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Push ${constants.criteria.PUSHES} times`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

  export namespace productivity {
    //////////////////////// PRODUCTIVITY STACKING TEMPLATES ////////////////////////
    export const linesOfCodeTemplate = (): StackingAchievementTemplate => ({
      name: 'Code Monkey %d',
      iconDir: 'code_monkey',
      category: constants.category.PRODUCTIVITY,
      group: 'Lines of Code',
      labels: [constants.category.PRODUCTIVITY, constants.labels.LINES_OF_CODE],
      criterias: [constants.criteria.LINES_OF_CODE],
      criteriasFunctions: [STANDARD_EASY_CRITERIA_FUNCTION],
      description: `Write ${constants.criteria.LINES_OF_CODE} lines of code`,
      minTier: 0,
      maxTier: 10,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const linesOfCodeLanguageTemplates = (): StackingAchievementTemplate[] =>
      constants.labels.LANGUAGES.map(language => ({
        name: `LANGUAGE Speaker %d`.replace('LANGUAGE', language),
        iconDir: `%s_speaker`.replace('%s', language),
        category: constants.category.PRODUCTIVITY,
        group: 'Lines of Code',
        labels: [constants.category.PRODUCTIVITY, constants.labels.LINES_OF_CODE],
        criterias: [constants.criteria.LINES_OF_CODE_LANGUAGE.replace('%s', language)],
        criteriasFunctions: [STANDARD_MEDIUM_CRITERIA_FUNCTION],
        description: `Write LOC lines of LANGUAGE code`.replace('LANGUAGE', language).replace('LOC', constants.criteria.LINES_OF_CODE_LANGUAGE.replace('%s', language)),
        minTier: 0,
        maxTier: 15,
        pointsFunction: STANDARD_POINTS_FUNCTION,
        hidden: false,
        requires: [],
      }));

    export const linesOfCommentTemplate = (): StackingAchievementTemplate => ({
      name: 'Outstanding Commentator %d',
      iconDir: 'commentator',
      category: constants.category.PRODUCTIVITY,
      group: 'Lines of Comments',
      labels: [constants.category.PRODUCTIVITY, constants.labels.LINES_OF_COMMENTS],
      criterias: [constants.criteria.LINES_OF_COMMENTS],
      criteriasFunctions: [STANDARD_MEDIUM_CRITERIA_FUNCTION],
      description: `Write ${constants.criteria.LINES_OF_COMMENTS} lines of comments`,
      minTier: 0,
      maxTier: 15,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const numberOfPastesTemplate = (): StackingAchievementTemplate => ({
      name: 'Copy Ninja %d',
      iconDir: 'copy_ninja',
      category: constants.category.PRODUCTIVITY,
      group: 'Number of Pastes',
      labels: [constants.category.PRODUCTIVITY, constants.labels.NUMBER_OF_PASTES],
      criterias: [constants.criteria.NUMBER_OF_PASTES],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Paste ${constants.criteria.NUMBER_OF_PASTES} times`,
      minTier: 0,
      maxTier: 15,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const errorsFixedTemplate = (): StackingAchievementTemplate => ({
      name: 'I can fix her %d',
      iconDir: 'error_fixer',
      category: constants.category.PRODUCTIVITY,
      group: 'Errors Fixed',
      labels: [constants.category.PRODUCTIVITY, constants.labels.ERRORS_FIXED],
      criterias: [constants.criteria.ERRORS_FIXED],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Fix ${constants.criteria.ERRORS_FIXED} errors`,
      minTier: 0,
      maxTier: 15,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const timeSpentTemplate = (): StackingAchievementTemplate => ({
      name: 'Shower Avoider %d',
      iconDir: 'shower_avoider',
      category: constants.category.PRODUCTIVITY,
      group: 'Time Spent',
      labels: [constants.category.PRODUCTIVITY, constants.labels.TIME_SPENT],
      criterias: [constants.criteria.TIME_SPENT],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Spend ${constants.criteria.TIME_SPENT} hours coding`,
      minTier: 0,
      maxTier: 15,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const numberOfSimultaneousTabsTemplate = (): StackingAchievementTemplate => ({
      name: 'Tab Hoarder %d',
      iconDir: 'tab_hoarder',
      category: constants.category.PRODUCTIVITY,
      group: 'Number of Simultaneous Tabs',
      labels: [constants.category.PRODUCTIVITY, constants.labels.NUMBER_OF_SIMULTANEOUS_TABS],
      criterias: [constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Open ${constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS} tabs simultaneously`,
      minTier: 0,
      maxTier: 5,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

  export namespace vscode {
    //////////////////////// VSCODE STACKING TEMPLATES ////////////////////////
    export const extensionsInstalledTemplate = (): StackingAchievementTemplate => ({
      name: 'Got to catch them all ! %d',
      iconDir: 'extension_master',
      category: constants.category.VSCODE,
      group: 'Extensions Installed',
      labels: [constants.category.VSCODE, constants.labels.EXTENSIONS_INSTALLED],
      criterias: ['extensionsInstalledCount'],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Install ${'extensionsInstalledCount'} extensions`,
      minTier: 0,
      maxTier: 5,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const extensionsOutdatedTemplate = (): StackingAchievementTemplate => ({
      name: 'Living Dangerously %d',
      iconDir: 'extension_outdated',
      category: constants.category.VSCODE,
      group: 'Extensions Outdated',
      labels: [constants.category.VSCODE, constants.labels.EXTENSIONS_OUTDATED],
      criterias: ['extensionsOutdatedCount'],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Have ${'extensionsOutdatedCount'} outdated extensions`,
      minTier: 0,
      maxTier: 5,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const themesInstalledTemplate = (): StackingAchievementTemplate => ({
      name: 'Pimp my Ride %d',
      iconDir: 'theme_master',
      category: constants.category.VSCODE,
      group: 'Themes Installed',
      labels: [constants.category.VSCODE, constants.labels.THEMES_INSTALLED],
      criterias: ['themesInstalledCount'],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Install ${'themesInstalledCount'} themes`,
      minTier: 0,
      maxTier: 5,
      pointsFunction: STANDARD_POINTS_FUNCTION,
      hidden: false,
      requires: [],
    });
  }
}
