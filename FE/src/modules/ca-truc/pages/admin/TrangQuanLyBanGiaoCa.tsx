import { useEffect, useState, useMemo } from 'react';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import '@/components/ui/admin-crud.css';

type Handover = {
  id: number;
  status: string;
  sender: string;
  receiver: string | null;
  shift: string;
  cashSystem: number;
  cashActual: number | null;
  difference: number | null;
  note: string | null;
  createdAt: string;
  submittedAt: string | null;
};

const money = (value: number | null) =>
  value === null ? '—' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;

const statusLabel: Record<string, string> = {
  BAN_NHAP: 'Bản nháp',
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_BAN_GIAO: 'Đã bàn giao',
};

const statusClass: Record<string, string> = {
  BAN_NHAP: 'badge-status-pending',
  CHO_XAC_NHAN: 'badge-status-locked',
  DA_BAN_GIAO: 'badge-status-active',
};

export default function TrangQuanLyBanGiaoCa() {
  const { showToast } = useAppToast();
  const [rows, setRows] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    axiosClient
      .get<{ data: Handover[] }>('/receptionist-schedules/handovers')
      .then((response) => setRows(response.data.data || []))
      .catch((error) =>
        showToast(getApiErrorMessage(error, 'Không thể tải danh sách bàn giao ca'), 'danger')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [showToast]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) =>
      row.sender.toLowerCase().includes(keyword) ||
      (row.receiver && row.receiver.toLowerCase().includes(keyword)) ||
      row.shift.toLowerCase().includes(keyword)
    );
  }, [search, rows]);

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Kiểm soát ca làm</p>
          <h1>BÀN GIAO CA</h1>
          <p className="admin-management-description">
            Theo dõi các ca đã lưu nháp và gửi bàn giao của lễ tân / thu ngân.
          </p>
        </div>
      </div>

      <div className="admin-crud-toolbar">
        <div className="admin-crud-search">
          <span className="material-symbols-outlined">search</span>
          <input
            className="form-control"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm người bàn giao, người nhận..."
          />
        </div>
        <button
          className="btn btn-outline-primary d-flex align-items-center gap-2 ms-auto"
          onClick={loadData}
          disabled={loading}
        >
          <span className="material-symbols-outlined">refresh</span>
          Làm mới
        </button>
      </div>

      {loading && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary mb-3" />
          <span>Đang tải danh sách bàn giao ca...</span>
        </div>
      )}

      {!loading && (
        <div className="admin-management-table-card">
          <div className="admin-management-table-heading">
            <div>
              <h2>Danh sách bàn giao</h2>
              <p>{filteredRows.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table admin-management-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Người bàn giao</th>
                  <th>Người nhận</th>
                  <th>Ca làm việc</th>
                  <th>Tiền mặt hệ thống</th>
                  <th>Tiền mặt thực tế</th>
                  <th>Chênh lệch</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong className="d-block">{row.sender}</strong>
                    </td>
                    <td>
                      <span className={row.receiver ? '' : 'text-secondary fst-italic'}>
                        {row.receiver || 'Chưa có'}
                      </span>
                    </td>
                    <td>{row.shift}</td>
                    <td className="fw-semibold text-secondary">{money(row.cashSystem)}</td>
                    <td className="fw-semibold">{money(row.cashActual)}</td>
                    <td>
                      {row.difference && row.difference !== 0 ? (
                        <span className="text-danger fw-bold">{money(row.difference)}</span>
                      ) : (
                        <span className="text-success fw-bold">{money(row.difference)}</span>
                      )}
                    </td>
                    <td>
                      <span className={statusClass[row.status] || 'badge-status-pending'}>
                        {statusLabel[row.status] || row.status}
                      </span>
                    </td>
                    <td className="text-end text-secondary">
                      {dinhDangNgayGio(row.submittedAt || row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="admin-crud-empty py-5">
              {rows.length === 0
                ? 'Chưa có dữ liệu bàn giao ca nào.'
                : 'Không tìm thấy kết quả phù hợp.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
