import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlan, runSeed } from './seed-doctor-certificates.mjs';

const entry = (code, certificate = 'Dữ liệu mô phỏng kiểm thử') => ({
  maBacSi: code,
  chungChiDuKien: certificate,
  nguon: 'fixture test',
  daPheDuyet: true,
});

function fakeClient(initial, ready = true) {
  let rows = structuredClone(initial);
  let snapshot;
  let writes = 0;
  return {
    get rows() {
      return rows;
    },
    get writes() {
      return writes;
    },
    async query(sql, args) {
      if (sql.startsWith('BEGIN')) {
        snapshot = structuredClone(rows);
        return {};
      }
      if (sql === 'ROLLBACK') {
        rows = snapshot;
        return {};
      }
      if (sql === 'COMMIT') return {};
      if (sql.includes('information_schema.columns'))
        return { rows: [{ ready }] };
      if (sql.startsWith('SELECT b.ma_bac_si'))
        return { rows: structuredClone(rows) };
      if (sql.startsWith('UPDATE bac_si')) {
        writes++;
        const row = rows.find((item) => item.code === args[1]);
        if (
          !row ||
          (args.length === 3
            ? row.certificate !== args[2]
            : row.certificate?.trim())
        )
          return { rowCount: 0 };
        row.certificate = args[0];
        return { rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

test('dry-run không ghi; phân biệt có sẵn, không duyệt và sai mã', async () => {
  const client = fakeClient([
    { code: 'A', certificate: null },
    { code: 'B', certificate: 'Có sẵn' },
  ]);
  const result = await runSeed(
    client,
    [entry('A'), entry('B'), entry('C'), { maBacSi: 'B2', daPheDuyet: false }],
    { target: 'test' },
  );
  assert.equal(result.candidates, 1);
  assert.equal(result.skipped, 3);
  assert.equal(client.writes, 0);
  assert.equal(client.rows[0].certificate, null);
});

const oldCertificate = 'Mô phỏng, chưa xác minh: chuyên môn Nội tổng quát';
const newCertificate = 'Đào tạo điện tâm đồ cơ bản';
const replacement = (code = 'A') => ({
  ...entry(code, newCertificate),
  chungChiHienTai: oldCertificate,
  duLieuDemoDaXacNhan: true,
  nguon: 'DEMO - fixture kiểm thử',
});
const correctionMode = { replaceDemo: true, target: 'test' };

test('cập nhật tên đào tạo demo cũ khớp chính xác, bỏ cơ bản', async () => {
  const oldValue = 'Đào tạo điện tâm đồ cơ bản';
  const client = fakeClient([{ code: 'A', certificate: oldValue }]);
  const input = [{ ...replacement(), chungChiHienTai: oldValue, chungChiDuKien: 'Đào tạo điện tâm đồ' }];
  const dry = await runSeed(client, input, correctionMode);
  assert.equal(dry.candidates, 1);
  const result = await runSeed(client, input, { ...correctionMode, apply: true, confirmTarget: 'test', confirmPlan: dry.planHash, approved: true });
  assert.equal(result.updated, 1);
  assert.equal(client.rows[0].certificate, 'Đào tạo điện tâm đồ');
});
const approvedCorrection = (dry) => ({
  ...correctionMode,
  apply: true,
  confirmTarget: 'test',
  confirmPlan: dry.planHash,
  approved: true,
});

test('chỉ thay đúng seed cũ; chứng chỉ nhập thủ công được bảo toàn, mã sai bỏ qua', async () => {
  const client = fakeClient([
    { code: 'A', certificate: oldCertificate },
    { code: 'B', certificate: 'Nội dung nhập thủ công' },
  ]);
  const input = [replacement('A'), replacement('B'), replacement('C')];
  const dry = await runSeed(client, input, correctionMode);
  assert.equal(dry.candidates, 1);
  assert.equal(dry.conflicts, 1);
  assert.equal(dry.details[0].beforeCertificate, oldCertificate);
  assert.equal(dry.details[0].certificate, newCertificate);
  const applied = await runSeed(client, input, approvedCorrection(dry));
  assert.equal(applied.updated, 1);
  assert.equal(client.rows[1].certificate, 'Nội dung nhập thủ công');
});

test('không phê duyệt thì chỉ lập kế hoạch, không chọn cập nhật', async () => {
  const client = fakeClient([{ code: 'A', certificate: oldCertificate }]);
  const dry = await runSeed(
    client,
    [{ ...replacement(), daPheDuyet: false }],
    correctionMode,
  );
  assert.equal(dry.pendingApproval, 1);
  assert.equal(dry.candidates, 0);
  assert.equal(client.writes, 0);
});

test('giá trị cũ đổi sau dry-run làm vô hiệu mã kế hoạch, không ghi đè', async () => {
  const client = fakeClient([{ code: 'A', certificate: oldCertificate }]);
  const dry = await runSeed(client, [replacement()], correctionMode);
  client.rows[0].certificate = 'Chỉnh thủ công sau dry-run';
  await assert.rejects(
    runSeed(client, [replacement()], approvedCorrection(dry)),
    /xác nhận/,
  );
  assert.equal(client.writes, 0);
  assert.equal(client.rows[0].certificate, 'Chỉnh thủ công sau dry-run');
});

test('chạy lại correction không cập nhật thêm và không đổi trường ngoài chứng chỉ', async () => {
  const record = {
    code: 'A',
    certificate: oldCertificate,
    name: 'Nguyễn Văn A',
    degree: 'Bác sĩ',
    specialty: 'Nội tổng quát',
    userId: 123,
  };
  const client = fakeClient([record]);
  const dry = await runSeed(client, [replacement()], correctionMode);
  await runSeed(client, [replacement()], approvedCorrection(dry));
  const next = await runSeed(client, [replacement()], correctionMode);
  assert.equal(next.candidates, 0);
  assert.equal(
    (await runSeed(client, [replacement()], approvedCorrection(next))).updated,
    0,
  );
  assert.deepEqual(client.rows[0], { ...record, certificate: newCertificate });
});

test('correction từ chối mã trùng, nội dung rỗng/quá dài và thiếu xác nhận demo', () => {
  const doctors = [{ code: 'A', certificate: oldCertificate }];
  assert.throws(
    () =>
      makePlan([replacement(), replacement()], doctors, true, correctionMode),
    /trùng/,
  );
  for (const certificate of ['', 'A'.repeat(256)]) {
    assert.throws(
      () =>
        makePlan(
          [{ ...replacement(), chungChiDuKien: certificate }],
          doctors,
          true,
          correctionMode,
        ),
      /rỗng hoặc quá 255/,
    );
  }
  assert.throws(
    () =>
      makePlan(
        [{ ...replacement(), duLieuDemoDaXacNhan: false }],
        doctors,
        true,
        correctionMode,
      ),
    /xác nhận demo/,
  );
});

test('correction gặp conflict lúc UPDATE thì rollback cả transaction', async () => {
  const client = fakeClient([
    { code: 'A', certificate: oldCertificate },
    { code: 'B', certificate: oldCertificate },
  ]);
  const input = [replacement('A'), replacement('B')];
  const dry = await runSeed(client, input, correctionMode);
  const query = client.query.bind(client);
  client.query = async (sql, args) =>
    sql.startsWith('UPDATE bac_si') && args[1] === 'B'
      ? { rowCount: 0 }
      : query(sql, args);
  await assert.rejects(
    runSeed(client, input, approvedCorrection(dry)),
    /dừng toàn bộ/,
  );
  assert.equal(client.rows[0].certificate, oldCertificate);
});

test('chạy hai lần an toàn, không ghi đè chứng chỉ đã tồn tại', async () => {
  const client = fakeClient([
    { code: 'A', certificate: null },
    { code: 'B', certificate: 'Có sẵn' },
  ]);
  const entries = [entry('A'), entry('B')];
  const dry = await runSeed(client, entries, { target: 'test' });
  const opts = {
    apply: true,
    target: 'test',
    confirmTarget: 'test',
    confirmPlan: dry.planHash,
    approved: true,
  };
  assert.equal((await runSeed(client, entries, opts)).updated, 1);
  assert.equal(client.rows[1].certificate, 'Có sẵn');
  await assert.rejects(runSeed(client, entries, opts), /xác nhận/);
  const second = await runSeed(client, entries, { target: 'test' });
  assert.equal(second.candidates, 0);
  assert.equal(
    (await runSeed(client, entries, { ...opts, confirmPlan: second.planHash }))
      .updated,
    0,
  );
});

test('từ chối apply nếu schema thiếu, sai xác nhận hoặc thay dữ liệu sau dry-run', async () => {
  const client = fakeClient([{ code: 'A', certificate: null }]);
  const dry = await runSeed(client, [entry('A')], { target: 'test' });
  await assert.rejects(
    runSeed(client, [entry('A', 'Giá trị khác')], {
      apply: true,
      target: 'test',
      confirmTarget: 'test',
      confirmPlan: dry.planHash,
      approved: true,
    }),
    /xác nhận/,
  );
  await assert.rejects(
    runSeed(client, [entry('A')], {
      apply: true,
      target: 'test',
      confirmTarget: 'wrong',
      confirmPlan: dry.planHash,
      approved: true,
    }),
    /xác nhận/,
  );
  await assert.rejects(
    runSeed(
      fakeClient([{ code: 'A', certificate: null }], false),
      [entry('A')],
      { apply: true, target: 'test', approved: true },
    ),
    /Chưa có cột/,
  );
  assert.equal(client.writes, 0);
});

test('không nhận mã trùng, nguồn rỗng hoặc nội dung vượt giới hạn', () => {
  const doctors = [{ code: 'A', certificate: null }];
  assert.throws(
    () => makePlan([entry('A'), entry('A')], doctors, true),
    /trùng/,
  );
  assert.throws(
    () => makePlan([{ ...entry('A'), nguon: '' }], doctors, true),
    /thiếu/,
  );
  assert.throws(
    () => makePlan([entry('A', 'A'.repeat(256))], doctors, true),
    /255/,
  );
});

test('nếu một cập nhật không còn hợp lệ thì rollback toàn bộ transaction', async () => {
  const client = fakeClient([
    { code: 'A', certificate: null },
    { code: 'B', certificate: null },
  ]);
  const entries = [entry('A'), entry('B')];
  const dry = await runSeed(client, entries, { target: 'test' });
  const query = client.query.bind(client);
  client.query = async (sql, args) => {
    if (sql.startsWith('UPDATE bac_si') && args[1] === 'B') {
      return { rowCount: 0 };
    }
    return query(sql, args);
  };
  await assert.rejects(
    runSeed(client, entries, {
      apply: true,
      target: 'test',
      confirmTarget: 'test',
      confirmPlan: dry.planHash,
      approved: true,
    }),
    /dừng toàn bộ/,
  );
  assert.equal(client.rows[0].certificate, null);
});
