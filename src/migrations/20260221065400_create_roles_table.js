import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("roles", table => {
    table.id();
    table.string("name", 100);
    table.string("slug", 150);
    table.text("description");
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("roles", client);
}
