import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '@/modules/bac-si/doctor-workspace.css';

import { queueApi } from '../../api/queue.api';
import { useDoctorQueue } from '../../hooks/use-doctor-queue';
import type { QueueStatus, QueueTicket } from '../../types/queue.types';

const TICKETS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

const STATUS_LABELS: Record<QueueStatus, string> = {
  CHO_GOI: 'Chờ gọi',
  DANG_GOI: 'Đang gọi',
  BO_QUA: 'Đã bỏ qua',
  DA_VAO_PHONG: 'Đang khám',
  DA_HOAN_TAT: 'Đã hoàn tất',
  DA_HUY: 'Đã hủy',
};

export default function TrangHangDoiKham() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const { tickets, isLoading, error, reload } = useDoctorQueue();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      if (a.status === 'DA_VAO_PHONG' && b.status !== 'DA_VAO_PHONG') return -1;
      if (b.status === 'DA_VAO_PHONG' && a.status !== 'DA_VAO_PHONG') return 1;
      return a.ordinalNumber - b.ordinalNumber;
    });
  }, [tickets]);

  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / TICKETS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    sortedTickets.length === 0 ? 0 : (currentPage - 1) * TICKETS_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * TICKETS_PER_PAGE, sortedTickets.length);
  const paginatedTickets = useMemo(
    () =>
      sortedTickets.slice(
        (currentPage - 1) * TICKETS_PER_PAGE,
        currentPage * TICKETS_PER_PAGE,
      ),
    [currentPage, sortedTickets],
  );

  const runAction = async (
    ticket: QueueTicket,
    action: 'call' | 'skip' | 'enter-room',
  ) => {
    setProcessingId(ticket.id);
    try {
      const response =
        action === 'call'
          ? await queueApi.call(ticket.id)
          : action === 'skip'
            ? await queueApi.skip(ticket.id)
            : await queueApi.enterRoom(ticket.id);
      showToast(response.message);
      await reload();
      if (action === 'enter-room') {
        void navigate(
          `/bac-si/kham-benh?luotKhamId=${ticket.visit.id}`,
        );
      }
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể cập nhật hàng đợi'),
        'danger',
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading align-items-end">
        <div>
          <p className="admin-management-eyebrow">
            Tiếp nhận khám bệnh
          </p>
          <h1>HÀNG ĐỢI KHÁM</h1>
          <p className="admin-management-description">
            Danh sách bệnh nhân được cập nhật tự động sau khi hoàn tất tiếp nhận và phân công bác sĩ tại quầy lễ tân.
          </p>
        </div>
      </header>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-4">
          <div className="doctor-stat">
            <div className="doctor-stat__icon">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <div className="doctor-stat__value">{tickets.length}</div>
              <div className="doctor-stat__label">Đang trong hàng đợi</div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-8">
          <div className="doctor-note h-100 d-flex align-items-center">
            <span className="material-symbols-outlined me-2">info</span>
            Gọi số trước, chờ bệnh nhân tới phòng rồi mới xác nhận vào phòng khám.
          </div>
        </div>
      </div>

      <section className="doctor-panel overflow-hidden">
        {isLoading && (
          <div className="doctor-empty">
            <div className="spinner-border text-primary mb-3" />
            <div>Đang tải hàng đợi...</div>
          </div>
        )}
        {!isLoading && error && (
          <div className="doctor-empty">
            <span className="material-symbols-outlined">error</span>
            <p className="text-danger">{error}</p>
            <button className="btn btn-outline-primary" onClick={() => void reload()}>
              Thử lại
            </button>
          </div>
        )}
        {!isLoading && !error && sortedTickets.length === 0 && (
          <div className="doctor-empty">
            <span className="material-symbols-outlined">hourglass_empty</span>
            <strong>Chưa có bệnh nhân chờ khám</strong>
            <div>Danh sách sẽ tự hiện khi lễ tân cấp phiếu.</div>
          </div>
        )}
        {!isLoading && !error && sortedTickets.length > 0 && (
          <>
            <div className="table-responsive">
              <table
                className="table doctor-table align-middle mb-0"
                style={{ tableLayout: 'fixed', width: '100%' }}
              >
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '21%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ width: '10%' }}>Số phiếu</th>
                    <th style={{ width: '22%' }}>Bệnh nhân</th>
                    <th style={{ width: '22%' }}>Lý do khám</th>
                    <th style={{ width: '13%' }}>Phòng</th>
                    <th style={{ width: '12%' }}>Trạng thái</th>
                    <th className="text-end" style={{ width: '21%' }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map((ticket) => {
                    const isInRoom = ticket.status === 'DA_VAO_PHONG';
                    return (
                      <tr key={ticket.id} className={isInRoom ? 'table-light' : undefined}>
                        <td>
                          <span className="doctor-queue-number">{ticket.queueNumber}</span>
                        </td>
                        <td>
                          <strong className="d-block text-dark">{ticket.patient.fullName}</strong>
                          <small className="text-secondary">{ticket.patient.code}</small>
                        </td>
                        <td className="text-truncate" title={ticket.visit.reason || ''}>
                          {ticket.visit.reason || '—'}
                        </td>
                        <td>{ticket.room?.name ?? 'Chưa phân phòng'}</td>
                        <td>
                          {isInRoom ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 text-nowrap">
                              {STATUS_LABELS[ticket.status]}
                            </span>
                          ) : (
                            <span className={`doctor-status text-nowrap ${ticket.status === 'DANG_GOI' ? 'doctor-status--ready' : 'doctor-status--waiting'}`}>
                              {STATUS_LABELS[ticket.status]}
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex flex-nowrap align-items-center justify-content-end gap-1">
                            {isInRoom ? (
                              <button
                                className="btn btn-sm btn-success text-nowrap d-inline-flex align-items-center gap-1"
                                style={{ minHeight: '32px', height: '32px', padding: '0 10px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                                onClick={() => void navigate(`/bac-si/kham-benh?luotKhamId=${ticket.visit.id}`)}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
                                <span>Tiếp tục khám</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  className="btn btn-sm btn-primary text-nowrap"
                                  style={{ minHeight: '32px', height: '32px', padding: '0 8px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                                  disabled={processingId === ticket.id}
                                  onClick={() => void runAction(ticket, 'call')}
                                >
                                  {ticket.status === 'DANG_GOI' ? 'Gọi lại' : 'Gọi số'}
                                </button>
                                {ticket.status !== 'BO_QUA' && (
                                  <button
                                    className="btn btn-sm btn-outline-secondary text-nowrap"
                                    style={{ minHeight: '32px', height: '32px', padding: '0 8px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                                    disabled={processingId === ticket.id}
                                    onClick={() => void runAction(ticket, 'skip')}
                                  >
                                    Bỏ qua
                                  </button>
                                )}
                                {ticket.status === 'DANG_GOI' && (
                                  <button
                                    className="btn btn-sm btn-primary text-nowrap"
                                    style={{ minHeight: '32px', height: '32px', padding: '0 8px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                                    disabled={processingId === ticket.id}
                                    onClick={() => void runAction(ticket, 'enter-room')}
                                  >
                                    Vào phòng
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sortedTickets.length > 0 && (
              <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-3 py-2 border-top">
                <span className="text-secondary small">
                  Hiển thị {displayedFrom}–{displayedTo} trong tổng số {sortedTickets.length} bệnh nhân
                </span>
                <nav aria-label="Phân trang hàng đợi khám">
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
          </>
        )}
      </section>
    </div>
  );
}
