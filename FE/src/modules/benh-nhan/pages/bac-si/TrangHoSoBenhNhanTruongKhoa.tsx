import { Fragment, useEffect, useMemo, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '@/modules/bac-si/doctor-workspace.css';
import '../../patients.css';

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

export default function TrangHoSoBenhNhanTruongKhoa() {
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [managedSpecialty, setManagedSpecialty] = useState<string | null>(null);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get<{ data: Patient[]; managedSpecialty?: string | null }>(
          '/receptions/admin-patients',
          { params: { search: search.trim() } },
        );
        setPatients(response.data.data);
        if (response.data.managedSpecialty) {
          setManagedSpecialty(response.data.managedSpecialty);
        }
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Không thể tải danh sách bệnh nhân'), 'danger');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, showToast]);

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
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải hồ sơ bệnh nhân'), 'danger');
    }
  };

  return (
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">
            Bác sĩ trưởng khoa {managedSpecialty ? `• Khoa ${managedSpecialty}` : ''}
          </div>
          <h1 className="doctor-page__title">Hồ sơ bệnh nhân của khoa</h1>
          <p className="doctor-page__description">
            Danh sách bệnh nhân và lịch sử khám bệnh thuộc chuyên khoa bạn phụ trách.
          </p>
        </div>
        <div className="patient-management__search">
          <span className="material-symbols-outlined">search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên, mã hoặc số điện thoại..."
          />
        </div>
      </div>

      <section className="patient-table-card">
        <div className="table-responsive">
          <table className="table patient-table align-middle mb-0">
            <thead>
              <tr className="text-center align-middle">
                <th className="text-center align-middle">Mã BN</th>
                <th className="text-center align-middle">Họ tên</th>
                <th className="text-center align-middle">Ngày sinh</th>
                <th className="text-center align-middle">Giới tính</th>
                <th className="text-center align-middle">Số điện thoại</th>
                <th className="text-center align-middle">CCCD</th>
                <th className="text-center align-middle">BHYT</th>
                <th className="text-center align-middle">Địa chỉ</th>
                <th className="text-center align-middle">Hồ sơ</th>
              </tr>
            </thead>
            <tbody>
              {visiblePatients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <span className="patient-table__code">{patient.code}</span>
                  </td>
                  <td>
                    <div className="patient-table__identity">
                      <span className="patient-table__avatar patient-table__avatar--primary">
                        {initials(patient.fullName)}
                      </span>
                      <strong>{patient.fullName}</strong>
                    </div>
                  </td>
                  <td>{dateText(patient.dateOfBirth)}</td>
                  <td className="text-center align-middle text-nowrap">
                    {patient.gender === 'NU' ? 'Nữ' : patient.gender === 'NAM' ? 'Nam' : 'Khác'}
                  </td>
                  <td>{patient.phoneNumber}</td>
                  <td>{patient.identityNumber || '—'}</td>
                  <td>{patient.healthInsuranceNumber || '—'}</td>
                  <td>{patient.address || '—'}</td>
                  <td className="text-center text-nowrap">
                    <button
                      className="btn btn-sm btn-primary d-inline-flex align-items-center justify-content-center text-nowrap"
                      type="button"
                      onClick={() => void openRecord(patient)}
                    >
                      <span className="material-symbols-outlined me-1" style={{ fontSize: 18, lineHeight: 1 }}>
                        visibility
                      </span>
                      <span>Xem hồ sơ</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && patients.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-5 text-center text-secondary">
                    Chưa có bệnh nhân nào trong chuyên khoa này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && <div className="p-3 text-secondary">Đang tải...</div>}
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
            <button className="btn btn-secondary" type="button" onClick={() => setRecord(null)}>
              Đóng
            </button>
          }
        >
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <strong>Mã BN</strong>
              <div>{record.code}</div>
            </div>
            <div className="col-md-3">
              <strong>Điện thoại</strong>
              <div>{record.phoneNumber}</div>
            </div>
            <div className="col-md-3">
              <strong>CCCD</strong>
              <div>{record.identityNumber || '—'}</div>
            </div>
            <div className="col-md-3">
              <strong>BHYT</strong>
              <div>{record.healthInsuranceNumber || '—'}</div>
            </div>
            <div className="col-12">
              <strong>Địa chỉ</strong>
              <div>{record.address || '—'}</div>
            </div>
          </div>

          <h5 className="fw-bold mb-3">Lịch sử khám và đơn thuốc tại chuyên khoa</h5>
          {record.visits.length === 0 ? (
            <p className="text-secondary py-3 text-center border rounded">
              Bệnh nhân chưa có lượt khám hoàn tất nào tại chuyên khoa này.
            </p>
          ) : (
            record.visits.map((visit) => (
              <article className="border rounded p-3 mb-3 bg-light" key={visit.id}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong className="text-primary fs-6">{visit.specialty}</strong>
                  <span className="badge bg-secondary">{dateText(visit.date)}</span>
                </div>
                <div>
                  <strong>Bác sĩ:</strong> {visit.doctor || 'Chưa phân công'}
                </div>
                <div>
                  <strong>Lý do khám:</strong> {visit.reason}
                </div>
                {visit.examination && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <div>
                      <strong>Chẩn đoán:</strong> {visit.examination.diagnosis || '—'}
                    </div>
                    <div>
                      <strong>Kết luận:</strong> {visit.examination.conclusion || '—'}
                    </div>
                    {visit.examination.notes && (
                      <div className="small text-muted mt-1">
                        <strong>Ghi chú:</strong> {visit.examination.notes}
                      </div>
                    )}
                  </div>
                )}
                {visit.prescription && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <strong className="d-block mb-1">Đơn thuốc kê:</strong>
                    {visit.prescription.items.length > 0 && (
                      <ul className="mb-0 ps-3">
                        {visit.prescription.items.map((line, index) => (
                          <li key={`${visit.id}-${index}`}>
                            <strong>{line.medicine}</strong> × {line.quantity} — {line.dosage}
                            {line.frequency && `, ${line.frequency}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {visit.prescription.refusal && (
                      <div className="alert alert-danger py-2 mt-2 mb-0">
                        <strong>Đã từ chối cấp thuốc</strong>
                        <div>{visit.prescription.refusal.reason}</div>
                        <small className="text-muted">
                          Dược sĩ: {visit.prescription.refusal.pharmacist || '—'}
                          {visit.prescription.refusal.refusedAt
                            ? ` · ${dateText(visit.prescription.refusal.refusedAt)}`
                            : ''}
                        </small>
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
