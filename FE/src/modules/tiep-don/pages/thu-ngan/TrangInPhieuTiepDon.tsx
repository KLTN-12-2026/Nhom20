import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { receptionApi } from '../../api/reception.api';
import type { ReceptionTicketData } from '../../types/reception-ticket.types';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import '../../receptionist-workspace.css';

export default function TrangInPhieuTiepDon() {
  const { queueNumber } = useParams();
  const [ticket, setTicket] = useState<ReceptionTicketData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!queueNumber) {
      setError('Thiếu mã phiếu tiếp đón.');
      return;
    }

    // Luôn đọc từ API để mở trực tiếp hoặc tải lại trang không bị hiện dữ liệu giả.
    void receptionApi
      .getTicket(queueNumber)
      .then((response) => setTicket(response.data))
      .catch(() =>
        setError(
          'Không tìm thấy phiếu tiếp đón hoặc bạn không có quyền xem phiếu này.',
        ),
      );
  }, [queueNumber]);

  return (
    <div className="reception-print-page">
      <div className="reception-print-toolbar">
        <div>
          <h1>Phiếu tiếp đón bệnh nhân</h1>
          <p>Kiểm tra nội dung trước khi gửi lệnh in.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-outline-secondary" to="/thu-ngan/tiep-don">
            <span className="material-symbols-outlined me-2">arrow_back</span>
            Quay lại tiếp đón
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ticket}
            onClick={() => window.print()}
          >
            <span className="material-symbols-outlined me-2">print</span>
            In phiếu
          </button>
        </div>
      </div>

      {error ? (
        <section className="reception-print-sheet text-center py-5" aria-live="polite">
          <span className="material-symbols-outlined fs-1 text-secondary">error</span>
          <h2 className="h5 mt-3">Không thể tải phiếu tiếp đón</h2>
          <p className="mb-0 text-secondary">{error}</p>
        </section>
      ) : !ticket ? (
        <section className="reception-print-sheet text-center py-5" aria-live="polite">
          <span className="spinner-border text-primary" role="status" />
          <p className="mb-0 mt-3 text-secondary">Đang tải phiếu tiếp đón...</p>
        </section>
      ) : (
        <section className="reception-print-sheet" aria-label="Phiếu tiếp đón">
          <header className="reception-print-sheet__header">
            <div className="reception-print-sheet__brand">
              <div className="reception-ticket__brand">
                <span className="material-symbols-outlined">medical_services</span>
                <strong>SMART CLINIC</strong>
              </div>
              <small>Chăm sóc sức khỏe thông minh</small>
            </div>
            <div className="reception-print-sheet__document">
              <span>PHIẾU TIẾP ĐÓN</span>
              <strong>{ticket.queueNumber}</strong>
            </div>
          </header>

          <div className="reception-ticket__title">
            <p>PHIẾU TIẾP ĐÓN BỆNH NHÂN</p>
            <small>Vui lòng xuất trình phiếu khi được gọi vào phòng khám.</small>
          </div>

          <div className="reception-ticket__number" aria-label="Số thứ tự khám">
            <small>SỐ THỨ TỰ KHÁM</small>
            <strong>#{ticket.queueNumber}</strong>
          </div>

          <dl>
            <dt>Bệnh nhân</dt>
            <dd>{ticket.patientName}</dd>
            <dt>Số điện thoại</dt>
            <dd>{ticket.phoneNumber}</dd>
            <dt>Chuyên khoa</dt>
            <dd>{ticket.specialty}</dd>
            <dt>Bác sĩ / Phòng</dt>
            <dd>{ticket.doctorAndRoom}</dd>
            <dt>Mức ưu tiên</dt>
            <dd>{ticket.priority}</dd>
            <dt>Thời gian cấp phiếu</dt>
            <dd>{dinhDangNgayGio(ticket.issuedAt)}</dd>
          </dl>

          <section className="reception-ticket__note">
            <span className="material-symbols-outlined">campaign</span>
            <div><strong>Hướng dẫn</strong><span>Theo dõi bảng gọi số hoặc thông báo của lễ tân để vào khám đúng lượt.</span></div>
          </section>


        </section>
      )}
    </div>
  );
}
