import { DatabaseSeederRunner } from "../../database/seeders/DatabaseSeederRunner.js";

try {
    const seeder = new DatabaseSeederRunner();
    await seeder.run();
    console.log("✅ Database seeding completed");
    process.exit(0);
} catch (err) {
    console.error("❌ Seeding failed", err);
    process.exit(1);
}
