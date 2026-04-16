import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsRoot = path.join(__dirname, "../migrations");

const args = process.argv.slice(2);

// CLI FLAGS
const stepArg = args.find(a => a.startsWith("--step="));
const fileArg = args.find(a => a.startsWith("--file="));
const dryRun = args.includes("--dry-run");

const steps = stepArg ? Number(stepArg.split("=")[1]) : 1;
const targetFile = fileArg ? fileArg.split("=")[1] : null;

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function rollback() {
    await client.connect();

    let query = `
    SELECT name FROM migrations
    ORDER BY executed_at DESC
  `;

    if (targetFile) {
        query += ` WHERE name = '${targetFile}'`;
    } else {
        query += ` LIMIT ${steps}`;
    }

    const { rows } = await client.query(query);

    if (!rows.length) {
        console.log("⚠️ No migrations to rollback");
        process.exit(0);
    }

    for (const row of rows) {
        const migrationName = row.name;
        const migrationPath = findMigration(migrationName);

        if (!migrationPath) {
            console.error(`❌ Migration not found: ${migrationName}`);
            continue;
        }

        console.log(`⏪ Rolling back: ${migrationName}`);
        if (dryRun) continue;

        const migration = await import(`file://${migrationPath}`);

        try {
            await client.query("BEGIN");
            await migration.down(client);
            await client.query(`DELETE FROM migrations WHERE name=$1`, [migrationName]);
            await client.query("COMMIT");
            console.log(`✅ Rolled back: ${migrationName}`);
        } catch (err) {
            await client.query("ROLLBACK");
            console.error(`❌ Failed: ${migrationName}`, err);
            process.exit(1);
        }
    }

    if (dryRun) {
        console.log("🧪 Dry-run completed (no DB changes)");
    }

    await client.end();
}

function findMigration(fileName) {
    const modules = fs.readdirSync(migrationsRoot);
    for (const module of modules) {
        const filePath = path.join(migrationsRoot, module, fileName);
        if (fs.existsSync(filePath)) return filePath;
    }
    return null;
}

rollback();
