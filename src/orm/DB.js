import { pool } from "../config/database.js";

export class DB {
    static async transaction(callback) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await callback(client);
            await client.query("COMMIT");
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    }
}
