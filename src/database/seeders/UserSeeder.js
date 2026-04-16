import { DatabaseSeeder } from "./DatabaseSeeder.js";
import { User } from "../../models/User.js";
import {DB} from "../../orm/DB.js";

export class UserSeeder extends DatabaseSeeder {
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

        await DB.transaction(async () => {
            await User.create([
                {
                    name: "Admin User",
                    email: "admin@example.com",
                    password: "secret"
                },
                {
                    name: "Test User",
                    email: "test@example.com",
                    password: "secret"
                }
            ]);
        });

    }
}