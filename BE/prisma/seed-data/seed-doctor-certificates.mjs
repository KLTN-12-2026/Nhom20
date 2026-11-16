import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

const digest = (value) => createHash('sha256').update(value).digest('hex');

// Không suy luận chứng chỉ từ học vị, chuyên khoa hay tên bác sĩ.
export function makePlan(entries, doctors, schemaReady) {
  if (!Array.isArray(entries))
    throw new Error('Danh sách đầu vào phải là mảng');
  const existing = new Map(doctors.map((doctor) => [doctor.code, doctor]));
  const seen = new Set();
  const details = entries.map((entry) => {
    if (!entry || typeof entry.maBacSi !== 'string' || !entry.maBacSi.trim()) {
      throw new Error('Mỗi dòng phải có mã bác sĩ hợp lệ');
    }
    const code = entry.maBacSi.trim();
    if (seen.has(code)) throw new Error(`Mã bác sĩ bị trùng: ${code}`);
    seen.add(code);
    const doctor = existing.get(code);
    if (!doctor) return { code, reason: 'không khớp mã bác sĩ' };
    if (entry.daPheDuyet !== true) return { code, reason: 'chưa duyệt' };
    if (
      typeof entry.chungChiDuKien !== 'string' ||
      !entry.chungChiDuKien.trim() ||
      typeof entry.nguon !== 'string' ||
      !entry.nguon.trim()
    ) {
      throw new Error(`Bản ghi đã duyệt thiếu chứng chỉ hoặc nguồn: ${code}`);
    }
    const certificate = entry.chungChiDuKien.trim();
    if ([...certificate].length > 255)
      throw new Error(`Chứng chỉ quá 255 ký tự: ${code}`);
    if (!schemaReady) return { code, reason: 'chưa có cột chứng chỉ' };
    if (doctor.certificate?.trim()) return { code, reason: 'đã có chứng chỉ' };
    return {
      code,
      certificate,
      source: entry.nguon.trim(),
      reason: 'sẽ cập nhật',
    };
  });
  return {
    totalDoctors: doctors.length,
    details,
    candidates: details.filter((item) => item.reason === 'sẽ cập nhật'),
  };
}

export async function runSeed(
  client,
  entries,
  { apply = false, target, confirmTarget, confirmPlan, approved = false } = {},
) {
  await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
  try {
    const schema = await client.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='bac_si' AND column_name='chung_chi') AS ready",
    );
    const schemaReady = schema.rows[0].ready;
    const certificateSql = schemaReady ? 'b.chung_chi' : 'NULL::text';
    const rows = await client.query(
      `SELECT b.ma_bac_si AS code, b.ho_ten AS name, k.ten_chuyen_khoa AS specialty, ${certificateSql} AS certificate FROM bac_si b JOIN chuyen_khoa k ON k.id=b.chuyen_khoa_id ORDER BY b.ma_bac_si`,
    );
    const plan = makePlan(entries, rows.rows, schemaReady);
    const planHash = digest(
      JSON.stringify({ target, candidates: plan.candidates }),
    );
    if (apply) {
      if (!schemaReady) throw new Error('Chưa có cột chứng chỉ; không ghi');
      if (
        !approved ||
        !target ||
        confirmTarget !== target ||
        confirmPlan !== planHash
      ) {
        throw new Error(
          'Thiếu xác nhận đích, mã kế hoạch dry-run hoặc phê duyệt',
        );
      }
      for (const candidate of plan.candidates) {
        // Điều kiện này ngăn ghi đè chứng chỉ đã được cập nhật sau dry-run.
        const result = await client.query(
          "UPDATE bac_si SET chung_chi=$1 WHERE ma_bac_si=$2 AND (chung_chi IS NULL OR btrim(chung_chi)='')",
          [candidate.certificate, candidate.code],
        );
        if (result.rowCount !== 1)
          throw new Error(
            `Dữ liệu đã thay đổi, dừng toàn bộ: ${candidate.code}`,
          );
      }
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
    return {
      schemaReady,
      target,
      planHash,
      totalDoctors: plan.totalDoctors,
      candidates: plan.candidates.length,
      skipped: plan.details.length - plan.candidates.length,
      updated: apply ? plan.candidates.length : 0,
      details: plan.details,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  config({ path: '.env', quiet: true });
  const args = process.argv.slice(2);
  const option = (prefix) =>
    args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const apply = args.includes('--apply');
  if (apply && args.includes('--dry-run'))
    throw new Error('Không dùng đồng thời --apply và --dry-run');
  if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL');
  const path = option('--file=');
  if (!path) throw new Error('Cần --file=<file JSON>');
  const input = JSON.parse(await readFile(resolve(path), 'utf8'));
  const parsed = new URL(process.env.DATABASE_URL);
  const target = digest(
    `${parsed.hostname.toLowerCase()}:${parsed.port || '5432'}${parsed.pathname}`,
  );
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const actual = await client.query('SELECT current_database() AS db');
    if (decodeURIComponent(parsed.pathname.slice(1)) !== actual.rows[0].db)
      throw new Error('Database thực tế không khớp cấu hình');
    const result = await runSeed(client, input, {
      apply,
      target,
      confirmTarget: option('--confirm-target='),
      confirmPlan: option('--confirm-plan='),
      approved: args.includes('--approved'),
    });
    console.log(
      JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...result }, null, 2),
    );
  } finally {
    await client.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`Không thực hiện seed: ${error.code || error.message}`);
    process.exitCode = 1;
  });
}
