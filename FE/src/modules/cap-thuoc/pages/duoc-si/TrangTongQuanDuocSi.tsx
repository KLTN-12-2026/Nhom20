import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { dispensingApi } from '../../api/dispensing.api';
import { medicinesApi, type MedicineBatchRow } from '../../api/medicines.api';
import type { DispensingPrescription } from '../../types/dispensing.types';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '../../pharmacist-workspace.css';

export default function TrangTongQuanDuocSi() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [pending, setPending] = useState<DispensingPrescription[]>([]);
  const [batches, setBatches] = useState<MedicineBatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prescriptions, medicineBatches] = await Promise.all([
        dispensingApi.getPending(),
        medicinesApi.batches(),
      ]);
      setPending(prescriptions.data.data.items);
      setBatches(medicineBatches.data.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeEvent('prescription.created', load);

  const accept = async (id: number) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await dispensingApi.accept(id);
      navigate(`/duoc-si/dang-xu-ly/${id}`);
    } catch (error) {
      showToast(
        getApiErrorMessage(error, 'Không thể tiếp nhận đơn thuốc'),
        'danger',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const expiringBatchesCount = batches.filter(
    (batch) => batch.status === 'SẮP HẾT HẠN',
  ).length;
  const outOfStockCount = batches.filter(
    (batch) => batch.status === 'HẾT HÀNG',
  ).length;

  return (
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Vận hành nhà thuốc</p>
          <h1>TỔNG QUAN NHÀ THUỐC</h1>
          <p className="admin-management-description">
            Theo dõi đơn thuốc chờ cấp, lô thuốc sắp hết hạn và tình trạng thuốc hết hàng.
          </p>
        </div>
      </header>

      <section className="medicine-inventory__stats">
        <article>
          <span className="material-symbols-outlined">pending_actions</span>
          <div>
            <small>Đơn chờ cấp</small>
            <strong>{pending.length}</strong>
          </div>
        </article>
        <article className="is-warning">
          <span className="material-symbols-outlined">event_busy</span>
          <div>
            <small>Lô sắp hết hạn</small>
            <strong>{expiringBatchesCount}</strong>
          </div>
        </article>
        <article>
          <span className="material-symbols-outlined">
            production_quantity_limits
          </span>
          <div>
            <small>Thuốc hết hàng</small>
            <strong>{outOfStockCount}</strong>
          </div>
        </article>
      </section>

      <section className="medicine-inventory__card">
        <div className="medicine-inventory__tabs justify-content-between">
          <div className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              receipt_long
            </span>
            <span>Đơn thuốc mới nhất (chờ dược sĩ tiếp nhận)</span>
          </div>
          <Link
            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 text-white"
            to="/duoc-si/don-cho-cap"
          >
            <span>Xem tất cả</span>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="table-responsive">
          <table
            className="table medicine-inventory__table mb-0"
            style={{ minWidth: '850px', width: '100%' }}
          >
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Mã đơn</th>
                <th style={{ width: '30%' }}>Bệnh nhân</th>
                <th style={{ width: '30%' }}>Bác sĩ</th>
                <th style={{ width: '15%' }}>Thời gian</th>
                <th className="text-end" style={{ width: '10%' }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-secondary">
                    Hiện chưa có đơn thuốc nào đang chờ tiếp nhận.
                  </td>
                </tr>
              ) : (
                pending.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="medicine-inventory__code">
                        {item.code}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong className="text-dark">{item.patient.fullName}</strong>
                        <small className="d-block text-secondary">
                          Mã BN: {item.patient.code}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong className="text-dark">{item.doctor.fullName}</strong>
                        <small className="d-block text-secondary">
                          Khoa: {item.doctor.specialty}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="text-nowrap text-secondary">
                        {dinhDangNgayGio(item.createdAt)}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="admin-crud-actions justify-content-end">
                        <button
                          className="btn btn-sm btn-primary text-nowrap"
                          disabled={isLoading}
                          onClick={() => void accept(item.id)}
                        >
                          <span className="material-symbols-outlined">
                            check_circle
                          </span>
                          Tiếp nhận
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
