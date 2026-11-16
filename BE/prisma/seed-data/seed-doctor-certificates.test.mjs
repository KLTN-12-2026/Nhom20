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
        if (!row || row.certificate?.trim()) return { rowCount: 0 };
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
