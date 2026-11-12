import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import '@/components/ui/admin-crud.css';
import { useAppToast } from '@/components/ui/use-app-toast';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';
import '@/modules/tiep-don/receptionist-workspace.css';

type PendingHandover = {
  id: number;
  sender: string;
  senderPhone: string | null;
  shift: string;
  workingDate: string;
  submittedAt: string | null;
  systemCash: number;
  actualCash: number | null;
  transferAmount: number;
  difference: number | null;
  differenceReason: string | null;
  pendingItemCount: number;
  checklist: string[];
  note: string | null;
};

const ITEMS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

const money = (value: number | null) =>
  value === null ? 'Chưa kiểm đếm' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;

function formatDate(value: string | null) {
  return value ? dinhDangNgayGio(value) : 'Chưa gửi';
}

export default function TrangNhanBanGiaoCa() {
  const user = useAuthStore((state) => state.user);
  const canConfirm = hasPermission(user, 'BAN_GIAO_CA.UPDATE');
  const { showToast } = useAppToast();
  const [handovers, setHandovers] = useState<PendingHandover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<PendingHandover | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(handovers.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    handovers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * ITEMS_PER_PAGE, handovers.length);
  const paginatedHandovers = useMemo(
    () =>
      handovers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
      ),
    [currentPage, handovers],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const loadHandovers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get<{ data: PendingHandover[] }>('/receptionist-schedules/handover/pending');
      setHandovers(response.data.data ?? []);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải bàn giao đang chờ'), 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadHandovers(); }, [loadHandovers]);

  const confirmReceipt = async () => {
    if (!selected) return;
    setIsConfirming(true);
    try {
      await axiosClient.post(`/receptionist-schedules/handover/${selected.id}/confirm-receipt`);
      setHandovers((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      showToast('Đã xác nhận nhận bàn giao ca', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể xác nhận bàn giao'), 'danger');
    } finally {
      setIsConfirming(false);
    }
  };

  return <div className="reception-page medicine-inventory admin-crud-page">
    <div className="admin-crud-heading d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <p className="admin-management-eyebrow">NHẬN CA VÀ ĐỐI CHIẾU</p>
        <h1 className="mb-0">NHẬN BÀN GIAO CA</h1>
        <p className="admin-management-description mb-0 mt-1">
          Kiểm tra quỹ tiền mặt, giao dịch và công việc tồn trước khi xác nhận nhận ca.
        </p>
      </div>
      <div>
        <span className="reception-badge reception-badge--amber text-nowrap">{handovers.length} chờ xác nhận</span>
      </div>
    </div>

    <section className="reception-card">
      <div className="reception-card__header">
        <div>
          <h2>Bàn giao chờ bạn xác nhận</h2>
          <p className="mb-0 text-secondary small">Chỉ bạn — người được chọn nhận ca — mới có thể xác nhận.</p>
        </div>
      </div>
      <div className="table-responsive">
        <table
          className="table reception-table align-middle mb-0"
          style={{ tableLayout: 'fixed', minWidth: '950px', width: '100%' }}
        >
          <colgroup>
            <col style={{ width: '22%', minWidth: '200px' }} />
            <col style={{ width: '18%', minWidth: '160px' }} />
            <col style={{ width: '16%', minWidth: '150px' }} />
            <col style={{ width: '15%', minWidth: '130px' }} />
            <col style={{ width: '14%', minWidth: '120px' }} />
            <col style={{ width: '15%', minWidth: '140px' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: '22%', minWidth: '200px' }}>Người bàn giao</th>
              <th style={{ width: '18%', minWidth: '160px' }}>Ca làm việc</th>
              <th style={{ width: '16%', minWidth: '150px' }}>Thời gian gửi</th>
              <th style={{ width: '15%', minWidth: '130px' }}>Tiền mặt thực tế</th>
              <th style={{ width: '14%', minWidth: '120px' }}>Chênh lệch</th>
              <th className="text-end" style={{ width: '15%', minWidth: '140px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center text-secondary py-5">Đang tải bàn giao ca...</td></tr>}
            {!isLoading && handovers.length === 0 && <tr><td colSpan={6} className="text-center text-secondary py-5">Bạn chưa có bàn giao ca nào cần xác nhận.</td></tr>}
            {!isLoading && paginatedHandovers.map((item) => <tr key={item.id}>
              <td><strong>{item.sender}</strong><span className="d-block text-secondary small">{item.senderPhone ?? 'Không có số điện thoại'}</span></td>
              <td>{item.shift}<span className="d-block text-secondary small">{formatDate(item.workingDate)}</span></td>
              <td>{formatDate(item.submittedAt)}</td>
              <td>{money(item.actualCash)}</td>
              <td className={item.difference ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>{money(item.difference)}</td>
              <td className="text-end"><button type="button" className="btn btn-primary btn-sm text-nowrap" style={{ minHeight: '32px', height: '32px', padding: '0 12px', fontSize: '0.8125rem' }} onClick={() => setSelected(item)}>{canConfirm ? 'Xem & xác nhận' : 'Xem chi tiết'}</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!isLoading && handovers.length > 0 && (
        <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-3 py-2 border-top">
          <span className="text-secondary small">
            Hiển thị {displayedFrom}–{displayedTo} trong tổng số {handovers.length} bàn giao
          </span>
          <nav aria-label="Phân trang nhận ca">
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
    </section>

    {selected && <AppModal
      size="lg"
      title="Xác nhận nhận bàn giao"
      onClose={() => !isConfirming && setSelected(null)}
      footer={<><button type="button" className="btn btn-outline-secondary" disabled={isConfirming} onClick={() => setSelected(null)}>Quay lại</button>{canConfirm && <button type="button" className="btn btn-primary" disabled={isConfirming} onClick={() => void confirmReceipt()}>{isConfirming ? 'Đang xác nhận...' : 'Xác nhận đã nhận ca'}</button>}</>}
    >
      <div className="row g-3">
        <div className="col-md-6"><small className="text-secondary d-block">Người bàn giao</small><strong>{selected.sender}</strong></div>
        <div className="col-md-6"><small className="text-secondary d-block">Ca làm việc</small><strong>{selected.shift} · {formatDate(selected.workingDate)}</strong></div>
        <div className="col-md-4"><small className="text-secondary d-block">Tiền mặt hệ thống</small><strong>{money(selected.systemCash)}</strong></div>
        <div className="col-md-4"><small className="text-secondary d-block">Tiền mặt thực tế</small><strong>{money(selected.actualCash)}</strong></div>
        <div className="col-md-4"><small className="text-secondary d-block">Chênh lệch</small><strong className={selected.difference ? 'text-danger' : 'text-success'}>{money(selected.difference)}</strong></div>
        <div className="col-12"><div className="border rounded-3 p-3"><strong>Checklist bàn giao</strong><ul className="mb-0 mt-2 ps-3">{selected.checklist.length ? selected.checklist.map((item) => <li key={item}>{item}</li>) : <li>Chưa có checklist.</li>}</ul></div></div>
        {(selected.note || selected.differenceReason || selected.pendingItemCount > 0) && <div className="col-12"><div className="border rounded-3 p-3"><strong>Lưu ý từ ca trước</strong>{selected.note && <p className="mb-1 mt-2">{selected.note}</p>}{selected.differenceReason && <p className="mb-1 text-danger">Lý do chênh lệch: {selected.differenceReason}</p>}{selected.pendingItemCount > 0 && <p className="mb-0 text-warning-emphasis">Còn {selected.pendingItemCount} phiếu chờ xử lý.</p>}</div></div>}
      </div>
      <p className="small text-secondary mt-3 mb-0">Khi xác nhận, trạng thái bàn giao chuyển thành “Đã bàn giao” và hệ thống lưu thời điểm xác nhận.</p>
    </AppModal>}
  </div>;
}
