import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("order_items", table => {
    table.id();
    table.integer("order_id");
    table.integer("product_id");
    table.integer("unit_price");
    table.integer("quantity");
    table.integer("total_price");
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("order_items", client);
}
