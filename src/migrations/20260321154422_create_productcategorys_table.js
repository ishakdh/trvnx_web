import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("product_categories", table => {
    table.id();
    table.string("name", 100);
    table.integer("parent_id");
    table.string("status",50);
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("product_categories", client);
}
