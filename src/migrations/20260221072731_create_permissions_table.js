import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("permissions", table => {
    table.id();
    table.string("name", 100);
    table.string("slug", 150).unique();
    table.string("module",50);
    table.text("description");
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("permissions", client);
}
