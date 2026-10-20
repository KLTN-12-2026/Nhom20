import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import { maHoaNoiDung, moCuaSoIn } from '@/utils/in-an';

import { patientPortalApi } from '../api/patient-portal.api';
import { useAuth } from '../../xac-thuc/hooks/use-auth';
import { usePatientPortal } from '../hooks/use-patient-portal';
import type { PatientVisit } from '../types/patient-portal.types';

const MONEY_FORMATTER = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const STATUS_LABELS: Record<string, string> = {
  DA_HOAN_TAT: 'Đã hoàn tất', DA_THANH_TOAN: 'Đã thanh toán', CHUA_THANH_TOAN: 'Chưa thanh toán',
  CHO_THANH_TOAN: 'Chờ thanh toán', CHO_DUYET: 'Chờ duyệt', DA_HIEN_THI: 'Đã hiển thị', DA_AN: 'Đã ẩn',
};

function label(value: string) { return STATUS_LABELS[value] ?? value.replaceAll('_', ' '); }
function date(value: string | null) { return value ? dinhDangNgayGio(value) : 'Chưa cập nhật'; }

interface DialogProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  subtitle?: string;
}

function Dialog({ children, onClose, title, subtitle }: DialogProps) {
  return createPortal(
    <div className="patient-history-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button className="patient-history-modal__backdrop" aria-label="Đóng" onClick={onClose} />
      <div className="patient-history-modal__dialog">
        <div className="patient-history-modal__surface">
          <div className="patient-history-modal__header">
            <div><h3 className="modal-title fs-5">{title}</h3>{subtitle && <small className="text-secondary">{subtitle}</small>}</div>
            <button className="btn-close" onClick={onClose} aria-label="Đóng" />
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PatientMedicalHistorySection() {
  const { showToast } = useAppToast();
  const { user } = useAuth();
  const { visits, isLoading, error, reload } = usePatientPortal(true);
  const [selectedVisit, setSelectedVisit] = useState<PatientVisit | null>(null);
  const [reviewVisit, setReviewVisit] = useState<PatientVisit | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const countSummary = useMemo(() => `${visits.length} lượt khám của riêng tài khoản đang đăng nhập`, [visits.length]);

  // Chỉ cho phép mở modal đánh giá khi lượt khám đã hoàn tất + thanh toán và chưa có đánh giá
  const openReview = (visit: PatientVisit) => {
    if (!visit.isReviewable || visit.review) return;
    setReviewVisit(visit);
    setRating(5);
    setComment('');
  };

  const printPrescription = (visit: PatientVisit) => {
    if (!visit.prescription) return;

    // In đơn thuốc từ dữ liệu lượt khám mà bệnh nhân đang xem, không dùng dữ liệu mẫu.
    const medicineRows = visit.prescription.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${maHoaNoiDung(item.name)}</strong><br /><small>${maHoaNoiDung(item.activeIngredient ?? 'Chưa cập nhật hoạt chất')}</small></td>
        <td>${item.quantity} ${maHoaNoiDung(item.unit)}</td>
        <td>${maHoaNoiDung(item.dosage)} · ${maHoaNoiDung(item.frequency)} · ${item.days} ngày${item.instruction ? `<br /><small>${maHoaNoiDung(item.instruction)}</small>` : ''}</td>
      </tr>`).join('');

    moCuaSoIn('Đơn thuốc', `
      <header class="thuong-hieu"><h1>SMART CLINIC</h1><p>Chăm sóc sức khỏe thông minh</p></header>
      <h2>ĐƠN THUỐC</h2>
      <div class="meta">Mã đơn: ${maHoaNoiDung(visit.prescription.code)} · Ngày khám: ${dinhDangNgayGio(visit.examinedAt)}</div>
      <div class="dong"><strong>Bệnh nhân</strong><span>${maHoaNoiDung(user?.fullName ?? 'Chưa cập nhật')}</span></div>
      <div class="dong"><strong>Bác sĩ</strong><span>${maHoaNoiDung(visit.doctor?.name ?? 'Chưa cập nhật')}</span></div>
      <div class="dong"><strong>Chuyên khoa</strong><span>${maHoaNoiDung(visit.specialty?.name ?? 'Chưa cập nhật')}</span></div>
      <div class="dong"><strong>Chẩn đoán</strong><span>${maHoaNoiDung(visit.diagnosis ?? 'Chưa cập nhật')}</span></div>
      <table><thead><tr><th>STT</th><th>Thuốc / Hoạt chất</th><th>Số lượng</th><th>Cách dùng</th></tr></thead><tbody>${medicineRows}</tbody></table>
      <div class="ghi-chu">Vui lòng sử dụng thuốc theo đúng hướng dẫn của bác sĩ. Liên hệ phòng khám nếu có biểu hiện bất thường.</div>
      <div class="chu-ky"><div>Người bệnh<br /><em>(Ký, ghi rõ họ tên)</em></div><div>Bác sĩ khám bệnh<br /><em>(Ký, ghi rõ họ tên)</em></div></div>`);
  };

  // Gửi đánh giá 1 lần duy nhất (không có sửa/xóa)
  const submitReview = async () => {
    if (!reviewVisit) return;
    setIsSubmitting(true);
    try {
      const payload = { rating, comment: comment.trim() || undefined };
      const response = await patientPortalApi.createReview(reviewVisit.id, payload);
      showToast(response.message);
      setReviewVisit(null);
      await reload();
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Không thể gửi đánh giá'), 'danger');
    } finally { setIsSubmitting(false); }
  };

  return (
    <section className="profile-section patient-history" id="lich-su-kham">
      <div className="profile-section__header">
        <span className="profile-section__accent profile-section__accent--green" />
        <div><h2>Lịch sử khám & đánh giá</h2><small>{countSummary}</small></div>
      </div>
      <div className="p-4">
        {isLoading && <div className="text-center text-secondary py-4"><span className="spinner-border spinner-border-sm me-2" />Đang tải lịch sử khám...</div>}
        {!isLoading && error && <div className="text-center py-4"><p className="text-danger">{error}</p><button className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button></div>}
        {!isLoading && !error && visits.length === 0 && <div className="text-center text-secondary py-4">Chưa có lịch sử khám.</div>}
        {!isLoading && !error && visits.length > 0 && (
          <div className="table-responsive">
            <table className="table align-middle patient-history__table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Lượt khám</th>
                  <th style={{ width: '28%' }}>Chẩn đoán & Đơn thuốc</th>
                  <th style={{ width: '18%' }}>Thanh toán</th>
                  <th style={{ width: '20%' }}>Đánh giá</th>
                  <th style={{ width: '6%' }} className="text-end" aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>
                      <strong>{date(visit.examinedAt)}</strong>
                      <div className="text-secondary small mt-1">
                        {visit.doctor?.name ?? 'Chưa phân công'} · {visit.specialty?.name ?? 'Chưa cập nhật'}
                      </div>
                      <span className="badge bg-light text-dark border mt-1">{label(visit.status)}</span>
                    </td>
                    <td>
                      <div className="fw-medium text-dark">{visit.diagnosis ?? 'Chưa cập nhật'}</div>
                      <div className="mt-1">
                        {visit.prescription ? (
                          <button
                            className="btn btn-sm btn-outline-primary py-0 px-2 text-nowrap"
                            onClick={() => setSelectedVisit(visit)}
                            title="Xem đơn thuốc"
                          >
                            <span className="material-symbols-outlined align-middle fs-6 me-1">medication</span>
                            {visit.prescription.code}
                          </button>
                        ) : (
                          <span className="text-secondary small">Không kê thuốc</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {visit.invoice ? (
                        <>
                          <strong className="d-block">{MONEY_FORMATTER.format(visit.invoice.total)}</strong>
                          <span className={`small fw-semibold ${visit.invoice.status === 'DA_THANH_TOAN' ? 'text-success' : 'text-warning-emphasis'}`}>
                            {label(visit.invoice.status)}
                          </span>
                        </>
                      ) : (
                        <span className="text-secondary small">Chưa có hóa đơn</span>
                      )}
                    </td>
                    <td>
                      {visit.review ? (
                        <div className="patient-history__review-cell">
                          <div className="text-warning fs-6">
                            {'★'.repeat(visit.review.rating)}{'☆'.repeat(5 - visit.review.rating)}
                          </div>
                          {visit.review.comment && (
                            <div
                              className="small text-muted text-truncate mt-1"
                              style={{ maxWidth: '180px' }}
                              title={visit.review.comment}
                            >
                              "{visit.review.comment}"
                            </div>
                          )}
                          <small className="d-block text-secondary mt-1">
                            {label(visit.review.status)}
                          </small>
                        </div>
                      ) : visit.isReviewable ? (
                        <button className="btn btn-sm btn-primary text-nowrap" onClick={() => openReview(visit)}>
                          Đánh giá
                        </button>
                      ) : (
                        <small className="text-secondary">Chỉ mở sau khi đã thanh toán</small>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setSelectedVisit(visit)}
                        aria-label="Xem chi tiết lượt khám"
                        title="Xem chi tiết"
                      >
                        <span className="material-symbols-outlined fs-6 align-middle">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedVisit && (
        <Dialog title="Chi tiết lượt khám" subtitle={selectedVisit.code} onClose={() => setSelectedVisit(null)}>
          <div className="patient-history-modal__body">
            <dl className="patient-history__details">
              <dt>Ngày khám</dt>
              <dd>{date(selectedVisit.examinedAt)}</dd>
              <dt>Bác sĩ</dt>
              <dd>{selectedVisit.doctor?.name ?? 'Chưa cập nhật'}</dd>
              <dt>Chuyên khoa</dt>
              <dd>{selectedVisit.specialty?.name ?? 'Chưa cập nhật'}</dd>
              <dt>Chẩn đoán</dt>
              <dd>{selectedVisit.diagnosis ?? 'Chưa cập nhật'}</dd>
              <dt>Kết luận</dt>
              <dd>{selectedVisit.conclusion ?? 'Chưa cập nhật'}</dd>
            </dl>
            {selectedVisit.prescription && (
              <>
                <h4 className="h6 mt-4 mb-2">Đơn thuốc {selectedVisit.prescription.code}</h4>
                <ul className="list-group">
                  {selectedVisit.prescription.items.map((item) => (
                    <li className="list-group-item" key={`${item.name}-${item.dosage}`}>
                      <strong>{item.name}</strong> · {item.activeIngredient ?? 'Chưa cập nhật hoạt chất'}
                      <small className="d-block text-secondary mt-1">
                        {item.quantity} {item.unit} · {item.dosage} · {item.frequency} · {item.days} ngày
                        {item.instruction ? ` · ${item.instruction}` : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="patient-history-modal__footer">
            {selectedVisit.prescription && (
              <button className="btn btn-outline-primary" onClick={() => printPrescription(selectedVisit)}>
                In đơn thuốc
              </button>
            )}
            <button className="btn btn-outline-secondary" onClick={() => setSelectedVisit(null)}>
              Đóng
            </button>
          </div>
        </Dialog>
      )}

      {reviewVisit && (
        <Dialog
          title="Đánh giá bác sĩ"
          subtitle={`${reviewVisit.doctor?.name ?? 'Bác sĩ'} · ${reviewVisit.specialty?.name ?? 'Chưa cập nhật'}`}
          onClose={() => setReviewVisit(null)}
        >
          <div className="patient-history-modal__body">
            <p className="mb-3">Ngày khám: <strong>{date(reviewVisit.examinedAt)}</strong></p>
            <label className="form-label fw-semibold">Số sao</label>
            <div className="patient-history__stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={star <= rating ? 'active' : ''}
                  onClick={() => setRating(star)}
                  aria-label={`${star} sao`}
                >
                  ★
                </button>
              ))}
            </div>
            <label className="form-label fw-semibold mt-4" htmlFor="doctor-review-comment">Nhận xét</label>
            <textarea
              id="doctor-review-comment"
              className="form-control"
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về bác sĩ và buổi khám..."
            />
            <small className="d-block text-secondary mt-2">
              Đánh giá của bạn sẽ được gửi đến ban quản trị phê duyệt trước khi hiển thị công khai.
            </small>
          </div>
          <div className="patient-history-modal__footer">
            <button className="btn btn-outline-secondary" onClick={() => setReviewVisit(null)} disabled={isSubmitting}>
              Hủy
            </button>
            <button className="btn btn-primary text-nowrap" onClick={() => void submitReview()} disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
