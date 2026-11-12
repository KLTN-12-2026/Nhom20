import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppModal from '@/components/ui/AppModal';
import '@/components/ui/admin-crud.css';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';
import { usePatientAdministration } from '../../hooks/use-patient-administration';
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

const PATIENTS_PER_PAGE = 10;

const GENDER_BADGE_MAP: Record<string, { label: string; className: string }> = {
  NAM: { label: 'Nam', className: 'text-primary bg-primary-subtle' },
  NU: { label: 'Nữ', className: 'text-danger bg-danger-subtle' },
  KHAC: { label: 'Khác', className: 'text-secondary bg-secondary-subtle' },
};

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

export default function TrangBenhNhanThuNgan() {
  const { showToast } = useAppToast();
  const user = useAuthStore((state) => state.user);
  const canViewPatient = hasPermission(user, 'BENH_NHAN.VIEW');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'' | 'NAM' | 'NU' | 'KHAC'>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const { record, loadingId, openRecord, closeRecord } = usePatientAdministration();
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

  const filteredPatients = useMemo(() => {
    if (!genderFilter) return patients;
    return patients.filter((patient) => patient.gender === genderFilter);
  }, [genderFilter, patients]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PATIENTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    filteredPatients.length === 0 ? 0 : (currentPage - 1) * PATIENTS_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * PATIENTS_PER_PAGE, filteredPatients.length);
  const paginatedPatients = useMemo(
    () =>
      filteredPatients.slice(
        (currentPage - 1) * PATIENTS_PER_PAGE,
        currentPage * PATIENTS_PER_PAGE,
      ),
    [currentPage, filteredPatients],
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
            Tra cứu thông tin hành chính, thẻ BHYT và lịch sử các lượt khám bệnh tại quầy tiếp đón.
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
        <header className="reception-card__header align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-primary">groups</span>
            <h2 className="h6 fw-bold mb-0">Danh sách bệnh nhân</h2>
          </div>
          <span className="reception-badge reception-badge--blue">
            {filteredPatients.length} bệnh nhân
          </span>
        </header>

        <div
          className="reception-filter bg-light bg-opacity-50 align-items-end"
          style={{ borderBottom: '1px solid #e6ebf3' }}
        >
          <div className="reception-filter__search" style={{ flex: '1 1 340px' }}>
            <label
              className="form-label fw-semibold small text-secondary mb-1"
              htmlFor="cashier-patient-search"
            >
              Tìm bệnh nhân
            </label>
            <div className="app-search-field">
              <span className="material-symbols-outlined">search</span>
              <input
                id="cashier-patient-search"
                className="form-control"
                placeholder="Nhập họ tên hoặc số điện thoại (tối thiểu 2 ký tự)..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div style={{ flex: '0 1 220px', minWidth: '180px' }}>
            <label
              className="form-label fw-semibold small text-secondary mb-1"
              htmlFor="cashier-patient-gender"
            >
              Giới tính
            </label>
            <select
              id="cashier-patient-gender"
              className="form-select"
              value={genderFilter}
              onChange={(event) => {
                setGenderFilter(event.target.value as '' | 'NAM' | 'NU' | 'KHAC');
                setPage(1);
              }}
            >
              <option value="">Tất cả giới tính</option>
              <option value="NAM">Nam</option>
              <option value="NU">Nữ</option>
              <option value="KHAC">Khác</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table
            className="table reception-table table-hover align-middle mb-0"
            style={{ tableLayout: 'fixed', minWidth: '960px', width: '100%' }}
          >
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="ps-4">Họ tên</th>
                <th>Ngày sinh</th>
                <th>Giới tính</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Địa chỉ</th>
                <th className="text-end pe-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((patient) => {
                const genderBadge = patient.gender ? GENDER_BADGE_MAP[patient.gender] : undefined;
                return (
                <tr key={patient.id}>
                  <td className="ps-4">
                    <div className="reception-person" style={{ minWidth: 0 }}>
                      <span className="reception-person__avatar flex-shrink-0">
                        {patient.fullName
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(-2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0 d-flex flex-column">
                        <strong className="text-truncate" title={patient.fullName}>
                          {patient.fullName}
                        </strong>
                        {patient.code ? (
                          <small className="text-truncate">{patient.code}</small>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="text-nowrap">
                    {patient.dateOfBirth ? (
                      dinhDangNgay(patient.dateOfBirth)
                    ) : (
                      <span className="text-body-tertiary">—</span>
                    )}
                  </td>
                  <td>
                    {genderBadge ? (
                      <span
                        className={`badge rounded-pill fw-semibold px-2 py-1 ${genderBadge.className}`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {genderBadge.label}
                      </span>
                    ) : (
                      <span className="text-body-tertiary">—</span>
                    )}
                  </td>
                  <td className="text-nowrap fw-medium">
                    {patient.phoneNumber || (
                      <span className="text-body-tertiary fw-normal">—</span>
                    )}
                  </td>
                  <td className="text-truncate" title={patient.email || ''}>
                    {patient.email ? (
                      patient.email
                    ) : (
                      <span className="text-body-tertiary">—</span>
                    )}
                  </td>
                  <td className="text-truncate" title={patient.address || ''}>
                    {patient.address ? (
                      patient.address
                    ) : (
                      <span className="text-body-tertiary">—</span>
                    )}
                  </td>
                  <td className="text-end pe-4">
                    <div className="reception-row-actions justify-content-end flex-nowrap">
                      {canViewPatient && (
                        <button
                          className="btn btn-sm btn-primary text-white text-nowrap d-inline-flex align-items-center gap-1"
                          style={{
                            minHeight: '32px',
                            height: '32px',
                            width: 'auto',
                            minWidth: 'auto',
                            padding: '0 12px',
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
                          }}
                          type="button"
                          title="Xem hồ sơ bệnh nhân"
                          disabled={loadingId !== null}
                          onClick={() => void openRecord(patient.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            visibility
                          </span>
                          <span className="text-nowrap">
                            {loadingId === patient.id ? 'Đang tải...' : 'Xem hồ sơ'}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {loading && filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-secondary">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-5 text-center text-secondary">
                    Không tìm thấy bệnh nhân phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredPatients.length > 0 && (
          <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
            <span className="text-secondary small">
              Hiển thị {displayedFrom}–{displayedTo} trong tổng số {filteredPatients.length} bệnh nhân
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
          onClose={closeRecord}
          footer={
            <button
              className="btn btn-primary"
              type="button"
              onClick={closeRecord}
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
              <span className="text-secondary small d-block">Họ tên</span>
              <strong>{record.fullName}</strong>
            </div>
            <div className="col-md-3">
              <span className="text-secondary small d-block">Ngày sinh</span>
              <strong>{record.dateOfBirth ? dinhDangNgay(record.dateOfBirth) : '—'}</strong>
            </div>
            <div className="col-md-3">
              <span className="text-secondary small d-block">Giới tính</span>
              <strong>{record.gender === 'NU' ? 'Nữ' : record.gender === 'NAM' ? 'Nam' : record.gender === 'KHAC' ? 'Khác' : '—'}</strong>
            </div>
            <div className="col-md-3">
              <span className="text-secondary small d-block">Điện thoại</span>
              <strong>{record.phoneNumber}</strong>
            </div>
            <div className="col-md-3">
              <span className="text-secondary small d-block">Email</span>
              <strong>{record.email || '—'}</strong>
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
            <div className="col-md-6">
              <span className="text-secondary small d-block">Người liên hệ khẩn cấp</span>
              <strong>{record.emergencyContactName || '—'}</strong>
            </div>
            <div className="col-md-6">
              <span className="text-secondary small d-block">SĐT liên hệ khẩn cấp</span>
              <strong>{record.emergencyContactPhone || '—'}</strong>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
