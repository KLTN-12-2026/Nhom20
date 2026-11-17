// Hồi quy Bước 7: Chrome thật, API giả lập; chặn toàn bộ API/socket/mạng ngoài.
// Không gọi Backend, Neon, ngân hàng hoặc máy in; không tạo giao dịch thật.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base = process.env.UI_TEST_URL || 'http://127.0.0.1:5187';
assert.equal(new URL(base).hostname, '127.0.0.1');
let browser;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
});
after(async () => { await browser?.close(); });

async function setup(t, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  t.after(() => context.close());
  const user = {
    id: 987, fullName: 'Thu Ngân Kiểm Thử', email: 'cashier@example.test',
    roles: ['RECEPTIONIST'], permissions: ['HOA_DON.VIEW', ...(options.readOnly ? [] : ['HOA_DON.UPDATE'])],
  };
  await context.addInitScript((value) => {
    localStorage.setItem('accessToken', 'mock-only-not-a-real-token');
    localStorage.setItem('authUser', JSON.stringify(value));
  }, user);
  const invoice = {
    id: 991, maHoaDon: 'HD-TEST-991', createdAt: new Date().toISOString(),
    benhNhan: { hoTen: 'Bệnh Nhân Kiểm Thử', soDienThoai: '' },
    tongTien: '500000', trangThai: 'CHUA_THANH_TOAN', sanSangThuTien: true,
    thanhToan: [],
    chiTiet: [
      { id: 1, loaiMuc: 'PHI_KHAM', tenMuc: 'Phí khám demo', soLuong: 1, donGia: '300000', thanhTien: '300000' },
      { id: 2, loaiMuc: 'DICH_VU', tenMuc: 'X-quang demo', soLuong: 1, donGia: '200000', thanhTien: '200000' },
    ],
    ...options.invoice,
  };
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  const writes = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.routeWebSocket('**/*', (socket) => socket.close());
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const api = url.pathname.split('/api/v1')[1];
    if (api === undefined) {
      if (url.origin === new URL(base).origin && !url.pathname.startsWith('/socket.io')) return route.continue();
      return route.abort();
    }
    const reply = (data) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Dữ liệu kiểm thử', data }),
    });
    if (!['GET', 'OPTIONS'].includes(request.method())) {
      writes.push(api);
      return route.abort();
    }
    if (api === '/auth/me') return reply(user);
    if (api === '/thanh-toan/hoa-don') return reply([invoice]);
    if (api.startsWith('/notifications')) return reply({ items: [], unreadCount: 0, total: 0 });
    return reply([]);
  });
  t.after(() => {
    assert.deepEqual(errors, [], 'Không có lỗi React runtime');
    assert.deepEqual(writes, [], 'Không gửi request ghi dữ liệu');
  });
  await page.goto(`${base}/thu-ngan/thanh-toan`);
  const row = page.getByRole('row').filter({ hasText: invoice.maHoaDon });
  await row.waitFor();
  await row.getByRole('button', { name: /Thu tiền|Xem chi tiết/ }).click();
  const modal = page.getByRole('dialog');
  await modal.waitFor();
  return { page, modal, row, invoice };
}

test('Không thuốc: chi tiết giữ phí khám và X-quang, cho thu khi sẵn sàng', async (t) => {
  const { modal } = await setup(t);
  assert.equal(await modal.getByRole('row').filter({ hasText: 'X-quang demo' }).count(), 1);
  assert.equal(await modal.getByRole('row').filter({ hasText: 'Phí khám demo' }).count(), 1);
  assert.match(await modal.locator('.reception-finance-box').innerText(), /500\.000/);
  assert.equal(await modal.getByRole('button', { name: 'Xác nhận thu tiền mặt' }).count(), 1);
});

test('Chờ cấp thuốc: vẫn xem được phí dịch vụ, không có nút xác nhận hoặc QR', async (t) => {
  const { modal } = await setup(t, { invoice: { sanSangThuTien: false, trangThai: 'BAN_NHAP' } });
  await modal.getByText('Đơn thuốc chưa được cấp. Chưa thể thu tiền hoặc tạo mã QR.').waitFor();
  assert.equal(await modal.getByRole('row').filter({ hasText: 'X-quang demo' }).count(), 1);
  assert.equal(await modal.getByRole('button', { name: /Xác nhận/ }).count(), 0);
  assert.equal(await modal.getByRole('img', { name: /Mã QR/ }).count(), 0);
});

test('Sau cấp thuốc: reload giữ phí dịch vụ, thêm thuốc và tổng mới', async (t) => {
  const { page, invoice } = await setup(t, { invoice: { sanSangThuTien: false } });
  invoice.sanSangThuTien = true;
  invoice.tongTien = '550000';
  invoice.chiTiet.push({ id: 3, loaiMuc: 'TIEN_THUOC', tenMuc: 'Thuốc demo', soLuong: 5, donGia: '10000', thanhTien: '50000' });
  await page.reload();
  await page.getByRole('row').filter({ hasText: invoice.maHoaDon }).getByRole('button', { name: /Thu tiền/ }).click();
  const modal = page.getByRole('dialog');
  assert.equal(await modal.getByRole('row').filter({ hasText: 'X-quang demo' }).count(), 1);
  assert.equal(await modal.getByRole('row').filter({ hasText: 'Thuốc demo' }).count(), 1);
  assert.match(await modal.locator('.reception-finance-box').innerText(), /550\.000/);
  assert.equal(await modal.getByRole('button', { name: 'Xác nhận thu tiền mặt' }).count(), 1);
});

test('Thanh toán một phần: hiển thị số còn thiếu, không báo đã thanh toán đủ', async (t) => {
  const { modal, row } = await setup(t, { invoice: { thanhToan: [{
    soTien: '200000', trangThai: 'THANH_CONG', phuongThuc: 'CHUYEN_KHOAN',
    thoiGianThanhToan: new Date().toISOString(), maGiaoDich: 'MOCK-991',
  }] } });
  assert.match(await row.innerText(), /Thanh toán một phần/);
  assert.match(await modal.locator('.reception-finance-box').innerText(), /Còn phải thu\s+300\.000/);
  assert.equal(await modal.locator('.reception-payment-readonly').count(), 0);
});

test('Hóa đơn đã thanh toán đủ: không còn nút thu tiền', async (t) => {
  const { modal } = await setup(t, { invoice: { trangThai: 'DA_THANH_TOAN', thanhToan: [{
    soTien: '500000', trangThai: 'THANH_CONG', phuongThuc: 'TIEN_MAT', thoiGianThanhToan: new Date().toISOString(),
  }] } });
  assert.equal(await modal.getByRole('button', { name: /Xác nhận/ }).count(), 0);
  await modal.locator('.reception-payment-readonly').waitFor();
});

test('Chỉ có quyền xem: xem phí X-quang nhưng không được thu tiền', async (t) => {
  const { modal } = await setup(t, { readOnly: true });
  await modal.getByText('Bạn không có quyền thu tiền.').waitFor();
  assert.equal(await modal.getByRole('button', { name: /Xác nhận/ }).count(), 0);
});

test('Hóa đơn DA_HUY phải hiển thị đã hủy và không cho thu tiền', async (t) => {
  const { row, modal } = await setup(t, { invoice: { trangThai: 'DA_HUY' } });
  assert.equal(await modal.getByRole('button', { name: /Xác nhận/ }).count(), 0, 'Hóa đơn đã hủy không được có nút xác nhận thu');
  assert.match(await row.innerText(), /Đã hủy/);
});
