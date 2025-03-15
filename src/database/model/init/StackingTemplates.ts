/**
 * Stacking Achievements Templates represents achievements that are based on a stacking criteria.
 *
 * @namespace StackingTemplates
 * @see constants
 * @author: BoxBoxJason
 */

import { constants } from '../../../constants';
import { StackingAchievementTemplate } from '../tables/Achievement';

/**
 * Stacking Achievements Templates namespace
 *
 * @namespace StackingTemplates
 */
export namespace StackingTemplates {
  //////////////////////// CRITERIA FUNCTIONS ////////////////////////
  export const STANDARD_EASY_CRITERIA_FUNCTION = (x: number) => 10 ** x;
  export const STANDARD_MEDIUM_CRITERIA_FUNCTION = (x: number) => 2 ** ((x + 2) >> 1) * 5 ** ((x + 1) >> 1);
  export const STANDARD_HARD_CRITERIA_FUNCTION = (x: number) => 2 ** (x >> 1) * 5 ** ((x + 1) >> 1);
  export const STANDARD_INFERNAL_CRITERIA_FUNCTION = (x: number) => (2 ** Math.max(0, (x - 1) >> 1)) * (3 ** (x === 1 ? 1 : 0)) * (5 ** (x >> 1));
  export const STANDARD_EXP_FUNCTION = STANDARD_INFERNAL_CRITERIA_FUNCTION;

  /**
   * Files stacking templates, achievements based on files criteria
   *
   * @namespace files
   * @memberof StackingTemplates
   *
   * @function filesCreatedTemplate - Files created stacking template
   * @function filesCreatedLanguageTemplates - Files created by language stacking templates
   * @function directoriesCreatedTemplate - Directories created stacking template
   * @function resourceDeletedTemplate - Resource deleted stacking template
   */
  export namespace files {

    export const filesCreatedTemplate = (): StackingAchievementTemplate => ({
      title: 'Creator %d',
      icon: 'FILE_CREATOR',
      category: constants.category.FILES,
      group: 'Files Created',
      labels: [constants.category.FILES, constants.labels.RESOURCE_CREATED],
      criterias: [constants.criteria.FILES_CREATED],
      criteriasFunctions: [STANDARD_MEDIUM_CRITERIA_FUNCTION],
      description: `Create ${constants.criteria.FILES_CREATED} files`,
      minTier: 0,
      maxTier: 15,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const filesCreatedLanguageTemplates = (): StackingAchievementTemplate[] =>
      Object.values(constants.labels.LANGUAGES).map(language => ({
        title: `LANGUAGE Creator %d`.replace('LANGUAGE', language),
        icon: `%s_CREATOR`.replace('%s', language.toUpperCase()),
        category: constants.category.FILES,
        group: 'Files Created',
        labels: [constants.category.FILES, constants.labels.RESOURCE_CREATED],
        criterias: [constants.criteria.FILES_CREATED_LANGUAGE.replace('%s', language)],
        criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
        description: `Create FILES files in LANGUAGE`.replace('LANGUAGE', language).replace('FILES', constants.criteria.FILES_CREATED_LANGUAGE.replace('%s', language)),
        minTier: 0,
        maxTier: 11,
        expFunction: STANDARD_EXP_FUNCTION,
        hidden: false,
        requires: [],
      }));

    export const filesRenamedCountTemplate = (): StackingAchievementTemplate => ({
      title: 'Please Bro, Just One more Refactor %d',
      icon: 'FILE_RENAMED',
      category: constants.category.FILES,
      group: 'Files Renamed',
      labels: [constants.category.FILES, constants.labels.RESOURCE_CREATED],
      criterias: [constants.criteria.FILES_RENAMED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Rename or Move ${constants.criteria.FILES_RENAMED} files`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const directoriesCreatedTemplate = (): StackingAchievementTemplate => ({
      title: 'Shaper %d',
      icon: 'DIRECTORY_CREATOR',
      category: constants.category.FILES,
      group: 'Resource Created',
      labels: [constants.category.FILES, constants.labels.RESOURCE_CREATED],
      criterias: [constants.criteria.DIRECTORY_CREATED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Create ${constants.criteria.DIRECTORY_CREATED} directories`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const resourceDeletedTemplate = (): StackingAchievementTemplate => ({
      title: 'Destroyer %d',
      icon: 'RESOURCE_DELETED',
      category: constants.category.FILES,
      group: 'Resource Deleted',
      labels: [constants.category.FILES, constants.labels.RESOURCE_DELETED],
      criterias: [constants.criteria.RESOURCE_DELETED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Delete ${constants.criteria.RESOURCE_DELETED} files or directories`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

  export namespace git {
    //////////////////////// GIT STACKING TEMPLATES ////////////////////////
    export const commitsTemplate = (): StackingAchievementTemplate => ({
      title: 'Committer %d',
      icon: 'GIT_COMMIT',
      category: constants.category.GIT,
      group: 'Commits',
      labels: [constants.category.GIT, constants.labels.COMMITS],
      criterias: [constants.criteria.COMMITS],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Commit ${constants.criteria.COMMITS} times`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const branchesCreatedTemplate = (): StackingAchievementTemplate => ({
      title: 'Friend of the Trees %d',
      icon: 'GIT_BRANCH',
      category: constants.category.GIT,
      group: 'Branches Created',
      labels: [constants.category.GIT, constants.labels.BRANCHES],
      criterias: [constants.criteria.BRANCHES_CREATED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Create ${constants.criteria.BRANCHES_CREATED} branches`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const mergesAndRebasesTemplate = (): StackingAchievementTemplate => ({
      title: 'Merger %d',
      icon: 'GIT_MERGE',
      category: constants.category.GIT,
      group: 'Merges and Rebases',
      labels: [constants.category.GIT, constants.labels.MERGES_AND_REBASES],
      criterias: [constants.criteria.MERGES_AND_REBASES],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Merge or rebase ${constants.criteria.MERGES_AND_REBASES} times`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const amendsTemplate = (): StackingAchievementTemplate => ({
      title: 'Amender %d',
      icon: 'GIT_AMEND',
      category: constants.category.GIT,
      group: 'Amends',
      labels: [constants.category.GIT, constants.labels.AMENDS],
      criterias: [constants.criteria.AMENDS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Amend ${constants.criteria.AMENDS} times`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const pushesTemplate = (): StackingAchievementTemplate => ({
      title: 'Product Shipping %d',
      icon: 'GIT_PUSH',
      category: constants.category.GIT,
      group: 'Pushes',
      labels: [constants.category.GIT, constants.labels.PUSHES],
      criterias: [constants.criteria.PUSHES],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Push ${constants.criteria.PUSHES} times`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

  export namespace productivity {
    //////////////////////// PRODUCTIVITY STACKING TEMPLATES ////////////////////////
    export const linesOfCodeTemplate = (): StackingAchievementTemplate => ({
      title: 'Code Monkey %d',
      icon: 'CODE_MONKEY',
      category: constants.category.PRODUCTIVITY,
      group: 'Lines of Code',
      labels: [constants.category.PRODUCTIVITY, constants.labels.LINES_OF_CODE],
      criterias: [constants.criteria.LINES_OF_CODE],
      criteriasFunctions: [STANDARD_EASY_CRITERIA_FUNCTION],
      description: `Write ${constants.criteria.LINES_OF_CODE} lines of code`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const linesOfCodeLanguageTemplates = (): StackingAchievementTemplate[] =>
      Object.values(constants.labels.LANGUAGES).map(language => ({
        title: `LANGUAGE Speaker %d`.replace('LANGUAGE', language),
        icon: `%s_SPEAKER`.replace('%s', language.toUpperCase()),
        category: constants.category.PRODUCTIVITY,
        group: 'Lines of Code',
        labels: [constants.category.PRODUCTIVITY, constants.labels.LINES_OF_CODE],
        criterias: [constants.criteria.LINES_OF_CODE_LANGUAGE.replace('%s', language)],
        criteriasFunctions: [STANDARD_MEDIUM_CRITERIA_FUNCTION],
        description: `Write LOC lines of LANGUAGE code`.replace('LANGUAGE', language).replace('LOC', constants.criteria.LINES_OF_CODE_LANGUAGE.replace('%s', language)),
        minTier: 0,
        maxTier: 15,
        expFunction: STANDARD_EXP_FUNCTION,
        hidden: false,
        requires: [],
      }));

    export const linesOfCommentTemplate = (): StackingAchievementTemplate => ({
      title: 'Outstanding Commentator %d',
      icon: 'CODE_COMMENTATOR',
      category: constants.category.PRODUCTIVITY,
      group: 'Lines of Comments',
      labels: [constants.category.PRODUCTIVITY, constants.labels.LINES_OF_COMMENTS],
      criterias: [constants.criteria.LINES_OF_COMMENTS],
      criteriasFunctions: [STANDARD_MEDIUM_CRITERIA_FUNCTION],
      description: `Write ${constants.criteria.LINES_OF_COMMENTS} lines of comments`,
      minTier: 0,
      maxTier: 15,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const numberOfPastesTemplate = (): StackingAchievementTemplate => ({
      title: 'Copy Ninja %d',
      icon: 'COPY_NINJA',
      category: constants.category.PRODUCTIVITY,
      group: 'Number of Pastes',
      labels: [constants.category.PRODUCTIVITY, constants.labels.NUMBER_OF_PASTES],
      criterias: [constants.criteria.NUMBER_OF_PASTES],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Paste ${constants.criteria.NUMBER_OF_PASTES} times`,
      minTier: 0,
      maxTier: 15,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const errorsFixedTemplate = (): StackingAchievementTemplate => ({
      title: 'I can fix her %d',
      icon: 'ERROR_FIXER',
      category: constants.category.PRODUCTIVITY,
      group: 'Errors Fixed',
      labels: [constants.category.PRODUCTIVITY, constants.labels.ERRORS_FIXED],
      criterias: [constants.criteria.ERRORS_FIXED],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Fix ${constants.criteria.ERRORS_FIXED} errors`,
      minTier: 0,
      maxTier: 15,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const totalTimeSpentTemplate = (): StackingAchievementTemplate => ({
      title: 'Shower Avoider %d',
      icon: 'SHOWER_AVOIDER',
      category: constants.category.PRODUCTIVITY,
      group: 'time spent',
      labels: [constants.category.PRODUCTIVITY, constants.labels.TIME],
      criterias: [constants.criteria.TOTAL_TIME_SPENT],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Spend ${constants.criteria.TOTAL_TIME_SPENT} hours coding`,
      minTier: 0,
      maxTier: 13,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const numberOfSimultaneousTabsTemplate = (): StackingAchievementTemplate => ({
      title: 'Tab Hoarder %d',
      icon: 'TAB_HOARDER',
      category: constants.category.PRODUCTIVITY,
      group: 'Number of Simultaneous Tabs',
      labels: [constants.category.PRODUCTIVITY, constants.labels.TABS],
      criterias: [constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Open ${constants.criteria.NUMBER_OF_SIMULTANEOUS_TABS} tabs simultaneously`,
      minTier: 0,
      maxTier: 5,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

  export namespace vscode {
    //////////////////////// VSCODE STACKING TEMPLATES ////////////////////////
    export const extensionsInstalledTemplate = (): StackingAchievementTemplate => ({
      title: 'Got to catch them all ! %d',
      icon: 'EXTENSION_MASTER',
      category: constants.category.VSCODE,
      group: 'Extensions Installed',
      labels: [constants.category.VSCODE, constants.labels.EXTENSIONS],
      criterias: [constants.criteria.EXTENSIONS_INSTALLED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Install ${constants.criteria.EXTENSIONS_INSTALLED} extensions`,
      minTier: 0,
      maxTier: 5,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const extensionsOutdatedTemplate = (): StackingAchievementTemplate => ({
      title: 'Living Dangerously %d',
      icon: 'EXTENSION_OUTDATED',
      category: constants.category.VSCODE,
      group: 'Extensions Outdated',
      labels: [constants.category.VSCODE, constants.labels.EXTENSIONS],
      criterias: [constants.criteria.EXTENSIONS_OUTDATED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Have ${constants.criteria.EXTENSIONS_OUTDATED} outdated extensions`,
      minTier: 0,
      maxTier: 5,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const themesInstalledTemplate = (): StackingAchievementTemplate => ({
      title: 'Pimp my Ride %d',
      icon: 'PIMP_MY_RIDE',
      category: constants.category.VSCODE,
      group: 'Themes Installed',
      labels: [constants.category.VSCODE, constants.labels.THEMES],
      criterias: [constants.criteria.THEMES_INSTALLED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Install ${constants.criteria.THEMES_INSTALLED} themes`,
      minTier: 0,
      maxTier: 5,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const themeChangedTemplate = (): StackingAchievementTemplate => ({
      title: 'Chameleon %d',
      icon: 'CHAMELEON',
      category: constants.category.VSCODE,
      group: 'Theme Changed',
      labels: [constants.category.VSCODE, constants.labels.THEMES],
      criterias: [constants.criteria.THEME_CHANGED],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Change theme ${constants.criteria.THEME_CHANGED} times`,
      minTier: 0,
      maxTier: 8,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const debuggerSessionsTemplate = (): StackingAchievementTemplate => ({
      title: 'Am I better than everyone ? %d',
      icon: 'DEBUGGER_SESSION',
      category: constants.category.VSCODE,
      group: 'Debugger Sessions',
      labels: [constants.category.VSCODE, constants.labels.DEBUGGER],
      criterias: [constants.criteria.DEBUGGER_SESSIONS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Start ${constants.criteria.DEBUGGER_SESSIONS} debugger sessions`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const breakpointsTemplate = (): StackingAchievementTemplate => ({
      title: 'Breaking Bad %d',
      icon: 'DEBUGGER_BREAKPOINT',
      category: constants.category.VSCODE,
      group: 'Breakpoints',
      labels: [constants.category.VSCODE, constants.labels.DEBUGGER],
      criterias: [constants.criteria.BREAKPOINTS],
      criteriasFunctions: [STANDARD_HARD_CRITERIA_FUNCTION],
      description: `Create ${constants.criteria.BREAKPOINTS} breakpoints`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const terminalCommandsTemplate = (): StackingAchievementTemplate => ({
      title: 'Commander %d',
      icon: 'TERMINAL_TASK',
      category: constants.category.VSCODE,
      group: 'tasks',
      labels: [constants.category.VSCODE, constants.labels.TERMINAL],
      criterias: [constants.criteria.TERMINAL_TASKS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Run ${constants.criteria.TERMINAL_TASKS} vscode tasks (terminal commands)`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const failedTerminalCommandsTemplate = (): StackingAchievementTemplate => ({
      title: 'Failure achiever %d',
      icon: 'TERMINAL_TASK_FAIL',
      category: constants.category.VSCODE,
      group: 'tasks',
      labels: [constants.category.VSCODE, constants.labels.TERMINAL],
      criterias: [constants.criteria.FAILED_TERMINAL_TASKS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Run ${constants.criteria.FAILED_TERMINAL_TASKS} non zero vscode tasks (terminal command) output`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const successfulTerminalCommandsTemplate = (): StackingAchievementTemplate => ({
      title: 'Works on my Machine %d',
      icon: 'TERMINAL_TASK_SUCCESS',
      category: constants.category.VSCODE,
      group: 'tasks',
      labels: [constants.category.VSCODE, constants.labels.TERMINAL],
      criterias: [constants.criteria.SUCCESSFUL_TERMINAL_TASKS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Run ${constants.criteria.SUCCESSFUL_TERMINAL_TASKS} zero vscode tasks (terminal command) output`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });

    export const codeSnippetsTemplate = (): StackingAchievementTemplate => ({
      title: 'Snippets Master %d',
      icon: 'CODE_SNIPPETS',
      category: constants.category.PRODUCTIVITY,
      group: 'Code Snippets',
      labels: [constants.category.PRODUCTIVITY, constants.labels.SNIPPETS],
      criterias: [constants.criteria.CODE_SNIPPETS],
      criteriasFunctions: [STANDARD_INFERNAL_CRITERIA_FUNCTION],
      description: `Use ${constants.criteria.CODE_SNIPPETS} code snippets`,
      minTier: 0,
      maxTier: 10,
      expFunction: STANDARD_EXP_FUNCTION,
      hidden: false,
      requires: [],
    });
  }

}
