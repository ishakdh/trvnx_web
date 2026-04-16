import { DatabaseSeeder } from "./DatabaseSeeder.js";
import { UserSeeder } from "./UserSeeder.js";
import {SupplierCategorySeeder} from "./SupplierCategorySeeder.js";

export class DatabaseSeederRunner extends DatabaseSeeder {
    async run() {
        await this.call(UserSeeder);
        await this.call(SupplierCategorySeeder);
    }
}
