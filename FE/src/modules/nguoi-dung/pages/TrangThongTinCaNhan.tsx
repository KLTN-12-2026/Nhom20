import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { useAuthStore } from '@/stores/auth.store';
import { PatientMedicalHistorySection } from '@/modules/benh-nhan/components/PatientMedicalHistorySection';

import { useProfile } from '../hooks/use-profile';
import type { UpdateProfilePayload } from '../types/user.types';
import SegmentedDateInput from '@/modules/lich-hen/components/benh-nhan/SegmentedDateInput';
import './profile.css';

const EMPTY_FORM: UpdateProfilePayload = {
  fullName: '',
  email: '',
  phoneNumber: '',
  gender: undefined,
  dateOfBirth: '',
  identityNumber: '',
  address: '',
  healthInsuranceNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  DOCTOR: 'Bác sĩ',
  PHARMACIST: 'Dược sĩ',
  RECEPTIONIST: 'Lễ tân / Thu ngân',
  PATIENT: 'Bệnh nhân',
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

export default function TrangThongTinCaNhan() {
  const {
    profile,
    isLoading,
    error,
    reload,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    changePassword,
  } = useProfile();
  const { showToast } = useAppToast();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const authUser = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [form, setForm] = useState<UpdateProfilePayload>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName,
      email: profile.email ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      gender: profile.gender ?? undefined,
      dateOfBirth: profile.dateOfBirth?.slice(0, 10) ?? '',
      identityNumber: profile.identityNumber ?? '',
      address: profile.address ?? '',
      healthInsuranceNumber: profile.healthInsuranceNumber ?? '',
      emergencyContactName: profile.emergencyContactName ?? '',
      emergencyContactPhone: profile.emergencyContactPhone ?? '',
    });
  }, [profile]);

  const syncSession = (avatarUrl: string | null, fullName: string) => {
    if (!accessToken || !authUser) return;
    setSession(accessToken, {
      ...authUser,
      avatarUrl,
      fullName,
      email: form.email,
      phoneNumber: form.phoneNumber || null,
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const response = await updateProfile({
        ...form,
        phoneNumber: form.phoneNumber || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        identityNumber: form.identityNumber || undefined,
        address: form.address || undefined,
        healthInsuranceNumber: form.healthInsuranceNumber || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
      });
      syncSession(response.data.avatarUrl, response.data.fullName);
      showToast(response.message);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (file?: File) => {
    if (!file) return;
    
    // Tạo preview local ngay lập tức để người dùng thấy ảnh ngay
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    
    setIsSaving(true);
    try {
      const response = await uploadAvatar(file);
      syncSession(response.data.avatarUrl, response.data.fullName);
      showToast(response.message);
    } catch (requestError) {
      setAvatarPreview(null); // Hoàn tác preview nếu lỗi
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsSaving(true);
    try {
      const response = await removeAvatar();
      setAvatarPreview(null);
      syncSession(null, response.data.fullName);
      showToast(response.message);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const response = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordVisibility({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
      showToast(response.message);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/dang-nhap', { replace: true });
    showToast('Đăng xuất thành công');
  };

  if (isLoading) {
    return (
      <div className="admin-crud-empty">
        <div className="spinner-border text-primary mb-3" role="status" />
        <div>Đang tải thông tin cá nhân...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="admin-crud-empty">
        <p className="text-danger">{error || 'Không tìm thấy hồ sơ'}</p>
        <button className="btn btn-outline-primary" onClick={() => void reload()}>
          Thử lại
        </button>
      </div>
    );
  }

  const primaryRole = profile.roles[0]?.code ?? '';
  const roleLabel = ROLE_LABELS[primaryRole] ?? profile.roles[0]?.name;

  return (
    <div className="profile-page">
      <div className="profile-page__heading">
        <div>
          <h1>THÔNG TIN CÁ NHÂN</h1>
          <p>Quản lý thông tin, ảnh đại diện và bảo mật tài khoản.</p>
        </div>
      </div>

      <div className="profile-page__layout">
        <aside className="profile-card">
          <div className="profile-avatar-wrap position-relative">
            {avatarPreview || profile.avatarUrl ? (
              <img
                src={avatarPreview || profile.avatarUrl!}
                alt={profile.fullName}
                className={`profile-avatar ${isSaving ? 'opacity-50' : ''}`}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className={`profile-avatar profile-avatar--fallback ${isSaving ? 'opacity-50' : ''}`}>
                {getInitials(profile.fullName)}
              </div>
            )}
            
            {isSaving && (
              <div className="position-absolute top-50 start-50 translate-middle pointer-events-none" style={{ zIndex: 10 }}>
                <div className="spinner-border text-primary border-3" style={{ width: '2rem', height: '2rem' }} role="status">
                  <span className="visually-hidden">Đang tải...</span>
                </div>
              </div>
            )}

            <label className={`profile-avatar-button ${isSaving ? 'd-none' : ''}`} htmlFor="profile-avatar">
              <span className="material-symbols-outlined">photo_camera</span>
              <input
                id="profile-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isSaving}
                onChange={(event) =>
                  void handleAvatarChange(event.target.files?.[0])
                }
              />
            </label>
          </div>
          <h2>{profile.fullName}</h2>
          <p>{roleLabel}</p>
          <span className="badge-status-active">Đang hoạt động</span>
          {profile.avatarUrl && (
            <button
              className="btn btn-sm btn-outline-danger mt-3"
              onClick={() => void handleRemoveAvatar()}
              disabled={isSaving}
            >
              Xóa ảnh đại diện
            </button>
          )}
          <div className="profile-card__divider" />
          <a className="profile-card__link" href="#bao-mat">
            <span className="material-symbols-outlined">security</span>
            Bảo mật tài khoản
            <span className="material-symbols-outlined ms-auto">
              chevron_right
            </span>
          </a>
          {profile.linkedProfiles.patient && (
            <a className="profile-card__link" href="#lich-su-kham">
              <span className="material-symbols-outlined">clinical_notes</span>
              Lịch sử khám
              <span className="material-symbols-outlined ms-auto">chevron_right</span>
            </a>
          )}
          <button type="button" className="profile-card__link profile-card__logout" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            Đăng xuất
          </button>
        </aside>

        <div className="d-flex flex-column gap-4">
          <form onSubmit={handleSave}>
            <section className="profile-section">
              <div className="profile-section__header">
                <span className="profile-section__accent" />
                <h2>Thông tin cơ bản</h2>
              </div>
              <div className="row g-3 p-4">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-name">
                    Họ và tên *
                  </label>
                  <input
                    id="profile-name"
                    className="form-control"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm({ ...form, fullName: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-gender">
                    Giới tính
                  </label>
                  <select
                    id="profile-gender"
                    className="form-select"
                    value={form.gender ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        gender:
                          (event.target.value as UpdateProfilePayload['gender']) ||
                          undefined,
                      })
                    }
                  >
                    <option value="">Chưa cập nhật</option>
                    <option value="NAM">Nam</option>
                    <option value="NU">Nữ</option>
                    <option value="KHAC">Khác</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-birthday">
                    Ngày sinh
                  </label>
                  <SegmentedDateInput
                    id="profile-birthday"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={(val) =>
                      setForm({ ...form, dateOfBirth: val })
                    }
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-identity">
                    Số CCCD
                  </label>
                  <input
                    id="profile-identity"
                    className="form-control"
                    value={form.identityNumber}
                    onChange={(event) =>
                      setForm({ ...form, identityNumber: event.target.value })
                    }
                    maxLength={20}
                    placeholder="Chưa cập nhật"
                  />
                </div>
              </div>
            </section>

            <section className="profile-section mt-4">
              <div className="profile-section__header">
                <span className="profile-section__accent profile-section__accent--green" />
                <h2>Liên hệ</h2>
              </div>
              <div className="row g-3 p-4">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-email">
                    Email *
                  </label>
                  <input
                    id="profile-email"
                    className="form-control"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="profile-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="profile-phone"
                    className="form-control"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      setForm({ ...form, phoneNumber: event.target.value })
                    }
                  />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="profile-address">
                    Địa chỉ
                  </label>
                  <textarea
                    id="profile-address"
                    className="form-control"
                    rows={3}
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                    placeholder="Chưa cập nhật địa chỉ"
                  />
                </div>
                {profile.linkedProfiles.patient && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="profile-health-insurance">Mã thẻ BHYT</label>
                      <input id="profile-health-insurance" className="form-control" value={form.healthInsuranceNumber ?? ''} onChange={(event) => setForm({ ...form, healthInsuranceNumber: event.target.value })} maxLength={30} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="profile-emergency-name">Người liên hệ khẩn cấp</label>
                      <input id="profile-emergency-name" className="form-control" value={form.emergencyContactName ?? ''} onChange={(event) => setForm({ ...form, emergencyContactName: event.target.value })} maxLength={150} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="profile-emergency-phone">Số điện thoại khẩn cấp</label>
                      <input id="profile-emergency-phone" className="form-control" type="tel" value={form.emergencyContactPhone ?? ''} onChange={(event) => setForm({ ...form, emergencyContactPhone: event.target.value })} maxLength={20} />
                    </div>
                  </>
                )}
                <div className="col-12 text-end">
                  <button
                    className="btn btn-primary px-4"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            </section>
          </form>

          {profile.linkedProfiles.patient && <PatientMedicalHistorySection />}

          <section className="profile-section" id="bao-mat">
            <div className="profile-section__header">
              <span className="profile-section__accent profile-section__accent--orange" />
              <h2>Bảo mật tài khoản</h2>
            </div>
            <form className="row g-3 p-4" onSubmit={handlePasswordChange}>
              <div className="col-md-4">
                <label className="form-label" htmlFor="current-password">
                  Mật khẩu hiện tại
                </label>
                <div className="input-group">
                  <input
                    id="current-password"
                    className="form-control"
                    type={
                      passwordVisibility.currentPassword ? 'text' : 'password'
                    }
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: event.target.value,
                      })
                    }
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    aria-label={
                      passwordVisibility.currentPassword
                        ? 'Ẩn mật khẩu hiện tại'
                        : 'Hiện mật khẩu hiện tại'
                    }
                    onClick={() =>
                      setPasswordVisibility((current) => ({
                        ...current,
                        currentPassword: !current.currentPassword,
                      }))
                    }
                  >
                    <span className="material-symbols-outlined fs-5">
                      {passwordVisibility.currentPassword
                        ? 'visibility_off'
                        : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="new-password">
                  Mật khẩu mới
                </label>
                <div className="input-group">
                  <input
                    id="new-password"
                    className="form-control"
                    type={passwordVisibility.newPassword ? 'text' : 'password'}
                    minLength={8}
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: event.target.value,
                      })
                    }
                    required
                    onInvalid={(event) => {
                      event.currentTarget.setCustomValidity(
                        event.currentTarget.validity.valueMissing
                          ? 'Vui lòng nhập mật khẩu mới'
                          : 'Mật khẩu mới phải có ít nhất 8 ký tự',
                      );
                    }}
                    onInput={(event) =>
                      event.currentTarget.setCustomValidity('')
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    aria-label={
                      passwordVisibility.newPassword
                        ? 'Ẩn mật khẩu mới'
                        : 'Hiện mật khẩu mới'
                    }
                    onClick={() =>
                      setPasswordVisibility((current) => ({
                        ...current,
                        newPassword: !current.newPassword,
                      }))
                    }
                  >
                    <span className="material-symbols-outlined fs-5">
                      {passwordVisibility.newPassword
                        ? 'visibility_off'
                        : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="confirm-password">
                  Xác nhận mật khẩu
                </label>
                <div className="input-group">
                  <input
                    id="confirm-password"
                    className="form-control"
                    type={
                      passwordVisibility.confirmPassword ? 'text' : 'password'
                    }
                    minLength={8}
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: event.target.value,
                      })
                    }
                    required
                    onInvalid={(event) => {
                      event.currentTarget.setCustomValidity(
                        event.currentTarget.validity.valueMissing
                          ? 'Vui lòng xác nhận mật khẩu'
                          : 'Mật khẩu xác nhận phải có ít nhất 8 ký tự',
                      );
                    }}
                    onInput={(event) =>
                      event.currentTarget.setCustomValidity('')
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    aria-label={
                      passwordVisibility.confirmPassword
                        ? 'Ẩn mật khẩu xác nhận'
                        : 'Hiện mật khẩu xác nhận'
                    }
                    onClick={() =>
                      setPasswordVisibility((current) => ({
                        ...current,
                        confirmPassword: !current.confirmPassword,
                      }))
                    }
                  >
                    <span className="material-symbols-outlined fs-5">
                      {passwordVisibility.confirmPassword
                        ? 'visibility_off'
                        : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="col-12 text-end">
                <button
                  className="btn btn-outline-primary px-4"
                  type="submit"
                  disabled={isSaving}
                >
                  Đổi mật khẩu
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
