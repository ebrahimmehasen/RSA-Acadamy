/**
 * Applies SQL migration files from supabase/migrations in filename order.
 *
 * Usage:
 *   npx tsx scripts/db-apply.ts            # apply all pending
 *   npx tsx scripts/db-apply.ts 0002       # apply only files starting with 0002
 *
 * Requires SUPABASE_DB_URL in .env.local — the Postgres connection string
 * from Supabase Dashboard → Settings → Database → Connection string (URI).
 * Applied migrations are tracked in the _migrations table.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "SUPABASE_DB_URL is missing from .env.local.\n" +
        "Get it from Supabase Dashboard → Settings → Database → Connection string (URI).",
    );
    process.exit(1);
  }

  const only = process.argv[2];
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => !only || f.startsWith(only))
    .sort();

  if (files.length === 0) {
    console.log("No migration files matched.");
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(
      `create table if not exists public._migrations (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );

    for (const file of files) {
      const { rowCount } = await client.query(
        "select 1 from public._migrations where name = $1",
        [file],
      );
      if (rowCount) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }

      const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`apply ${file} ...`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into public._migrations (name) values ($1)",
          [file],
        );
        await client.query("commit");
        console.log(`ok    ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
