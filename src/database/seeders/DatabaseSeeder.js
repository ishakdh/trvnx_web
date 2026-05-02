export class DatabaseSeeder {
    async run() {
        throw new Error("Seeder run() method not implemented");
    }

    async call(SeederClass) {
        const seeder = new SeederClass();
        console.log(`🌱 Seeding: ${SeederClass.name}`);
        await seeder.run();
    }
}
