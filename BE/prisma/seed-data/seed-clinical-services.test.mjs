import test from 'node:test';
import assert from 'node:assert/strict';
import { planServices, verifyChanges, assertTarget, TARGET, XRAY } from './seed-clinical-services.mjs';

const blood = () => ({ id: 2, ma_dich_vu: 'DV002', ten_dich_vu: 'Xét nghiệm công thức máu',
  don_gia: '150000.00', chuyen_khoa_id: null, trang_thai: 'DANG_HOAT_DONG', loai_dich_vu: null });

test('Chỉ phân loại dịch vụ máu có sẵn và thêm một X-quang', () => {
  assert.deepEqual(planServices([blood()]), { classifyBlood: true, insertXray: true });
});
test('Chạy lại không ghi trùng', () => {
  assert.deepEqual(planServices([{ ...blood(), loai_dich_vu: 'CAN_LAM_SANG' }, { id: 12, ...XRAY }]),
    { classifyBlood: false, insertXray: false });
});
test('Không tự tạo dịch vụ máu khi thiếu bản ghi được duyệt', () => {
  assert.throws(() => planServices([]), /BLOOD_SERVICE_CONFLICT/);
});
for (const change of [{ don_gia: '160000' }, { ten_dich_vu: 'Đã sửa tên' },
  { loai_dich_vu: 'KHAM' }, { trang_thai: 'NGUNG_HOAT_DONG' }, { chuyen_khoa_id: 1 }]) {
  test(`Không ghi đè dịch vụ máu đã thay đổi ${JSON.stringify(change)}`, () => {
    assert.throws(() => planServices([{ ...blood(), ...change }]), /BLOOD_SERVICE_CONFLICT/);
  });
}
test('Chặn trùng tên X-quang có mã khác', () => {
  assert.throws(() => planServices([blood(), { ...XRAY, ma_dich_vu: 'OTHER' }]), /XRAY_SERVICE_CONFLICT/);
});
test('Chặn ghi đè giá X-quang đã được sửa tay', () => {
  assert.throws(() => planServices([blood(), { ...XRAY, don_gia: '250000' }]), /XRAY_SERVICE_CONFLICT/);
});
test('Chặn sai database/branch/project', () => {
  assert.doesNotThrow(() => assertTarget(TARGET));
  for (const key of Object.keys(TARGET)) assert.throws(() => assertTarget({ ...TARGET, [key]: 'other' }), /TARGET_MISMATCH/);
});
test('Đọc lại đảm bảo không thay dịch vụ khác hoặc trường cũ', () => {
  const before = [blood(), { id: 3, ma_dich_vu: 'DV003', ten_dich_vu: 'Siêu âm ổ bụng' }];
  const plan = planServices(before);
  const after = [{ ...blood(), loai_dich_vu: 'CAN_LAM_SANG' }, before[1], { id: 12, ...XRAY }];
  assert.doesNotThrow(() => verifyChanges(before, after, plan));
  assert.throws(() => verifyChanges(before, [{ ...after[0], don_gia: '1' }, ...after.slice(1)], plan), /UNEXPECTED_DATA_CHANGE/);
  assert.throws(() => verifyChanges(before, after.slice(0, 2), plan), /COUNT_MISMATCH/);
});
