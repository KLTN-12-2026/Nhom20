import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

// Hai dịch vụ demo đã được chủ dự án duyệt; không dùng làm bảng giá thực tế.
export const TARGET = Object.freeze({
  database: 'smart_clinic', project: 'solitary-firefly-31944589', branch: 'br-shiny-art-az888jre',
});
export const XRAY = Object.freeze({
  ma_dich_vu: 'CLS_XQ_NGUC', ten_dich_vu: 'Chụp X-quang ngực thẳng',
  mo_ta: 'Dịch vụ mô phỏng phục vụ demo khóa luận; giá minh họa, không phải bảng giá khám chữa bệnh thực tế.',
  don_gia: '200000.00', chuyen_khoa_id: null, thoi_gian_du_kien_phut: null,
  trang_thai: 'DANG_HOAT_DONG', loai_dich_vu: 'CAN_LAM_SANG',
});
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function assertTarget(identity) {
  if (!Object.entries(TARGET).every(([key, value]) => identity[key] === value))
    throw new Error('TARGET_MISMATCH');
}

export function planServices(rows) {
  const blood = rows.filter((r) => r.ma_dich_vu === 'DV002');
  if (blood.length !== 1 || blood[0].ten_dich_vu !== 'Xét nghiệm công thức máu' ||
      Number(blood[0].don_gia) !== 150000 || blood[0].chuyen_khoa_id !== null ||
      blood[0].trang_thai !== 'DANG_HOAT_DONG' ||
      ![null, 'CAN_LAM_SANG'].includes(blood[0].loai_dich_vu))
    throw new Error('BLOOD_SERVICE_CONFLICT');
  const xray = rows.filter((r) => r.ma_dich_vu === XRAY.ma_dich_vu ||
    r.ten_dich_vu.trim().toLocaleLowerCase('vi') === XRAY.ten_dich_vu.toLocaleLowerCase('vi'));
  if (xray.length > 1 || (xray.length === 1 && !Object.entries(XRAY).every(([key, value]) =>
    key === 'don_gia' ? Number(xray[0][key]) === Number(value) : xray[0][key] === value)))
    throw new Error('XRAY_SERVICE_CONFLICT');
  return { classifyBlood: blood[0].loai_dich_vu === null, insertXray: xray.length === 0 };
}

export function verifyChanges(before, after, plan) {
  if (after.length !== before.length + Number(plan.insertXray)) throw new Error('COUNT_MISMATCH');
  for (const row of before) {
    const expected = { ...row };
    if (row.ma_dich_vu === 'DV002' && plan.classifyBlood) expected.loai_dich_vu = 'CAN_LAM_SANG';
    if (!same(expected, after.find((r) => r.id === row.id))) throw new Error('UNEXPECTED_DATA_CHANGE');
  }
  const next = planServices(after);
  if (next.classifyBlood || next.insertXray) throw new Error('NOT_IDEMPOTENT');
}

export async function run(args) {
  const apply = args.includes('--apply');
  const confirm = args.find((a) => a.startsWith('--confirm='))?.slice('--confirm='.length);
  if (args.some((a) => a !== '--apply' && a !== '--dry-run' && !a.startsWith('--confirm=')) ||
      (apply && args.includes('--dry-run'))) throw new Error('INVALID_ARGUMENTS');
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
  const env = dotenv.parse(fs.readFileSync(envPath));
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.DATABASE_URL,
    connectionTimeoutMillis: 10000, query_timeout: 20000 });
  let committed = false;
  try {
    await db.connect();
    await db.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
    await db.query("SET LOCAL lock_timeout = '5s'");
    await db.query("SET LOCAL statement_timeout = '15s'");
    const identity = (await db.query("SELECT current_database() AS database, current_setting('neon.project_id', true) AS project, current_setting('neon.branch_id', true) AS branch")).rows[0];
    assertTarget(identity);
    // Chặn thay đổi danh mục đồng thời trong transaction seed ngắn, không khóa bảng khám/thuốc.
    if (apply) await db.query('LOCK TABLE public.dich_vu IN SHARE ROW EXCLUSIVE MODE');
    const read = async () => (await db.query('SELECT * FROM public.dich_vu ORDER BY id')).rows;
    const before = await read();
    const plan = planServices(before);
    const confirmation = hash({ identity, before, plan, proposed: XRAY });
    console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', identity, totalBefore: before.length, plan, confirmation }));
    if (!apply) { await db.query('ROLLBACK'); return; }
    if (confirm !== confirmation) throw new Error('CONFIRMATION_MISMATCH');
    // Lưu và đọc kiểm tra backup trước mọi ghi dữ liệu; không chứa connection string.
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartclinic-cls-'));
    const backupPath = path.join(backupDir, 'services-before.json');
    const backup = { identity, createdAt: new Date().toISOString(), rows: before, plan };
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), { flag: 'wx', mode: 0o600 });
    if (!same(JSON.parse(fs.readFileSync(backupPath, 'utf8')).rows, JSON.parse(JSON.stringify(before))))
      throw new Error('BACKUP_VERIFICATION_FAILED');
    console.log(JSON.stringify({ backupPath, backupVerified: true }));
    if (plan.classifyBlood) {
      const result = await db.query("UPDATE public.dich_vu SET loai_dich_vu = 'CAN_LAM_SANG' WHERE ma_dich_vu = $1 AND loai_dich_vu IS NULL AND ten_dich_vu = $2 AND don_gia = $3 RETURNING id",
        ['DV002', 'Xét nghiệm công thức máu', 150000]);
      if (result.rowCount !== 1) throw new Error('BLOOD_UPDATE_CONFLICT');
    }
    if (plan.insertXray) {
      await db.query(`INSERT INTO public.dich_vu
        (ma_dich_vu, ten_dich_vu, mo_ta, don_gia, chuyen_khoa_id, thoi_gian_du_kien_phut, trang_thai, loai_dich_vu, updated_at)
        VALUES ($1, $2, $3, $4, NULL, NULL, 'DANG_HOAT_DONG', 'CAN_LAM_SANG', CURRENT_TIMESTAMP)`,
      [XRAY.ma_dich_vu, XRAY.ten_dich_vu, XRAY.mo_ta, XRAY.don_gia]);
    }
    verifyChanges(before, await read(), plan);
    await db.query('COMMIT'); committed = true;
    await db.query('BEGIN READ ONLY');
    const after = await read();
    verifyChanges(before, after, plan);
    console.log(JSON.stringify({ result: 'SEED_PASS', totalAfter: after.length,
      classified: Number(plan.classifyBlood), inserted: Number(plan.insertXray),
      otherServiceFieldsUnchanged: true, readback: after.filter((r) => ['DV002', XRAY.ma_dich_vu].includes(r.ma_dich_vu)) }));
    await db.query('ROLLBACK');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    // Không in message từ driver vì có thể lộ thông tin kết nối.
    console.error(JSON.stringify({ result: 'FAILED', committed,
      reason: /^[A-Z_]+$/.test(error.message) ? error.message : 'DATABASE_OR_FILE_ERROR', code: error.code }));
    process.exitCode = 1;
  } finally { await db.end(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch(() => { console.error('SEED_START_FAILED'); process.exitCode = 1; });
}
