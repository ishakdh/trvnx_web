import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("payments", table => {
    table.id();
    table.integer("customer_id");
    table.integer("order_id").nullable();
    table.integer("order_item_id").nullable();
    table.integer("amount");
    table.integer("user_id");
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("payments", client);
}
