import { useEffect, useMemo, useState, type FormEvent } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/components/ui/admin-crud.css';
import { getApiErrorMessage } from '@/services/axios-client';

import { useRoles } from '../../hooks/use-roles';
import type {
  ManagedRole,
  PermissionAction,
} from '../../types/role.types';

type ModalMode = 'create' | 'edit' | 'view' | 'delete' | null;

const ACTIONS: Array<{ key: PermissionAction; label: string }> = [
  { key: 'view', label: 'Xem' },
  { key: 'create', label: 'Thêm' },
  { key: 'update', label: 'Sửa' },
  { key: 'delete', label: 'Xóa' },
];

export default function TrangVaiTroPhanQuyen() {
  const {
    roles,
    modules,
    isLoading,
    error,
    createRole,
    updateRole,
    savePermissions,
    removeRole,
  } = useRoles();
  const { showToast } = useAppToast();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [permissionDrafts, setPermissionDrafts] = useState<
    Record<number, number[]>
  >({});
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [targetRole, setTargetRole] = useState<ManagedRole | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPermissionDrafts(
      Object.fromEntries(roles.map((role) => [role.id, role.permissionIds])),
    );
    setSelectedRoleId((current) =>
      current && roles.some((role) => role.id === current)
        ? current
        : (roles[0]?.id ?? null),
    );
  }, [roles]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );
  const selectedPermissionIds = selectedRole
    ? (permissionDrafts[selectedRole.id] ?? selectedRole.permissionIds)
    : [];

  const closeModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
    setTargetRole(null);
  };

  const openCreateModal = () => {
    setForm({ name: '', description: '' });
    setTargetRole(null);
    setModalMode('create');
  };

  const openRoleModal = (
    mode: Exclude<ModalMode, 'create' | null>,
    role: ManagedRole,
  ) => {
    setTargetRole(role);
    setForm({ name: role.name, description: role.description ?? '' });
    setModalMode(mode);
  };

  const togglePermission = (permissionId: number) => {
    if (!selectedRole) return;
    setPermissionDrafts((current) => {
      const currentIds = current[selectedRole.id] ?? selectedRole.permissionIds;
      return {
        ...current,
        [selectedRole.id]: currentIds.includes(permissionId)
          ? currentIds.filter((id) => id !== permissionId)
          : [...currentIds, permissionId],
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || isSaving) return;
    setIsSaving(true);
    try {
      const response = await savePermissions(
        selectedRole.id,
        selectedPermissionIds,
      );
      showToast(response.message);
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể lưu cấu hình phân quyền'),
        'danger',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        const response = await createRole(form);
        setSelectedRoleId(response.data.id);
        showToast(response.message);
      } else if (modalMode === 'edit' && targetRole) {
        const response = await updateRole(targetRole.id, form);
        showToast(response.message);
      }
      setModalMode(null);
      setTargetRole(null);
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể lưu vai trò'),
        'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!targetRole || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await removeRole(targetRole.id);
      showToast(response.message);
      setModalMode(null);
      setTargetRole(null);
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể xóa vai trò'),
        'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormModal = modalMode === 'create' || modalMode === 'edit';
  const hasUnsavedChanges =
    selectedRole !== null &&
    [...selectedPermissionIds].sort((a, b) => a - b).join(',') !==
      [...selectedRole.permissionIds].sort((a, b) => a - b).join(',');

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <h1>VAI TRÒ VÀ PHÂN QUYỀN</h1>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="permission-layout">
        <aside className="permission-role-list d-flex flex-column gap-3">
          <h2 className="h5 mb-1">Danh sách vai trò</h2>
          <div className="d-flex flex-column gap-2">
            {isLoading ? (
              <div className="text-secondary py-3">Đang tải vai trò...</div>
            ) : (
              roles.map((role) => (
                <div className="d-flex align-items-center gap-1" key={role.id}>
                  <button
                    type="button"
                    className={`permission-role-button ${
                      selectedRoleId === role.id ? 'active' : ''
                    }`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <span>{role.name}</span>
                    {selectedRoleId === role.id && (
                      <span className="material-symbols-outlined">
                        chevron_right
                      </span>
                    )}
                  </button>
                  <div className="d-flex">
                    <button
                      type="button"
                      className="btn btn-sm p-1"
                      title="Xem chi tiết"
                      onClick={() => openRoleModal('view', role)}
                    >
                      <span className="material-symbols-outlined">
                        visibility
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm p-1"
                      title="Sửa vai trò"
                      onClick={() => openRoleModal('edit', role)}
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm p-1 text-danger"
                      title="Xóa vai trò"
                      onClick={() => openRoleModal('delete', role)}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            className="btn btn-outline-primary mt-auto d-flex align-items-center justify-content-center gap-2"
            onClick={openCreateModal}
          >
            <span className="material-symbols-outlined">add</span>
            Thêm vai trò mới
          </button>
        </aside>

        <section className="permission-matrix">
          {selectedRole ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <h2 className="h5 mb-1">
                    Phân quyền chi tiết: {selectedRole.name}
                  </h2>
                  <p className="text-secondary mb-0">
                    Quản lý quyền truy cập và thao tác cho vai trò được chọn.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-2"
                  onClick={() => void handleSavePermissions()}
                  disabled={isSaving || !hasUnsavedChanges}
                >
                  <span className="material-symbols-outlined">save</span>
                  {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>

              <div className="table-responsive rounded border">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Module hệ thống</th>
                      {ACTIONS.map((action) => (
                        <th className="text-center" key={action.key}>
                          {action.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((module) => (
                      <tr key={module.code}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">
                              {module.icon}
                            </span>
                            {module.name}
                          </div>
                        </td>
                        {ACTIONS.map((action) => {
                          const permission = module.permissions.find(
                            (item) => item.action === action.key,
                          );
                          return (
                            <td className="text-center" key={action.key}>
                              <input
                                type="checkbox"
                                className="form-check-input permission-switch"
                                role="switch"
                                checked={
                                  permission
                                    ? selectedPermissionIds.includes(
                                        permission.id,
                                      )
                                    : false
                                }
                                disabled={!permission || isSaving}
                                onChange={() =>
                                  permission &&
                                  togglePermission(permission.id)
                                }
                                aria-label={`${module.name} - ${action.label}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="admin-crud-empty">
              {isLoading ? 'Đang tải cấu hình...' : 'Chưa có vai trò nào.'}
            </div>
          )}
        </section>
      </div>

      {isFormModal && (
        <AppModal
          title={modalMode === 'create' ? 'Thêm vai trò mới' : 'Sửa vai trò'}
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
                form="role-form"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Đang lưu...'
                  : modalMode === 'create'
                    ? 'Thêm vai trò'
                    : 'Lưu thay đổi'}
              </button>
            </>
          }
        >
          <form id="role-form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="form-label" htmlFor="role-name">
              Tên vai trò <span className="text-danger">*</span>
            </label>
            <input
              id="role-name"
              className="form-control mb-3"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              minLength={2}
              maxLength={100}
              required
            />
            <label className="form-label" htmlFor="role-description">
              Mô tả
            </label>
            <textarea
              id="role-description"
              className="form-control"
              rows={3}
              maxLength={1000}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </form>
        </AppModal>
      )}

      {modalMode === 'view' && targetRole && (
        <AppModal title="Chi tiết vai trò" onClose={closeModal}>
          <dl className="row mb-0">
            <dt className="col-sm-4">Tên vai trò</dt>
            <dd className="col-sm-8">{targetRole.name}</dd>
            <dt className="col-sm-4">Mã vai trò</dt>
            <dd className="col-sm-8">{targetRole.code}</dd>
            <dt className="col-sm-4">Mô tả</dt>
            <dd className="col-sm-8">{targetRole.description || 'Chưa có'}</dd>
            <dt className="col-sm-4">Số người dùng</dt>
            <dd className="col-sm-8">{targetRole.userCount}</dd>
            <dt className="col-sm-4">Số quyền được bật</dt>
            <dd className="col-sm-8">{targetRole.enabledPermissionCount}</dd>
          </dl>
        </AppModal>
      )}

      {modalMode === 'delete' && targetRole && (
        <AppModal
          title="Xác nhận xóa vai trò"
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
                {isSubmitting ? 'Đang xóa...' : 'Xóa vai trò'}
              </button>
            </>
          }
        >
          Bạn có chắc muốn xóa vai trò <strong>{targetRole.name}</strong>?
          {targetRole.userCount > 0 && (
            <div className="alert alert-warning mt-3 mb-0">
              Vai trò đang được gán cho {targetRole.userCount} người dùng nên
              không thể xóa.
            </div>
          )}
        </AppModal>
      )}
    </div>
  );
}
