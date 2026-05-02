import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("permission_roles", table => {
    table.id();
    table.string("name",150);
    table.string("slug",150);
    table.string("module",150);
    table.text("description");
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("permission_roles", client);
}
