// Chrome thật + API giả lập trong bộ nhớ. Không gửi request tới BE/Neon.
// Chạy Vite ở 127.0.0.1:5187, đặt PLAYWRIGHT_MODULE trỏ tới playwright-core/index.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base = process.env.UI_TEST_URL || 'http://127.0.0.1:5187';
assert.equal(new URL(base).hostname, '127.0.0.1');
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); });
after(async () => { await browser?.close(); });
const catalog = [{ id: 2, code: 'DV002', name: 'Xét nghiệm công thức máu', price: '150000' },
  { id: 16, code: 'CLS_XQ_NGUC', name: 'Chụp X-quang ngực thẳng', price: '200000' }];
const notice = 'Kết quả nhập thủ công phục vụ mô phỏng quy trình cận lâm sàng. Chưa tích hợp thiết bị chẩn đoán.';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  t.after(() => context.close());
  const user = { id: 987, fullName: 'Bác Sĩ Kiểm Thử', email: 'demo@example.test', roles: ['DOCTOR'], permissions: options.noPermission ? [] : ['BENH_AN.VIEW', 'LICH_HEN.VIEW'], avatarUrl: null };
  await context.addInitScript((value) => { localStorage.setItem('accessToken', 'mock-only-not-a-real-token'); localStorage.setItem('authUser', JSON.stringify(value)); }, user);
  const state = { orders: [], creates: [], transitions: [], drafts: [], visits: [], failList: false,
    draftRequests: [], serverDrafts: {}, visitStatuses: {}, waits: [], activeRequests: 0,
    failCatalog: false, failCreateOnce: false, createDelay: 0, emptyCatalog: false, ...options };
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.routeWebSocket('**/*', (socket) => socket.close());
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const api = url.pathname.split('/api/v1')[1];
    if (api === undefined) {
      if (url.origin === new URL(base).origin && !url.pathname.startsWith('/socket.io')) return route.continue();
      return route.abort();
    }
    const reply = (data, status = 200, message = 'Thành công', meta) => route.fulfill({ status, contentType: 'application/json',
      headers: { 'access-control-allow-origin': base, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
      body: JSON.stringify({ success: status < 400, data, message, meta }) });
    if (req.method() === 'OPTIONS') return reply(null);
    if (api === '/auth/me') return reply(user);
    if (api.startsWith('/notifications')) return reply({ items: [], unreadCount: 0, total: 0 });
    if (api === '/examinations/doctor/me/active') { state.activeRequests++; return reply(null); }
    if (api === '/examinations/waiting/me') {
      if (state.failWaiting) return reply(null, 503, 'Không tải được lượt chờ thử nghiệm');
      const items = Object.entries(state.visitStatuses).filter(([, s]) => s === 'CHO_KET_QUA').map(([id]) => ({
        id: Number(id), code: `LK-${id}`, patientName: `Bệnh Nhân Demo ${id}`, patientCode: `TEST-${id}`,
        pendingOrders: state.orders.filter((o) => o.visitId === Number(id) && o.status === 'CHO_THUC_HIEN').length,
      }));
      return reply(items, 200, 'Danh sách chờ', { total: items.length });
    }
    if (/^\/examinations\/waiting\/\d+\/(wait|resume)$/.test(api)) {
      const id = Number(api.split('/')[3]); const action = api.split('/')[4];
      state.waits.push({ id, action });
      if (state.failWait) return reply(null, 409, 'Không thể chuyển trạng thái thử nghiệm');
      state.visitStatuses[id] = action === 'wait' ? 'CHO_KET_QUA' : 'DA_VAO_PHONG';
      return reply({ id, status: state.visitStatuses[id] }, 200, action === 'wait' ? 'Đã lưu lượt chờ kết quả' : 'Đã tiếp tục lượt khám');
    }
    if (api.startsWith('/queues')) return reply({ items: [] });
    if (api === '/services') {
      state.publicFilter = url.searchParams.get('excludeType');
      const items = [{ id: 1, name: 'Khám dịch vụ demo', type: null }, { id: 2, name: 'Dịch vụ CLS demo', type: 'CAN_LAM_SANG' }]
        .filter((item) => item.type !== state.publicFilter).map((item) => ({ ...item, code: `DV-${item.id}`, price: 100, specialty: null, status: 'DANG_HOAT_DONG' }));
      return reply(items);
    }
    if (/^\/examinations\/visit\/\d+$/.test(api)) {
      const id = Number(api.split('/').at(-1)); state.visits.push(id);
      await wait(state.visitDelay?.[id] || 0);
      return reply({ id, status: state.visitStatuses[id] || (state.closed ? 'DA_HOAN_TAT' : 'DA_VAO_PHONG'),
        specialty: { code: '108', name: 'Cơ Xương Khớp' },
        patient: { id, code: `TEST-${id}`, fullName: `Bệnh Nhân Demo ${id}`, phoneNumber: '', allergies: [] }, draft: state.serverDrafts[id] || state.draft || null });
    }
    if (api.endsWith('/draft')) {
      const id = Number(api.split('/')[3]); const body = req.postDataJSON();
      state.drafts.push(body); state.draftRequests.push({ id, body });
      await wait(state.draftDelay || 0);
      if (state.failDraft) return reply(null, 503, 'Lưu nháp thử nghiệm thất bại');
      const draft = { ...body, id: id + 8000, updatedAt: new Date().toISOString(), prescription: { items: body.prescription.map((p) => ({ ...p, medicine: { id: p.medicineId, name: 'Thuốc kiểm thử' } })) } };
      state.serverDrafts[id] = draft;
      return reply({ ...draft, warnings: [] }, 200, 'Đã lưu bản nháp phiếu khám');
    }
    if (api === '/service-orders/catalog') {
      if (state.failCatalog) return reply(null, 503, 'Không tải được danh mục thử nghiệm');
      const search = url.searchParams.get('search')?.toLocaleLowerCase('vi') || '';
      const source = state.largeCatalog || catalog;
      const found = state.emptyCatalog ? [] : source.filter((item) => item.name.toLocaleLowerCase('vi').includes(search));
      const pageNumber = Number(url.searchParams.get('page') || 1);
      return reply(found.slice((pageNumber - 1) * 10, pageNumber * 10), 200, 'Danh mục', { total: found.length, page: pageNumber, limit: 10 });
    }
    if (/^\/service-orders\/visit\/\d+$/.test(api)) {
      const visitId = Number(api.split('/').at(-1));
      if (req.method() === 'GET') {
        if (state.failList) return reply(null, 403, 'Chỉ bác sĩ được phân công lượt khám mới được thực hiện');
        return reply(state.orders.filter((order) => order.visitId === visitId));
      }
      const body = req.postDataJSON(); state.creates.push(body);
      if (state.writeDenied) return reply(null, 403, 'Bạn không có quyền tạo chỉ định cho lượt khám này');
      await wait(state.createDelay);
      let order = state.orders.find((item) => item.idempotencyKey === body.idempotencyKey);
      if (!order) {
        order = { id: state.orders.length + 1, visitId, doctorId: 99, service: catalog.find((item) => item.id === body.serviceId),
          reason: body.reason, note: body.note || null, status: 'CHO_THUC_HIEN', priceSnapshot: catalog.find((item) => item.id === body.serviceId).price, idempotencyKey: body.idempotencyKey,
          result: null, cancellationReason: null, resultNotice: notice };
        state.orders.push(order);
      }
      if (state.failCreateOnce) { state.failCreateOnce = false; return route.abort('failed'); }
      return reply(order, 200, 'Tạo chỉ định dịch vụ thành công');
    }
    if (/^\/service-orders\/\d+\/(result|cancel)$/.test(api)) {
      const id = Number(api.split('/')[2]); const result = api.endsWith('/result'); const body = req.postDataJSON();
      state.transitions.push({ id, body });
      const order = state.orders.find((item) => item.id === id);
      Object.assign(order, result ? { status: 'DA_HOAN_TAT', result: body.result } : { status: 'DA_HUY', cancellationReason: body.reason });
      return reply(order, 200, result ? 'Lưu kết quả mô phỏng thành công' : 'Hủy chỉ định thành công');
    }
    return reply([]);
  });
  await page.goto(`${base}/bac-si/kham-benh?luotKhamId=101`);
  await page.locator('.doctor-exam-patient-bar').getByText('Bệnh Nhân Demo 101', { exact: true }).waitFor();
  t.after(() => assert.deepEqual(errors, [], 'Không có lỗi React runtime'));
  return { page, state, panel: page.locator('section[aria-labelledby="service-orders-title"]') };
}

async function choose(page, reason = 'Lý do demo', index = 0) {
  await page.getByRole('button', { name: 'Thêm chỉ định', exact: true }).click();
  await page.getByRole('radio').nth(index).check();
  await page.getByLabel('Lý do chỉ định').fill(reason);
}
async function create(page, reason = 'Lý do demo', index = 0) {
  await choose(page, reason, index);
  await page.getByRole('button', { name: 'Xác nhận chỉ định', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Thêm chỉ định', exact: true }).waitFor();
}

test('Danh mục, tạo chỉ định, cùng dịch vụ nhiều lần; giữ ICD/chẩn đoán đang soạn', async (t) => {
  const { page, state, panel } = await setup(t);
  await panel.getByText('Lượt khám chưa có chỉ định dịch vụ.').waitFor();
  await page.getByPlaceholder('Ví dụ: J02.9').fill('J02.9');
  await page.getByPlaceholder('Nhập chẩn đoán...').fill('Chẩn đoán demo đang soạn');
  await create(page);
  await create(page);
  await create(page, 'Chỉ định dịch vụ thứ hai', 1);
  assert.equal(state.orders.length, 3);
  assert.equal(new Set(state.creates.map((x) => x.idempotencyKey)).size, 3);
  assert.deepEqual(Object.keys(state.creates[0]).sort(), ['idempotencyKey', 'reason', 'serviceId']);
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'J02.9');
  assert.equal(await page.getByPlaceholder('Nhập chẩn đoán...').inputValue(), 'Chẩn đoán demo đang soạn');
  assert.equal(await panel.getByRole('row').count(), 4);
  if (process.env.UI_SCREENSHOT) await panel.screenshot({ path: process.env.UI_SCREENSHOT });
});

test('Double-click chỉ gửi một POST; khóa Escape khi đang lưu', async (t) => {
  const { page, state } = await setup(t, { createDelay: 600 });
  await choose(page);
  await page.locator('#service-order-create').evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 1);
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(state.creates.length, 1);
});

test('Mất phản hồi sau lưu: retry giữ UUID, không tạo trùng', async (t) => {
  const { page, state } = await setup(t, { failCreateOnce: true });
  await choose(page);
  await page.getByRole('button', { name: 'Xác nhận chỉ định', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: /Network Error/ }).waitFor();
  await page.getByRole('button', { name: 'Xác nhận chỉ định', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(state.creates.length, 2);
  assert.equal(state.creates[0].idempotencyKey, state.creates[1].idempotencyKey);
  assert.equal(state.orders.length, 1);
});

test('Nhập/xem kết quả và hủy có lý do; trạng thái cuối không còn nút sửa', async (t) => {
  const { page, state, panel } = await setup(t);
  await create(page);
  await panel.getByRole('button', { name: 'Nhập kết quả', exact: true }).click();
  await page.getByLabel('Nội dung kết quả mô phỏng').fill('<script>demo</script>\nNội dung kết quả thử nghiệm');
  await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await panel.getByText('Đã có kết quả', { exact: true }).waitFor();
  assert.equal(await panel.getByRole('button', { name: 'Hủy chỉ định', exact: true }).count(), 0);
  await panel.getByRole('button', { name: 'Xem chi tiết' }).click();
  await page.getByRole('dialog').getByText('<script>demo</script>', { exact: false }).waitFor();
  await page.keyboard.press('Escape');
  await create(page, 'Chỉ định cần hủy');
  await panel.getByRole('button', { name: 'Hủy chỉ định', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).isDisabled(), true);
  await page.getByLabel('Lý do hủy', { exact: false }).fill('Hủy trong kịch bản demo');
  await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await panel.getByText('Đã hủy', { exact: true }).waitFor();
  assert.equal(state.transitions.length, 2);
  await page.reload();
  await page.getByText('Đã có kết quả', { exact: true }).waitFor();
  await page.getByText('Đã hủy', { exact: true }).waitFor();
});

test('Lỗi quyền khi tải danh sách không hiển thị như danh sách rỗng; retry thành công', async (t) => {
  const { page, state, panel } = await setup(t, { failList: true });
  await panel.getByText('Chỉ bác sĩ được phân công lượt khám mới được thực hiện').waitFor();
  assert.equal(await panel.getByRole('button', { name: 'Thêm chỉ định', exact: true }).isDisabled(), true);
  state.failList = false;
  await page.getByRole('button', { name: 'Thử lại chỉ định' }).click();
  await panel.getByText('Lượt khám chưa có chỉ định dịch vụ.').waitFor();
});

test('Danh mục lỗi, thử lại, không có kết quả tìm kiếm', async (t) => {
  const { page, state } = await setup(t, { failCatalog: true });
  await page.getByRole('button', { name: 'Thêm chỉ định', exact: true }).click();
  await page.getByText('Không tải được danh mục thử nghiệm').waitFor();
  state.failCatalog = false;
  await page.getByRole('button', { name: 'Thử lại danh mục' }).click();
  await page.getByRole('radio').first().waitFor();
  await page.getByLabel('Tìm dịch vụ cận lâm sàng').fill('Không tồn tại');
  await page.getByText('Không có dịch vụ cận lâm sàng phù hợp.').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Xác nhận chỉ định', exact: true }).isDisabled(), true);
});

test('Phân trang danh mục và tìm kiếm trả về trang đầu', async (t) => {
  const { page } = await setup(t, { largeCatalog: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, code: `TEST-${i}`, name: `Dịch vụ demo ${i + 1}`, price: '100000' })) });
  await page.getByRole('button', { name: 'Thêm chỉ định', exact: true }).click();
  await page.getByText('Trang 1 / 2', { exact: true }).waitFor();
  assert.equal(await page.getByRole('radio').count(), 10);
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
  assert.equal(await page.getByRole('radio').count(), 2);
  await page.getByLabel('Tìm dịch vụ cận lâm sàng').fill('demo 12');
  await page.getByText('Trang 1 / 1', { exact: true }).waitFor();
  assert.equal(await page.getByRole('radio').count(), 1);
});

test('Không có BENH_AN.VIEW thì không hiện khu vực chỉ định', async (t) => {
  const { panel } = await setup(t, { noPermission: true });
  assert.equal(await panel.count(), 0);
});

test('Lượt đã đóng chỉ đọc, không có thêm chỉ định', async (t) => {
  const { panel } = await setup(t, { closed: true });
  await panel.getByText('Lượt khám chưa có chỉ định dịch vụ.').waitFor();
  assert.equal(await panel.getByRole('button', { name: 'Thêm chỉ định', exact: true }).count(), 0);
});

test('Đổi ID lượt khám đóng modal A, không hiện chỉ định A ở B', async (t) => {
  const { page, panel } = await setup(t);
  await create(page);
  await panel.getByRole('button', { name: 'Nhập kết quả', exact: true }).click();
  await page.getByLabel('Nội dung kết quả mô phỏng').fill('Kết quả của A chưa lưu');
  await page.evaluate(() => { history.pushState({}, '', '/bac-si/kham-benh?luotKhamId=102'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await page.locator('.doctor-exam-patient-bar').getByText('Bệnh Nhân Demo 102', { exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await panel.getByText('Lượt khám chưa có chỉ định dịch vụ.').waitFor();
});

test('Không tải lại phiếu khám hoặc xóa thuốc đang soạn khi thao tác chỉ định', async (t) => {
  const { page, state } = await setup(t, { draft: { id: 8001, symptoms: 'Triệu chứng demo', diagnosis: 'Chẩn đoán demo',
    icd10Code: 'M25.5', conclusion: 'Theo dõi demo', prescription: { items: [{ medicine: { id: 9001, name: 'Thuốc kiểm thử' },
      quantity: 2, dosage: 'Liều đã lưu', frequency: 'Tần suất demo', days: 2, instructions: 'Chỉ dẫn demo' }] } } });
  await page.getByPlaceholder('Ví dụ: 1 viên').fill('Liều đang soạn chưa hoàn tất');
  const visitsBefore = state.visits.length;
  await create(page);
  assert.equal(await page.getByPlaceholder('Ví dụ: 1 viên').inputValue(), 'Liều đang soạn chưa hoàn tất');
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'M25.5');
  assert.equal(state.visits.length, visitsBefore);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('smart_clinic_draft_101')));
  assert.equal(saved.prescriptions[0].medicineId, '9001');
  assert.equal(saved.prescriptions[0].dosage, 'Liều đang soạn chưa hoàn tất');
});

test('BE từ chối ghi: giữ modal/nội dung và không tạo dòng thành công giả', async (t) => {
  const { page, state, panel } = await setup(t, { writeDenied: true });
  await choose(page, 'Lý do cần giữ khi lỗi');
  await page.getByRole('button', { name: 'Xác nhận chỉ định', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Bạn không có quyền tạo chỉ định cho lượt khám này' }).waitFor();
  assert.equal(state.orders.length, 0);
  assert.equal(await page.getByRole('dialog').count(), 1);
  assert.equal(await page.getByLabel('Lý do chỉ định').inputValue(), 'Lý do cần giữ khi lỗi');
  assert.equal(await panel.getByRole('table').count(), 0);
});

async function moveTo(page, id) {
  await page.evaluate((visitId) => { history.pushState({}, '', `/bac-si/kham-benh?luotKhamId=${visitId}`); window.dispatchEvent(new PopStateEvent('popstate')); }, id);
  await page.locator('.doctor-exam-patient-bar').getByText(`Bệnh Nhân Demo ${id}`, { exact: true }).waitFor();
}

test('B5: A → B → A giữ ICD, thuốc đang soạn, chỉ định; không ghi A vào B', async (t) => {
  const { page, state, panel } = await setup(t, { draftDelay: 600, serverDrafts: { 101: {
    id: 8101, icd10Code: 'M25', prescription: { items: [{ medicine: { id: 9001, name: 'Thuốc kiểm thử' }, quantity: 2, dosage: 'Ban đầu', frequency: '1 lần/ngày', days: 2, instructions: 'Sau ăn' }] },
  } } });
  await page.getByPlaceholder('Ví dụ: J02.9').fill('R51');
  await page.getByPlaceholder('Ví dụ: 1 viên').fill('Liều của A');
  await create(page, 'Chỉ định của A');
  await moveTo(page, 102);
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), '');
  assert.equal(await page.getByPlaceholder('Ví dụ: 1 viên').inputValue(), '');
  await panel.getByText('Lượt khám chưa có chỉ định dịch vụ.').waitFor();
  await page.getByPlaceholder('Ví dụ: J02.9').fill('J02');
  await create(page, 'Chỉ định của B', 1);
  await moveTo(page, 101);
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'R51');
  assert.equal(await page.getByPlaceholder('Ví dụ: 1 viên').inputValue(), 'Liều của A');
  await panel.getByText('Xét nghiệm công thức máu', { exact: true }).waitFor();
  assert.equal(await panel.getByText('Chụp X-quang ngực thẳng', { exact: true }).count(), 0);
  await wait(1200);
  assert.ok(state.draftRequests.filter((r) => r.id === 102).every((r) => r.body.icd10Code !== 'R51' && r.body.prescription.length === 0));
  const localB = await page.evaluate(() => JSON.parse(localStorage.getItem('smart_clinic_draft_102')));
  assert.equal(localB.icd10Code, 'J02');
  assert.equal(state.activeRequests, 0);
});

test('B5: lưu → chờ → danh sách → mở đúng ID → nhập kết quả → tiếp tục; F5 giữ phiếu', async (t) => {
  const { page, state, panel } = await setup(t);
  await page.getByPlaceholder('Ví dụ: J02.9').fill('R51');
  await create(page);
  await page.getByRole('button', { name: 'Lưu nháp và chờ kết quả', exact: true }).click();
  await page.waitForURL('**/bac-si/hang-doi');
  await page.getByRole('link', { name: 'Mở lượt khám', exact: true }).click();
  await page.locator('.doctor-exam-patient-bar').getByText('Bệnh Nhân Demo 101', { exact: true }).waitFor();
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'R51');
  await panel.getByRole('button', { name: 'Nhập kết quả', exact: true }).click();
  await page.getByLabel('Nội dung kết quả mô phỏng').fill('Kết quả demo');
  await page.getByRole('button', { name: 'Lưu kết quả', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Tiếp tục lượt khám', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu nháp và chờ kết quả', exact: true }).waitFor();
  await page.reload();
  await panel.getByText('Đã có kết quả', { exact: true }).waitFor();
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'R51');
  assert.deepEqual(state.waits, [{ id: 101, action: 'wait' }, { id: 101, action: 'resume' }]);
  assert.equal(state.activeRequests, 0);
});

test('B5: lưu nháp lỗi không gửi chờ, không rời phiếu', async (t) => {
  const { page, state } = await setup(t, { failDraft: true });
  await create(page);
  await page.getByRole('button', { name: 'Lưu nháp và chờ kết quả', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Không lưu được bản nháp' }).waitFor();
  assert.equal(state.waits.length, 0);
  assert.ok(page.url().includes('luotKhamId=101'));
});

test('B5: phản hồi tải B chậm không ghi đè A sau khi quay lại', async (t) => {
  const { page, state } = await setup(t, { visitDelay: { 102: 1000 } });
  await page.getByPlaceholder('Ví dụ: J02.9').fill('R51');
  await page.evaluate(() => { history.pushState({}, '', '/bac-si/kham-benh?luotKhamId=102'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await wait(100);
  await moveTo(page, 101);
  await wait(1300);
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'R51');
  assert.equal(await page.locator('.doctor-exam-patient-bar').getByText('Bệnh Nhân Demo 102').count(), 0);
  assert.ok(state.draftRequests.filter((r) => r.id === 102).every((r) => r.body.icd10Code !== 'R51'));
});

test('B5: nháp mới trên máy không bị response lưu bản cũ ghi đè khi quay về A', async (t) => {
  const { page, state } = await setup(t, { draftDelay: 1200 });
  await page.getByPlaceholder('Ví dụ: J02.9').fill('R50');
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await wait(100);
  await page.getByPlaceholder('Ví dụ: J02.9').fill('R51');
  await moveTo(page, 102);
  await wait(1500);
  await moveTo(page, 101);
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'R51');
  assert.equal(state.activeRequests, 0);
});

test('B5: lỗi chuyển chờ giữ phiếu và ICD đã lưu, không toast thành công', async (t) => {
  const { page } = await setup(t, { failWait: true });
  await page.getByPlaceholder('Ví dụ: J02.9').fill('R51');
  await create(page);
  await page.getByRole('button', { name: 'Lưu nháp và chờ kết quả', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Không thể chuyển trạng thái thử nghiệm' }).waitFor();
  assert.ok(page.url().includes('luotKhamId=101'));
  assert.equal(await page.getByPlaceholder('Ví dụ: J02.9').inputValue(), 'R51');
});

test('B5: trang dịch vụ công khai gửi bộ lọc loại CLS, vẫn hiển thị dịch vụ cũ', async (t) => {
  const { page, state } = await setup(t);
  await page.goto(`${base}/dich-vu`);
  await page.getByRole('heading', { name: 'Khám dịch vụ demo', exact: true }).waitFor();
  assert.equal(state.publicFilter, 'CAN_LAM_SANG');
  assert.equal(await page.getByRole('heading', { name: 'Dịch vụ CLS demo', exact: true }).count(), 0);
});
