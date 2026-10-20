import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReceptionistPageHeader from '@/modules/tiep-don/components/ReceptionistPageHeader';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
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
}

export default function TrangBenhNhanThuNgan() {
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

  return (
    <div className="reception-page">
      <ReceptionistPageHeader
        eyebrow="Hệ thống dữ liệu"
        title="Quản lý bệnh nhân"
        description="Tra cứu hồ sơ bệnh nhân trực tiếp từ cơ sở dữ liệu."
        actions={
          <Link className="btn btn-primary" to="/thu-ngan/tiep-don">
            <span className="material-symbols-outlined me-2">person_add</span>
            Thêm bệnh nhân mới
          </Link>
        }
      />

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
          <table className="table reception-table">
            <thead>
              <tr>
                <th>Mã BN</th>
                <th>Họ tên</th>
                <th>Ngày sinh</th>
                <th>Giới tính</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Địa chỉ</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td className="fw-bold text-primary">{patient.code}</td>
                  <td>
                    <div className="reception-person">
                      <span className="reception-person__avatar">
                        {patient.fullName
                          .split(/\s+/)
                          .slice(-2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <strong>{patient.fullName}</strong>
                    </div>
                  </td>
                  <td>
                    {patient.dateOfBirth
                ? dinhDangNgay(patient.dateOfBirth)
                      : '—'}
                  </td>
                  <td>{patient.gender === 'NU' ? 'Nữ' : patient.gender === 'NAM' ? 'Nam' : '—'}</td>
                  <td>{patient.phoneNumber}</td>
                  <td>{patient.email || '—'}</td>
                  <td>{patient.address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-3 text-secondary">Đang tải...</div>}
          {!loading && patients.length === 0 && (
            <div className="reception-empty">
              <p>Không tìm thấy bệnh nhân phù hợp.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
