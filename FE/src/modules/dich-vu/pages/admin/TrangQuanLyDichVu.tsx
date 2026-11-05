import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react';
import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/components/ui/admin-crud.css';
import { getApiErrorMessage } from '@/services/axios-client';
import { useSpecialties } from '@/modules/chuyen-khoa/hooks/use-specialties';
import { useServices } from '../../hooks/use-services';
import type { MedicalService, ServicePayload, ServiceStatus } from '../../types/service.types';
import { getServiceIcon } from '@/utils/icon-mapper';

type ModalMode = 'create' | 'view' | 'edit' | 'delete' | null;
const SERVICES_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

const EMPTY_FORM: ServicePayload = { code: '', name: '', description: '', price: 0, specialtyId: undefined, estimatedMinutes: 30, status: 'DANG_HOAT_DONG' };
function currency(value: number) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value); }
function formatNumberWithDots(val: number) {
  if (val === undefined || val === null || isNaN(val)) return '';
  return new Intl.NumberFormat('vi-VN').format(val);
}

export default function TrangQuanLyDichVu() {
  const { services, isLoading, error, reload, createService, updateService, removeService } = useServices();
  const { specialties } = useSpecialties();
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ServiceStatus | ''>('');
  const [specialtyId, setSpecialtyId] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<MedicalService | null>(null);
  const [form, setForm] = useState<ServicePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return services.filter(
      (item) =>
        (!keyword || `${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(keyword)) &&
        (!status || item.status === status) &&
        (!specialtyId || item.specialty?.id === specialtyId)
    );
  }, [services, search, status, specialtyId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SERVICES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    filtered.length === 0 ? 0 : (currentPage - 1) * SERVICES_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * SERVICES_PER_PAGE, filtered.length);
  const visibleServices = useMemo(() => {
    const startIndex = (currentPage - 1) * SERVICES_PER_PAGE;
    return filtered.slice(startIndex, startIndex + SERVICES_PER_PAGE);
  }, [currentPage, filtered]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setMode('create'); };
  const open = (nextMode: Exclude<ModalMode, 'create' | null>, item: MedicalService) => {
    setSelected(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      specialtyId: item.specialty?.id,
      estimatedMinutes: item.estimatedMinutes ?? 30,
      status: item.status,
    });
    setMode(nextMode);
  };
  const close = () => { if (!submitting) setMode(null); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const message = mode === 'create' ? await createService(form) : await updateService(selected!.id, form);
      showToast(message);
      setMode(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setSubmitting(false);
    }
  };
  const remove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      showToast(await removeService(selected.id));
      setMode(null);
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError), 'danger');
    } finally {
      setSubmitting(false);
    }
  };
  const active = services.filter((item) => item.status === 'DANG_HOAT_DONG').length;

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Danh mục lâm sàng</p>
          <h1>QUẢN LÝ DỊCH VỤ</h1>
          <p className="admin-management-description">
            Theo dõi danh mục dịch vụ, chuyên khoa áp dụng và chi phí khám chữa bệnh.
          </p>
        </div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="admin-crud-card">
            <small className="text-secondary">Tổng dịch vụ</small>
            <strong className="d-block fs-3">{services.length}</strong>
          </div>
        </div>
        <div className="col-md-4">
          <div className="admin-crud-card">
            <small className="text-secondary">Đang hoạt động</small>
            <strong className="d-block fs-3 text-success">{active}</strong>
          </div>
        </div>
        <div className="col-md-4">
          <div className="admin-crud-card">
            <small className="text-secondary">Ngừng hoạt động</small>
            <strong className="d-block fs-3">{services.length - active}</strong>
          </div>
        </div>
      </div>
      <div className="admin-crud-toolbar">
        <div className="d-flex flex-wrap align-items-center gap-3 w-100">
          <div className="admin-crud-search">
            <span className="material-symbols-outlined">search</span>
            <input
              className="form-control"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm mã hoặc tên dịch vụ..."
            />
          </div>
          <select
            className="form-select"
            style={{ maxWidth: 230 }}
            value={specialtyId}
            onChange={(event) => {
              setSpecialtyId(event.target.value ? Number(event.target.value) : '');
              setPage(1);
            }}
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ maxWidth: 210 }}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ServiceStatus | '');
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DANG_HOAT_DONG">Đang hoạt động</option>
            <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
          </select>
          <button className="btn btn-primary d-flex align-items-center gap-2 ms-auto" onClick={openCreate}>
            <span className="material-symbols-outlined">add</span>Thêm dịch vụ
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary" />
          <span>Đang tải dịch vụ...</span>
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
              <h2>Danh sách dịch vụ</h2>
              <p>{filtered.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table
              className="table admin-management-table align-middle mb-0"
              style={{ tableLayout: 'fixed', minWidth: '1140px', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '10%', minWidth: '95px' }} />
                <col style={{ width: '24%', minWidth: '220px' }} />
                <col style={{ width: '14%', minWidth: '130px' }} />
                <col style={{ width: '13%', minWidth: '120px' }} />
                <col style={{ width: '9%', minWidth: '90px' }} />
                <col style={{ width: '12%', minWidth: '125px' }} />
                <col style={{ width: '18%', minWidth: '220px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '10%', minWidth: '95px' }}>Mã dịch vụ</th>
                  <th style={{ width: '24%', minWidth: '220px' }}>Tên dịch vụ</th>
                  <th style={{ width: '14%', minWidth: '130px' }}>Chuyên khoa</th>
                  <th style={{ width: '13%', minWidth: '120px' }}>Đơn giá</th>
                  <th style={{ width: '9%', minWidth: '90px' }}>Thời gian</th>
                  <th style={{ width: '12%', minWidth: '125px' }}>Trạng thái</th>
                  <th
                    className="text-end text-nowrap"
                    style={{ width: '18%', minWidth: '220px' }}
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleServices.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-bold text-primary text-truncate" title={item.code}>
                      {item.code}
                    </td>
                    <td>
                      <div className="admin-management-entity">
                        <span className="admin-crud-icon flex-shrink-0">
                          <span className="material-symbols-outlined">{getServiceIcon(item.name)}</span>
                        </span>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <strong className="d-block text-truncate" title={item.name}>
                            {item.name}
                          </strong>
                          <small className="text-secondary d-block text-truncate" title={item.description || 'Chưa có mô tả'}>
                            {item.description || 'Chưa có mô tả'}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="text-truncate" title={item.specialty?.name ?? 'Dùng chung'}>
                      {item.specialty?.name ?? 'Dùng chung'}
                    </td>
                    <td className="fw-semibold text-nowrap">{currency(item.price)}</td>
                    <td className="text-nowrap">{item.estimatedMinutes ? `${item.estimatedMinutes} phút` : 'Chưa đặt'}</td>
                    <td>
                      <span
                        className={`${
                          item.status === 'DANG_HOAT_DONG' ? 'badge-status-active' : 'badge-status-locked'
                        } text-nowrap`}
                      >
                        {item.status === 'DANG_HOAT_DONG' ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="admin-crud-actions justify-content-end flex-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary text-nowrap"
                          title="Xem"
                          onClick={() => open('view', item)}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light text-nowrap"
                          title="Sửa"
                          onClick={() => open('edit', item)}
                        >
                          <span className="material-symbols-outlined">edit</span>
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger text-white text-nowrap"
                          title="Xóa"
                          onClick={() => open('delete', item)}
                        >
                          <span className="material-symbols-outlined">delete</span>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-5 text-center text-secondary">
                      {services.length === 0 ? 'Chưa có dịch vụ nào.' : 'Không tìm thấy dịch vụ phù hợp.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
              <span className="text-secondary small">
                Hiển thị {displayedFrom}–{displayedTo} trong tổng số {filtered.length} dịch vụ
              </span>
              <nav className="align-self-md-auto align-self-start" aria-label="Phân trang dịch vụ">
                <ul className="pagination mb-0 flex-wrap">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang trước"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <span aria-hidden="true">&laquo;</span>
                    </button>
                  </li>
                  {pageNumbers.map((pageNumber, index) => (
                    <Fragment key={pageNumber}>
                      {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                        <li className="page-item disabled" aria-hidden="true">
                          <span className="page-link">…</span>
                        </li>
                      )}
                      <li className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          aria-current={pageNumber === currentPage ? 'page' : undefined}
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    </Fragment>
                  ))}
                  <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang sau"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    >
                      <span aria-hidden="true">&raquo;</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </footer>
          )}
        </div>
      )}

      {(mode === 'create' || mode === 'edit') && (
        <AppModal
          title={mode === 'create' ? 'Thêm dịch vụ' : 'Sửa dịch vụ'}
          size="lg"
          onClose={close}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={close}>
                Hủy
              </button>
              <button className="btn btn-primary" form="service-form" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu dịch vụ'}
              </button>
            </>
          }
        >
          <form id="service-form" onSubmit={(event) => void submit(event)}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Mã dịch vụ *</label>
                <input
                  className="form-control"
                  required
                  pattern="[0-9]+"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value })}
                />
              </div>
              <div className="col-md-8">
                <label className="form-label">Tên dịch vụ *</label>
                <input
                  className="form-control"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Chuyên khoa</label>
                <select
                  className="form-select"
                  value={form.specialtyId ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      specialtyId: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Dịch vụ dùng chung</option>
                  {specialties.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Đơn giá (VNĐ) *</label>
                <input
                  className="form-control"
                  required
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithDots(form.price)}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/\D/g, '');
                    setForm({ ...form, price: Number(raw) });
                  }}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Thời gian (phút)</label>
                <input
                  className="form-control"
                  min="5"
                  max="480"
                  type="number"
                  value={form.estimatedMinutes ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      estimatedMinutes: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as ServiceStatus })}
                >
                  <option value="DANG_HOAT_DONG">Đang hoạt động</option>
                  <option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option>
                </select>
              </div>
            </div>
          </form>
        </AppModal>
      )}
      {mode === 'view' && selected && (
        <AppModal
          title="Chi tiết dịch vụ"
          onClose={close}
          footer={
            <button className="btn btn-primary" onClick={close}>
              Đóng
            </button>
          }
        >
          <dl className="row mb-0">
            <dt className="col-5">Mã dịch vụ</dt>
            <dd className="col-7">{selected.code}</dd>
            <dt className="col-5">Tên dịch vụ</dt>
            <dd className="col-7">{selected.name}</dd>
            <dt className="col-5">Chuyên khoa</dt>
            <dd className="col-7">{selected.specialty?.name ?? 'Dùng chung'}</dd>
            <dt className="col-5">Đơn giá</dt>
            <dd className="col-7">{currency(selected.price)}</dd>
            <dt className="col-5">Thời gian dự kiến</dt>
            <dd className="col-7">{selected.estimatedMinutes ?? 'Chưa đặt'} phút</dd>
            <dt className="col-5">Mô tả</dt>
            <dd className="col-7">{selected.description || 'Chưa có'}</dd>
          </dl>
        </AppModal>
      )}
      {mode === 'delete' && selected && (
        <AppModal
          title="Xác nhận xóa dịch vụ"
          onClose={close}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={close}>
                Hủy
              </button>
              <button className="btn btn-danger" disabled={submitting} onClick={() => void remove()}>
                Xóa dịch vụ
              </button>
            </>
          }
        >
          <p className="mb-0">
            Bạn có chắc muốn xóa <strong>{selected.name}</strong>? Nếu đã xuất hiện trong hóa đơn hoặc gói khám, hệ thống sẽ không cho xóa và bạn nên chuyển sang ngừng hoạt động.
          </p>
        </AppModal>
      )}
    </div>
  );
}
