import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Model name =====
const name = process.argv[2];
if (!name) throw new Error("Model name required");

// ===== Check for -m flag =====
const createMigration = process.argv.includes("-m");

console.log(`Model: ${name}`);

// ===== Create model =====
const modelFile = `
import { Model } from "../orm/Model.js";

export class ${name} extends Model {
  static table = "${name.toLowerCase()}s";
  static fillable = [];
}
`;

fs.writeFileSync(
    path.resolve("src/models", `${name}.js`),
    modelFile.trim()
);

console.log("✅ Model created:", name);

// ===== Create migration =====
if (createMigration) {
    const tableName = `${name.toLowerCase()}s`;

    console.log("⚡ Creating migration for:", tableName);

    // 🔥 Adjust path to where your migration script actually is
    const migrationScript = path.resolve(__dirname, "make-migration.js");

    spawnSync(
        "node",
        [migrationScript, tableName],
        { stdio: "inherit" }
    );
}
