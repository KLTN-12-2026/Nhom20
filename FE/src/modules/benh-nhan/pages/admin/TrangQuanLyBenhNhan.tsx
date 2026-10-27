import { useEffect, useState } from 'react';
import AppModal from '@/components/ui/AppModal';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
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

const dateText = (value: string | null) => dinhDangNgay(value);
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

export default function TrangQuanLyBenhNhan() {
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get<{ data: Patient[] }>('/receptions/admin-patients', { params: { search: search.trim() } });
        setPatients(response.data.data);
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

  const visiblePatients = patients.slice(
    (currentPage - 1) * PATIENTS_PER_PAGE,
    currentPage * PATIENTS_PER_PAGE,
  );

  const openRecord = async (patient: Patient) => {
    try {
      const response = await axiosClient.get<{ data: PatientRecord }>(`/receptions/patients/${patient.id}`);
      setRecord(response.data.data);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải hồ sơ bệnh nhân'), 'danger');
    }
  };

  return (
    <div className="patient-management">
      <div className="patient-management__heading">
        <div><p style={{ color: "blue" }}>QUẢN TRỊ HỆ THỐNG</p><h1 style={{ color: "black" }}>QUẢN LÝ BỆNH NHÂN</h1><span className="text-secondary">Hồ sơ khám đã lưu.</span></div>
        <div className="patient-management__search"><span className="material-symbols-outlined">search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, mã hoặc số điện thoại..." /></div>
      </div>

      <section className="patient-table-card">
        <div className="table-responsive">
          <table className="table patient-table align-middle mb-0">
            <thead><tr><th>Mã BN</th><th>Họ tên</th><th>Ngày sinh</th><th>Giới tính</th><th>Số điện thoại</th><th>CCCD</th><th>BHYT</th><th>Địa chỉ</th><th className="text-center">Hồ sơ</th></tr></thead>
            <tbody>
              {visiblePatients.map((patient) => <tr key={patient.id}>
                <td><span className="patient-table__code">{patient.code}</span></td>
                <td><div className="patient-table__identity"><span className="patient-table__avatar patient-table__avatar--primary">{initials(patient.fullName)}</span><strong>{patient.fullName}</strong></div></td>
                <td>{dateText(patient.dateOfBirth)}</td><td>{patient.gender === 'NU' ? 'Nữ' : patient.gender === 'NAM' ? 'Nam' : 'Khác'}</td><td>{patient.phoneNumber}</td><td>{patient.identityNumber || '—'}</td><td>{patient.healthInsuranceNumber || '—'}</td><td>{patient.address || '—'}</td>
                <td className="text-center"><button className="btn btn-sm btn-primary" type="button" onClick={() => void openRecord(patient)}><span className="material-symbols-outlined me-1">visibility</span>Xem hồ sơ</button></td>
              </tr>)}
              {!loading && patients.length === 0 && <tr><td colSpan={9} className="py-5 text-center text-secondary">Không tìm thấy bệnh nhân.</td></tr>}
            </tbody>
          </table>
          {loading && <div className="p-3 text-secondary">Đang tải...</div>}
        </div>
        {patients.length > PATIENTS_PER_PAGE && (
          <nav
            className="d-flex justify-content-center px-3 py-4 border-top"
            aria-label="Phân trang danh sách bệnh nhân"
          >
            <ul className="pagination pagination-lg mb-0">
              <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage((page) => page - 1)}
                  disabled={currentPage === 1}
                  aria-label="Trang trước"
                >
                  <span aria-hidden="true">&laquo;</span>
                </button>
              </li>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <li
                    key={page}
                    className={`page-item${currentPage === page ? ' active' : ''}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setCurrentPage(page)}
                      aria-current={currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  </li>
                ),
              )}

              <li
                className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}
              >
                <button
                  type="button"
                  className="page-link"
                  onClick={() => setCurrentPage((page) => page + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Trang sau"
                >
                  <span aria-hidden="true">&raquo;</span>
                </button>
              </li>
            </ul>
          </nav>
        )}

        <footer className="patient-pagination">
          <span>
            Hiển thị {visiblePatients.length} / {patients.length} bệnh nhân
          </span>
        </footer>
      </section>

      {record && <AppModal title={`Hồ sơ bệnh nhân: ${record.fullName}`} size="xl" onClose={() => setRecord(null)} footer={<button className="btn btn-primary" type="button" onClick={() => setRecord(null)}>Đóng</button>}>
        <div className="row g-3 mb-4"><div className="col-md-3"><strong>Mã BN</strong><div>{record.code}</div></div><div className="col-md-3"><strong>Điện thoại</strong><div>{record.phoneNumber}</div></div><div className="col-md-3"><strong>CCCD</strong><div>{record.identityNumber || '—'}</div></div><div className="col-md-3"><strong>BHYT</strong><div>{record.healthInsuranceNumber || '—'}</div></div><div className="col-12"><strong>Địa chỉ</strong><div>{record.address || '—'}</div></div></div>
        <h5>Lịch sử khám và đơn thuốc</h5>
        {record.visits.length === 0 ? <p className="text-secondary">Chưa có hồ sơ khám.</p> : record.visits.map((visit) => <article className="border rounded p-3 mb-3" key={visit.id}><div className="d-flex justify-content-between"><strong>{visit.specialty}</strong><span>{dateText(visit.date)}</span></div><div>Bác sĩ: {visit.doctor || 'Chưa phân công'}</div><div>Lý do: {visit.reason}</div>{visit.examination && <div className="mt-2"><div>Chẩn đoán: {visit.examination.diagnosis || '—'}</div><div>Kết luận: {visit.examination.conclusion || '—'}</div></div>}{visit.prescription && <div className="mt-2"><strong>Đơn thuốc</strong>{visit.prescription.items.length > 0 && <ul className="mb-0">{visit.prescription.items.map((line, index) => <li key={`${visit.id}-${index}`}>{line.medicine} × {line.quantity} — {line.dosage}, {line.frequency}</li>)}</ul>}{visit.prescription.refusal && <div className="alert alert-danger py-2 mt-2 mb-0"><strong>Đã từ chối cấp thuốc</strong><div>{visit.prescription.refusal.reason}</div><small>Dược sĩ: {visit.prescription.refusal.pharmacist || '—'}{visit.prescription.refusal.refusedAt ? ` · ${dateText(visit.prescription.refusal.refusedAt)}` : ''}</small></div>}</div>}</article>)}
      </AppModal>}
    </div>
  );
}
