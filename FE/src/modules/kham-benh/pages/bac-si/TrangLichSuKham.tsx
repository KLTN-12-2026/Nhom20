import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import { maHoaNoiDung, moCuaSoIn } from '@/utils/in-an';
import { getApiErrorMessage } from '@/services/axios-client';
import { examinationApi } from '../../api/examination.api';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '@/modules/bac-si/doctor-workspace.css';

const RECORDS_PER_PAGE = 10;

const getPageNumbers = (currentPage: number, totalPages: number) => {
  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
};

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
  const [page, setPage] = useState(1);
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / RECORDS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * RECORDS_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * RECORDS_PER_PAGE,
    filteredRows.length,
  );
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(
      (currentPage - 1) * RECORDS_PER_PAGE,
      currentPage * RECORDS_PER_PAGE,
    );
  }, [filteredRows, currentPage]);

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
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Quản lý hồ sơ bệnh án</p>
          <h1>LỊCH SỬ KHÁM BỆNH</h1>
          <p className="admin-management-description">
            Tra cứu hồ sơ các lượt khám đã hoàn tất, được ghi nhận bởi bác sĩ đang đăng nhập.
          </p>
        </div>
      </header>

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
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Tên bệnh nhân, mã hồ sơ hoặc chẩn đoán..."
              />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table
            className="table doctor-table align-middle mb-0"
            style={{ tableLayout: 'fixed', minWidth: '1000px', width: '100%' }}
          >
            <colgroup>
              <col style={{ width: '14%', minWidth: '130px' }} />
              <col style={{ width: '22%', minWidth: '190px' }} />
              <col style={{ width: '24%', minWidth: '200px' }} />
              <col style={{ width: '16%', minWidth: '150px' }} />
              <col style={{ width: '12%', minWidth: '120px' }} />
              <col style={{ width: '12%', minWidth: '120px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: '14%', minWidth: '130px' }}>Mã hồ sơ</th>
                <th style={{ width: '22%', minWidth: '190px' }}>Bệnh nhân</th>
                <th style={{ width: '24%', minWidth: '200px' }}>Chẩn đoán</th>
                <th style={{ width: '16%', minWidth: '150px' }}>Ngày khám</th>
                <th style={{ width: '12%', minWidth: '120px' }}>Đơn thuốc</th>
                <th
                  className="text-end text-nowrap"
                  style={{ width: '12%', minWidth: '120px' }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((record) => (
                <tr key={record.id}>
                  <td className="fw-bold text-primary text-truncate" title={record.code}>
                    {record.code}
                  </td>
                  <td>
                    <strong className="d-block text-truncate" title={record.patient.fullName}>
                      {record.patient.fullName}
                    </strong>
                    <small className="d-block text-secondary text-truncate" title={record.patient.phoneNumber}>
                      {record.patient.phoneNumber}
                    </small>
                  </td>
                  <td className="text-truncate" title={record.diagnosis || '—'}>
                    {record.diagnosis || '—'}
                  </td>
                  <td className="text-nowrap">{dinhDangNgayGio(record.submittedAt)}</td>
                  <td>
                    <span className="doctor-status doctor-status--ready text-nowrap">
                      {record.prescription?.items.length ?? 0} loại thuốc
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary text-nowrap d-inline-flex align-items-center gap-1"
                      aria-label={`Xem chi tiết hồ sơ ${record.code}`}
                      onClick={() => setSelected(record)}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18 }}
                      >
                        visibility
                      </span>
                      Chi tiết
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

        {filteredRows.length > 0 && (
          <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
            <span className="text-secondary small">
              Hiển thị {displayedFrom}–{displayedTo} trong tổng số {filteredRows.length} hồ sơ
            </span>
            <nav className="align-self-md-auto align-self-start" aria-label="Phân trang hồ sơ">
              <ul className="pagination mb-0 flex-wrap">
                <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    aria-label="Trang trước"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <span aria-hidden="true">&laquo;</span>
                  </button>
                </li>
                {pageNumbers.map((pageNumber, index) => (
                  <Fragment key={pageNumber}>
                    {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                      <li className="page-item disabled" aria-hidden="true">
                        <span className="page-link">…</span>
                      </li>
                    )}
                    <li className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        aria-current={pageNumber === currentPage ? 'page' : undefined}
                        disabled={loading}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </li>
                  </Fragment>
                ))}
                <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    aria-label="Trang sau"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    <span aria-hidden="true">&raquo;</span>
                  </button>
                </li>
              </ul>
            </nav>
          </footer>
        )}
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
                    className="btn btn-primary"
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
