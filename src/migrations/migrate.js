import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate() {
    const client = await pool.connect();

    await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    const applied = (await client.query(`SELECT name FROM migrations`))
        .rows.map(r => r.name);

    const files = fs.readdirSync(__dirname)
        .filter(f => f.endsWith(".js") && !["migrate.js", "schema.js"].includes(f))
        .sort();

    for (const file of files) {
        if (applied.includes(file)) continue;

        const migration = await import(`file://${path.join(__dirname, file)}`);
        await client.query("BEGIN");
        await migration.up(client);
        await client.query(`INSERT INTO migrations (name) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        console.log("Migrated:", file);
    }

    client.release();
}
