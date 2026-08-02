/**
 * Seeds the subjects catalog (243 subjects) from subjects_database.json.
 * Idempotent: upserts on subject_id.
 *
 * Usage: npx tsx scripts/seed-subjects.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

interface SubjectRecord {
  id: string;
  name: string;
  class_name: string;
  class_short: string;
  branch: "Arabic" | "Languages";
  code: string;
}

async function main() {
  const raw = readFileSync(
    path.join(process.cwd(), "subjects_database.json"),
    "utf8",
  );
  const data = JSON.parse(raw) as { subjects: SubjectRecord[] };
  console.log(`loaded ${data.subjects.length} subjects from JSON`);

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const { rows: classes } = await client.query<{
      id: number;
      class_short: string;
    }>("select id, class_short from public.classes");
    const classIdByShort = new Map(classes.map((c) => [c.class_short, c.id]));

    let inserted = 0;
    let skipped = 0;
    await client.query("begin");
    for (const subject of data.subjects) {
      const classId = classIdByShort.get(subject.class_short);
      if (!classId) {
        console.warn(`no class for ${subject.class_short} (${subject.id})`);
        skipped++;
        continue;
      }
      const result = await client.query(
        `insert into public.subjects
           (subject_id, subject_name, class_id, branch, subject_code)
         values ($1, $2, $3, $4, $5)
         on conflict (subject_id) do update
           set subject_name = excluded.subject_name,
               class_id = excluded.class_id,
               branch = excluded.branch,
               subject_code = excluded.subject_code`,
        [subject.id, subject.name, classId, subject.branch, subject.code],
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("commit");

    const { rows } = await client.query(
      "select count(*)::int as n from public.subjects",
    );
    console.log(
      `done: ${inserted} upserted, ${skipped} skipped, total in DB: ${rows[0].n}`,
    );
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
