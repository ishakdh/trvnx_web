import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("installments", table => {
    table.id();
    table.integer("order_item_id");
    table.decimal("installment_amount", 10,2);
    table.string("due_date",50);
    table.string("secret_code",50);
    table.string("status",50);
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("installments", client);
}
