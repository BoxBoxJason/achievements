'''
StackingTemplates module contains the templates definitions for the achievements

List of Stacking Tempaltes:
- Files
    - Files Created
    - Files Created for each language
    - Files Deleted
    - Files Moved
- Git
    - Commits
    - Branches created
    - Merges and rebases
    - Amends
    - Forced Pushes
    - Pushes
- Productivity
    - Number of sumultaneous tabs
    - Time Spent
    - Errors Fixed
    - Lines of Code
    - Lines of Code for each language
    - Lines of comments
    - Number of pastes
- VSCode
    - Extensions Installed
    - Extensions Outdated
    - Themes Installed
'''

from typing import List, Callable
import constants

class StackingTemplates:
    '''
    Stacking templates class, contains the stacking templates for the achievements
    '''

    STANDARD_EASY_CRITERIA_FUNCTION = lambda x: 10**x                                                                            # [1, 10, 100, 1000, 10000, 100000,...]
    STANDARD_MEDIUM_CRITERIA_FUNCTION = lambda x: 2 ** ((x + 2) // 2) * 5 ** ((x + 1) // 2)                                      # [2, 10, 20, 100, 200, 1000, 2000, 10000, 20000, 100000]
    STANDARD_HARD_CRITERIA_FUNCTION = lambda x: 2 ** (x // 2) * 5 ** ((x + 1) // 2)                                              # [1, 5, 10, 50, 100, 500, 1000, 5000, 10000, 50000,...]
    STANDARD_INFERNAL_CRITERIA_FUNCTION = lambda x: (2 ** max(0, (x - 1) // 2)) * (3 ** (1 if x == 1 else 0)) * (5 ** (x // 2))  # [1, 3, 5, 10, 50, 100, 500, 1000, 5000, 10000,...]

    STANDARD_POINTS_FUNCTION = STANDARD_INFERNAL_CRITERIA_FUNCTION

    class Files:
        '''
        Files stacking templates
        '''
        @staticmethod
        def filesCreatedTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the files created achievement
            '''
            name = 'Creator %d'
            icon_dir = 'creator'
            category = constants.Category.FILES
            group = 'Files Created'
            criterias = [constants.Criteria.FILES_CREATED]
            description = f'Create {criterias[0]} files'
            labels = [constants.Category.FILES, constants.Labels.FILES_CREATED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_MEDIUM_CRITERIA_FUNCTION], description, 0, 15, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def filesCreatedLanguageTemplates() -> List[tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]]:
            '''
            Returns the templates for the files created for each language achievement
            '''
            name = 'LANGUAGE Creator %d'
            icon_dir = '%s_creator'
            category = constants.Category.FILES
            group = 'Files Created'
            description = 'Create FILES files in LANGUAGE'
            labels = [constants.Category.FILES, constants.Labels.FILES_CREATED]

            languages_tuples = []
            for language in constants.Labels.LANGUAGES:
                criterias = [constants.Criteria.FILES_CREATED_LANGUAGE % language]
                languages_tuples.append((name.replace('LANGUAGE', language), icon_dir % language, category, group, labels, criterias, [StackingTemplates.STANDARD_HARD_CRITERIA_FUNCTION], description.replace('LANGUAGE', language).replace('FILES', criterias[0]), 0, 11, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []))

            return languages_tuples


        @staticmethod
        def filesDeletedTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the files deleted achievement
            '''
            name = 'Deleter %d'
            icon_dir = 'deleter'
            category = constants.Category.FILES
            group = 'Files Deleted'
            criterias = [constants.Criteria.FILES_DELETED]
            description = f'Delete {criterias[0]} files'
            labels = [constants.Category.FILES, constants.Labels.FILES_DELETED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_HARD_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def filesMovedTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the files moved achievement
            '''
            name = 'Please bro just one more refactor %d'
            icon_dir = 'mover'
            category = constants.Category.FILES
            group = 'Files Moved'
            criterias = [constants.Criteria.FILES_MOVED]
            description = f'Move (or rename) {criterias[0]} files'
            labels = [constants.Category.FILES, constants.Labels.FILES_MOVED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


    class Git:
        '''
        Git stacking templates
        '''
        @staticmethod
        def commitsTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the commits achievement
            '''
            name = 'Committer %d'
            icon_dir = 'committer'
            category = constants.Category.GIT
            group = 'Commits'
            criterias = [constants.Criteria.COMMITS]
            description = f'Commit {criterias[0]} times'
            labels = [constants.Category.GIT, constants.Labels.COMMITS]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_HARD_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def branchesCreatedTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the branches created achievement
            '''
            name = 'Friend of the Trees %d'
            icon_dir = 'brancher'
            category = constants.Category.GIT
            group = 'Branches Created'
            criterias = [constants.Criteria.BRANCHES_CREATED]
            description = f'Create {criterias[0]} branches'
            labels = [constants.Category.GIT, constants.Labels.BRANCHES_CREATED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def mergesAndRebasesTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the merges and rebases achievement
            '''
            name = 'Merger %d'
            icon_dir = 'merger'
            category = constants.Category.GIT
            group = 'Merges and Rebases'
            criterias = [constants.Criteria.MERGES_AND_REBASES]
            description = f'Merge or rebase {criterias[0]} times'
            labels = [constants.Category.GIT, constants.Labels.MERGES_AND_REBASES]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def amendsTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the amends achievement
            '''
            name = 'Amender %d'
            icon_dir = 'amender'
            category = constants.Category.GIT
            group = 'Amends'
            criterias = [constants.Criteria.AMENDS]
            description = f'Amend {criterias[0]} times'
            labels = [constants.Category.GIT, constants.Labels.AMENDS]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def forcedPushesTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the forced pushes achievement
            '''
            name = 'Good Luck Everyone %d'
            icon_dir = 'forcer'
            category = constants.Category.GIT
            group = 'Forced Pushes'
            criterias = [constants.Criteria.FORCED_PUSHES]
            description = f'Force push {criterias[0]} times'
            labels = [constants.Category.GIT, constants.Labels.FORCED_PUSHES]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def pushesTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the pushes achievement
            '''
            name = 'Ship fast, talk later %d'
            icon_dir = 'pusher'
            category = constants.Category.GIT
            group = 'Pushes'
            criterias = [constants.Criteria.PUSHES]
            description = f'Push {criterias[0]} times'
            labels = [constants.Category.GIT, constants.Labels.PUSHES]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


    class Productivity:
        '''
        Productivity stacking templates
        '''
        @staticmethod
        def linesOfCodeTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the lines of code achievement
            '''
            name = 'Code Monkey %d'
            icon_dir = 'code_monkey'
            category = constants.Category.PRODUCTIVITY
            group = 'Lines of Code'
            criterias = [constants.Criteria.LINES_OF_CODE]
            description = f'Write {criterias[0]} lines of code'
            labels = [constants.Category.PRODUCTIVITY, constants.Labels.LINES_OF_CODE]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_EASY_CRITERIA_FUNCTION], description, 0, 10, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def linesOfCodeLanguageTemplates() -> List[tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]]:
            '''
            Returns the templates for the lines of code for each language achievement
            '''
            name = 'LANGUAGE Speaker %d'
            icon_dir = '%s_speaker'
            category = constants.Category.PRODUCTIVITY
            group = 'Lines of Code'
            description = 'Write LOC lines of LANGUAGE code'
            labels = [constants.Category.PRODUCTIVITY, constants.Labels.LINES_OF_CODE]

            languages_tuples = []
            for language in constants.Labels.LANGUAGES:
                criterias = [constants.Criteria.LINES_OF_CODE_LANGUAGE % language]
                languages_tuples.append((name.replace('LANGUAGE', language), icon_dir % language, category, group, labels, criterias, [StackingTemplates.STANDARD_MEDIUM_CRITERIA_FUNCTION], description.replace('LANGUAGE', language).replace('LOC', criterias[0]), 0, 15, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []))

            return languages_tuples


        @staticmethod
        def linesOfCommentTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the lines of comments achievement
            '''
            name = 'Outstanding Commentator %d'
            icon_dir = 'commentator'
            category = constants.Category.PRODUCTIVITY
            group = 'Lines of Comments'
            criterias = [constants.Criteria.LINES_OF_COMMENTS]
            description = f'Write {criterias[0]} lines of comments'
            labels = [constants.Category.PRODUCTIVITY, constants.Labels.LINES_OF_COMMENTS]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_MEDIUM_CRITERIA_FUNCTION],  description, 0, 15, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def numberOfPastesTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the number of pastes achievement
            '''
            name = 'Copy Ninja %d'
            icon_dir = 'copy_ninja'
            category = constants.Category.PRODUCTIVITY
            group = 'Number of Pastes'
            criterias = [constants.Criteria.NUMBER_OF_PASTES]
            description = f'Paste {criterias[0]} times'
            labels = [constants.Category.PRODUCTIVITY, constants.Labels.NUMBER_OF_PASTES]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_HARD_CRITERIA_FUNCTION], description, 0, 15, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def errorsFixedTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the errors fixed achievement
            '''
            name = 'I can fix her %d'
            icon_dir = 'error_fixer'
            category = constants.Category.PRODUCTIVITY
            group = 'Errors Fixed'
            criterias = [constants.Criteria.ERRORS_FIXED]
            description = f'Fix {criterias[0]} errors'
            labels = [constants.Category.PRODUCTIVITY, constants.Labels.ERRORS_FIXED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_HARD_CRITERIA_FUNCTION], description, 0, 15, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []

        @staticmethod
        def timeSpentTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the time spent achievement
            '''
            name = 'Shower Avoider %d'
            icon_dir = 'shower_avoider'
            category = constants.Category.PRODUCTIVITY
            group = 'Time Spent'
            criterias = [constants.Criteria.TIME_SPENT]
            description = f'Spend {criterias[0]} hours coding'
            labels = [constants.Category.PRODUCTIVITY, constants.Labels.TIME_SPENT]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 15, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def numberOfSimultaneousTabsTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the number of simultaneous tabs achievement
            '''
            name = 'Tab Hoarder %d'
            icon_dir = 'tab_hoarder'
            category = constants.Category.PRODUCTIVITY
            group = 'Number of Simultaneous Tabs'
            criterias = [constants.Criteria.NUMBER_OF_SIMULTANEOUS_TABS]
            description = f'Open {criterias[0]} tabs simultaneously'
            labels = [constants.Category.PRODUCTIVITY, constants.Labels.NUMBER_OF_SIMULTANEOUS_TABS]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 5, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []

    class VSCode:
        '''
        VSCode stacking templates
        '''

        @staticmethod
        def extensionsInstalledTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the extensions installed achievement
            '''
            name = 'Got to catch them all ! %d'
            icon_dir = 'extension_master'
            category = constants.Category.VSCODE
            group = 'Extensions Installed'
            criterias = ['extensionsInstalledCount']
            description = f'Install {criterias[0]} extensions'
            labels = [constants.Category.VSCODE, constants.Labels.EXTENSIONS_INSTALLED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 5, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def extensionsOutdatedTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the extensions outdated achievement
            '''
            name = 'Living Dangerously %d'
            icon_dir = 'extension_outdated'
            category = constants.Category.VSCODE
            group = 'Extensions Outdated'
            criterias = ['extensionsOutdatedCount']
            description = f'Have {criterias[0]} outdated extensions'
            labels = [constants.Category.VSCODE, constants.Labels.EXTENSIONS_OUTDATED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 5, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []


        @staticmethod
        def themesInstalledTemplate() -> tuple[str, str, str, str, List[str], List[str], List[Callable], str, int, int, Callable, bool, List[int]]:
            '''
            Returns the template for the themes installed achievement
            '''
            name = 'Pimp my Ride %d'
            icon_dir = 'theme_master'
            category = constants.Category.VSCODE
            group = 'Themes Installed'
            criterias = ['themesInstalledCount']
            description = f'Install {criterias[0]} themes'
            labels = [constants.Category.VSCODE, constants.Labels.THEMES_INSTALLED]

            return name, icon_dir, category, group, labels, criterias, [StackingTemplates.STANDARD_INFERNAL_CRITERIA_FUNCTION], description, 0, 5, StackingTemplates.STANDARD_POINTS_FUNCTION, False, []
