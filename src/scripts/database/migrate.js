import { migrate } from "../../migrations/migrate.js";

await migrate();
process.exit(0);