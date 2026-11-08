import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppModal from '@/components/ui/AppModal';
import '@/components/ui/admin-crud.css';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';
import '@/modules/tiep-don/receptionist-workspace.css';

interface Patient {
  id: number;
  code: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string;
  address?: string | null;
  identityNumber?: string | null;
  healthInsuranceNumber?: string | null;
}

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

export default function TrangBenhNhanThuNgan() {
  const { showToast } = useAppToast();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    const value = search.trim();
    if (value.length === 1) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get<{ data: Patient[] }>('/receptions/patients', {
          params: { search: value },
        });
        setPatients(response.data.data);
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Không thể tải danh sách bệnh nhân'), 'danger');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, showToast]);

  const openRecord = async (patient: Patient) => {
    try {
      const response = await axiosClient.get<{ data: PatientRecord }>(`/receptions/patients/${patient.id}`);
      setRecord(response.data.data);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể tải hồ sơ bệnh nhân'), 'danger');
    }
  };

  const totalPages = Math.max(1, Math.ceil(patients.length / PATIENTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    patients.length === 0 ? 0 : (currentPage - 1) * PATIENTS_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * PATIENTS_PER_PAGE, patients.length);
  const paginatedPatients = useMemo(
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

  return (
    <div className="reception-page medicine-inventory admin-crud-page">
      <div className="admin-crud-heading align-items-end">
        <div>
          <p className="admin-management-eyebrow">Hệ thống dữ liệu</p>
          <h1>QUẢN LÝ BỆNH NHÂN</h1>
          <p className="admin-management-description mb-0">
            Tra cứu hồ sơ bệnh nhân trực tiếp từ cơ sở dữ liệu.
          </p>
        </div>
        {hasPermission(user, 'TIEP_DON.CREATE') && hasPermission(user, 'BENH_NHAN.CREATE') && (
          <div className="admin-crud-actions">
            <Link className="btn btn-primary d-flex align-items-center gap-2" to="/thu-ngan/tiep-don">
              <span className="material-symbols-outlined">person_add</span>
              Thêm bệnh nhân mới
            </Link>
          </div>
        )}
      </div>

      <section className="reception-card overflow-hidden">
        <div className="reception-filter">
          <div className="reception-filter__search">
            <label className="form-label fw-semibold">Tìm bệnh nhân</label>
            <div className="app-search-field">
              <span className="material-symbols-outlined">search</span>
              <input
                className="form-control"
                placeholder="Nhập họ tên hoặc số điện thoại (tối thiểu 2 ký tự)..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table
            className="table reception-table align-middle mb-0"
            style={{ tableLayout: 'fixed', width: '100%' }}
          >
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Mã BN</th>
                <th style={{ width: '18%' }}>Họ tên</th>
                <th style={{ width: '11%' }}>Ngày sinh</th>
                <th style={{ width: '9%' }}>Giới tính</th>
                <th style={{ width: '12%' }}>Số điện thoại</th>
                <th style={{ width: '14%' }}>Email</th>
                <th style={{ width: '14%' }}>Địa chỉ</th>
                <th className="text-end" style={{ width: '12%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((patient) => (
                <tr key={patient.id}>
                  <td className="fw-bold text-primary text-truncate" title={patient.code}>
                    {patient.code}
                  </td>
                  <td>
                    <div className="reception-person" style={{ minWidth: 0 }}>
                      <span className="reception-person__avatar">
                        {patient.fullName
                          .split(/\s+/)
                          .slice(-2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <strong className="text-truncate" title={patient.fullName}>
                        {patient.fullName}
                      </strong>
                    </div>
                  </td>
                  <td className="text-nowrap">
                    {patient.dateOfBirth
                      ? dinhDangNgay(patient.dateOfBirth)
                      : '—'}
                  </td>
                  <td>{patient.gender === 'NU' ? 'Nữ' : patient.gender === 'NAM' ? 'Nam' : '—'}</td>
                  <td className="text-nowrap">{patient.phoneNumber}</td>
                  <td className="text-truncate" title={patient.email || ''}>
                    {patient.email || '—'}
                  </td>
                  <td className="text-truncate" title={patient.address || ''}>
                    {patient.address || '—'}
                  </td>
                  <td className="text-end">
                    <div className="reception-row-actions justify-content-end flex-nowrap">
                      <button
                        className="btn btn-sm btn-primary text-white border text-nowrap d-inline-flex align-items-center gap-1"
                        style={{ minHeight: '32px', height: '32px', width: 'auto', minWidth: 'auto', padding: '0 10px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                        type="button"
                        title="Xem hồ sơ bệnh nhân"
                        onClick={() => void openRecord(patient)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        <span className="text-nowrap">Xem hồ sơ</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && patients.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-secondary">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && patients.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-5 text-center text-secondary">
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
                    <span aria-hidden="true">«</span>
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
                    <span aria-hidden="true">»</span>
                  </button>
                </li>
              </ul>
            </nav>
          </footer>
        )}
      </section>

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
                  <span className="badge bg-secondary-subtle text-secondary">{dinhDangNgay(visit.date)}</span>
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
                          {visit.prescription.refusal.refusedAt ? ` · ${dinhDangNgay(visit.prescription.refusal.refusedAt)}` : ''}
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
