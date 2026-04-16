import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("licenses", table => {
    table.id();
    table.integer("order_item_id");
    table.string("license_key",150).unique();
    table.string("status",50);
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("licenses", client);
}
