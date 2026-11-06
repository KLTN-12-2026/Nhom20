import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';

import { dispensingApi } from '../../api/dispensing.api';
import type { DispensingPrescription } from '../../types/dispensing.types';
import '@/components/ui/admin-crud.css';
import '../../pharmacist-workspace.css';

export default function TrangDonThuocChoCap() {
  const user = useAuthStore((state) => state.user);
  const canUpdate = hasPermission(user, 'CAP_THUOC.UPDATE');
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<DispensingPrescription[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const response = await dispensingApi.getPending();
      setPending(response.data.data.items);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => { void loadPending(); }, [loadPending]);
  useRealtimeEvent('prescription.created', loadPending);

  const rows = useMemo(() => pending.filter((item) => `${item.code} ${item.patient.fullName} ${item.doctor.fullName}`.toLowerCase().includes(search.toLowerCase())), [pending, search]);

  const handleAccept = async (id: number) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await dispensingApi.accept(id);
      navigate(`/duoc-si/dang-xu-ly/${id}`);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tiếp nhận đơn thuốc này'), 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pharmacy-page admin-crud-page">
      <header className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Tiếp nhận đơn thuốc</p>
          <h1>ĐƠN THUỐC CHỜ CẤP</h1>
          <p className="admin-management-description">
            Hiển thị các đơn thuốc mới được bác sĩ kê và chờ dược sĩ tiếp nhận, cấp phát.
          </p>
        </div>
      </header>
      <section className="pharmacy-panel"><div className="pharmacy-filter"><div className="input-group"><span className="input-group-text"><span className="material-symbols-outlined">search</span></span><input className="form-control" placeholder="Tìm mã đơn, bệnh nhân hoặc bác sĩ..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div><div className="table-responsive"><table className="table pharmacy-table"><thead><tr><th>Mã đơn</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Số thuốc</th><th>Thời gian</th><th>Thao tác</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong className="text-primary">{item.code}</strong></td><td><div className="pharmacy-person"><div><strong>{item.patient.fullName}</strong><small>{item.patient.code}</small></div></div></td><td><div className="pharmacy-person"><div><strong>{item.doctor.fullName}</strong><small>{item.doctor.specialty}</small></div></div></td><td>{item.items.length}</td><td><strong>{dinhDangNgayGio(item.createdAt).split(' ')[0]}</strong><small>{dinhDangNgayGio(item.createdAt).split(' ')[1]}</small></td><td>{canUpdate && <button className="btn btn-sm btn-primary" disabled={isLoading} onClick={() => void handleAccept(item.id)}>Tiếp nhận</button>}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}
