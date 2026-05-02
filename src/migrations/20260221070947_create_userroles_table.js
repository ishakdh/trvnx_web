import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("user_roles", table => {
    table.id();
    table.bigInteger("user_id");
    table.string("role_id",);
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("user_roles", client);
}
