'''
'''

from os.path import dirname, join
from Achievement import Achievement
from StackingTemplates import StackingTemplates

ACHIVEMENTS_PATH = join(dirname(__file__), 'achievements.json')

if __name__ == '__main__':
    # Create the achievements from the stacking templates

    #################### PRODUCTIVITY ####################
    # Lines of Code
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Productivity.linesOfCodeTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Lines of Code for each language
    for template in StackingTemplates.Productivity.linesOfCodeLanguageTemplates():
        name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = template
        Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Lines of Comments
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Productivity.linesOfCommentTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Number of pastes
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Productivity.numberOfPastesTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Errors fixed
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Productivity.errorsFixedTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Time spent coding
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Productivity.timeSpentTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Number of simultaneous tabs
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Productivity.numberOfSimultaneousTabsTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    Achievement.toJsonFile(ACHIVEMENTS_PATH)
