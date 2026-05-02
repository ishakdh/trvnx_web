import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("users", table => {
    table.id();
    table.string("name", 100);
    table.string("email", 150).unique();
    table.string("type", 50);
    table.text("address").nullable();
    table.string("area",50).nullable();
    table.string("city",50).nullable();
    table.string("post_code",50).nullable();
    table.string("police_station",50).nullable();
    table.string("password",50);
    table.string("status",50);
    table.string("email_verified_at",50).nullable();
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("users", client);
}
