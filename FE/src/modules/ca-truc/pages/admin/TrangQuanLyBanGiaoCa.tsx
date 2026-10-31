import { Fragment, useEffect, useState, useMemo } from 'react';
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

const HANDOVERS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

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
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / HANDOVERS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * HANDOVERS_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * HANDOVERS_PER_PAGE,
    filteredRows.length,
  );
  const visibleRows = useMemo(() => {
    const startIndex = (currentPage - 1) * HANDOVERS_PER_PAGE;
    return filteredRows.slice(startIndex, startIndex + HANDOVERS_PER_PAGE);
  }, [currentPage, filteredRows]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm người bàn giao, người nhận..."
          />
        </div>
        <button
          className="btn btn-outline-primary d-flex align-items-center gap-2 ms-auto"
          onClick={() => {
            loadData();
            setPage(1);
          }}
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
              <p>Hiển thị {filteredRows.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table
              className="table admin-management-table admin-management-table--handovers align-middle mb-0"
              style={{ tableLayout: 'fixed', minWidth: '1080px', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '14%', minWidth: '140px' }} />
                <col style={{ width: '14%', minWidth: '140px' }} />
                <col style={{ width: '12%', minWidth: '120px' }} />
                <col style={{ width: '12%', minWidth: '120px' }} />
                <col style={{ width: '12%', minWidth: '120px' }} />
                <col style={{ width: '11%', minWidth: '110px' }} />
                <col style={{ width: '12%', minWidth: '125px' }} />
                <col style={{ width: '13%', minWidth: '135px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '14%', minWidth: '140px' }}>Người bàn giao</th>
                  <th style={{ width: '14%', minWidth: '140px' }}>Người nhận</th>
                  <th style={{ width: '12%', minWidth: '120px' }}>Ca làm việc</th>
                  <th style={{ width: '12%', minWidth: '120px' }}>Tiền mặt hệ thống</th>
                  <th style={{ width: '12%', minWidth: '120px' }}>Tiền mặt thực tế</th>
                  <th style={{ width: '11%', minWidth: '110px' }}>Chênh lệch</th>
                  <th style={{ width: '12%', minWidth: '125px' }}>Trạng thái</th>
                  <th
                    className="text-end text-nowrap"
                    style={{ width: '13%', minWidth: '135px' }}
                  >
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong className="d-block text-truncate" title={row.sender}>
                        {row.sender}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`d-block text-truncate ${row.receiver ? '' : 'text-secondary fst-italic'}`}
                        title={row.receiver || 'Chưa có'}
                      >
                        {row.receiver || 'Chưa có'}
                      </span>
                    </td>
                    <td>
                      <span className="d-block text-truncate" title={row.shift}>
                        {row.shift}
                      </span>
                    </td>
                    <td className="fw-semibold text-secondary text-nowrap">
                      {money(row.cashSystem)}
                    </td>
                    <td className="fw-semibold text-nowrap">{money(row.cashActual)}</td>
                    <td>
                      {row.difference && row.difference !== 0 ? (
                        <span className="text-danger fw-bold text-nowrap">
                          {money(row.difference)}
                        </span>
                      ) : (
                        <span className="text-success fw-bold text-nowrap">
                          {money(row.difference)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${
                          statusClass[row.status] || 'badge-status-pending'
                        } text-nowrap`}
                      >
                        {statusLabel[row.status] || row.status}
                      </span>
                    </td>
                    <td className="text-end text-secondary text-nowrap">
                      {dinhDangNgayGio(row.submittedAt || row.createdAt)}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-5 text-center text-secondary">
                      {rows.length === 0
                        ? 'Chưa có dữ liệu bàn giao ca nào.'
                        : 'Không tìm thấy kết quả phù hợp.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredRows.length > 0 && (
            <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
              <span className="text-secondary small">
                Hiển thị {displayedFrom}–{displayedTo} trong tổng số {filteredRows.length} ca bàn giao
              </span>
              <nav className="align-self-md-auto align-self-start" aria-label="Phân trang bàn giao ca">
                <ul className="pagination mb-0 flex-wrap">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang trước"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <span aria-hidden="true">&laquo;</span>
                    </button>
                  </li>
                  {pageNumbers.map((pageNumber, index) => (
                    <Fragment key={pageNumber}>
                      {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                        <li className="page-item disabled" aria-hidden="true">
                          <span className="page-link">…</span>
                        </li>
                      )}
                      <li className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          aria-current={pageNumber === currentPage ? 'page' : undefined}
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    </Fragment>
                  ))}
                  <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang sau"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    >
                      <span aria-hidden="true">&raquo;</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}
