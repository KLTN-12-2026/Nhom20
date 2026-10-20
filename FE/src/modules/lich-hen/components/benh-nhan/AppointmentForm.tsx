import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { specialtyApi } from '@/modules/chuyen-khoa/api/specialty.api';
import type { Specialty } from '@/modules/chuyen-khoa/types/specialty.types';
import { getApiErrorMessage } from '@/services/axios-client';
import { useAuth } from '@/modules/xac-thuc/hooks/use-auth';

import { appointmentApi } from '../../api/appointment.api';
import type { GuestAppointmentPayload } from '../../types/appointment.types';
import SegmentedDateInput from './SegmentedDateInput';

const FACILITY_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAwGXPa-L5CQj3DCPt4D6zrT_X12mx17KelXqrCyCwjJn6J_2nd8bsMMNjMdZv2Cr65_vzblayo3qc73Pi5hcPi8gBTduY2fhR90q87T61Z4ndAcFJqRaLavDV3PH-hxM7AcwyiLep6qvqxQB7ZefRWxvzy3iYazNcV-dHqM6lIOGZXda6qSuzCHszJHleRog-ANAcBwOD3jcrmhyhkyL_yASBcMM8fVxTPS-CmBPVZFHU8KFIWYEYvcIHZFJUtwQKlny4ka--1e8s';

export default function AppointmentForm() {
  const [searchParams] = useSearchParams();
  const { showToast } = useAppToast();
  const { user } = useAuth();
  const isPatient =
    user?.roles.some((r) => r === 'PATIENT' || r === 'BENH_NHAN') ?? false;

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState(
    searchParams.get('chuyenKhoaId') ?? '',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void specialtyApi.getAll()
      .then((specialtyResponse) => {
        setSpecialties(
          specialtyResponse.data.filter(
            (item) => item.status === 'DANG_HOAT_DONG',
          ),
        );
      })
      .catch((requestError) =>
        showToast(
          getApiErrorMessage(
            requestError,
            'Không thể tải danh sách chuyên khoa',
          ),
          'danger',
        ),
      );
  }, [showToast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    
    setIsSubmitting(true);
    try {
      if (isPatient) {
        await appointmentApi.createPatient({
          specialtyId: Number(data.get('specialty')),
          appointmentDate: String(data.get('appointmentDate') ?? ''),
          appointmentTime: String(data.get('appointmentTime') ?? ''),
          reason: String(data.get('reason') ?? ''),
          note: String(data.get('note') ?? '') || undefined,
        });
      } else {
        await appointmentApi.createGuest({
          fullName: String(data.get('fullName') ?? ''),
          phoneNumber: String(data.get('phoneNumber') ?? ''),
          dateOfBirth: String(data.get('dateOfBirth') ?? ''),
          gender: String(data.get('gender')) as GuestAppointmentPayload['gender'],
          email: String(data.get('email') ?? '') || undefined,
          specialtyId: Number(data.get('specialty')),
          appointmentDate: String(data.get('appointmentDate') ?? ''),
          appointmentTime: String(data.get('appointmentTime') ?? ''),
          reason: String(data.get('reason') ?? ''),
          note: String(data.get('note') ?? '') || undefined,
        });
      }

      showToast('Gửi yêu cầu đặt lịch thành công');
      form.reset();
      setSelectedSpecialtyId('');
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể gửi yêu cầu đặt lịch'),
        'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="appointment-page">
      <div className="max-container appointment-page__inner">
        <header className="appointment-intro">
          <div className="appointment-intro__decoration" />
          <div className="appointment-intro__eyebrow">
            <span />
            Dịch vụ trực tuyến
          </div>
          <h1>Đặt lịch khám bệnh</h1>
          <p>
            Tiết kiệm thời gian chờ đợi và nhận sự chăm sóc tận tâm từ đội ngũ
            chuyên gia hàng đầu tại Smart Clinic.
          </p>
        </header>

        <div className="row g-4 align-items-start">
          <form
            id="appointmentForm"
            className="col-lg-8 appointment-form"
            onSubmit={(event) => void handleSubmit(event)}
          >
            {!isPatient ? (
              <section className="appointment-form__section">
                <div className="appointment-form__section-heading">
                  <span className="appointment-form__section-icon material-symbols-outlined">
                    person
                  </span>
                  <h2>Thông tin người khám</h2>
                </div>

                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="appointment-full-name">
                      Họ và tên <span className="text-error">*</span>
                    </label>
                    <input
                      id="appointment-full-name"
                      className="form-control"
                      name="fullName"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" htmlFor="appointment-phone">
                      Số điện thoại <span className="text-error">*</span>
                    </label>
                    <input
                      id="appointment-phone"
                      className="form-control"
                      name="phoneNumber"
                      type="tel"
                      placeholder="0901 234 567"
                      autoComplete="tel"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" htmlFor="appointment-birth-date">
                      Ngày sinh <span className="text-error">*</span>
                    </label>
                    <SegmentedDateInput
                      id="appointment-birth-date"
                      name="dateOfBirth"
                      autoComplete="bday"
                      max={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label" htmlFor="appointment-gender">
                      Giới tính <span className="text-error">*</span>
                    </label>
                    <select
                      id="appointment-gender"
                      className="form-select"
                      name="gender"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        Chọn giới tính
                      </option>
                      <option value="NAM">Nam</option>
                      <option value="NU">Nữ</option>
                      <option value="KHAC">Khác</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label" htmlFor="appointment-email">
                      Email (không bắt buộc)
                    </label>
                    <input
                      id="appointment-email"
                      className="form-control"
                      name="email"
                      type="email"
                      placeholder="example@gmail.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
              </section>
            ) : (
              <section className="appointment-form__section">
                <div className="appointment-form__section-heading">
                  <span className="appointment-form__section-icon material-symbols-outlined">
                    person
                  </span>
                  <h2>Thông tin người khám</h2>
                </div>
                <div className="d-flex align-items-center gap-3 p-3 bg-surface-container-low rounded-3 border">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="rounded-circle object-fit-cover"
                      style={{ width: 48, height: 48 }}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-primary-container d-flex align-items-center justify-content-center text-on-primary-container fw-bold"
                      style={{ width: 48, height: 48, fontSize: 20 }}
                    >
                      {user?.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="fw-bold text-title-md">{user?.fullName}</div>
                    <div className="text-body-sm text-secondary">
                      {user?.phoneNumber || user?.email || 'Bệnh nhân'}
                    </div>
                  </div>
                  <div className="ms-auto">
                    <span className="badge bg-success-subtle text-success">
                      Tự động điền
                    </span>
                  </div>
                </div>
              </section>
            )}

            <section className="appointment-form__section">
              <div className="appointment-form__section-heading">
                <span className="appointment-form__section-icon material-symbols-outlined">
                  clinical_notes
                </span>
                <h2>Thông tin lịch khám</h2>
              </div>

              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="appointment-specialty">
                    Chuyên khoa muốn khám <span className="text-error">*</span>
                  </label>
                  <select
                    id="appointment-specialty"
                    className="form-select"
                    name="specialty"
                    value={selectedSpecialtyId}
                    onChange={(event) => {
                      setSelectedSpecialtyId(event.target.value);
                    }}
                    required
                  >
                    <option value="" disabled>
                      Chọn chuyên khoa
                    </option>
                    {specialties.map((specialty) => (
                      <option value={specialty.id} key={specialty.id}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="appointment-date">
                    Ngày muốn khám <span className="text-error">*</span>
                  </label>
                  <SegmentedDateInput
                    id="appointment-date"
                    name="appointmentDate"
                    min={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="appointment-time">
                    Giờ muốn khám <span className="text-error">*</span>
                  </label>
                  <input
                    id="appointment-time"
                    className="form-control"
                    name="appointmentTime"
                    type="time"
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="appointment-reason">
                    Lý do khám <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="appointment-reason"
                    className="form-control"
                    name="reason"
                    rows={3}
                    placeholder="Mô tả ngắn gọn các triệu chứng của bạn..."
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="appointment-note">
                    Ghi chú thêm
                  </label>
                  <textarea
                    id="appointment-note"
                    className="form-control"
                    name="note"
                    rows={2}
                    placeholder="Ví dụ: Cần xe lăn, tiền sử dị ứng thuốc..."
                  />
                </div>
              </div>
            </section>

            <section className="appointment-form__confirmation">
              <label
                className="appointment-form__agreement"
                htmlFor="appointment-agreement"
              >
                <input
                  id="appointment-agreement"
                  className="form-check-input"
                  name="agreement"
                  type="checkbox"
                  required
                />
                <span>
                  Tôi xác nhận thông tin đã cung cấp là chính xác và đồng ý để
                  phòng khám liên hệ xác nhận lịch hẹn qua số điện thoại hoặc
                  email.
                </span>
              </label>

              <div className="appointment-form__actions">
                <p>
                  <span className="material-symbols-outlined">info</span>
                  Lịch khám chỉ có hiệu lực sau khi được phòng khám xác nhận.
                </p>
                <button
                  className="btn appointment-form__submit"
                  type="submit"
                  disabled={isSubmitting}
                >
                  <span className="material-symbols-outlined">
                    calendar_add_on
                  </span>
                  {isSubmitting
                    ? 'Đang gửi yêu cầu...'
                    : 'Gửi yêu cầu đặt lịch'}
                </button>
              </div>
            </section>
          </form>

          <aside className="col-lg-4 appointment-sidebar">
            <section className="appointment-trust-card">
              <div className="appointment-trust-card__decoration" />
              <h2>Tại sao chọn Smart Clinic?</h2>
              <ul>
                <li>
                  <span className="material-symbols-outlined">verified</span>
                  <div>
                    <strong>Đội ngũ chuyên gia</strong>
                    <p>Hơn 50 bác sĩ đầu ngành với kinh nghiệm dày dặn.</p>
                  </div>
                </li>
                <li>
                  <span className="material-symbols-outlined">speed</span>
                  <div>
                    <strong>Thủ tục nhanh gọn</strong>
                    <p>Quy trình số hóa giúp giảm 70% thời gian chờ đợi.</p>
                  </div>
                </li>
                <li>
                  <span className="material-symbols-outlined">smart_toy</span>
                  <div>
                    <strong>Hỗ trợ AI 24/7</strong>
                    <p>Tư vấn sức khỏe thông minh mọi lúc, mọi nơi.</p>
                  </div>
                </li>
              </ul>
            </section>

            <section className="appointment-support-card">
              <h2>Bạn cần hỗ trợ?</h2>
              <p>
                Nếu bạn gặp khó khăn khi đặt lịch, vui lòng liên hệ hotline để
                được nhân viên hỗ trợ trực tiếp.
              </p>

              <a className="appointment-support-item" href="tel:19001234">
                <span className="material-symbols-outlined">call</span>
                <span>
                  <small>HOTLINE</small>
                  <strong>1900 1234</strong>
                </span>
              </a>

              <div className="appointment-support-item">
                <span className="material-symbols-outlined">schedule</span>
                <span>
                  <small>GIỜ LÀM VIỆC</small>
                  <strong>Thứ 2 - CN: 07:00 - 20:00</strong>
                </span>
              </div>
            </section>

            <figure className="appointment-facility-card">
              <img
                src={FACILITY_IMAGE_URL}
                alt="Không gian cơ sở vật chất hiện đại của Smart Clinic"
              />
              <figcaption>
                Cơ sở vật chất hiện đại, tiêu chuẩn quốc tế
              </figcaption>
            </figure>
          </aside>
        </div>
      </div>
    </div>
  );
}
