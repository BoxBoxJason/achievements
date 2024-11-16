/**
 * Achievements controller contains functions to interact with achievements and progressions
 *
 * @module achievements
 * @author BoxBoxJason
 * @date 2024-11-12
 */

import Achievement from '../model/tables/Achievement';
import Progression from '../model/tables/Progression';

interface ProgressionDict {
    [key: string]: number;
}

/**
 * Increase the progression value of a criteria and check if any achievements have been unlocked
 *
 * @memberof achievements
 * @function increaseProgression
 *
 * @param {string} criteria_name - The name of the criteria to increase
 * @param {number} increase - The amount to increase the criteria by
 * @returns {void}
 */
export function increaseProgression(criteria_name : string, increase : number) : void {
    // Update the progression value and retrieve all progressions
    Progression.addValueFromName(criteria_name, increase);
    let criterias = progressionsToObject(Progression.fromDB());

    // Retrieve the achievements that are achievable by the updated progression
    let achievableAchievements = Achievement.getAchievableByCriterias([criteria_name]);

    // Check if the updated progression has unlocked any achievements
    let unlockedAchievements = achievableAchievements.filter(
        achievement => checkAchievementDone(achievement, criterias)
    );

    // Complete the unlocked achievements
    unlockedAchievements.forEach(completeAchievement);
}


/**
 * Convert a list of progressions to a dictionary
 *
 * @memberof achievements
 * @function progressionsToObject
 *
 * @param {Progression[]} progressions - The list of progressions to convert
 * @returns {ProgressionDict} - The progressions as a dictionary
 */
function progressionsToObject(progressions : Progression[]) : ProgressionDict {
    let progressionDict : ProgressionDict = Object();
    for (let progression of progressions) {
        progressionDict[progression.name] = progression.value;
    }
    return progressionDict;
}


/**
 * Check if an achievement has been completed
 *
 * @memberof achievements
 * @function checkAchievementDone
 *
 * @param {Achievement} achievement - The achievement to check
 * @param {ProgressionDict} progressions - The progressions to check against
 * @returns {boolean} - True if the achievement has been completed
 */
function checkAchievementDone(achievement: Achievement, progressions: ProgressionDict): boolean {
    return Object.keys(achievement.criteria).every(
        criterion => progressions[criterion] >= achievement.criteria[criterion]
    );
}


/**
 * Complete an achievement
 *
 * @memberof achievements
 * @function completeAchievement
 *
 * @param {Achievement} achievement - The achievement to complete
 * @returns {void}
 */
function completeAchievement(achievement: Achievement) {
    achievement.updateAchieved();
}
