'''
Achievement class, contains the information of an achievement
Contains json output method
Contains builder method to create achievements from a template
@author: BoxBoxJason
@date: 2024-11-10
'''

import json
from os.path import join
from typing import List, Dict, Any, Callable

class Achievement:
    '''
    Achievement class, contains the information of an achievement
    Contains json output method
    '''
    # Path to the achievements icons dir
    ICONS_DIR = join('icons', 'achievements')
    # Instance counter
    __id_counter = 0
    # List of instances
    __instances = []

    def __init__(self,
                 name: str,
                 icon: str,
                 category: str,
                 group: str,
                 labels: List[str],
                 criteria: Dict[str, Any],
                 description: str,
                 tier: int,
                 points: int,
                 hidden: bool,
                 requires: List[int],
                 repeatable: bool) -> None:
        # Validate input
        name = name.strip()
        if not name:
            raise ValueError('name must not be empty')
        icon = icon.strip()
        if not icon:
            raise ValueError('icon must not be empty')
        category = category.strip()
        if not category:
            raise ValueError('category must not be empty')
        group = group.strip()
        if not group:
            raise ValueError('group must not be empty')
        if not criteria:
            raise ValueError('criteria must not be empty')
        description = description.strip()
        if not description:
            raise ValueError('description must not be empty')
        if tier < 0:
            raise ValueError('tier must be a positive integer')
        if points < 0:
            raise ValueError('points must be a positive integer')
        for requirement in requires:
            if requirement < 0 or requirement >= Achievement.__id_counter:
                raise ValueError('requirement must be an existing achievement id')
        for label in labels:
            if not label:
                raise ValueError('label must not be empty')

        self.id = Achievement.__id_counter
        self.name = name
        self.icon = join(Achievement.ICONS_DIR,icon)
        self.category = category
        self.group = group
        self.labels = labels
        self.criteria = criteria
        self.description = description
        self.tier = tier
        self.points = points
        self.hidden = hidden
        self.requires = requires
        self.repeatable = repeatable
        Achievement.__id_counter += 1
        Achievement.__instances.append(self)


    def __dict__(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon,
            'category': self.category,
            'group': self.group,
            'labels': self.labels,
            'criteria': self.criteria,
            'description': self.description,
            'tier': self.tier,
            'points': self.points,
            'hidden': self.hidden,
            'requires': self.requires,
            'repeatable': self.repeatable
        }


    @classmethod
    def createAchievementsFromStackingTemplate(cls, name: str, icon_dir: str, category: str, group: str, labels: List[str], criteria_variables: List[str], criteria_functions: List[Callable], description: str, min_tier: int, max_tier: int, points_function: Callable, hidden: bool, requires: List[int]) -> List['Achievement']:
        '''
        Create a list of achievements from a template
        '''
        achievements = []
        for tier in range(min_tier, max_tier + 1):
            # Store the previous achievement id as a requirement
            current_require = [] if tier == min_tier else [achievements[-1].id]
            # Add the additional requirements
            current_require.extend(requires)
            # Create the achievement criterias
            criterias = {}
            current_description = description
            for i in range(len(criteria_variables)):
                criterias[criteria_variables[i]] = criteria_functions[i](tier)
                current_description = current_description.replace(criteria_variables[i], str(criterias[criteria_variables[i]]))
            points = points_function(tier)
            achievements.append(Achievement(name % (tier - min_tier + 1), join(icon_dir,str(tier)), category, group, labels, criterias, current_description, tier, points, hidden, current_require, False))
        return achievements


    @classmethod
    def fromJson(cls, data: Dict[str, Any]) -> 'Achievement':
        '''
        Create an achievement from a json object
        '''
        return Achievement(data['name'], data['icon'], data['category'], data['group'], data['criteria'], data['description'], data['tier'], data['points'], data['hidden'], data['requires'], data['repeatable'])


    @classmethod
    def fromJsonFile(cls, path: str) -> List['Achievement']:
        '''
        Create a list of achievements from a json file
        '''
        with open(path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            return [Achievement.fromJson(achievement) for achievement in data]


    @classmethod
    def toJsonFile(cls, path: str) -> None:
        '''
        Output the achievements to a json file
        '''
        with open(path, 'w', encoding='utf-8') as file:
            json.dump([achievement.__dict__() for achievement in cls.__instances], file)
