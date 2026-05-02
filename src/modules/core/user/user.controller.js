import { pool } from "../../../config/database.js";
import {User} from "./model/User.js";  // Example Eloquent
const client = await pool.connect();  // Example basic

export const createUser = async ({ name, email, password }) => {
    const user = new User({ name: "John Doe", email: "john@example.com", password: "secret" });
    await user.save();
    console.log("Created:", user);

    return user;
};

export const getUsers = async () => {
    const user = new User({ name: "John Doe", email: "john@example.com", password: "secret" });
    await user.save();
    console.log("Created:", user);

    // const users = await User.where("status", "=", "active").paginate(10, 2);

    return user;
};

export const updateUser = async ({ id, name, email, password }) => {
    try {
        await client.query("BEGIN");

        await client.query(
            "UPDATE stock SET quantity = quantity - $1 WHERE product_id = $2",
            [qty, productId]
        );

        await client.query(
            "INSERT INTO journal (account_id, debit, credit) VALUES ($1, $2, $3)",
            [accountId, 0, amount]
        );

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }


    await User.where("status", "=", "inactive")
        .updateMany({ status: "active" });

    const user = await User.firstOrCreate(
        { email: "admin@example.com" },
        { name: "Admin", password: "secret" }
    );


}

/* EXAMPLE

// create
await User.create({
  name: "John",
  email: "john@mail.com",
  password: "secret"
});

// find
const user = await User.find(1);

// where
const users = await User.where("email", "LIKE", "%mail.com%").get();

// relationship
const accounts = await user.accounts();



 */
