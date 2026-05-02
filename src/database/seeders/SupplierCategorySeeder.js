import { DatabaseSeeder } from "./DatabaseSeeder.js";
import { SupplierCategory } from "../../models/SupplierCategory.js";
import {DB} from "../../orm/DB.js";

export class SupplierCategorySeeder extends DatabaseSeeder {
    async run() {
        // await User.create([
        //     {
        //         name: "Admin User",
        //         email: "admin@example.com",
        //         password: "secret"
        //     },
        //     {
        //         name: "Test User",
        //         email: "test@example.com",
        //         password: "secret"
        //     }
        // ]);

    }
}