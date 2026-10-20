import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import { useLocation } from 'react-router-dom';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { useAuthStore } from '@/stores/auth.store';
import { isDepartmentHeadEmail } from '@/utils/department-head';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';

import { useMedicines } from '../../hooks/use-medicines';
import type {
  CreateMedicineDto,
  Medicine,
  MedicineStatus,
  StockInDto,
} from '../../types/medicine.type';
import '../../medicine-inventory.css';

type MedicineTab = 'ALL' | 'EXPIRED_SOON' | 'EXPIRED';
type ModalMode =
  | 'create'
  | 'edit'
  | 'view'
  | 'delete'
  | 'stock-in'
  | null;

type MedicineForm = CreateMedicineDto;
type StockInForm = StockInDto & { medicineId: number };

const EMPTY_FORM: MedicineForm = {
  name: '',
  group: '',
  unit: 'Viên',
  salePrice: 0,
  stock: 0,
  minimumStock: 100,
  manufacturer: '',
  description: '',
  expiryDate: '',
  status: 'DANG_HOAT_DONG',
};

const EMPTY_STOCK_IN_FORM: StockInForm = {
  medicineId: 0,
  batchCode: '',
  quantity: 1,
  purchasePrice: 0,
  manufactureDate: '',
  expiryDate: '',
  supplier: '',
  notes: '',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  return dinhDangNgay(value);
};

const toIsoDate = (value?: string) =>
  value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;

const getPageNumbers = (currentPage: number, totalPages: number) => {
  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
};

const getStockState = (medicine: Medicine) => {
  if (medicine.trangThai === 'NGUNG_HOAT_DONG') {
    return { className: 'inactive', label: 'Ngừng kinh doanh' };
  }
  if (medicine.soLuongTon === 0) {
    return { className: 'out', label: 'Hết hàng' };
  }
  if (medicine.soLuongTon <= medicine.mucTonToiThieu) {
    return { className: 'low', label: 'Sắp hết hàng' };
  }
  return {
    className: medicine.trangThai === 'DANG_HOAT_DONG' ? 'active' : 'inactive',
    label:
      medicine.trangThai === 'DANG_HOAT_DONG'
        ? 'Đang kinh doanh'
        : 'Ngừng kinh doanh',
  };
};

export default function TrangQuanLyKhoThuoc() {
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin =
    location.pathname.startsWith('/admin') ||
    (user?.roles?.includes('ADMIN') && !user?.roles?.includes('PHARMACIST'));
  const isDepartmentHead = isDepartmentHeadEmail(user?.email);

  const { showToast } = useAppToast();
  const [activeTab, setActiveTab] = useState<MedicineTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MedicineStatus>(
    'ALL',
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const {
    medicines,
    medicineOptions,
    meta,
    error,
    isLoading,
    create,
    isCreating,
    update,
    isUpdating,
    remove,
    isRemoving,
    stockIn,
    isStockingIn,
    uploadImage,
    removeImage,
    isUploadingImage,
    refresh,
  } = useMedicines({
    page,
    limit,
    search: searchTerm.trim() || undefined,
    group: groupFilter !== 'ALL' ? groupFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    tab: activeTab !== 'ALL' ? activeTab : undefined,
  });

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null,
  );
  const [form, setForm] = useState<MedicineForm>(EMPTY_FORM);
  const [stockInForm, setStockInForm] =
    useState<StockInForm>(EMPTY_STOCK_IN_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  useEffect(
    () => () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  const pageNumbers = useMemo(
    () => getPageNumbers(meta.page, meta.totalPages),
    [meta.page, meta.totalPages],
  );
  const displayedFrom =
    meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const displayedTo = Math.min(meta.page * meta.limit, meta.total);
  const isSubmitting =
    isCreating || isUpdating || isUploadingImage || isRemoving;

  const resetPageAnd = (action: () => void) => {
    setPage(1);
    action();
  };

  const resetImageState = (url = '') => {
    setImageFile(null);
    setImagePreview(url);
    setRemoveCurrentImage(false);
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedMedicine(null);
    resetImageState();
  };

  const openCreateModal = () => {
    if (isAdmin) return;
    setForm(EMPTY_FORM);
    resetImageState();
    setModalMode('create');
  };

  const openStockInModal = (medicine?: Medicine) => {
    if (isAdmin) return;
    const target =
      medicine ??
      medicineOptions[0];
    setSelectedMedicine(target ?? null);
    setStockInForm({
      ...EMPTY_STOCK_IN_FORM,
      medicineId: target?.id ?? 0,
    });
    setModalMode('stock-in');
  };

  const openMedicineModal = (
    mode: Exclude<ModalMode, 'create' | 'stock-in' | null>,
    medicine: Medicine,
  ) => {
    if (isAdmin && mode !== 'view') return;
    if (mode === 'delete' && !isDepartmentHead) return;
    setSelectedMedicine(medicine);
    setForm({
      name: medicine.tenThuoc,
      group: medicine.hoatChat ?? '',
      unit: medicine.donViTinh,
      salePrice: medicine.giaBan,
      // Tồn kho chỉ được thay đổi thông qua từng lô thuốc.
      stock: 0,
      minimumStock: medicine.mucTonToiThieu,
      manufacturer: medicine.nhaSanXuat ?? '',
      description: medicine.moTa ?? '',
      expiryDate: '',
      status: medicine.trangThai,
    });
    resetImageState(medicine.anhThuocUrl ?? '');
    setModalMode(mode);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Ảnh thuốc chỉ hỗ trợ JPG, PNG hoặc WEBP', 'danger');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ảnh thuốc không được vượt quá 5 MB', 'danger');
      event.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveCurrentImage(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: MedicineForm = {
      ...form,
      expiryDate: undefined,
    };
    let savedMedicine: Medicine | null = null;
    if (modalMode === 'create') {
      savedMedicine = await create(payload);
    } else if (modalMode === 'edit' && selectedMedicine) {
      // Không gửi tồn kho/hạn dùng từ danh mục để tránh sửa chéo dữ liệu lô.
      const { stock: _stock, expiryDate: _expiryDate, ...updatePayload } =
        payload;
      savedMedicine = await update(selectedMedicine.id, updatePayload);
    }
    if (!savedMedicine) return;

    if (imageFile) {
      const uploaded = await uploadImage(savedMedicine.id, imageFile);
      if (!uploaded) return;
    } else if (
      modalMode === 'edit' &&
      removeCurrentImage &&
      selectedMedicine?.anhThuocUrl
    ) {
      const removed = await removeImage(savedMedicine.id);
      if (!removed) return;
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!selectedMedicine) return;
    const removed = await remove(selectedMedicine.id);
    if (removed) closeModal();
  };

  const handleStockInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { medicineId, ...payload } = stockInForm;
    const stocked = await stockIn(medicineId, {
      ...payload,
      manufactureDate: toIsoDate(payload.manufactureDate),
      expiryDate: toIsoDate(payload.expiryDate) ?? '',
    });
    if (stocked) closeModal();
  };

  return (
    <div className="medicine-inventory">
      <header className="medicine-inventory__header">
        <div>
          <div className="medicine-inventory__eyebrow">
            <span />
            Quản lý kho thuốc
          </div>
          <h1>Danh mục thuốc</h1>
          <p>
            Quản lý biệt dược, hoạt chất, giá bán và số lượng tồn kho của phòng
            khám.
          </p>
        </div>
        <div className="medicine-inventory__header-actions">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => void refresh()}
            disabled={isLoading}
          >
            <span className="material-symbols-outlined">sync</span>
            Tải lại dữ liệu
          </button>
          {!isAdmin && (
            <>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => openStockInModal()}
                disabled={medicineOptions.length === 0}
              >
                <span className="material-symbols-outlined">inventory</span>
                Nhập kho
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateModal}
              >
                <span className="material-symbols-outlined">add_circle</span>
                Thêm thuốc mới
              </button>
            </>
          )}
        </div>
      </header>

      <section className="medicine-inventory__stats">
        <article>
          <span className="material-symbols-outlined">medication</span>
          <div>
            <small>Tổng mặt hàng</small>
            <strong>{meta.stats.total}</strong>
          </div>
        </article>
        <article
          className="is-warning"
          style={{ cursor: 'pointer' }}
          onClick={() => resetPageAnd(() => setActiveTab('EXPIRED_SOON'))}
          title="Bấm để xem danh sách thuốc sắp hết hạn"
        >
          <span className="material-symbols-outlined">event_busy</span>
          <div>
            <small>Sắp hết hạn</small>
            <strong>{meta.stats.expiringSoon}</strong>
          </div>
        </article>
        <article>
          <span className="material-symbols-outlined">payments</span>
          <div>
            <small>Giá trị tồn kho</small>
            <strong>{formatCurrency(meta.stats.inventoryValue)}</strong>
          </div>
        </article>
        <article className="is-success">
          <span className="material-symbols-outlined">science</span>
          <div>
            <small>Hoạt chất</small>
            <strong>{meta.stats.activeIngredients}</strong>
          </div>
        </article>
      </section>

      <section className="medicine-inventory__filters">
        <label className="medicine-inventory__search">
          <span className="material-symbols-outlined">search</span>
          <input
            className="form-control"
            value={searchTerm}
            placeholder="Tìm theo mã hoặc tên thuốc..."
            onChange={(event) =>
              resetPageAnd(() => setSearchTerm(event.target.value))
            }
          />
        </label>
        <select
          className="form-select"
          value={groupFilter}
          onChange={(event) =>
            resetPageAnd(() => setGroupFilter(event.target.value))
          }
        >
          <option value="ALL">Tất cả hoạt chất</option>
          {meta.groups.map((group) => (
            <option value={group} key={group}>
              {group}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={statusFilter}
          onChange={(event) =>
            resetPageAnd(() =>
              setStatusFilter(event.target.value as 'ALL' | MedicineStatus),
            )
          }
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DANG_HOAT_DONG">Đang kinh doanh</option>
          <option value="NGUNG_HOAT_DONG">Ngừng kinh doanh</option>
        </select>
      </section>

      <section className="medicine-inventory__card">
        <div className="medicine-inventory__tabs">
          {[
            ['ALL', 'Tất cả'],
            ['EXPIRED_SOON', 'Sắp hết hạn'],
            ['EXPIRED', 'Đã hết hạn'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={activeTab === value ? 'active' : ''}
              onClick={() =>
                resetPageAnd(() => setActiveTab(value as MedicineTab))
              }
            >
              {label}
            </button>
          ))}
          <span>
            Hiển thị <strong>{displayedFrom}–{displayedTo}</strong> trong{' '}
            <strong>{meta.total}</strong>
          </span>
        </div>

        {error && (
          <div className="medicine-inventory__state text-danger">
            <span className="material-symbols-outlined">error</span>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => void refresh()}
            >
              Thử lại
            </button>
          </div>
        )}

        {!error && (
          <div className="table-responsive">
            <table className="table medicine-inventory__table mb-0">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Mã</th>
                  <th>Hoạt chất</th>
                  <th>Giá bán</th>
                  <th className="text-center">Tồn kho</th>
                  <th>Hạn sử dụng</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: Math.min(limit, 5) }).map((_, index) => (
                    <tr className="medicine-inventory__skeleton" key={index}>
                      <td colSpan={8}>
                        <span />
                      </td>
                    </tr>
                  ))}

                {!isLoading && medicines.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="medicine-inventory__state">
                        <span className="material-symbols-outlined">
                          inventory_2
                        </span>
                        <h2>Chưa có thuốc phù hợp</h2>
                        <p>Thay đổi bộ lọc hoặc thêm thuốc mới vào hệ thống.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  medicines.map((medicine) => {
                    const stockState = getStockState(medicine);
                    return (
                      <tr key={medicine.id}>
                        <td>
                          <div className="medicine-inventory__product">
                            <div className="medicine-inventory__image">
                              {medicine.anhThuocUrl ? (
                                <img
                                  src={medicine.anhThuocUrl}
                                  alt={medicine.tenThuoc}
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                    event.currentTarget.nextElementSibling?.classList.remove(
                                      'd-none',
                                    );
                                  }}
                                />
                              ) : null}
                              <span
                                className={`material-symbols-outlined ${
                                  medicine.anhThuocUrl ? 'd-none' : ''
                                }`}
                              >
                                medication
                              </span>
                            </div>
                            <div>
                              <strong>{medicine.tenThuoc}</strong>
                              <small>Dạng: {medicine.donViTinh}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="medicine-inventory__code">
                            {medicine.maThuoc}
                          </span>
                        </td>
                        <td>
                          <strong>{medicine.hoatChat || 'Chưa cập nhật'}</strong>
                          <small className="d-block">
                            Đơn vị: {medicine.donViTinh}
                          </small>
                        </td>
                        <td className="fw-semibold">
                          {formatCurrency(medicine.giaBan)}
                        </td>
                        <td className="text-center">
                          <strong
                            className={`medicine-inventory__stock is-${stockState.className}`}
                          >
                            {medicine.soLuongTon}
                          </strong>
                          <small className="d-block">
                            {medicine.donViTinh}
                          </small>
                        </td>
                        <td>{formatDate(medicine.hanSuDung)}</td>
                        <td>
                          <span
                            className={`medicine-inventory__status is-${stockState.className}`}
                          >
                            {stockState.label}
                          </span>
                        </td>
                        <td>
                          <div className="medicine-inventory__actions">
                            <button
                              type="button"
                              title="Xem chi tiết"
                              aria-label={`Xem chi tiết ${medicine.tenThuoc}`}
                              onClick={() =>
                                openMedicineModal('view', medicine)
                              }
                            >
                              <span className="material-symbols-outlined">
                                visibility
                              </span>
                            </button>
                            {!isAdmin && (
                              <>
                                <button
                                  type="button"
                                  title="Chỉnh sửa"
                                  aria-label={`Chỉnh sửa ${medicine.tenThuoc}`}
                                  onClick={() =>
                                    openMedicineModal('edit', medicine)
                                  }
                                >
                                  <span className="material-symbols-outlined">
                                    edit_square
                                  </span>
                                </button>
                                {isDepartmentHead && (
                                  <button
                                    type="button"
                                    className="is-danger"
                                    title="Xóa thuốc"
                                    aria-label={`Xóa ${medicine.tenThuoc}`}
                                    onClick={() =>
                                      openMedicineModal('delete', medicine)
                                    }
                                  >
                                    <span className="material-symbols-outlined">
                                      delete
                                    </span>
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

        <footer className="medicine-inventory__pagination">
          <span>
            Hiển thị {displayedFrom}–{displayedTo} trong {meta.total} thuốc
          </span>
          <div className="medicine-inventory__page-buttons">
            <button
              type="button"
              aria-label="Trang trước"
              disabled={meta.page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {pageNumbers.map((pageNumber, index) => (
              <span className="d-flex align-items-center" key={pageNumber}>
                {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                  <span className="medicine-inventory__ellipsis">…</span>
                )}
                <button
                  type="button"
                  className={pageNumber === meta.page ? 'active' : ''}
                  disabled={isLoading}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              </span>
            ))}
            <button
              type="button"
              aria-label="Trang sau"
              disabled={meta.page >= meta.totalPages || isLoading}
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <select
            className="form-select"
            aria-label="Số dòng mỗi trang"
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
          </select>
        </footer>
      </section>

      {['create', 'edit'].includes(modalMode ?? '') && (
        <AppModal
          onClose={closeModal}
          title={modalMode === 'create' ? 'Thêm thuốc mới' : 'Chỉnh sửa thuốc'}
          size="lg"
        >
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="medicine-inventory__upload mb-4">
              <div className="medicine-inventory__upload-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="Xem trước ảnh thuốc" />
                ) : (
                  <span className="material-symbols-outlined">medication</span>
                )}
              </div>
              <div>
                <label
                  className="btn btn-outline-primary btn-sm"
                  htmlFor="medicine-image"
                >
                  <span className="material-symbols-outlined">upload</span>
                  Chọn ảnh thuốc
                </label>
                <input
                  id="medicine-image"
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm text-danger"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                      setRemoveCurrentImage(true);
                    }}
                  >
                    Xóa ảnh
                  </button>
                )}
                <small className="d-block mt-2">
                  JPG, PNG hoặc WEBP; tối đa 5 MB.
                </small>
              </div>
            </div>

            <div className="alert alert-info py-2 small" role="note">
              Tồn kho và hạn sử dụng được quản lý theo từng lô. Sau khi tạo
              thuốc, chọn <strong>Nhập kho</strong> để thêm lô đầu tiên.
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Tên thuốc *</label>
                <input
                  className="form-control"
                  required
                  maxLength={200}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Hoạt chất / Hàm lượng</label>
                <input
                  className="form-control"
                  maxLength={255}
                  value={form.group}
                  onChange={(event) =>
                    setForm({ ...form, group: event.target.value })
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Đơn vị tính *</label>
                <input
                  className="form-control"
                  required
                  maxLength={50}
                  value={form.unit}
                  onChange={(event) =>
                    setForm({ ...form, unit: event.target.value })
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Giá bán (VNĐ) *</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  required
                  value={form.salePrice}
                  onChange={(event) =>
                    setForm({ ...form, salePrice: Number(event.target.value) })
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Tồn kho tối thiểu *</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  required
                  value={form.minimumStock}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      minimumStock: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as MedicineStatus,
                    })
                  }
                >
                  <option value="DANG_HOAT_DONG">Đang kinh doanh</option>
                  <option value="NGUNG_HOAT_DONG">Ngừng kinh doanh</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Nhà sản xuất</label>
                <input
                  className="form-control"
                  maxLength={200}
                  value={form.manufacturer}
                  onChange={(event) =>
                    setForm({ ...form, manufacturer: event.target.value })
                  }
                />
              </div>
              <div className="col-12">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-light"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span className="spinner-border spinner-border-sm" />
                )}
                {modalMode === 'create' ? 'Thêm thuốc' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </AppModal>
      )}

      {modalMode === 'view' && selectedMedicine && (
        <AppModal onClose={closeModal} title="Chi tiết thuốc" size="lg">
          <div className="medicine-inventory__detail">
            <div className="medicine-inventory__detail-image">
              {selectedMedicine.anhThuocUrl ? (
                <img
                  src={selectedMedicine.anhThuocUrl}
                  alt={selectedMedicine.tenThuoc}
                />
              ) : (
                <span className="material-symbols-outlined">medication</span>
              )}
            </div>
            <dl>
              <div>
                <dt>Mã thuốc</dt>
                <dd>{selectedMedicine.maThuoc}</dd>
              </div>
              <div>
                <dt>Tên thuốc</dt>
                <dd>{selectedMedicine.tenThuoc}</dd>
              </div>
              <div>
                <dt>Hoạt chất</dt>
                <dd>{selectedMedicine.hoatChat || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Đơn vị tính</dt>
                <dd>{selectedMedicine.donViTinh}</dd>
              </div>
              <div>
                <dt>Nhà sản xuất</dt>
                <dd>{selectedMedicine.nhaSanXuat || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Giá nhập gần nhất</dt>
                <dd>{formatCurrency(selectedMedicine.giaNhap)}</dd>
              </div>
              <div>
                <dt>Giá bán</dt>
                <dd>{formatCurrency(selectedMedicine.giaBan)}</dd>
              </div>
              <div>
                <dt>Số lượng tồn</dt>
                <dd>
                  {selectedMedicine.soLuongTon} (tối thiểu{' '}
                  {selectedMedicine.mucTonToiThieu})
                </dd>
              </div>
              <div>
                <dt>Hạn sử dụng</dt>
                <dd>{formatDate(selectedMedicine.hanSuDung)}</dd>
              </div>
              <div>
                <dt>Mô tả</dt>
                <dd>{selectedMedicine.moTa || 'Chưa cập nhật'}</dd>
              </div>
            </dl>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-light" onClick={closeModal}>
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openMedicineModal('edit', selectedMedicine)}
            >
              Chỉnh sửa
            </button>
          </div>
        </AppModal>
      )}

      {modalMode === 'stock-in' && (
        <AppModal onClose={closeModal} title="Nhập kho thuốc" size="lg">
          <form onSubmit={(event) => void handleStockInSubmit(event)}>
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Thuốc nhập kho *</label>
                <select
                  className="form-select"
                  required
                  value={stockInForm.medicineId}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      medicineId: Number(event.target.value),
                    })
                  }
                >
                  <option value={0} disabled>
                    Chọn thuốc
                  </option>
                  {medicineOptions.map((medicine) => (
                    <option value={medicine.id} key={medicine.id}>
                      {medicine.maThuoc} – {medicine.tenThuoc}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Mã lô *</label>
                <input
                  className="form-control"
                  required
                  value={stockInForm.batchCode}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      batchCode: event.target.value,
                    })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Số lượng nhập *</label>
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  required
                  value={stockInForm.quantity}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      quantity: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Giá nhập (VNĐ) *</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  required
                  value={stockInForm.purchasePrice}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      purchasePrice: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Nhà cung cấp *</label>
                <input
                  className="form-control"
                  required
                  value={stockInForm.supplier}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      supplier: event.target.value,
                    })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Ngày sản xuất</label>
                <input
                  className="form-control"
                  type="date"
                  value={stockInForm.manufactureDate}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      manufactureDate: event.target.value,
                    })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Hạn sử dụng *</label>
                <input
                  className="form-control"
                  type="date"
                  required
                  value={stockInForm.expiryDate}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      expiryDate: event.target.value,
                    })
                  }
                />
              </div>
              <div className="col-12">
                <label className="form-label">Ghi chú</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={stockInForm.notes}
                  onChange={(event) =>
                    setStockInForm({
                      ...stockInForm,
                      notes: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-light"
                onClick={closeModal}
                disabled={isStockingIn}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isStockingIn || stockInForm.medicineId === 0}
              >
                {isStockingIn && (
                  <span className="spinner-border spinner-border-sm" />
                )}
                Xác nhận nhập kho
              </button>
            </div>
          </form>
        </AppModal>
      )}

      {modalMode === 'delete' && selectedMedicine && (
        <AppModal onClose={closeModal} title="Xác nhận xóa thuốc">
          <div className="medicine-inventory__delete">
            <span className="material-symbols-outlined">warning</span>
            <h2>Xóa {selectedMedicine.tenThuoc}?</h2>
            <p>
              Thuốc đã có đơn thuốc hoặc giao dịch kho sẽ không thể xóa để bảo
              toàn lịch sử hệ thống.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-light"
                onClick={closeModal}
                disabled={isRemoving}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleDelete()}
                disabled={isRemoving}
              >
                {isRemoving && (
                  <span className="spinner-border spinner-border-sm" />
                )}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}
