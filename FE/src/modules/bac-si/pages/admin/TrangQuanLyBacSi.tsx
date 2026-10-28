import { useMemo, useState, type FormEvent } from 'react';

import AppModal from '@/components/ui/AppModal';
import '@/components/ui/admin-crud.css';
import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { useSpecialties } from '@/modules/chuyen-khoa/hooks/use-specialties';
import { userApi } from '@/modules/nguoi-dung/api/user.api';

import { useDoctors } from '../../hooks/use-doctors';
import type {
  CreateDoctorPayload,
  Doctor,
  UpdateDoctorPayload,
} from '../../types/doctor.types';

type ModalMode = 'create' | 'edit' | 'view' | 'delete' | null;

const DOCTORS_PER_PAGE = 10;

const EMPTY_FORM: CreateDoctorPayload = {
  code: '',
  fullName: '',
  specialtyId: 0,
  phoneNumber: '',
  email: '',
  initialPassword: '',
  academicDegree: '',
  experienceYears: 0,
  description: '',
  status: 'DANG_HOAT_DONG',
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

export default function TrangQuanLyBacSi() {
  const {
    doctors,
    isLoading,
    error,
    reload,
    createDoctor,
    updateDoctor,
    removeDoctor,
  } = useDoctors();
  const { specialties } = useSpecialties();
  const { showToast } = useAppToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<CreateDoctorPayload>(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDoctors = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase('vi');
    return doctors.filter(
      (doctor) =>
        !search ||
        doctor.fullName.toLocaleLowerCase('vi').includes(search) ||
        doctor.specialty.name.toLocaleLowerCase('vi').includes(search) ||
        doctor.code.toLocaleLowerCase('vi').includes(search) ||
        doctor.email.toLocaleLowerCase('vi').includes(search),
    );
  }, [doctors, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDoctors.length / DOCTORS_PER_PAGE),
  );
  const visibleDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * DOCTORS_PER_PAGE;
    return filteredDoctors.slice(startIndex, startIndex + DOCTORS_PER_PAGE);
  }, [currentPage, filteredDoctors]);

  const closeModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
    setSelectedDoctor(null);
    setAvatarFile(null);
    setIsPasswordVisible(false);
  };

  const openCreateModal = () => {
    setForm({
      ...EMPTY_FORM,
      specialtyId:
        specialties.find((item) => item.status === 'DANG_HOAT_DONG')?.id ?? 0,
    });
    setAvatarFile(null);
    setIsPasswordVisible(false);
    setModalMode('create');
  };

  const openDoctorModal = (
    mode: Exclude<ModalMode, 'create' | null>,
    doctor: Doctor,
  ) => {
    setSelectedDoctor(doctor);
    setAvatarFile(null);
    setIsPasswordVisible(false);
    setForm({
      code: doctor.code,
      fullName: doctor.fullName,
      specialtyId: doctor.specialty.id,
      phoneNumber: doctor.phoneNumber ?? '',
      email: doctor.email,
      initialPassword: '',
      academicDegree: doctor.academicDegree ?? '',
      experienceYears: doctor.experienceYears,
      description: doctor.description ?? '',
      status: doctor.status,
    });
    setModalMode(mode);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      let savedDoctor: Doctor;
      let message: string;
      if (modalMode === 'create') {
        const response = await createDoctor(form);
        savedDoctor = response.data;
        message = response.message;
      } else {
        const payload: UpdateDoctorPayload = { ...form };
        if (!payload.initialPassword) delete payload.initialPassword;
        const response = await updateDoctor(selectedDoctor!.id, payload);
        savedDoctor = response.data;
        message = response.message;
      }
      if (avatarFile) {
        try {
          const avatarResponse = await userApi.uploadAvatar(
            savedDoctor.userId,
            avatarFile,
          );
          await reload();
          message = `${message}. ${avatarResponse.message}`;
        } catch (avatarError) {
          showToast(
            `${message}, nhưng tải ảnh thất bại: ${getApiErrorMessage(avatarError)}`,
            'warning',
          );
          setModalMode(null);
          setSelectedDoctor(null);
          setAvatarFile(null);
          return;
        }
      }
      showToast(message);
      setCurrentPage(1);
      setModalMode(null);
      setSelectedDoctor(null);
      setAvatarFile(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoctor) return;
    setIsSubmitting(true);
    try {
      const message = await removeDoctor(selectedDoctor.id);
      showToast(message);
      setCurrentPage(1);
      setModalMode(null);
      setSelectedDoctor(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormModal = modalMode === 'create' || modalMode === 'edit';
  const activeDoctorCount = doctors.filter(
    (doctor) => doctor.status === 'DANG_HOAT_DONG',
  ).length;
  const totalExaminationCount = doctors.reduce(
    (total, doctor) => total + doctor.examinationCount,
    0,
  );

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Nhân sự khám chữa bệnh</p>
          <h1>QUẢN LÝ BÁC SĨ</h1>
          <p className="admin-management-description">
            Theo dõi hồ sơ chuyên môn, chuyên khoa và trạng thái làm việc.
          </p>
        </div>
        <div className="admin-management-summary" aria-label="Tổng quan bác sĩ">
          <span><strong>{doctors.length}</strong> bác sĩ</span>
          <span><strong>{activeDoctorCount}</strong> đang hoạt động</span>
          <span><strong>{totalExaminationCount}</strong> lượt khám</span>
        </div>
      </div>

      <div className="admin-crud-toolbar">
        <div className="admin-crud-search">
          <span className="material-symbols-outlined">search</span>
          <input
            className="form-control"
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, mã, email hoặc chuyên khoa..."
          />
        </div>
        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={openCreateModal}
          disabled={specialties.length === 0}
          title={
            specialties.length === 0
              ? 'Cần có ít nhất một chuyên khoa trước'
              : undefined
          }
        >
          <span className="material-symbols-outlined">add</span>
          Thêm bác sĩ
        </button>
      </div>

      {isLoading && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div>Đang tải danh sách bác sĩ...</div>
        </div>
      )}

      {!isLoading && error && (
        <div className="admin-crud-empty">
          <p className="text-danger">{error}</p>
          <button
            className="btn btn-outline-primary"
            onClick={() => void reload()}
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="admin-management-table-card">
          <div className="admin-management-table-heading">
            <div>
              <h2>Danh sách bác sĩ</h2>
              <p>{filteredDoctors.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table admin-management-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Bác sĩ</th>
                  <th>Chuyên khoa</th>
                  <th>Chuyên môn</th>
                  <th>Hiệu suất</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleDoctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>
                      <div className="admin-management-entity">
                        {doctor.avatarUrl ? (
                          <img src={doctor.avatarUrl} alt={doctor.fullName} className="admin-management-avatar" />
                        ) : (
                          <span className="doctor-card__avatar">{getInitials(doctor.fullName)}</span>
                        )}
                        <div>
                          <strong>BS. {doctor.fullName}</strong>
                          <small>{doctor.code} · {doctor.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{doctor.specialty.name}</td>
                    <td>
                      <strong className="d-block">{doctor.academicDegree || 'Bác sĩ'}</strong>
                      <small className="text-secondary">{doctor.experienceYears} năm kinh nghiệm</small>
                    </td>
                    <td>
                      <strong className="d-block">{doctor.examinationCount} lượt khám</strong>
                      <small className="text-secondary">★ {doctor.averageRating ?? 'Chưa có'} {doctor.ratingCount > 0 && `(${doctor.ratingCount})`}</small>
                    </td>
                    <td>
                      <span className={doctor.status === 'DANG_HOAT_DONG' ? 'badge-status-active' : 'badge-status-locked'}>
                        {doctor.status === 'DANG_HOAT_DONG' ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-crud-actions justify-content-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => openDoctorModal('view', doctor)}>
                          <span className="material-symbols-outlined">visibility</span>Chi tiết
                        </button>
                        <button className="btn btn-sm btn-light" onClick={() => openDoctorModal('edit', doctor)}>
                          <span className="material-symbols-outlined">edit</span>Sửa
                        </button>
                        <button className="btn btn-sm btn-light text-danger" onClick={() => openDoctorModal('delete', doctor)}>
                          <span className="material-symbols-outlined">delete</span>Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDoctors.length === 0 && (
            <div className="admin-crud-empty py-5">
              {doctors.length === 0 ? 'Chưa có bác sĩ nào.' : 'Không tìm thấy bác sĩ phù hợp.'}
            </div>
          )}
          {filteredDoctors.length > DOCTORS_PER_PAGE && (
            <nav
              className="d-flex justify-content-center px-3 py-4 border-top"
              aria-label="Phân trang danh sách bác sĩ"
            >
              <ul className="pagination pagination-lg mb-0">
                <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((page) => page - 1)}
                    disabled={currentPage === 1}
                    aria-label="Trang trước"
                  >
                    <span aria-hidden="true">&laquo;</span>
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <li
                      key={page}
                      className={`page-item${currentPage === page ? ' active' : ''}`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setCurrentPage(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    </li>
                  ),
                )}
                <li
                  className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}
                >
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setCurrentPage((page) => page + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Trang sau"
                  >
                    <span aria-hidden="true">&raquo;</span>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      )}

      {isFormModal && (
        <AppModal
          title={modalMode === 'create' ? 'Thêm bác sĩ' : 'Cập nhật bác sĩ'}
          size="lg"
          onClose={closeModal}
          footer={
            <>
              <button
                className="btn btn-outline-secondary"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                form="doctor-form"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Đang lưu...'
                  : modalMode === 'create'
                    ? 'Tạo bác sĩ và tài khoản'
                    : 'Lưu thay đổi'}
              </button>
            </>
          }
        >
          <form id="doctor-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-code">
                  Mã bác sĩ *
                </label>
                <input
                  id="doctor-code"
                  className="form-control"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                  pattern="[A-Z0-9_-]+"
                  placeholder="Ví dụ: BS-2042"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-name">
                  Họ và tên *
                </label>
                <input
                  id="doctor-name"
                  className="form-control"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                  placeholder="Ví dụ: BS. Nguyễn Minh An"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-specialty">
                  Chuyên khoa *
                </label>
                <select
                  id="doctor-specialty"
                  className="form-select"
                  value={form.specialtyId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      specialtyId: Number(event.target.value),
                    })
                  }
                  required
                >
                  <option value={0} disabled>
                    Chọn chuyên khoa
                  </option>
                  {specialties.map((specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-avatar">
                  Ảnh đại diện
                </label>
                <input
                  id="doctor-avatar"
                  className="form-control"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setAvatarFile(event.target.files?.[0] ?? null)
                  }
                />
                <small className="text-secondary">
                  JPG, PNG hoặc WEBP; tối đa 5 MB.
                </small>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-degree">
                  Học vị
                </label>
                <input
                  id="doctor-degree"
                  className="form-control"
                  value={form.academicDegree}
                  onChange={(event) =>
                    setForm({ ...form, academicDegree: event.target.value })
                  }
                  placeholder="Ví dụ: Thạc sĩ"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-email">
                  Email đăng nhập *
                </label>
                <input
                  id="doctor-email"
                  className="form-control"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="Ví dụ: bacsi.minhan@smartclinic.local"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-password">
                  {modalMode === 'create'
                    ? 'Mật khẩu ban đầu *'
                    : 'Mật khẩu mới (nếu đổi)'}
                </label>
                <div className="input-group">
                  <input
                    id="doctor-password"
                    className="form-control"
                    type={isPasswordVisible ? 'text' : 'password'}
                    minLength={8}
                    value={form.initialPassword}
                    onChange={(event) =>
                      setForm({ ...form, initialPassword: event.target.value })
                    }
                    required={modalMode === 'create'}
                    autoComplete="new-password"
                    placeholder={
                      modalMode === 'create'
                        ? 'Tối thiểu 8 ký tự'
                        : 'Để trống nếu không đổi'
                    }
                    onInvalid={(event) => {
                      event.currentTarget.setCustomValidity(
                        event.currentTarget.validity.valueMissing
                          ? 'Vui lòng nhập mật khẩu'
                          : 'Mật khẩu phải có ít nhất 8 ký tự',
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
                      isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                    }
                    onClick={() =>
                      setIsPasswordVisible((current) => !current)
                    }
                  >
                    <span className="material-symbols-outlined fs-5">
                      {isPasswordVisible ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="doctor-phone">
                  Số điện thoại
                </label>
                <input
                  id="doctor-phone"
                  className="form-control"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm({ ...form, phoneNumber: event.target.value })
                  }
                  placeholder="Ví dụ: 0901 234 567"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="doctor-experience">
                  Số năm kinh nghiệm
                </label>
                <input
                  id="doctor-experience"
                  className="form-control"
                  type="number"
                  min={0}
                  value={form.experienceYears}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      experienceYears: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="doctor-status">
                  Trạng thái
                </label>
                <select
                  id="doctor-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target
                        .value as CreateDoctorPayload['status'],
                    })
                  }
                >
                  <option value="DANG_HOAT_DONG">Đang hoạt động</option>
                  <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="doctor-description">
                  Mô tả chuyên môn
                </label>
                <textarea
                  id="doctor-description"
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Ví dụ: Khám và điều trị các bệnh lý chuyên khoa."
                />
              </div>
            </div>
          </form>
        </AppModal>
      )}

      {modalMode === 'view' && selectedDoctor && (
        <AppModal title="Chi tiết bác sĩ" size="lg" onClose={closeModal}>
          <div className="d-flex align-items-center gap-3 mb-4">
            {selectedDoctor.avatarUrl ? (
              <img
                src={selectedDoctor.avatarUrl}
                alt={selectedDoctor.fullName}
                className="rounded-circle object-fit-cover"
                style={{ width: 72, height: 72 }}
              />
            ) : (
              <span className="doctor-card__avatar">
                {getInitials(selectedDoctor.fullName)}
              </span>
            )}
            <div>
              <h2 className="h5 mb-1">BS. {selectedDoctor.fullName}</h2>
              <span className="text-secondary">{selectedDoctor.code}</span>
            </div>
          </div>
          <dl className="row mb-0">
            <dt className="col-sm-4">Chuyên khoa</dt>
            <dd className="col-sm-8">{selectedDoctor.specialty.name}</dd>
            <dt className="col-sm-4">Email đăng nhập</dt>
            <dd className="col-sm-8">{selectedDoctor.email}</dd>
            <dt className="col-sm-4">Điện thoại</dt>
            <dd className="col-sm-8">
              {selectedDoctor.phoneNumber || 'Chưa cập nhật'}
            </dd>
            <dt className="col-sm-4">Học vị</dt>
            <dd className="col-sm-8">
              {selectedDoctor.academicDegree || 'Chưa cập nhật'}
            </dd>
            <dt className="col-sm-4">Kinh nghiệm</dt>
            <dd className="col-sm-8">
              {selectedDoctor.experienceYears} năm
            </dd>
            <dt className="col-sm-4">Mô tả</dt>
            <dd className="col-sm-8">
              {selectedDoctor.description || 'Chưa cập nhật'}
            </dd>
          </dl>
        </AppModal>
      )}

      {modalMode === 'delete' && selectedDoctor && (
        <AppModal
          title="Xác nhận xóa bác sĩ"
          onClose={closeModal}
          footer={
            <>
              <button
                className="btn btn-outline-secondary"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                className="btn btn-danger"
                onClick={() => void handleDelete()}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xóa...' : 'Xóa bác sĩ'}
              </button>
            </>
          }
        >
          Bác sĩ <strong>{selectedDoctor.fullName}</strong> và tài khoản đăng
          nhập liên kết sẽ bị xóa. Bạn có chắc muốn tiếp tục?
        </AppModal>
      )}
    </div>
  );
}
