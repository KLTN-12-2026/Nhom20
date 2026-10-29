import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import '@/components/ui/admin-crud.css';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';

type Patient = {
  id: number;
  code: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: 'NAM' | 'NU' | 'KHAC' | null;
  address: string | null;
  identityNumber: string | null;
  healthInsuranceNumber: string | null;
};

type PatientRecord = Patient & {
  visits: Array<{
    id: number;
    date: string;
    specialty: string;
    doctor: string | null;
    reason: string;
    examination: { diagnosis: string | null; conclusion: string | null; notes: string | null } | null;
    prescription: {
      status: string;
      refusal: { reason: string; refusedAt: string | null; pharmacist: string | null } | null;
      items: Array<{ medicine: string; quantity: number; dosage: string; frequency: string }>;
    } | null;
  }>;
};

const PATIENTS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

const dateText = (value: string | null) => dinhDangNgay(value);
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

export default function TrangQuanLyBenhNhan() {
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosClient.get<{ data: Patient[] }>(
        '/receptions/admin-patients',
        { params: { search: query.trim() } },
      );
      setPatients(response.data.data);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Không thể tải danh sách bệnh nhân');
      setError(message);
      showToast(message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setPage(1);
    const timer = window.setTimeout(() => {
      void loadPatients(search);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, loadPatients]);

  const totalPages = Math.max(
    1,
    Math.ceil(patients.length / PATIENTS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    patients.length === 0 ? 0 : (currentPage - 1) * PATIENTS_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * PATIENTS_PER_PAGE,
    patients.length,
  );
  const visiblePatients = useMemo(
    () =>
      patients.slice(
        (currentPage - 1) * PATIENTS_PER_PAGE,
        currentPage * PATIENTS_PER_PAGE,
      ),
    [currentPage, patients],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openRecord = async (patient: Patient) => {
    try {
      const response = await axiosClient.get<{ data: PatientRecord }>(`/receptions/patients/${patient.id}`);
      setRecord(response.data.data);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể tải hồ sơ bệnh nhân'), 'danger');
    }
  };

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">QUẢN TRỊ HỆ THỐNG</p>
          <h1>QUẢN LÝ BỆNH NHÂN</h1>
          <p className="admin-management-description">Hồ sơ khám đã lưu.</p>
        </div>
        <div className="admin-management-summary" aria-label="Tổng quan bệnh nhân">
          <span>
            <strong>{patients.length}</strong> bệnh nhân
          </span>
        </div>
      </div>

      <div className="admin-crud-toolbar">
        <div className="admin-crud-search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            className="form-control"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên, mã hoặc số điện thoại..."
          />
        </div>
        <button
          type="button"
          className="btn btn-outline-primary d-flex align-items-center gap-2 ms-auto"
          onClick={() => void loadPatients(search)}
          disabled={loading}
        >
          <span className="material-symbols-outlined">refresh</span>
          Làm mới
        </button>
      </div>

      {loading && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div>Đang tải danh sách bệnh nhân...</div>
        </div>
      )}

      {!loading && error && (
        <div className="admin-crud-empty">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => void loadPatients(search)}
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="admin-management-table-card">
          <div className="admin-management-table-heading">
            <div>
              <h2>Danh sách bệnh nhân</h2>
              <p>Hiển thị {patients.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table admin-management-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Mã BN</th>
                  <th>Bệnh nhân</th>
                  <th>Ngày sinh</th>
                  <th>Giới tính</th>
                  <th>Số điện thoại</th>
                  <th>CCCD</th>
                  <th>BHYT</th>
                  <th>Địa chỉ</th>
                  <th className="text-end">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {visiblePatients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <span className="fw-semibold text-primary">{patient.code}</span>
                    </td>
                    <td>
                      <div className="admin-management-entity">
                        <span
                          className="doctor-card__avatar"
                          style={{ width: 38, height: 38, fontSize: '0.85rem' }}
                        >
                          {initials(patient.fullName)}
                        </span>
                        <div>
                          <strong>{patient.fullName}</strong>
                          <small>{patient.email || 'Chưa có email'}</small>
                        </div>
                      </div>
                    </td>
                    <td>{dateText(patient.dateOfBirth)}</td>
                    <td>{patient.gender === 'NU' ? 'Nữ' : patient.gender === 'NAM' ? 'Nam' : 'Khác'}</td>
                    <td>{patient.phoneNumber}</td>
                    <td>{patient.identityNumber || '—'}</td>
                    <td>{patient.healthInsuranceNumber || '—'}</td>
                    <td>{patient.address || '—'}</td>
                    <td className="text-end">
                      <div className="admin-crud-actions justify-content-end">
                        <button
                          className="btn btn-sm btn-primary"
                          type="button"
                          onClick={() => void openRecord(patient)}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                          Xem hồ sơ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-5 text-center text-secondary">
                      Không tìm thấy bệnh nhân phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {patients.length > 0 && (
            <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
              <span className="text-secondary small">
                Hiển thị {displayedFrom}–{displayedTo} trong tổng số {patients.length} bệnh nhân
              </span>
              <nav className="align-self-md-auto align-self-start" aria-label="Phân trang bệnh nhân">
                <ul className="pagination mb-0 flex-wrap">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang trước"
                      disabled={currentPage <= 1}
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
                      disabled={currentPage >= totalPages}
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
        </div>
      )}

      {record && (
        <AppModal
          title={`Hồ sơ bệnh nhân: ${record.fullName}`}
          size="xl"
          onClose={() => setRecord(null)}
          footer={
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setRecord(null)}
            >
              Đóng
            </button>
          }
        >
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <span className="text-secondary small d-block">Mã BN</span>
              <strong className="text-primary">{record.code}</strong>
            </div>
            <div className="col-md-3">
              <span className="text-secondary small d-block">Điện thoại</span>
              <strong>{record.phoneNumber}</strong>
            </div>
            <div className="col-md-3">
              <span className="text-secondary small d-block">CCCD</span>
              <strong>{record.identityNumber || '—'}</strong>
            </div>
            <div className="col-md-3">
              <span className="text-secondary small d-block">BHYT</span>
              <strong>{record.healthInsuranceNumber || '—'}</strong>
            </div>
            <div className="col-12">
              <span className="text-secondary small d-block">Địa chỉ</span>
              <div>{record.address || '—'}</div>
            </div>
          </div>

          <h5 className="mb-3">Lịch sử khám và đơn thuốc</h5>
          {record.visits.length === 0 ? (
            <p className="text-secondary">Chưa có hồ sơ khám.</p>
          ) : (
            record.visits.map((visit) => (
              <article className="border rounded-3 p-3 mb-3 bg-light-subtle" key={visit.id}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong className="text-primary fs-6">{visit.specialty}</strong>
                  <span className="badge bg-secondary-subtle text-secondary">{dateText(visit.date)}</span>
                </div>
                <div className="small text-secondary mb-1">
                  <strong>Bác sĩ:</strong> {visit.doctor || 'Chưa phân công'}
                </div>
                <div className="small mb-2">
                  <strong>Lý do khám:</strong> {visit.reason}
                </div>
                {visit.examination && (
                  <div className="p-2 rounded bg-white border mb-2 small">
                    <div><strong>Chẩn đoán:</strong> {visit.examination.diagnosis || '—'}</div>
                    <div><strong>Kết luận:</strong> {visit.examination.conclusion || '—'}</div>
                    {visit.examination.notes && <div><strong>Ghi chú:</strong> {visit.examination.notes}</div>}
                  </div>
                )}
                {visit.prescription && (
                  <div className="mt-2">
                    <strong className="small d-block mb-1">Đơn thuốc:</strong>
                    {visit.prescription.items.length > 0 && (
                      <ul className="mb-0 small ps-3">
                        {visit.prescription.items.map((line, index) => (
                          <li key={`${visit.id}-${index}`}>
                            <span className="fw-semibold">{line.medicine}</span> × {line.quantity} — {line.dosage}, {line.frequency}
                          </li>
                        ))}
                      </ul>
                    )}
                    {visit.prescription.refusal && (
                      <div className="alert alert-danger py-2 mt-2 mb-0 small">
                        <strong>Đã từ chối cấp thuốc:</strong> {visit.prescription.refusal.reason}
                        <div className="text-muted mt-1">
                          Dược sĩ: {visit.prescription.refusal.pharmacist || '—'}
                          {visit.prescription.refusal.refusedAt ? ` · ${dateText(visit.prescription.refusal.refusedAt)}` : ''}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </AppModal>
      )}
    </div>
  );
}
