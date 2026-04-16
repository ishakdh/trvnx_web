import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("transactions", table => {
    table.id();
    table.integer("customer_id");
    table.integer("order_item_id").nullable();
    table.string("particular", 200);
    table.string("keyword", 50);
    table.integer("amount");
    table.integer("cumulative_amount");
    table.string("type",50);
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("transactions", client);
}
