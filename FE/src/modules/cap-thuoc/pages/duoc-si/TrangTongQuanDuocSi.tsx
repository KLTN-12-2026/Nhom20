import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { dispensingApi } from '../../api/dispensing.api';
import { medicinesApi, type MedicineBatchRow } from '../../api/medicines.api';
import PharmacyPageHeader from '../../components/PharmacyPageHeader';
import type { DispensingPrescription } from '../../types/dispensing.types';
import '../../pharmacist-workspace.css';

export default function TrangTongQuanDuocSi() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [pending, setPending] = useState<DispensingPrescription[]>([]);
  const [batches, setBatches] = useState<MedicineBatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prescriptions, medicineBatches] = await Promise.all([dispensingApi.getPending(), medicinesApi.batches()]);
      setPending(prescriptions.data.data.items);
      setBatches(medicineBatches.data.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('prescription.created', load);

  const accept = async (id: number) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await dispensingApi.accept(id);
      navigate(`/duoc-si/dang-xu-ly/${id}`);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tiếp nhận đơn thuốc'), 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  return <div className="pharmacy-page">
    <PharmacyPageHeader title="Tổng quan nhà thuốc" description="Đơn thuốc mới và tình trạng tồn kho được cập nhật từ hệ thống." />
    <div className="pharmacy-stats">
      <article><span className="material-symbols-outlined">pending_actions</span><div><strong>{pending.length}</strong><small>Đơn chờ cấp</small></div></article>
      <article><span className="material-symbols-outlined">inventory_2</span><div><strong>{batches.filter((batch) => batch.status === 'SẮP HẾT HẠN').length}</strong><small>Lô sắp hết hạn</small></div></article>
      <article><span className="material-symbols-outlined">production_quantity_limits</span><div><strong>{batches.filter((batch) => batch.status === 'HẾT HÀNG').length}</strong><small>Thuốc hết hàng</small></div></article>
    </div>
    <section className="pharmacy-panel"><div className="pharmacy-panel__header"><div><h2>Đơn thuốc mới nhất</h2><p>Danh sách đang chờ dược sĩ tiếp nhận.</p></div><Link className="btn btn-outline-primary" to="/duoc-si/don-cho-cap">Xem tất cả</Link></div><div className="table-responsive"><table className="table pharmacy-table"><thead><tr><th>Mã đơn</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Thời gian</th><th /></tr></thead><tbody>{pending.slice(0, 3).map((item) => <tr key={item.id}><td><strong className="text-primary">{item.code}</strong></td><td><div className="pharmacy-person"><div><strong>{item.patient.fullName}</strong><small>{item.patient.code}</small></div></div></td><td><div className="pharmacy-person"><div><strong>{item.doctor.fullName}</strong><small>{item.doctor.specialty}</small></div></div></td><td><strong>{dinhDangNgayGio(item.createdAt).split(' ')[0]}</strong><small>{dinhDangNgayGio(item.createdAt).split(' ')[1]}</small></td><td className="text-end"><button className="btn btn-sm btn-primary" disabled={isLoading} onClick={() => void accept(item.id)}>Tiếp nhận</button></td></tr>)}</tbody></table></div></section>
  </div>;
}
