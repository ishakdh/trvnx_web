import { Schema } from "./database/schema.js";

export async function up(client) {
  await Schema.create("product_images", table => {
    table.id();
    table.string("name", 100);
    table.string("image_url", 150);
    table.string("extension");
    table.string("height");
    table.string("width");
    table.string("type");
    table.timestamps();
  }, client);
}

export async function down(client) {
  await Schema.dropIfExists("product_images", client);
}
