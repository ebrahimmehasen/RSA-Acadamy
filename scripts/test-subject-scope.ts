/**
 * Run: npx tsx scripts/test-subject-scope.ts
 * Applies migration 0031 and exercises set_subject_branch_scope against the
 * real database INSIDE ONE TRANSACTION THAT IS ALWAYS ROLLED BACK — nothing
 * is persisted. Uses a class that has students in both branches and a pair
 * of throwaway subject rows (one per branch).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query("begin");
  try {
    await client.query(
      readFileSync(path.join("supabase", "migrations", "0031_subject_branch_scope.sql"), "utf8"),
    );
    await client.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`);
    await client.query(`select set_config('request.jwt.claim.role', 'service_role', true)`);

    // existing rows kept their behaviour
    const { rows: mismatched } = await client.query(
      "select count(*)::int as n from subjects where branch_scope <> branch",
    );
    assert.equal(mismatched[0].n, 0, "every existing subject keeps scope = own branch");

    const { rows: cls } = await client.query(`
      select class_id from students
      where branch in ('Arabic','Languages') and class_id is not null
      group by class_id
      having count(*) filter (where branch='Arabic') > 0 and count(*) filter (where branch='Languages') > 0
      limit 1`);
    if (cls.length === 0) {
      console.log("no class with students in both branches — only schema checks ran");
      return;
    }
    const classId: number = cls[0].class_id;
    const count = async (sql: string, params: unknown[] = []) =>
      (await client.query(sql, params)).rows[0].n as number;
    const arabic = await count(
      "select count(*)::int as n from students where class_id=$1 and branch='Arabic'", [classId]);
    const languages = await count(
      "select count(*)::int as n from students where class_id=$1 and branch='Languages'", [classId]);

    // a twin pair, inserted without branch_scope (trigger fills it in)
    await client.query(
      `insert into subjects (subject_id, subject_name, class_id, branch, subject_code)
       values ('ZZ_AR_SCOPETEST', 'مادة اختبار النطاق', $1, 'Arabic', 'SCOPETEST'),
              ('ZZ_EN_SCOPETEST', 'مادة اختبار النطاق', $1, 'Languages', 'SCOPETEST')`,
      [classId],
    );
    const scopeOf = async (id: string) =>
      (await client.query("select branch_scope, is_active from subjects where subject_id=$1", [id])).rows[0];
    assert.equal((await scopeOf("ZZ_AR_SCOPETEST")).branch_scope, "Arabic");

    // enroll each branch in its own row, the way auto-enrollment does
    await client.query(
      `insert into student_subjects (student_id, subject_id)
       select user_id, case branch when 'Arabic' then 'ZZ_AR_SCOPETEST' else 'ZZ_EN_SCOPETEST' end
       from students where class_id=$1 and branch in ('Arabic','Languages')`,
      [classId],
    );
    const active = (id: string, branch?: string) =>
      count(
        `select count(*)::int as n from student_subjects ss join students st on st.user_id=ss.student_id
         where ss.subject_id=$1 and ss.is_active ${branch ? "and st.branch=$2" : ""}`,
        branch ? [id, branch] : [id],
      );

    // 1. Arabic row → Both: Languages students move over, twin switched off
    let r = (await client.query("select set_subject_branch_scope('ZZ_AR_SCOPETEST','Both') as r")).rows[0].r;
    assert.deepEqual(r, { enrolled: languages, removed: 0 });
    assert.equal(await active("ZZ_AR_SCOPETEST"), arabic + languages);
    assert.equal(await active("ZZ_EN_SCOPETEST"), 0);
    assert.equal((await scopeOf("ZZ_EN_SCOPETEST")).is_active, false);

    // 2. idempotent
    r = (await client.query("select set_subject_branch_scope('ZZ_AR_SCOPETEST','Both') as r")).rows[0].r;
    assert.deepEqual(r, { enrolled: 0, removed: 0 });

    // 3. back to Arabic only: Languages students handed back to the twin
    r = (await client.query("select set_subject_branch_scope('ZZ_AR_SCOPETEST','Arabic') as r")).rows[0].r;
    assert.deepEqual(r, { enrolled: 0, removed: languages });
    assert.equal(await active("ZZ_AR_SCOPETEST"), arabic);
    assert.equal(await active("ZZ_EN_SCOPETEST", "Languages"), languages);
    assert.equal((await scopeOf("ZZ_EN_SCOPETEST")).is_active, true);

    // 4. new students follow the scope through auto-enrollment
    r = (await client.query("select set_subject_branch_scope('ZZ_AR_SCOPETEST','Both') as r")).rows[0].r;
    const { rows: oneLang } = await client.query(
      "select user_id from students where class_id=$1 and branch='Languages' limit 1", [classId]);
    await client.query("delete from student_subjects where student_id=$1 and subject_id like 'ZZ_%'", [oneLang[0].user_id]);
    await client.query("select enroll_student_in_class_subjects($1)", [oneLang[0].user_id]);
    assert.equal(
      await count(
        "select count(*)::int as n from student_subjects where student_id=$1 and subject_id='ZZ_AR_SCOPETEST' and is_active",
        [oneLang[0].user_id],
      ),
      1,
    );

    // 5. bad input is refused
    await assert.rejects(client.query("select set_subject_branch_scope('ZZ_AR_SCOPETEST','Everyone')"));

    console.log(`subject-scope: all checks passed (class ${classId}: ${arabic} Arabic, ${languages} Languages students)`);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
