import { useMemo, useState, type FormEvent } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/components/ui/admin-crud.css';
import { getApiErrorMessage } from '@/services/axios-client';

import { useSpecialties } from '../../hooks/use-specialties';
import type {
  Specialty,
  SpecialtyPayload,
} from '../../types/specialty.types';
import { getSpecialtyIcon } from '@/utils/icon-mapper';

type ModalMode = 'create' | 'edit' | 'view' | 'delete' | null;

const EMPTY_FORM: SpecialtyPayload = {
  code: '',
  name: '',
  description: '',
  examinationFee: 0,
  status: 'DANG_HOAT_DONG',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function TrangQuanLyChuyenKhoa() {
  const {
    specialties,
    isLoading,
    error,
    reload,
    createSpecialty,
    updateSpecialty,
    removeSpecialty,
  } = useSpecialties();
  const { showToast } = useAppToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<Specialty | null>(null);
  const [form, setForm] = useState<SpecialtyPayload>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSpecialties = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase('vi');
    return specialties.filter(
      (specialty) =>
        !search ||
        specialty.name.toLocaleLowerCase('vi').includes(search) ||
        specialty.code.toLocaleLowerCase('vi').includes(search),
    );
  }, [searchTerm, specialties]);

  const closeModal = () => {
    if (isSubmitting) return;
    setModalMode(null);
    setSelectedSpecialty(null);
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setModalMode('create');
  };

  const openSpecialtyModal = (
    mode: Exclude<ModalMode, 'create' | null>,
    specialty: Specialty,
  ) => {
    setSelectedSpecialty(specialty);
    setForm({
      code: specialty.code,
      name: specialty.name,
      description: specialty.description ?? '',
      examinationFee: specialty.examinationFee,
      status: specialty.status,
    });
    setModalMode(mode);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const message =
        modalMode === 'create'
          ? await createSpecialty(form)
          : await updateSpecialty(selectedSpecialty!.id, form);
      showToast(message);
      setModalMode(null);
      setSelectedSpecialty(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSpecialty) return;
    setIsSubmitting(true);
    try {
      const message = await removeSpecialty(selectedSpecialty.id);
      showToast(message);
      setModalMode(null);
      setSelectedSpecialty(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormModal = modalMode === 'create' || modalMode === 'edit';
  const activeSpecialtyCount = specialties.filter(
    (specialty) => specialty.status === 'DANG_HOAT_DONG',
  ).length;
  const totalDoctorCount = specialties.reduce(
    (total, specialty) => total + specialty.doctorCount,
    0,
  );

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Danh mục lâm sàng</p>
          <h1>QUẢN LÝ CHUYÊN KHOA</h1>
          <p className="admin-management-description">
            Theo dõi chuyên khoa, phí khám và nhân sự đang phụ trách.
          </p>
        </div>
        <div className="admin-management-summary" aria-label="Tổng quan chuyên khoa">
          <span><strong>{formatNumber(specialties.length)}</strong> chuyên khoa</span>
          <span><strong>{formatNumber(activeSpecialtyCount)}</strong> đang hoạt động</span>
          <span><strong>{formatNumber(totalDoctorCount)}</strong> bác sĩ</span>
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
            placeholder="Tìm kiếm chuyên khoa..."
          />
        </div>
        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={openCreateModal}
        >
          <span className="material-symbols-outlined">add</span>
          Thêm chuyên khoa
        </button>
      </div>

      {isLoading && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div>Đang tải danh sách chuyên khoa...</div>
        </div>
      )}

      {!isLoading && error && (
        <div className="admin-crud-empty">
          <p className="text-danger">{error}</p>
          <button className="btn btn-outline-primary" onClick={() => void reload()}>
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="admin-management-table-card">
          <div className="admin-management-table-heading">
            <div>
              <h2>Danh sách chuyên khoa</h2>
              <p>{formatNumber(filteredSpecialties.length)} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table admin-management-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Chuyên khoa</th>
                  <th>Nhân sự</th>
                  <th>Phí khám</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpecialties.map((specialty) => (
                  <tr key={specialty.id}>
                    <td>
                      <div className="admin-management-entity">
                        <span className="admin-crud-icon">
                          <span className="material-symbols-outlined">{getSpecialtyIcon(specialty.name)}</span>
                        </span>
                        <div>
                          <strong>{specialty.name}</strong>
                          <small>{specialty.code} · {specialty.description || 'Chưa có mô tả'}</small>
                        </div>
                      </div>
                    </td>
                    <td><strong>{formatNumber(specialty.doctorCount)}</strong> bác sĩ</td>
                    <td className="fw-semibold">{formatCurrency(specialty.examinationFee)}</td>
                    <td>
                      <span className={specialty.status === 'DANG_HOAT_DONG' ? 'badge-status-active' : 'badge-status-locked'}>
                        {specialty.status === 'DANG_HOAT_DONG' ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-crud-actions justify-content-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => openSpecialtyModal('view', specialty)}>
                          <span className="material-symbols-outlined">visibility</span>Chi tiết
                        </button>
                        <button className="btn btn-sm btn-light" onClick={() => openSpecialtyModal('edit', specialty)}>
                          <span className="material-symbols-outlined">edit</span>Sửa
                        </button>
                        <button
                          className="btn btn-sm btn-light text-danger"
                          onClick={() => openSpecialtyModal('delete', specialty)}
                          disabled={specialty.doctorCount > 0}
                          title={specialty.doctorCount > 0 ? `Không thể xóa vì đang có ${specialty.doctorCount} bác sĩ trực thuộc.` : 'Xóa chuyên khoa'}
                        >
                          <span className="material-symbols-outlined">delete</span>Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredSpecialties.length === 0 && (
            <div className="admin-crud-empty py-5">
              {specialties.length === 0 ? 'Chưa có chuyên khoa nào.' : 'Không tìm thấy chuyên khoa phù hợp.'}
            </div>
          )}
        </div>
      )}

      {isFormModal && (
        <AppModal
          title={
            modalMode === 'create'
              ? 'Thêm chuyên khoa'
              : 'Cập nhật chuyên khoa'
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
                form="specialty-form"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Đang lưu...'
                  : modalMode === 'create'
                    ? 'Thêm chuyên khoa'
                    : 'Lưu thay đổi'}
              </button>
            </>
          }
        >
          <form id="specialty-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="specialty-code">
                  Mã chuyên khoa *
                </label>
                <input
                  id="specialty-code"
                  className="form-control"
                  value={form.code}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      code: event.target.value.toUpperCase(),
                    })
                  }
                  pattern="[A-Z0-9_]+"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="specialty-name">
                  Tên chuyên khoa *
                </label>
                <input
                  id="specialty-name"
                  className="form-control"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="specialty-fee">
                  Phí khám (VNĐ) *
                </label>
                <input
                  id="specialty-fee"
                  className="form-control"
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(form.examinationFee)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      examinationFee: Number(
                        event.target.value.replace(/\D/g, ''),
                      ),
                    })
                  }
                  onFocus={(event) => event.currentTarget.select()}
                  placeholder="Ví dụ: 300.000"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="specialty-status">
                  Trạng thái
                </label>
                <select
                  id="specialty-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as SpecialtyPayload['status'],
                    })
                  }
                >
                  <option value="DANG_HOAT_DONG">Đang hoạt động</option>
                  <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="specialty-description">
                  Mô tả
                </label>
                <textarea
                  id="specialty-description"
                  className="form-control"
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </div>
            </div>
          </form>
        </AppModal>
      )}

      {modalMode === 'view' && selectedSpecialty && (
        <AppModal title="Chi tiết chuyên khoa" onClose={closeModal}>
          <h2 className="h5 mb-1">{selectedSpecialty.name}</h2>
          <p className="text-secondary">{selectedSpecialty.code}</p>
          <p>{selectedSpecialty.description || 'Chưa có mô tả'}</p>
          <dl className="row mb-0">
            <dt className="col-sm-5">Phí khám</dt>
            <dd className="col-sm-7">
              {formatCurrency(selectedSpecialty.examinationFee)}
            </dd>
            <dt className="col-sm-5">Số bác sĩ</dt>
            <dd className="col-sm-7">{selectedSpecialty.doctorCount}</dd>
            <dt className="col-sm-5">Trạng thái</dt>
            <dd className="col-sm-7">
              {selectedSpecialty.status === 'DANG_HOAT_DONG'
                ? 'Đang hoạt động'
                : 'Ngừng hoạt động'}
            </dd>
          </dl>
        </AppModal>
      )}

      {modalMode === 'delete' && selectedSpecialty && (
        <AppModal
          title="Xác nhận xóa chuyên khoa"
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
                {isSubmitting ? 'Đang xóa...' : 'Xóa chuyên khoa'}
              </button>
            </>
          }
        >
          Bạn có chắc muốn xóa chuyên khoa{' '}
          <strong>{selectedSpecialty.name}</strong>?
        </AppModal>
      )}
    </div>
  );
}
