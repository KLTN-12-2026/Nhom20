import { useMemo, useState } from 'react';

import '@/components/ui/admin-crud.css';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import { useAuditLogs } from '../../hooks/use-audit-logs';
import type {
  AuditLogQuery,
  SystemModule,
} from '../../types/audit-log.types';
import '../../system-log.css';

const MODULE_LABELS: Record<SystemModule, string> = {
  XAC_THUC: 'Xác thực',
  NGUOI_DUNG: 'Người dùng',
  BAC_SI: 'Bác sĩ',
  CHUYEN_KHOA: 'Chuyên khoa',
  BENH_NHAN: 'Bệnh nhân',
  LICH_HEN: 'Lịch hẹn',
  THUOC: 'Thuốc',
  HE_THONG: 'Hệ thống',
};

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatLogDate(value: string) {
  const date = new Date(value);
  return {
    time: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date),
    date: dinhDangNgay(date),
  };
}

function getTimeRange(timeFilter: string) {
  if (timeFilter === 'ALL') return {};

  const now = new Date();
  const from = new Date(now);
  if (timeFilter === 'TODAY') {
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 7);
  }

  return { from: from.toISOString(), to: now.toISOString() };
}

export default function TrangNhatKyHeThong() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const query = useMemo<AuditLogQuery>(
    () => ({
      search: searchTerm.trim() || undefined,
      module: (moduleFilter as SystemModule) || undefined,
      ...getTimeRange(timeFilter),
      page,
      limit: 20,
    }),
    [moduleFilter, page, searchTerm, timeFilter],
  );
  const { logs, meta, isLoading, error, reload } = useAuditLogs(query);

  const changeFilter = (callback: () => void) => {
    setPage(1);
    callback();
  };

  return (
    <div className="admin-crud-page system-log-page">
      <div className="system-log-heading">
        <div>
          <div className="system-log-eyebrow">
            <span className="material-symbols-outlined">history</span>
            Giám sát hệ thống
          </div>
          <h1>NHẬT KÝ HỆ THỐNG</h1>
          <p>
            Theo dõi các thao tác của người dùng và sự kiện đăng nhập trong hệ
            thống.
          </p>
        </div>

      </div>

      <div className="system-log-filters">
        <div className="system-log-filter">
          <span className="material-symbols-outlined">calendar_today</span>
          <select
            className="form-select"
            value={timeFilter}
            onChange={(event) =>
              changeFilter(() => setTimeFilter(event.target.value))
            }
            aria-label="Lọc theo thời gian"
          >
            <option value="ALL">Tất cả thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="SEVEN_DAYS">7 ngày qua</option>
          </select>
        </div>

        <div className="system-log-filter system-log-filter--search">
          <span className="material-symbols-outlined">person_search</span>
          <input
            type="search"
            className="form-control"
            value={searchTerm}
            onChange={(event) =>
              changeFilter(() => setSearchTerm(event.target.value))
            }
            placeholder="Tìm người dùng, email hoặc hành động..."
          />
        </div>

        <div className="system-log-filter">
          <span className="material-symbols-outlined">filter_list</span>
          <select
            className="form-select"
            value={moduleFilter}
            onChange={(event) =>
              changeFilter(() => setModuleFilter(event.target.value))
            }
            aria-label="Lọc theo phân hệ"
          >
            <option value="">Tất cả phân hệ</option>
            {Object.entries(MODULE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="system-log-table-card">
        {isLoading && (
          <div className="admin-crud-empty">
            <div className="spinner-border text-primary mb-3" role="status" />
            <div>Đang tải nhật ký hệ thống...</div>
          </div>
        )}

        {!isLoading && error && (
          <div className="admin-crud-empty">
            <p className="text-danger">{error}</p>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => void reload()}
            >
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Phân hệ</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const date = formatLogDate(log.occurredAt);
                    return (
                      <tr key={log.id}>
                        <td className="text-nowrap">
                          <div className="fw-semibold">{date.time}</div>
                          <small className="text-secondary">{date.date}</small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            {log.avatar ? (
                              <img src={log.avatar} alt={log.userName} className="system-log-avatar" style={{ objectFit: 'cover' }} />
                            ) : (
                              <span className="system-log-avatar">
                                {getInitials(log.userName)}
                              </span>
                            )}
                            <div>
                              <div className="fw-semibold">{log.userName}</div>
                              <small className="text-secondary">
                                {log.email || 'Không có email'} · {log.role}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`system-log-module system-log-module--${log.module.toLocaleLowerCase()}`}
                          >
                            {MODULE_LABELS[log.module]}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold">{log.action}</div>
                          {log.detail && (
                            <small className="text-secondary">
                              {log.detail}
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="admin-crud-empty">
                          <span className="material-symbols-outlined fs-1 mb-2">
                            manage_search
                          </span>
                          <div>Chưa có hoạt động phù hợp.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="system-log-footer">
              <span>
                Hiển thị {logs.length} trong {meta.total} hoạt động
              </span>
              {meta.totalPages > 1 && (
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Trang trước
                  </button>
                  <span>
                    Trang {meta.page}/{meta.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
