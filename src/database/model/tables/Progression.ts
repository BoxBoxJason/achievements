/**
 * Progression database model, represents each achievement criteria value
 * @author: BoxBoxJason
 * @date 2024-11-11
 */

import * as fs from 'fs';
import { db_model } from '../model';

interface ProgressionDict {
    id?: number;
    name: string;
    value?: number;
}

/**
 * Represents a progression value for an achievement.
 *
 * @class Progression
 * @property {number} id - The ID of the progression.
 * @property {string} name - The name of the progression.
 * @property {number} value - The value of the progression.
 * @method fromObject - Creates an instance of Progression from an object.
 * @method fromRow - Creates an instance of Progression from a database row.
 * @method fromDB - Retrieves all progressions from the database.
 * @method toObject - Converts an instance of Progression to an object.
 * @method toRow - Inserts an instance of Progression into the database.
 * @method toDB - Inserts multiple instances of Progression into the database.
 * @method toJsonFile - Writes an array of Progression instances to a JSON file.
 * @method updateValue - Updates the value of the progression.
 * @method addValue - Adds a value to the progression.
 * @method updateValueFromName - Updates the value of a progression by name.
 * @method addValueFromName - Adds a value to a progression by name.
 * @method getProgressionFromName - Retrieves a progression by name.
 * @method getValueFromName - Retrieves the value of a progression by name.
 * @method getProgressionFromId - Retrieves a progression by ID.
 * @method getValueFromId - Retrieves the value of a progression by ID.
 * @default Progression
 */
class Progression {
    private id?: number;
    public name: string;
    public value: number;

    constructor(data: ProgressionDict) {
        this.name = data.name;
        this.value = data.value || 0;
    }


    // ==================== FROM methods ====================

    /**
     * Creates an instance of Progression from an object.
     *
     * @memberof Progression
     * @method fromObject
     * @static
     *
     * @param {ProgressionDict} data - The object to create an instance from.
     * @returns {Progression} - An instance of Progression.
     */
    static fromObject(data: ProgressionDict): Progression {
        return new Progression(data);
    }


    /**
     * Creates an instance of Progression from a database row.
     *
     * @memberof Progression
     * @method fromRow
     * @static
     *
     * @param {any} row - The database row to create an instance from.
     * @returns {Progression} - An instance of Progression.
     */
    static fromRow(row: any): Progression {
        return new Progression({
            id: row.id,
            name: row.name,
            value: row.value,
        });
    }


    /**
     * Retrieves all progressions from the database.
     *
     * @memberof Progression
     * @method fromDB
     * @static
     *
     * @returns {Progression[]} - An array of all progressions.
     */
    static fromDB(): Progression[] {
        const db = db_model.openDB();
        const query = 'SELECT * FROM progressions';
        const rows = db.prepare(query).all();
        return rows.map((row) => Progression.fromRow(row));
    }


    // ==================== TO methods ====================

    /**
     * Converts an instance of Progression to an object.
     *
     * @memberof Progression
     * @method toObject
     *
     * @returns {ProgressionDict} - An object representation of the Progression.
     */
    toObject(): ProgressionDict {
        return {
            id: this.id,
            name: this.name,
            value: this.value,
        };
    }


    /**
     * Inserts an instance of Progression into the database.
     *
     * @memberof Progression
     * @method toRow
     *
     * @returns {void}
     */
    toRow(): void {
        const query = `INSERT INTO progressions
        (name,value) VALUES (?,?)
        ON CONFLICT(name) DO NOTHING`;

        const db = db_model.openDB();

        const statement = db.prepare(query);
        const info = statement.run([this.name, this.value]);

        // Change the id of the instance to the id of the row if it was inserted
        if (info.changes && info.lastInsertRowid) {
            this.id = Number(info.lastInsertRowid);
        }
    }


    /**
     * Inserts multiple instances of Progression into the database.
     *
     * @memberof Progression
     * @method toDB
     * @static
     *
     * @param {Progression[]} progressions - An array of Progression instances to insert.
     * @returns {void}
     */
    static toDB(progressions: Progression[]) {
        const db = db_model.openDB();
        const query = `INSERT INTO progressions
        (name,value) VALUES (?,?)
        ON CONFLICT(name) DO NOTHING`;

        const statement = db.prepare(query);
        db.transaction((progressions) => {
            for (const progression of progressions) {
                const info = statement.run([progression.name, progression.value]);

                // Change the id of the instance to the id of the row if it was inserted
                if (info.changes && info.lastInsertRowid) {
                    progression.id = Number(info.lastInsertRowid);
                }
            }
        })(progressions);

    }

    /**
     * Writes an array of Progression instances to a JSON file.
     *
     * @memberof Progression
     * @method toJsonFile
     *
     * @param {Progression[]} instances - An array of Progression instances to write to the file.
     * @param {string} filePath - The path to the file to write to.
     * @returns {void}
     */
    static toJsonFile(instances: Progression[], filePath: string): void {
        const data = instances.map((achievement) => achievement.toObject());
        fs.writeFileSync(filePath, JSON.stringify(data, null), 'utf-8');
    }


    // ==================== UPDATE ====================


    /**
     * Updates the value of the progression.
     *
     * @memberof Progression
     * @method updateValue
     *
     * @param {number} value - The new value of the progression.
     * @returns {void}
     */
    updateValue(value: number): void {
        this.value = value;
        const query = `UPDATE progressions SET value = ? WHERE id = ?`;

        const db = db_model.openDB();
        const statement = db.prepare(query);
        statement.run([value, this.id]);
    }


    /**
     * Adds a value to the progression.
     *
     * @memberof Progression
     * @method addValue
     *
     * @param {number} value - The value to add to the progression.
     * @returns {void}
     */
    addValue(value: number = 1): void {
        this.value += value;
        const query = `UPDATE progressions SET value = value + ? WHERE id = ?`;

        const db = db_model.openDB();
        const statement = db.prepare(query);
        statement.run([value, this.id]);
    }

    /**
     * Updates the value of a progression by name.
     *
     * @memberof Progression
     * @method updateValueFromName
     * @static
     *
     * @param {string} name - The name of the progression to update.
     * @param {number} value - The new value of the progression.
     * @returns {void}
     */
    static updateValueFromName(name: string, value: number): void {
        const query = `UPDATE progressions SET value = ? WHERE name = ?`;

        const db = db_model.openDB();
        const statement = db.prepare(query);
        statement.run([value, name]);
    }


    /**
     * Adds a value to a progression by name.
     *
     * @memberof Progression
     * @method addValueFromName
     * @static
     *
     * @param {string} name - The name of the progression to update.
     * @param {number} value - The value to add to the progression.
     * @returns {void}
     */
    static addValueFromName(name: string, value: number = 1): void {
        const query = `UPDATE progressions SET value = value + ? WHERE name = ?`;

        const db = db_model.openDB();
        const statement = db.prepare(query);
        statement.run([value, name]);
    }


    // ==================== GET ====================

    /**
     * Retrieves a progression by name.
     *
     * @memberof Progression
     * @method getProgressionFromName
     * @static
     *
     * @param {string} name - The name of the progression to retrieve.
     * @returns {Progression} - The progression with the given name.
     */
    static getProgressionFromName(name: string): Progression {
        const query = `SELECT * FROM progressions WHERE name = ?`;

        const db = db_model.openDB();
        const row = db.prepare(query).get(name);
        return Progression.fromRow(row);
    }


    /**
     * Retrieves the value of a progression by name.
     *
     * @memberof Progression
     * @method getValueFromName
     * @static
     *
     * @param {string} name - The name of the progression to retrieve the value of.
     * @returns {number} - The value of the progression with the given name.
     */
    static getValueFromName(name: string): number {
        const query = `SELECT value FROM progressions WHERE name = ?`;

        const db = db_model.openDB();
        const row = db.prepare(query).get(name);
        return Progression.fromRow(row).value;
    }


    /**
     * Retrieves a progression by ID.
     *
     * @memberof Progression
     * @method getProgressionFromId
     * @static
     *
     * @param {number} id - The ID of the progression to retrieve.
     * @returns {Progression} - The progression with the given ID.
     */
    static getProgressionFromId(id: number): Progression {
        const query = `SELECT * FROM progressions WHERE id = ?`;

        const db = db_model.openDB();
        const row = db.prepare(query).get(id);
        return Progression.fromRow(row);
    }


    /**
     * Retrieves the value of a progression by ID.
     *
     * @memberof Progression
     * @method getValueFromId
     * @static
     *
     * @param {number} id - The ID of the progression to retrieve the value of.
     * @returns {number} - The value of the progression with the given ID.
     */
    static getValueFromId(id: number): number {
        const query = `SELECT value FROM progressions WHERE id = ?`;

        const db = db_model.openDB();
        const row = db.prepare(query).get(id);
        return Progression.fromRow(row).value;
    }
}

export default Progression;
