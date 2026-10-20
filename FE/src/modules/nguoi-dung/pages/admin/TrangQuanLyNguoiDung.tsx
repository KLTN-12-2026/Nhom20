import { useMemo, useState, type FormEvent } from 'react';

import AppModal from '@/components/ui/AppModal';
import '@/components/ui/admin-crud.css';
import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { useAuthStore } from '@/stores/auth.store';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { useUsers } from '../../hooks/use-users';
import type {
  CreateUserPayload,
  ManagedUser,
  UpdateUserPayload,
  UserStatus,
} from '../../types/user.types';

type ModalMode = 'create' | 'edit' | 'view' | 'delete' | null;

const EMPTY_FORM: CreateUserPayload = {
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  roleCodes: [],
  status: 'DANG_HOAT_DONG',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  DANG_HOAT_DONG: 'Đang hoạt động',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
  BI_KHOA: 'Bị khóa',
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

function formatDate(value: string | null) {
  return value
    ? dinhDangNgayGio(value)
    : 'Chưa có';
}

function hasLinkedProfile(user: ManagedUser) {
  return Object.values(user.linkedProfiles).some(Boolean);
}

export default function TrangQuanLyNguoiDung() {
  const {
    users,
    roleOptions,
    isLoading,
    error,
    reload,
    createUser,
    updateUser,
    removeUser,
    uploadUserAvatar,
    removeUserAvatar,
  } = useUsers();
  const currentUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const { showToast } = useAppToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase('vi');
    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.fullName.toLocaleLowerCase('vi').includes(search) ||
        user.email?.toLocaleLowerCase('vi').includes(search) ||
        user.phoneNumber?.includes(search);
      const matchesRole =
        !roleFilter || user.roles.some((role) => role.code === roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, searchTerm, users]);

  const closeModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
    setSelectedUser(null);
    setAvatarFile(null);
    setIsPasswordVisible(false);
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setSelectedUser(null);
    setAvatarFile(null);
    setIsPasswordVisible(false);
    setModalMode('create');
  };

  const openUserModal = (
    mode: Exclude<ModalMode, 'create' | null>,
    user: ManagedUser,
  ) => {
    setSelectedUser(user);
    setAvatarFile(null);
    setIsPasswordVisible(false);
    setForm({
      fullName: user.fullName,
      email: user.email ?? '',
      phoneNumber: user.phoneNumber ?? '',
      password: '',
      roleCodes: user.roles.map((role) => role.code),
      status: user.status,
    });
    setModalMode(mode);
  };

  const toggleRole = (code: string) => {
    setForm((current) => ({
      ...current,
      roleCodes: current.roleCodes.includes(code)
        ? current.roleCodes.filter((item) => item !== code)
        : [...current.roleCodes, code],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.roleCodes.length === 0) {
      showToast('Cần chọn ít nhất một vai trò', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      let savedUser: ManagedUser;
      let message: string;
      if (modalMode === 'create') {
        const response = await createUser(form);
        savedUser = response.data;
        message = response.message;
      } else {
        const payload: UpdateUserPayload = { ...form };
        if (!payload.password) delete payload.password;
        const response = await updateUser(selectedUser!.id, payload);
        savedUser = response.data;
        message = response.message;
      }
      if (avatarFile) {
        try {
          const avatarResponse = await uploadUserAvatar(
            savedUser.id,
            avatarFile,
          );
          savedUser = avatarResponse.data;
          message = `${message}. ${avatarResponse.message}`;
        } catch (avatarError) {
          showToast(
            `${message}, nhưng tải ảnh thất bại: ${getApiErrorMessage(avatarError)}`,
            'warning',
          );
          setModalMode(null);
          setSelectedUser(null);
          setAvatarFile(null);
          return;
        }
      }
      if (
        currentUser?.id === savedUser.id &&
        accessToken &&
        savedUser.avatarUrl !== currentUser.avatarUrl
      ) {
        setSession(accessToken, {
          ...currentUser,
          avatarUrl: savedUser.avatarUrl,
          fullName: savedUser.fullName,
          email: savedUser.email,
          phoneNumber: savedUser.phoneNumber,
        });
      }
      showToast(message);
      setModalMode(null);
      setSelectedUser(null);
      setAvatarFile(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const response = await removeUserAvatar(selectedUser.id);
      setSelectedUser(response.data);
      setAvatarFile(null);
      if (currentUser?.id === response.data.id && accessToken) {
        setSession(accessToken, { ...currentUser, avatarUrl: null });
      }
      showToast(response.message);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const message = await removeUser(selectedUser.id);
      showToast(message);
      setModalMode(null);
      setSelectedUser(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormModal = modalMode === 'create' || modalMode === 'edit';
  const rolesAreLocked =
    modalMode === 'edit' && selectedUser
      ? hasLinkedProfile(selectedUser)
      : false;

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Quản trị hệ thống</p>
          <h1>QUẢN LÝ NHÂN SỰ</h1>
          <p className="admin-management-description">
            Quản lý tài khoản, thông tin liên hệ và vai trò truy cập của nhân viên.
          </p>
        </div>
      </div>

      <div className="admin-crud-toolbar">
        <div className="admin-crud-search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            className="form-control"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên, email, số điện thoại..."
          />
        </div>
        <select
          className="form-select"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          style={{ width: 210 }}
          aria-label="Lọc theo vai trò"
        >
          <option value="">Tất cả vai trò</option>
          {roleOptions.map((role) => (
            <option key={role.id} value={role.code}>
              {role.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2 ms-auto"
          onClick={openCreateModal}
        >
          <span className="material-symbols-outlined">add</span>
          Thêm người dùng
        </button>
      </div>

      {isLoading && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div>Đang tải danh sách người dùng...</div>
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
              <h2>Danh sách tài khoản</h2>
              <p>Hiển thị {filteredUsers.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table admin-management-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th className="text-end">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="rounded-circle object-fit-cover"
                            style={{ width: 40, height: 40 }}
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className="doctor-card__avatar"
                            style={{ width: 40, height: 40 }}
                          >
                            {getInitials(user.fullName)}
                          </span>
                        )}
                        <div>
                          <div className="fw-semibold text-on-surface">{user.fullName}</div>
                          <small className="text-secondary">ID: {user.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{user.email || 'Chưa có email'}</div>
                      <small className="text-secondary">
                        {user.phoneNumber || 'Chưa có số điện thoại'}
                      </small>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span
                            key={role.id}
                            className="badge-role"
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          user.status === 'DANG_HOAT_DONG'
                            ? 'badge-status-active'
                            : 'badge-status-locked'
                        }
                      >
                        {STATUS_LABELS[user.status]}
                      </span>
                    </td>
                    <td className="text-nowrap">{formatDate(user.createdAt)}</td>
                    <td className="text-end text-nowrap">
                      <button
                        className="btn btn-sm btn-icon border-0"
                        title="Xem chi tiết"
                        onClick={() => openUserModal('view', user)}
                      >
                        <span className="material-symbols-outlined text-secondary">
                          visibility
                        </span>
                      </button>
                      <button
                        className="btn btn-sm btn-icon border-0 ms-1"
                        title="Sửa thông tin"
                        onClick={() => openUserModal('edit', user)}
                      >
                        <span className="material-symbols-outlined text-secondary">edit</span>
                      </button>
                      <button
                        className="btn btn-sm btn-icon border-0 ms-1"
                        title={
                          user.id === currentUser?.id
                            ? 'Không thể tự xóa tài khoản'
                            : hasLinkedProfile(user)
                              ? 'Tài khoản đang gắn hồ sơ nghiệp vụ'
                              : 'Xóa người dùng'
                        }
                        disabled={
                          user.id === currentUser?.id || hasLinkedProfile(user)
                        }
                        onClick={() => openUserModal('delete', user)}
                      >
                        <span className="material-symbols-outlined text-danger">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-secondary">
                      {users.length === 0
                        ? 'Chưa có người dùng nào.'
                        : 'Không tìm thấy kết quả phù hợp.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isFormModal && (
        <AppModal
          title={
            modalMode === 'create'
              ? 'Thêm người dùng'
              : 'Cập nhật người dùng'
          }
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
                form="user-form"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Đang lưu...'
                  : modalMode === 'create'
                    ? 'Thêm người dùng'
                    : 'Lưu thay đổi'}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="user-name">
                  Họ và tên *
                </label>
                <input
                  id="user-name"
                  className="form-control"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="user-email">
                  Email đăng nhập *
                </label>
                <input
                  id="user-email"
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
                <label className="form-label" htmlFor="user-phone">
                  Số điện thoại
                </label>
                <input
                  id="user-phone"
                  className="form-control"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm({ ...form, phoneNumber: event.target.value })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="user-password">
                  {modalMode === 'create'
                    ? 'Mật khẩu ban đầu *'
                    : 'Mật khẩu mới (nếu đổi)'}
                </label>
                <div className="input-group">
                  <input
                    id="user-password"
                    className="form-control"
                    type={isPasswordVisible ? 'text' : 'password'}
                    minLength={8}
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    required={modalMode === 'create'}
                    autoComplete="new-password"
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
                <label className="form-label" htmlFor="user-status">
                  Trạng thái
                </label>
                <select
                  id="user-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as UserStatus,
                    })
                  }
                >
                  <option value="DANG_HOAT_DONG">Đang hoạt động</option>
                  <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
                  <option value="BI_KHOA">Bị khóa</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="user-avatar">
                  Ảnh đại diện
                </label>
                <div className="user-avatar-picker">
                  <label
                    className="btn btn-outline-primary"
                    htmlFor="user-avatar"
                  >
                    <span className="material-symbols-outlined">
                      add_photo_alternate
                    </span>
                    Chọn ảnh
                  </label>
                  <span
                    className={
                      avatarFile
                        ? 'user-avatar-picker__name'
                        : 'user-avatar-picker__name text-secondary'
                    }
                  >
                    {avatarFile?.name ||
                      (selectedUser?.avatarUrl
                        ? 'Đang sử dụng ảnh hiện tại'
                        : 'Chưa chọn ảnh')}
                  </span>
                  <input
                    id="user-avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setAvatarFile(event.target.files?.[0] ?? null)
                    }
                  />
                </div>
                <small className="text-secondary">
                  JPG, PNG hoặc WEBP; tối đa 5 MB.
                </small>
                {modalMode === 'edit' && selectedUser?.avatarUrl && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger d-block mt-2"
                    onClick={() => void handleRemoveAvatar()}
                    disabled={isSubmitting}
                  >
                    Xóa ảnh hiện tại
                  </button>
                )}
              </div>
              <div className="col-12">
                <div className="form-label">Vai trò *</div>
                <div className="user-role-choice-grid">
                  {roleOptions.map((role) => {
                    const doctorCreate =
                      modalMode === 'create' && role.code === 'DOCTOR';
                    const isSelected = form.roleCodes.includes(role.code);
                    const isDisabled = Boolean(
                      rolesAreLocked || doctorCreate,
                    );
                    return (
                      <button
                        type="button"
                        key={role.id}
                        className={`user-role-choice${isSelected ? ' user-role-choice--selected' : ''
                          }`}
                        disabled={isDisabled}
                        title={
                          doctorCreate
                            ? 'Tạo bác sĩ tại chức năng Quản lý bác sĩ'
                            : rolesAreLocked
                              ? 'Tài khoản đã gắn hồ sơ nghiệp vụ'
                              : `Chọn vai trò ${role.name}`
                        }
                        onClick={() => toggleRole(role.code)}
                      >
                        <span className="user-role-choice__icon">
                          <span className="material-symbols-outlined">
                            {doctorCreate
                              ? 'lock'
                              : isSelected
                                ? 'check'
                                : 'person'}
                          </span>
                        </span>
                        <span className="text-start">
                          <strong>{role.name}</strong>
                          <small>
                            {doctorCreate
                              ? 'Tạo tại Quản lý bác sĩ'
                              : role.description || 'Vai trò hệ thống'}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {rolesAreLocked && (
                  <small className="d-block text-warning mt-2">
                    Không thể đổi vai trò vì tài khoản đã gắn hồ sơ nghiệp vụ.
                  </small>
                )}
              </div>
            </div>
          </form>
        </AppModal>
      )}

      {modalMode === 'view' && selectedUser && (
        <AppModal title="Chi tiết người dùng" onClose={closeModal}>
          <div className="text-center mb-4">
            {selectedUser.avatarUrl ? (
              <img
                src={selectedUser.avatarUrl}
                alt={selectedUser.fullName}
                className="rounded-circle object-fit-cover"
                style={{ width: 72, height: 72 }}
              />
            ) : (
              <span
                className="doctor-card__avatar fs-4"
                style={{ width: 72, height: 72 }}
              >
                {getInitials(selectedUser.fullName)}
              </span>
            )}
            <h2 className="h5 mt-3 mb-1">{selectedUser.fullName}</h2>
            <div className="text-secondary">{selectedUser.email}</div>
          </div>
          <dl className="row mb-0">
            <dt className="col-sm-5">Số điện thoại</dt>
            <dd className="col-sm-7">
              {selectedUser.phoneNumber || 'Chưa cập nhật'}
            </dd>
            <dt className="col-sm-5">Vai trò</dt>
            <dd className="col-sm-7">
              {selectedUser.roles.map((role) => role.name).join(', ')}
            </dd>
            <dt className="col-sm-5">Trạng thái</dt>
            <dd className="col-sm-7">
              {STATUS_LABELS[selectedUser.status]}
            </dd>
            <dt className="col-sm-5">Ngày tạo</dt>
            <dd className="col-sm-7">{formatDate(selectedUser.createdAt)}</dd>
          </dl>
        </AppModal>
      )}

      {modalMode === 'delete' && selectedUser && (
        <AppModal
          title="Xác nhận xóa người dùng"
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
                {isSubmitting ? 'Đang xóa...' : 'Xóa người dùng'}
              </button>
            </>
          }
        >
          Bạn có chắc muốn xóa tài khoản{' '}
          <strong>{selectedUser.fullName}</strong>? Thao tác này không thể hoàn
          tác.
        </AppModal>
      )}
    </div>
  );
}
