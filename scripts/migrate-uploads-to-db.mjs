import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to migrate uploaded images.");
}

const contentTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
]);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const failures = [];
let migrated = 0;

try {
  const { rows } = await client.query(
    'SELECT "id", "url" FROM "asset_images" WHERE "url" LIKE \'/uploads/%\' ORDER BY "id"',
  );

  for (const image of rows) {
    const fileName = path.basename(image.url);
    const contentType = contentTypes.get(path.extname(fileName).toLowerCase());
    if (!contentType || image.url !== `/uploads/${fileName}`) {
      failures.push(`Image ${image.id} has an unsupported upload path or file type: ${image.url}`);
      continue;
    }

    let data;
    try {
      data = await readFile(path.join(process.cwd(), "public", "uploads", fileName));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      failures.push(`Image ${image.id} is missing public/uploads/${fileName}.`);
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(
        'INSERT INTO "asset_image_data" ("assetImageId", "contentType", "data") VALUES ($1, $2, $3) ON CONFLICT ("assetImageId") DO UPDATE SET "contentType" = EXCLUDED."contentType", "data" = EXCLUDED."data"',
        [image.id, contentType, data],
      );
      await client.query(
        'UPDATE "asset_images" SET "url" = $1 WHERE "id" = $2',
        [`/api/images/${image.id}`, image.id],
      );
      await client.query("COMMIT");
      migrated += 1;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.info(`Migrated ${migrated} uploaded image(s) to the database.`);
  for (const failure of failures) {
    console.error(`[Image migration] ${failure}`);
  }
  if (failures.length > 0) process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
