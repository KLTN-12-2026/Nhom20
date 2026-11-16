import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import pg from 'pg';
import { runSeed } from './seed-doctor-certificates.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const migrationName = '20261116000000_add_doctor_certificate';
const args = process.argv.slice(2);
const option = (key) =>
  args.find((arg) => arg.startsWith(`${key}=`))?.slice(key.length + 1);
const apply = args.includes('--apply');
config({ quiet: true });
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

// Chỉ triển khai thay đổi chứng chỉ đã được duyệt, không chạy các migration khác.
async function snapshot() {
  const result = await client.query(
    'SELECT to_jsonb(b) AS value FROM public.bac_si b ORDER BY id',
  );
  return result.rows.map((row) => row.value);
}

async function unrelated() {
  const result = {};
  for (const table of [
    'nguoi_dung',
    'chuyen_khoa',
    'lich_hen',
    'ho_so_kham',
    'luot_kham',
  ]) {
    const rows = await client.query(
      `SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, '' ORDER BY id), '')) AS hash, count(*)::int AS count FROM public.${table} t`,
    );
    result[table] = rows.rows[0];
  }
  return result;
}

async function main() {
  await client.connect();
  const identity = (
    await client.query(
      "SELECT current_database() AS db, current_setting('neon.project_id', true) AS project, current_setting('neon.branch_id', true) AS branch",
    )
  ).rows[0];
  if (
    identity.db !== 'smart_clinic' ||
    identity.project !== option('--project') ||
    identity.branch !== option('--branch')
  )
    throw new Error('Sai định danh database/project/branch');
  const entries = JSON.parse(
    await readFile(
      resolve('prisma/seed-data/doctor-certificates.demo.json'),
      'utf8',
    ),
  );
  if (
    entries.length !== 56 ||
    new Set(entries.map((entry) => entry.maBacSi)).size !== 56 ||
    entries.some(
      (entry) =>
        entry.daPheDuyet !== true ||
        !entry.nguon.startsWith('DEMO') ||
        !entry.chungChiDuKien.startsWith('Mô phỏng, chưa xác minh:'),
    )
  )
    throw new Error('Dữ liệu demo không đủ điều kiện');
  const sql = await readFile(
    resolve(`prisma/migrations/${migrationName}/migration.sql`),
    'utf8',
  );
  if (
    sql.replace(/--[^\n]*/g, '').trim() !==
    'ALTER TABLE "bac_si" ADD COLUMN "chung_chi" VARCHAR(255);'
  )
    throw new Error('Migration không đúng phạm vi');
  const before = await snapshot();
  if (
    before.length !== 56 ||
    entries.some(
      (entry) =>
        !before.some(
          (row) =>
            row.ma_bac_si === entry.maBacSi && row.ho_ten === entry.hoTen,
        ),
    )
  )
    throw new Error('Không khớp 56 hồ sơ');
  const othersBefore = await unrelated();
  const schema =
    (
      await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='bac_si' AND column_name='chung_chi'",
      )
    ).rowCount > 0;
  const backupDir = await mkdtemp(join(tmpdir(), 'smartclinic-v243-backup-'));
  const backupPath = join(backupDir, 'doctors-before.json');
  const backup = JSON.stringify({
    identity,
    generatedAt: new Date().toISOString(),
    schemaHadCertificate: schema,
    doctors: before,
    unrelated: othersBefore,
  });
  await writeFile(backupPath, backup, { flag: 'wx', mode: 0o600 });
  if (hash(await readFile(backupPath, 'utf8')) !== hash(backup))
    throw new Error('Kiểm tra đọc lại backup thất bại');
  console.log(
    JSON.stringify({
      backupPath,
      backupVerified: true,
      doctorsBefore: before.length,
    }),
  );

  // Bản sao tạm chỉ tồn tại trong phiên này; không sửa dữ liệu bảng public khi thử.
  await client.query(
    'CREATE TEMP TABLE bac_si (LIKE public.bac_si INCLUDING ALL)',
  );
  const restoredBackup = JSON.parse(await readFile(backupPath, 'utf8'));
  await client.query(
    'INSERT INTO pg_temp.bac_si SELECT * FROM jsonb_populate_recordset(NULL::pg_temp.bac_si, $1::jsonb)',
    [JSON.stringify(restoredBackup.doctors)],
  );
  await client.query('SET search_path TO pg_temp, public');
  if (!schema) await client.query(sql);
  const tempTarget = 'isolated-session-test';
  const dryTest = await runSeed(client, entries, { target: tempTarget });
  if (!dryTest.schemaReady) throw new Error('Không tìm thấy schema bảng tạm');
  const appliedTest = await runSeed(client, entries, {
    apply: true,
    target: tempTarget,
    confirmTarget: tempTarget,
    confirmPlan: dryTest.planHash,
    approved: true,
  });
  const repeatTest = await runSeed(client, entries, { target: tempTarget });
  if (repeatTest.candidates !== 0) throw new Error('Test idempotency thất bại');
  await client.query('SET search_path TO public');
  await client.query('DROP TABLE pg_temp.bac_si');
  if (hash(JSON.stringify(await snapshot())) !== hash(JSON.stringify(before)))
    throw new Error('Bảng thật thay đổi trong test');
  console.log(
    JSON.stringify({
      isolatedTempTableTest: 'PASS',
      testUpdated: appliedTest.updated,
      secondTestCandidates: repeatTest.candidates,
    }),
  );
  if (!apply) {
    console.log('Chưa apply: dùng --apply sau khi phê duyệt');
    return;
  }

  if (!schema) {
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL statement_timeout='30s'");
      await client.query('LOCK TABLE public.bac_si IN ACCESS EXCLUSIVE MODE');
      if (
        hash(JSON.stringify(await snapshot())) !== hash(JSON.stringify(before))
      )
        throw new Error('Bảng bác sĩ đã đổi sau backup');
      const ledger = await client.query(
        'SELECT id FROM public._prisma_migrations WHERE migration_name=$1 AND rolled_back_at IS NULL',
        [migrationName],
      );
      if (ledger.rowCount)
        throw new Error('Migration đã có bản ghi, cần kiểm tra');
      await client.query(sql);
      await client.query(
        'INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ($1,$2,now(),$3,NULL,NULL,now(),1)',
        [randomUUID(), hash(sql), migrationName],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  const target = hash(JSON.stringify(identity));
  const dry = await runSeed(client, entries, { target });
  console.log(
    JSON.stringify({
      realDryRun: { candidates: dry.candidates, skipped: dry.skipped },
    }),
  );
  const applied = await runSeed(client, entries, {
    apply: true,
    target,
    confirmTarget: target,
    confirmPlan: dry.planHash,
    approved: true,
  });
  const after = await snapshot();
  const finalDry = await runSeed(client, entries, { target });
  const changedCodes = new Set(
    dry.details
      .filter((item) => item.reason === 'sẽ cập nhật')
      .map((item) => item.code),
  );
  const clean = (rows) => rows.map(({ chung_chi, ...rest }) => rest);
  if (
    after.length !== 56 ||
    JSON.stringify(clean(after)) !== JSON.stringify(clean(before))
  )
    throw new Error('Dữ liệu bác sĩ ngoài chứng chỉ không khớp');
  if (
    after.some(
      (row) =>
        changedCodes.has(row.ma_bac_si) &&
        row.chung_chi !==
          entries.find((entry) => entry.maBacSi === row.ma_bac_si)
            .chungChiDuKien,
    )
  )
    throw new Error('Chứng chỉ đọc lại không khớp');
  const othersAfter = await unrelated();
  if (JSON.stringify(othersBefore) !== JSON.stringify(othersAfter))
    throw new Error(
      'Dữ liệu ngoài phạm vi đã thay đổi; cần đối soát, không tự ghi đè',
    );
  if (finalDry.candidates !== 0)
    throw new Error('Dry-run sau ghi còn ứng viên');
  console.log(
    JSON.stringify({
      migration: schema ? 'already present' : migrationName,
      updated: applied.updated,
      skipped: applied.skipped,
      doctorsAfter: after.length,
      certifiedDoctors: after.filter((row) => row.chung_chi?.trim()).length,
      readBackVerified: true,
      unrelatedVerified: true,
      finalCandidates: finalDry.candidates,
    }),
  );
}

main()
  .catch((error) => {
    console.error(`Deployment stopped: ${error.code || error.message}`);
    process.exitCode = 1;
  })
  .finally(() => client.end());
