
import { db_model } from '../model';

interface AchievementRequirementDict {
    achievement_id: number;
    requirement_id: number;
}

/**
 * Represents a requirement for an achievement.
 *
 * @class AchievementRequirement
 * @property {number} achievement_id - The ID of the achievement.
 * @property {number} requirement_id - The ID of the requirement.
 * @method fromObject - Creates an instance of AchievementRequirement from an object.
 * @method fromRow - Creates an instance of AchievementRequirement from a database row.
 * @method fromDB - Retrieves all achievement requirements from the database.
 * @method toObject - Converts an instance of AchievementRequirement to an object.
 * @method toRow - Inserts an instance of AchievementRequirement into the database.
 * @method toRows - Inserts multiple instances of AchievementRequirement into the database.
 * @default AchievementRequirement
 */
class AchievementRequirement {
    public achievement_id: number;
    public requirement_id: number;

    constructor(data: AchievementRequirementDict) {
        this.achievement_id = data.achievement_id;
        this.requirement_id = data.requirement_id;
    }

    // ==================== FROM methods ====================

    /**
     * Creates an instance of AchievementRequirement from an object.
     *
     * @memberof AchievementRequirement
     * @method fromObject
     * @static
     *
     * @param {AchievementRequirementDict} data - The object to create an instance from.
     * @returns {AchievementRequirement} - An instance of AchievementRequirement.
     */
    static fromObject(data: AchievementRequirementDict): AchievementRequirement {
        return new AchievementRequirement(data);
    }


    /**
     * Creates an instance of AchievementRequirement from a database row.
     *
     * @memberof AchievementRequirement
     * @method fromRow
     * @static
     *
     * @param {any} row - The database row to create an instance from.
     * @returns {AchievementRequirement} - An instance of AchievementRequirement.
     */
    static fromRow(row: any): AchievementRequirement {
        return new AchievementRequirement({
            achievement_id: row.achievement_id,
            requirement_id: row.requirement_id,
        });
    }

    /**
     * Retrieves all achievement requirements from the database.
     *
     * @memberof AchievementRequirement
     * @method fromDB
     * @static
     *
     * @returns {AchievementRequirement[]} - An array of all achievement requirements.
     */
    static fromDB(): AchievementRequirement[] {
        const db = db_model.openDB();
        const query = 'SELECT * FROM achievement_requirements';
        const rows = db.prepare(query).all();
        return rows.map((row) => AchievementRequirement.fromRow(row));
    }

    // ==================== TO methods ====================

    /**
     * Converts an instance of AchievementRequirement to an object.
     *
     * @memberof AchievementRequirement
     * @method toObject
     *
     * @returns {AchievementRequirementDict} - An object representation of the instance.
     */
    toObject(): AchievementRequirementDict {
        return {
            achievement_id: this.achievement_id,
            requirement_id: this.requirement_id,
        };
    }


    /**
     * Inserts an instance of AchievementRequirement into the database.
     *
     * @memberof AchievementRequirement
     * @method toRow
     *
     * @returns {void}
     */
    toRow(): void {
        const db = db_model.openDB();
        const query = `INSERT INTO achievement_requirements (achievement_id, requirement_id) VALUES (?, ?)
                       ON CONFLICT(achievement_id, requirement_id) DO NOTHING`;
        db.prepare(query).run(this.achievement_id, this.requirement_id);
    }


    /**
     * Inserts multiple instances of AchievementRequirement into the database.
     *
     * @memberof AchievementRequirement
     * @method toRows
     * @static
     *
     * @param {number} achievement_id - The ID of the achievement.
     * @param {number[]} requirements_ids - An array of requirement IDs.
     * @returns {void}
     */
    static toRows(achievement_id : number, requirements_ids : number[])  : void {
        let requirements = requirements_ids.map((requirement_id) => new AchievementRequirement({achievement_id, requirement_id}));
        const db = db_model.openDB();
        const query = `INSERT INTO achievement_requirements (achievement_id, requirement_id) VALUES (?, ?)
                       ON CONFLICT(achievement_id, requirement_id) DO NOTHING`;
        let insert = db.prepare(query);
        requirements.forEach((requirement) => {
            insert.run(requirement.achievement_id, requirement.requirement_id);
        });
    }
}

export default AchievementRequirement;
