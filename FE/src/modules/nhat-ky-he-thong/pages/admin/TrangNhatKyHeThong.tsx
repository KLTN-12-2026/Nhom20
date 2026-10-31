import { Fragment, useEffect, useMemo, useState } from 'react';

import '@/components/ui/admin-crud.css';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import { useAuditLogs } from '../../hooks/use-audit-logs';
import type {
  AuditLogQuery,
  SystemModule,
} from '../../types/audit-log.types';
import '../../system-log.css';

const LOGS_PER_PAGE = 10;

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

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

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
      limit: LOGS_PER_PAGE,
    }),
    [moduleFilter, page, searchTerm, timeFilter],
  );
  const { logs, meta, isLoading, error, reload } = useAuditLogs(query);

  const totalPages = Math.max(1, meta.totalPages);
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    meta.total === 0 ? 0 : (currentPage - 1) * meta.limit + 1;
  const displayedTo = Math.min(
    currentPage * meta.limit,
    meta.total,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const changeFilter = (callback: () => void) => {
    setPage(1);
    callback();
  };

  return (
    <div className="admin-crud-page system-log-page">
      <div className="system-log-heading">
        <div>
          <div className="system-log-eyebrow">
            Giám sát hệ thống
          </div>
          <h1>NHẬT KÝ HỆ THỐNG</h1>
          <p>
            Theo dõi các thao tác của người dùng và sự kiện đăng nhập trong hệ
            thống.
          </p>
        </div>
        <div className="admin-management-summary" aria-label="Tổng quan nhật ký">
          <span>
            <strong>{meta.total}</strong> hoạt động
          </span>
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
              <table
                className="table admin-management-table admin-management-table--system-logs align-middle mb-0"
                style={{ tableLayout: 'fixed', minWidth: '960px', width: '100%' }}
              >
                <colgroup>
                  <col style={{ width: '16%', minWidth: '150px' }} />
                  <col style={{ width: '28%', minWidth: '260px' }} />
                  <col style={{ width: '16%', minWidth: '150px' }} />
                  <col style={{ width: '40%', minWidth: '350px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ width: '16%', minWidth: '150px' }}>Thời gian</th>
                    <th style={{ width: '28%', minWidth: '260px' }}>Người thực hiện</th>
                    <th style={{ width: '16%', minWidth: '150px' }}>Phân hệ</th>
                    <th style={{ width: '40%', minWidth: '350px' }}>Hành động</th>
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
                          <div
                            className="d-flex align-items-center gap-3"
                            style={{ minWidth: 0 }}
                          >
                            {log.avatar ? (
                              <img
                                src={log.avatar}
                                alt={log.userName}
                                className="system-log-avatar flex-shrink-0"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <span className="system-log-avatar flex-shrink-0">
                                {getInitials(log.userName)}
                              </span>
                            )}
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <div
                                className="fw-semibold text-truncate"
                                title={log.userName}
                              >
                                {log.userName}
                              </div>
                              <small
                                className="text-secondary text-truncate d-block"
                                title={`${log.email || 'Không có email'} · ${log.role}`}
                              >
                                {log.email || 'Không có email'} · {log.role}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`system-log-module system-log-module--${log.module.toLocaleLowerCase()} text-nowrap`}
                          >
                            {MODULE_LABELS[log.module]}
                          </span>
                        </td>
                        <td>
                          <div
                            className="fw-semibold text-truncate"
                            title={log.action}
                          >
                            {log.action}
                          </div>
                          {log.detail && (
                            <small
                              className="text-secondary text-truncate d-block"
                              title={log.detail}
                            >
                              {log.detail}
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-5 text-center text-secondary">
                        <span className="material-symbols-outlined fs-1 d-block mb-2 text-secondary">
                          manage_search
                        </span>
                        <div>Chưa có hoạt động phù hợp.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {meta.total > 0 && (
              <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
                <span className="text-secondary small">
                  Hiển thị {displayedFrom}–{displayedTo} trong tổng số {meta.total} hoạt động
                </span>
                <nav
                  className="align-self-md-auto align-self-start"
                  aria-label="Phân trang nhật ký hệ thống"
                >
                  <ul className="pagination mb-0 flex-wrap">
                    <li
                      className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        aria-label="Trang trước"
                        disabled={currentPage <= 1}
                        onClick={() =>
                          setPage((current) => Math.max(1, current - 1))
                        }
                      >
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    {pageNumbers.map((pageNumber, index) => (
                      <Fragment key={pageNumber}>
                        {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                          <li
                            className="page-item disabled"
                            aria-hidden="true"
                          >
                            <span className="page-link">…</span>
                          </li>
                        )}
                        <li
                          className={`page-item ${
                            pageNumber === currentPage ? 'active' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            aria-current={
                              pageNumber === currentPage ? 'page' : undefined
                            }
                            onClick={() => setPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        </li>
                      </Fragment>
                    ))}
                    <li
                      className={`page-item ${
                        currentPage >= totalPages ? 'disabled' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        aria-label="Trang sau"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setPage((current) =>
                            Math.min(totalPages, current + 1),
                          )
                        }
                      >
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                  </ul>
                </nav>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
