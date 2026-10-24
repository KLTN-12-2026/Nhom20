import { useCallback, useEffect, useMemo, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { dispensingApi } from '../../api/dispensing.api';
import PharmacyPageHeader from '../../components/PharmacyPageHeader';
import type { DispensingPrescription } from '../../types/dispensing.types';
import '../../pharmacist-workspace.css';

type StatusFilterTab = 'ALL' | 'DA_CAP_THUOC' | 'TU_CHOI_CAP_THUOC';

export default function TrangLichSuCapThuoc() {
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusFilterTab>('ALL');
  const [rows, setRows] = useState<DispensingPrescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DispensingPrescription | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dispensingApi.getHistory({
        search: search.trim() || undefined,
        limit: 100,
      });
      setRows(response.data.data.items);
    } catch (error) {
      showToast(
        getApiErrorMessage(error, 'Không thể tải lịch sử cấp thuốc'),
        'danger',
      );
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const daCap = rows.filter(
      (r) => r.status === 'DA_CAP_THUOC' || r.status === 'DA_CAP',
    ).length;
    const tuChoi = rows.filter((r) => r.status === 'TU_CHOI_CAP_THUOC').length;
    return { all: rows.length, daCap, tuChoi };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (statusTab === 'ALL') return rows;
    if (statusTab === 'DA_CAP_THUOC') {
      return rows.filter(
        (r) => r.status === 'DA_CAP_THUOC' || r.status === 'DA_CAP',
      );
    }
    if (statusTab === 'TU_CHOI_CAP_THUOC') {
      return rows.filter((r) => r.status === 'TU_CHOI_CAP_THUOC');
    }
    return rows;
  }, [rows, statusTab]);

  return (
    <div className="pharmacy-page">
      <PharmacyPageHeader
        title="Lịch sử cấp thuốc"
        description="Tra cứu các đơn thuốc đã hoàn tất hoặc đã từ chối cấp."
      />
      <section className="pharmacy-panel">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div className="pharmacy-filter m-0" style={{ maxWidth: 360, flex: '1 1 280px' }}>
            <div className="input-group">
              <span className="input-group-text">
                <span className="material-symbols-outlined">search</span>
              </span>
              <input
                className="form-control"
                placeholder="Tìm mã đơn hoặc bệnh nhân..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ minWidth: 220 }}>
            <select
              className="form-select"
              value={statusTab}
              onChange={(e) => setStatusTab(e.target.value as StatusFilterTab)}
            >
              <option value="ALL">Tất cả trạng thái ({counts.all})</option>
              <option value="DA_CAP_THUOC">Đã cấp thuốc ({counts.daCap})</option>
              <option value="TU_CHOI_CAP_THUOC">Từ chối cấp ({counts.tuChoi})</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table pharmacy-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Bệnh nhân</th>
                <th>Dược sĩ</th>
                <th>Số loại</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-secondary">
                    Chưa có dữ liệu phù hợp
                  </td>
                </tr>
              )}
              {filteredRows.map((item) => {
                const isRefused = item.status === 'TU_CHOI_CAP_THUOC';
                const pharmacistName =
                  item.pharmacist?.fullName ??
                  item.refusal?.pharmacist?.fullName ??
                  '—';
                const actionTime = item.dispensedAt
                  ? dinhDangNgayGio(item.dispensedAt)
                  : item.refusal?.refusedAt
                  ? dinhDangNgayGio(item.refusal.refusedAt)
                  : '—';

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.code}</strong>
                    </td>
                    <td>{item.patient.fullName}</td>
                    <td>{pharmacistName}</td>
                    <td>{item.items.length}</td>
                    <td>{actionTime}</td>
                    <td>
                      {isRefused ? (
                        <span className="pharmacy-badge pharmacy-badge--red">
                          Từ chối cấp
                        </span>
                      ) : item.status === 'DA_CAP_THUOC' ||
                        item.status === 'DA_CAP' ? (
                        <span className="pharmacy-badge pharmacy-badge--green">
                          Đã cấp thuốc
                        </span>
                      ) : (
                        <span className="pharmacy-badge pharmacy-badge--gray">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                        onClick={() => setSelectedItem(item)}
                        title="Xem chi tiết đơn thuốc"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          visibility
                        </span>
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="text-secondary small mt-2">Đang tải dữ liệu...</div>
        )}
      </section>

      {selectedItem && (
        <AppModal
          title={`Chi tiết đơn thuốc #${selectedItem.code}`}
          onClose={() => setSelectedItem(null)}
          size="lg"
          footer={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSelectedItem(null)}
            >
              Đóng
            </button>
          }
        >
          <div className="d-flex flex-column gap-3">
            {selectedItem.status === 'TU_CHOI_CAP_THUOC' && (
              <div className="alert alert-danger d-flex align-items-start gap-2 mb-0">
                <span className="material-symbols-outlined text-danger fs-4">
                  cancel
                </span>
                <div>
                  <h6 className="alert-heading fw-bold mb-1">
                    Đơn thuốc đã bị từ chối cấp
                  </h6>
                  <p className="mb-1">
                    <strong>Lý do từ chối:</strong>{' '}
                    <span className="text-danger fw-semibold">
                      {selectedItem.refusal?.reason || 'Không có lý do cụ thể'}
                    </span>
                  </p>
                  <div className="small text-muted">
                    <span>
                      Dược sĩ từ chối:{' '}
                      <strong>
                        {selectedItem.refusal?.pharmacist?.fullName ?? 'Hệ thống'}
                      </strong>
                    </span>
                    {selectedItem.refusal?.refusedAt && (
                      <span> • {dinhDangNgayGio(selectedItem.refusal.refusedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="card border-0 bg-light">
              <div className="card-body p-3">
                <div className="row g-2 small">
                  <div className="col-12 col-md-6">
                    <span className="text-muted">Bệnh nhân:</span>{' '}
                    <strong>{selectedItem.patient.fullName}</strong>{' '}
                    <span className="text-muted">({selectedItem.patient.code})</span>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted">Bác sĩ kê đơn:</span>{' '}
                    <strong>{selectedItem.doctor.fullName}</strong>{' '}
                    <span className="text-muted">({selectedItem.doctor.specialty})</span>
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted">Trạng thái:</span>{' '}
                    {selectedItem.status === 'TU_CHOI_CAP_THUOC' ? (
                      <span className="pharmacy-badge pharmacy-badge--red">
                        Từ chối cấp
                      </span>
                    ) : (
                      <span className="pharmacy-badge pharmacy-badge--green">
                        Đã cấp thuốc
                      </span>
                    )}
                  </div>
                  <div className="col-12 col-md-6">
                    <span className="text-muted">Thời gian thực hiện:</span>{' '}
                    <strong>
                      {selectedItem.dispensedAt
                        ? dinhDangNgayGio(selectedItem.dispensedAt)
                        : selectedItem.refusal?.refusedAt
                        ? dinhDangNgayGio(selectedItem.refusal.refusedAt)
                        : dinhDangNgayGio(selectedItem.createdAt)}
                    </strong>
                  </div>
                  {selectedItem.diagnosis && (
                    <div className="col-12">
                      <span className="text-muted">Chẩn đoán:</span>{' '}
                      <strong>{selectedItem.diagnosis}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h6 className="fw-bold mb-2">Danh sách thuốc trong đơn</h6>
              <div className="table-responsive border rounded">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Tên thuốc</th>
                      <th className="text-center">Số lượng</th>
                      <th>Đơn vị</th>
                      <th>Liều lượng & Hướng dẫn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted py-3">
                          Không có thông tin chi tiết thuốc
                        </td>
                      </tr>
                    ) : (
                      selectedItem.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{it.medicine?.name || 'Thuốc'}</strong>
                          </td>
                          <td className="text-center fw-semibold">
                            {it.quantity}
                          </td>
                          <td>{it.medicine?.unit || '—'}</td>
                          <td>
                            {it.dosage && <div>{it.dosage}</div>}
                            {it.instructions && (
                              <small className="text-muted">{it.instructions}</small>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
