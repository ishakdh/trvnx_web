import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("products", table => {
    table.id();
    table.string("name", 100);
    table.integer("category_id");
    table.text("short_description").nullable();
    table.text("long_description").nullable();
    table.text("specification").nullable();
    table.decimal("buy_price",10,2);
    table.decimal("sell_price",10,2);
    table.decimal("discount_percent",10,2);
    table.string("status",50);
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("products", client);
}
