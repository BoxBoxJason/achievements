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
'''

from typing import List, Callable
from math import factorial
import constants

class StackingTemplates:

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

            return name, icon_dir, category, group, labels, criterias, [lambda x: 10**x], description, 0, 10, lambda x: 2**x, False, []


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
                languages_tuples.append((name.replace('LANGUAGE', language), icon_dir % language, category, group, labels, criterias, [lambda x: 5**x], description.replace('LANGUAGE', language).replace('LOC', criterias[0]), 0, 10, lambda x: 2**x, False, []))

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

            return name, icon_dir, category, group, labels, criterias, [lambda x: 10**x ],  description, 0, 10, lambda x: 2**x, False, []


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

            return name, icon_dir, category, group, labels, criterias, [lambda x: 5**x], description, 0, 10, lambda x: 2**x, False, []


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

            return name, icon_dir, category, group, labels, criterias, [factorial], description, 0, 10, lambda x: 2**x, False, []

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

            return name, icon_dir, category, group, labels, criterias, [lambda x: 2**x], description, 0, 17, lambda x: 2**x, False, []


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

            return name, icon_dir, category, group, labels, criterias, [lambda x: [1,3,5,10,50,100][x]], description, 0, 5, lambda x: 2**x, False, []
