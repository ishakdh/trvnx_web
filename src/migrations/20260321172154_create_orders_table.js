import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("orders", table => {
    table.id();
    table.integer("customer_id");
    table.integer("user_id");
    table.string("order_type",50);
    table.integer("total_amount");
    table.integer("due_amount");
    table.integer("paid_amount");
    table.string("status",50);
    table.string("type",50);
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("orders", client);
}
