import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import '@/modules/bac-si/doctor-workspace.css';

import { queueApi } from '../../api/queue.api';
import { useDoctorQueue } from '../../hooks/use-doctor-queue';
import type { QueueStatus, QueueTicket } from '../../types/queue.types';

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

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      if (a.status === 'DA_VAO_PHONG' && b.status !== 'DA_VAO_PHONG') return -1;
      if (b.status === 'DA_VAO_PHONG' && a.status !== 'DA_VAO_PHONG') return 1;
      return a.ordinalNumber - b.ordinalNumber;
    });
  }, [tickets]);

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
    <div className="doctor-page">
      <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
        <div>
          <div className="doctor-page__eyebrow">Bệnh nhân đã tiếp nhận</div>
          <h1 className="doctor-page__title">Hàng đợi khám</h1>
          <p className="doctor-page__description">
            Danh sách tự cập nhật ngay khi lễ tân cấp phiếu cho đúng bác sĩ.
          </p>
        </div>
        <button
          className="btn btn-outline-primary align-self-start d-flex align-items-center gap-2"
          onClick={() => void reload()}
          disabled={isLoading}
        >
          <span className="material-symbols-outlined">refresh</span>
          Làm mới
        </button>
      </div>

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
          <div className="table-responsive">
            <table className="table doctor-table mb-0">
              <thead>
                <tr>
                  <th>Số phiếu</th>
                  <th>Bệnh nhân</th>
                  <th>Lý do khám</th>
                  <th>Phòng</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedTickets.map((ticket) => {
                  const isInRoom = ticket.status === 'DA_VAO_PHONG';
                  return (
                    <tr key={ticket.id} className={isInRoom ? 'table-light' : undefined}>
                      <td>
                        <span className="doctor-queue-number">{ticket.queueNumber}</span>
                      </td>
                      <td>
                        <strong className="d-block">{ticket.patient.fullName}</strong>
                        <small className="text-secondary">{ticket.patient.code}</small>
                      </td>
                      <td>{ticket.visit.reason}</td>
                      <td>{ticket.room?.name ?? 'Chưa phân phòng'}</td>
                      <td>
                        {isInRoom ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            {STATUS_LABELS[ticket.status]}
                          </span>
                        ) : (
                          <span className={`doctor-status ${ticket.status === 'DANG_GOI' ? 'doctor-status--ready' : 'doctor-status--waiting'}`}>
                            {STATUS_LABELS[ticket.status]}
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                          {isInRoom ? (
                            <button
                              className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                              onClick={() => void navigate(`/bac-si/kham-benh?luotKhamId=${ticket.visit.id}`)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
                              Tiếp tục khám
                            </button>
                          ) : (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                disabled={processingId === ticket.id}
                                onClick={() => void runAction(ticket, 'call')}
                              >
                                {ticket.status === 'DANG_GOI' ? 'Gọi lại' : 'Gọi số'}
                              </button>
                              {ticket.status !== 'BO_QUA' && (
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={processingId === ticket.id}
                                  onClick={() => void runAction(ticket, 'skip')}
                                >
                                  Bỏ qua
                                </button>
                              )}
                              {ticket.status === 'DANG_GOI' && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  disabled={processingId === ticket.id}
                                  onClick={() => void runAction(ticket, 'enter-room')}
                                >
                                  Vào phòng khám
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
        )}
      </section>
    </div>
  );
}
