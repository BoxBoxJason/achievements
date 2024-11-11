/**
 * Achievement class, contains the information of an achievement
 * Contains JSON output method
 * Contains builder method to create achievements from a template
 * @author: BoxBoxJason
 * @date: 2024-11-10
 */

import * as fs from 'fs';
import * as path from 'path';

type Criteria = { [key: string]: any };

interface StackingAchievementTemplate{
  name: string;
  iconDir: string;
  category: string;
  group: string;
  labels: string[];
  criterias: string[];
  criteriasFunctions: ((tier: number) => any)[];
  description: string;
  minTier: number;
  maxTier: number;
  pointsFunction: (tier: number) => number;
  hidden: boolean;
  requires: number[];
}

class Achievement {
  private static ICONS_DIR = path.join('icons', 'achievements');
  private static idCounter: number = 0;
  private static instances: Achievement[] = [];

  public id: number;
  public name: string;
  public icon: string;
  public category: string;
  public group: string;
  public labels: string[];
  public criteria: Criteria;
  public description: string;
  public tier: number;
  public points: number;
  public hidden: boolean;
  public requires: number[];
  public repeatable: boolean;

  constructor(
    name: string,
    icon: string,
    category: string,
    group: string,
    labels: string[],
    criteria: Criteria,
    description: string,
    tier: number,
    points: number,
    hidden: boolean,
    requires: number[],
    repeatable: boolean
  ) {
    name = name.trim();
    if (!name) {throw new Error('name must not be empty');}
    icon = icon.trim();
    if (!icon) {throw new Error('icon must not be empty');}
    category = category.trim();
    if (!category) {throw new Error('category must not be empty');}
    group = group.trim();
    if (!group) {throw new Error('group must not be empty');}
    if (!criteria) {throw new Error('criteria must not be empty');}
    description = description.trim();
    if (!description) {throw new Error('description must not be empty');}
    if (tier < 0) {throw new Error('tier must be a positive integer');}
    if (points < 0) {throw new Error('points must be a positive integer');}
    requires.forEach((requirement) => {
      if (requirement < 0 || requirement >= Achievement.idCounter) {
        throw new Error('requirement must be an existing achievement id');
      }
    });
    labels.forEach((label) => {
      if (!label) {throw new Error('label must not be empty');}
    });

    this.id = Achievement.idCounter++;
    this.name = name;
    this.icon = path.join(Achievement.ICONS_DIR, icon);
    this.category = category;
    this.group = group;
    this.labels = labels;
    this.criteria = criteria;
    this.description = description;
    this.tier = tier;
    this.points = points;
    this.hidden = hidden;
    this.requires = requires;
    this.repeatable = repeatable;
    Achievement.instances.push(this);
  }

  toDict(): { [key: string]: any } {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      category: this.category,
      group: this.group,
      labels: this.labels,
      criteria: this.criteria,
      description: this.description,
      tier: this.tier,
      points: this.points,
      hidden: this.hidden,
      requires: this.requires,
      repeatable: this.repeatable
    };
  }

static fromStackingTemplate(
  template: StackingAchievementTemplate
): Achievement[] {
  const {
    name,
    iconDir,
    category,
    group,
    labels,
    criterias,
    criteriasFunctions,
    description,
    minTier,
    maxTier,
    pointsFunction,
    hidden,
    requires,
  } = template;

  const achievements: Achievement[] = [];
  for (let tier = minTier; tier <= maxTier; tier++) {
    const currentRequire = tier === minTier ? [] : [achievements[achievements.length - 1].id];
    currentRequire.push(...requires);
    const criteriaMap: Criteria = {};
    let currentDescription = description;
    for (let i = 0; i < criterias.length; i++) {
      criteriaMap[criterias[i]] = criteriasFunctions[i](tier);
      currentDescription = currentDescription.replace(criterias[i], String(criteriaMap[criterias[i]]));
    }
    const points = pointsFunction(tier);
    achievements.push(
      new Achievement(
        name.replace('%d', (tier - minTier + 1).toString()),
        path.join(iconDir, String(tier)),
        category,
        group,
        labels,
        criteriaMap,
        currentDescription,
        tier,
        points,
        hidden,
        currentRequire,
        false
      )
    );
  }
  return achievements;
}

  static fromJson(data: { [key: string]: any }): Achievement {
    return new Achievement(
      data.name,
      data.icon,
      data.category,
      data.group,
      data.labels,
      data.criteria,
      data.description,
      data.tier,
      data.points,
      data.hidden,
      data.requires,
      data.repeatable
    );
  }

  static fromJsonFile(filePath: string): Achievement[] {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as { [key: string]: any }[];
    return data.map((achievementData) => Achievement.fromJson(achievementData));
  }

  static toJsonFile(filePath: string): void {
    const data = Achievement.instances.map((achievement) => achievement.toDict());
    fs.writeFileSync(filePath, JSON.stringify(data, null), 'utf-8');
  }
}

export default Achievement;
export { StackingAchievementTemplate };
