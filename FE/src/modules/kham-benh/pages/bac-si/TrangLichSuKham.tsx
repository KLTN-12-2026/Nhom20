import { useEffect, useMemo, useState } from 'react';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import { maHoaNoiDung, moCuaSoIn } from '@/utils/in-an';
import { getApiErrorMessage } from '@/services/axios-client';
import { examinationApi } from '../../api/examination.api';
import '@/modules/bac-si/doctor-workspace.css';

type HoSoKham = {
  id: number;
  code: string;
  patient: { fullName: string; phoneNumber: string };
  diagnosis: string | null;
  conclusion: string | null;
  submittedAt: string | null;
  prescription: {
    items: Array<{
      medicine: { name: string; unit: string };
      quantity: number;
      dosage: string;
      frequency: string;
      instructions: string;
    }>;
  } | null;
};

export default function TrangLichSuKham() {
  const { showToast } = useAppToast();
  const [rows, setRows] = useState<HoSoKham[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<HoSoKham | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy hồ sơ đã hoàn tất của đúng bác sĩ đang đăng nhập.
    examinationApi
      .getHistory({ page: 1, limit: 50 })
      .then((response) => setRows(response.data.data.items))
      .catch((error) => showToast(getApiErrorMessage(error, 'Không thể tải lịch sử khám'), 'danger'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((record) =>
      `${record.code} ${record.patient.fullName} ${record.diagnosis ?? ''}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [rows, search]);

  const handlePrintExam = (record: HoSoKham) => {
    const medicineRows = record.prescription?.items.length
      ? record.prescription.items
          .map(
            (item, index) =>
              `<tr>
                <td>${index + 1}</td>
                <td><strong>${maHoaNoiDung(item.medicine.name)}</strong></td>
                <td>${item.quantity} ${maHoaNoiDung(item.medicine.unit)}</td>
                <td>${maHoaNoiDung(item.dosage || '—')}</td>
                <td>${maHoaNoiDung(item.frequency || '—')}</td>
                <td>${maHoaNoiDung(item.instructions || '—')}</td>
              </tr>`,
          )
          .join('')
      : '<tr><td colspan="6" class="text-center">Không kê thuốc</td></tr>';

    // In phiếu khám riêng, không lấy sidebar hoặc các nút thao tác của giao diện.
    moCuaSoIn(
      `Phiếu khám ${record.code}`,
      `
        <div class="thuong-hieu">
          <div>
            <h1>SMART CLINIC</h1>
            <p>Chăm sóc sức khỏe thông minh</p>
          </div>
          <div class="thuong-hieu__right">
            <div>Ngày khám: ${maHoaNoiDung(dinhDangNgayGio(record.submittedAt))}</div>
          </div>
        </div>
        <div class="tieu-de-phieu">
          <h2>PHIẾU KHÁM BỆNH</h2>
          <div class="ma-phieu">${maHoaNoiDung(record.code)}</div>
        </div>
        <div class="thong-tin-in">
          <div><span>Bệnh nhân</span><strong>${maHoaNoiDung(record.patient.fullName)}</strong></div>
          <div><span>Số điện thoại</span><strong>${maHoaNoiDung(record.patient.phoneNumber)}</strong></div>
        </div>
        <div class="dong">
          <span>Chẩn đoán</span>
          <strong>${maHoaNoiDung(record.diagnosis || 'Chưa cập nhật')}</strong>
        </div>
        <div class="dong" style="border-bottom: none;">
          <span>Kết luận và dặn dò</span>
          <strong>${maHoaNoiDung(record.conclusion || 'Chưa cập nhật')}</strong>
        </div>
        <h2 style="margin-top: 15px;">Đơn thuốc</h2>
        <table>
          <thead><tr><th>STT</th><th>Thuốc</th><th>Số lượng</th><th>Liều dùng</th><th>Tần suất</th><th>Hướng dẫn</th></tr></thead>
          <tbody>${medicineRows}</tbody>
        </table>
        <div class="chu-ky">
          <div class="chu-ky__item">
            <strong>Người bệnh</strong>
            <small>(Ký, ghi rõ họ tên)</small>
          </div>
          <div class="chu-ky__item"></div>
          <div class="chu-ky__item">
            <strong>Bác sĩ khám</strong>
            <small>(Ký, ghi rõ họ tên)</small>
          </div>
        </div>
      `,
    );
  };

  return (
    <div className="doctor-page">
      <div className="doctor-page__eyebrow">Hồ sơ chuyên môn</div>
      <h1 className="doctor-page__title">Lịch sử khám bệnh</h1>
      <p className="doctor-page__description">
        Dữ liệu thật từ các phiếu khám đã hoàn tất của bác sĩ đang đăng nhập.
      </p>

      <section className="doctor-panel overflow-hidden">
        <div className="doctor-filter-bar border-bottom">
          <div className="flex-grow-1">
            <label className="form-label fw-semibold">Tìm hồ sơ</label>
            <div className="input-group">
              <span className="input-group-text">
                <span className="material-symbols-outlined">search</span>
              </span>
              <input
                className="form-control"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tên bệnh nhân, mã hồ sơ hoặc chẩn đoán..."
              />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table doctor-table mb-0">
            <thead>
              <tr>
                <th>Mã hồ sơ</th>
                <th>Bệnh nhân</th>
                <th>Chẩn đoán</th>
                <th>Ngày khám</th>
                <th>Đơn thuốc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((record) => (
                <tr key={record.id}>
                  <td className="fw-bold text-primary">{record.code}</td>
                  <td>
                    <strong>{record.patient.fullName}</strong>
                    <small className="d-block text-secondary">{record.patient.phoneNumber}</small>
                  </td>
                  <td>{record.diagnosis || '—'}</td>
                  <td>{dinhDangNgayGio(record.submittedAt)}</td>
                  <td>
                    <span className="doctor-status doctor-status--ready">
                      {record.prescription?.items.length ?? 0} loại thuốc
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-light border"
                      aria-label={`Xem hồ sơ ${record.code}`}
                      onClick={() => setSelected(record)}
                    >
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-secondary">
                    Chưa có hồ sơ khám phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <>
          <div className="modal-backdrop show" onClick={() => setSelected(null)} />
          <div className="modal d-block" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title fs-5">Chi tiết hồ sơ khám · {selected.code}</h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Đóng"
                    onClick={() => setSelected(null)}
                  />
                </div>
                <div className="modal-body">
                  <p><strong>Bệnh nhân:</strong> {selected.patient.fullName}</p>
                  <p><strong>Chẩn đoán:</strong> {selected.diagnosis || '—'}</p>
                  <p><strong>Kết luận:</strong> {selected.conclusion || '—'}</p>
                  <h3 className="h6">Đơn thuốc</h3>
                  <ul>
                    {selected.prescription?.items.length ? (
                      selected.prescription.items.map((item, index) => (
                        <li key={index}>
                          {item.medicine.name} × {item.quantity} {item.medicine.unit} —{' '}
                          {item.dosage || '—'}, {item.frequency || '—'}
                        </li>
                      ))
                    ) : (
                      <li>Không kê thuốc</li>
                    )}
                  </ul>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => handlePrintExam(selected)}
                  >
                    <span className="material-symbols-outlined align-text-bottom">print</span> In phiếu khám
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setSelected(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
