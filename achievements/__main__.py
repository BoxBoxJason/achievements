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

    #################### FILES ####################
    # Files created
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Files.filesCreatedTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Files created for each language
    for template in StackingTemplates.Files.filesCreatedLanguageTemplates():
        name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = template
        Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Files deleted
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Files.filesDeletedTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Files moved
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Files.filesMovedTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    #################### GIT ####################
    # Commits
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Git.commitsTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Branches created
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Git.branchesCreatedTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Merges and rebases
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Git.mergesAndRebasesTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Amends
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Git.amendsTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Forced pushes
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Git.forcedPushesTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Pushes
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.Git.pushesTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    #################### VSCODE ####################
    # extensions installed
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.VSCode.extensionsInstalledTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # extensions out of date
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.VSCode.extensionsOutdatedTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # themes installed
    name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires = StackingTemplates.VSCode.themesInstalledTemplate()
    Achievement.createAchievementsFromStackingTemplate(name, icon_dir, category, group, labels, criterias, criterias_functions, description, min_tier, max_tier, points_function, hidden, requires)

    # Create the achievements from the stacking templates
    Achievement.toJsonFile(ACHIVEMENTS_PATH)
