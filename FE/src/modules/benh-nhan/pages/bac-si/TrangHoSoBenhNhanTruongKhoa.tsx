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

const dateText = (value: string | null) => dinhDangNgay(value);
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

export default function TrangHoSoBenhNhanTruongKhoa() {
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [managedSpecialty, setManagedSpecialty] = useState<string | null>(null);
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
        <div>
          <p className="text-uppercase text-primary fw-bold mb-1" style={{ letterSpacing: '0.08em' }}>
            Bác sĩ trưởng khoa {managedSpecialty ? `• Khoa ${managedSpecialty}` : ''}
          </p>
          <h1>HỒ SƠ BỆNH NHÂN CỦA KHOA</h1>
          <span className="text-secondary">
            Danh sách bệnh nhân và lịch sử khám bệnh thuộc chuyên khoa bạn phụ trách.
          </span>
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
              <tr>
                <th>Mã BN</th>
                <th>Họ tên</th>
                <th>Ngày sinh</th>
                <th>Giới tính</th>
                <th>Số điện thoại</th>
                <th>CCCD</th>
                <th>BHYT</th>
                <th>Địa chỉ</th>
                <th className="text-center">Hồ sơ</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
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
                  <td>{patient.gender === 'NU' ? 'Nữ' : patient.gender === 'NAM' ? 'Nam' : 'Khác'}</td>
                  <td>{patient.phoneNumber}</td>
                  <td>{patient.identityNumber || '—'}</td>
                  <td>{patient.healthInsuranceNumber || '—'}</td>
                  <td>{patient.address || '—'}</td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      type="button"
                      onClick={() => void openRecord(patient)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
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
        <footer className="patient-pagination">
          <span>
            Hiển thị <strong>{patients.length}</strong> bệnh nhân thuộc chuyên khoa
          </span>
        </footer>
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
