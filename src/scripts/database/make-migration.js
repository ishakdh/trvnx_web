import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get table name
const tableName = process.argv[2];
if (!tableName) {
    console.error("❌ Please provide a table name");
    console.error("Example: npm run make:migration users --module=auth");
    process.exit(1);
}

// Get optional module name
const moduleArg = process.argv.find(arg => arg.startsWith("--module="));
const moduleName = moduleArg ? moduleArg.split("=")[1] : null;

// Timestamp for migration
const timestamp = new Date()
    .toISOString()
    .replace(/[-T:\.Z]/g, "")
    .slice(0, 14);

// Migration file name
const fileName = `${timestamp}_create_${tableName}_table.js`;

// Determine migration folder
let migrationsDir = path.join(__dirname, "../../migrations");
if (moduleName) {
    migrationsDir = path.join(migrationsDir, moduleName);
}

// Ensure directory exists
if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
}

const filePath = path.join(migrationsDir, fileName);

// Laravel-style migration template
const template = `import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("${tableName}", table => {
    table.id();
    table.string("name", 100);
    table.string("email", 150).unique();
    table.string("password");
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("${tableName}", client);
}
`;

// Write the file
fs.writeFileSync(filePath, template, { encoding: "utf8" });

console.log(`✅ Migration created: ${fileName} in module: ${moduleName || "core"}`);
