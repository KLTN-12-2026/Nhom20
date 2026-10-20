import { useMemo, useState, type FormEvent } from 'react';
import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/components/ui/admin-crud.css';
import { getApiErrorMessage } from '@/services/axios-client';
import { useSpecialties } from '@/modules/chuyen-khoa/hooks/use-specialties';
import { useServices } from '../../hooks/use-services';
import type { MedicalService, ServicePayload, ServiceStatus } from '../../types/service.types';
import { getServiceIcon } from '@/utils/icon-mapper';

type ModalMode = 'create' | 'view' | 'edit' | 'delete' | null;
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
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<MedicalService | null>(null);
  const [form, setForm] = useState<ServicePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const filtered = useMemo(() => { const keyword = search.trim().toLocaleLowerCase('vi'); return services.filter((item) => (!keyword || `${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(keyword)) && (!status || item.status === status) && (!specialtyId || item.specialty?.id === specialtyId)); }, [services, search, status, specialtyId]);
  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setMode('create'); };
  const open = (nextMode: Exclude<ModalMode, 'create' | null>, item: MedicalService) => { setSelected(item); setForm({ code: item.code, name: item.name, description: item.description ?? '', price: item.price, specialtyId: item.specialty?.id, estimatedMinutes: item.estimatedMinutes ?? 30, status: item.status }); setMode(nextMode); };
  const close = () => { if (!submitting) setMode(null); };
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); try { const message = mode === 'create' ? await createService(form) : await updateService(selected!.id, form); showToast(message); setMode(null); } catch (requestError) { showToast(getApiErrorMessage(requestError), 'danger'); } finally { setSubmitting(false); } };
  const remove = async () => { if (!selected) return; setSubmitting(true); try { showToast(await removeService(selected.id)); setMode(null); } catch (requestError) { showToast(getApiErrorMessage(requestError), 'danger'); } finally { setSubmitting(false); } };
  const active = services.filter((item) => item.status === 'DANG_HOAT_DONG').length;

  return <div className="admin-crud-page">
    <div className="admin-crud-heading">
      <div>
        <p className="admin-management-eyebrow">Danh mục lâm sàng</p>
        <h1>QUẢN LÝ DỊCH VỤ</h1>
      </div>
    </div>
    <div className="row g-3 mb-4"><div className="col-md-4"><div className="admin-crud-card"><small className="text-secondary">Tổng dịch vụ</small><strong className="d-block fs-3">{services.length}</strong></div></div><div className="col-md-4"><div className="admin-crud-card"><small className="text-secondary">Đang hoạt động</small><strong className="d-block fs-3 text-success">{active}</strong></div></div><div className="col-md-4"><div className="admin-crud-card"><small className="text-secondary">Ngừng hoạt động</small><strong className="d-block fs-3">{services.length - active}</strong></div></div></div>
    <div className="admin-crud-toolbar">
      <div className="d-flex flex-wrap align-items-center gap-3 w-100">
        <div className="admin-crud-search"><span className="material-symbols-outlined">search</span><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc tên dịch vụ..." /></div>
        <select className="form-select" style={{ maxWidth: 230 }} value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value ? Number(event.target.value) : '')}><option value="">Tất cả chuyên khoa</option>{specialties.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
        <select className="form-select" style={{ maxWidth: 210 }} value={status} onChange={(event) => setStatus(event.target.value as ServiceStatus | '')}><option value="">Tất cả trạng thái</option><option value="DANG_HOAT_DONG">Đang hoạt động</option><option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option></select>
        <button className="btn btn-primary d-flex align-items-center gap-2 ms-auto" onClick={openCreate}><span className="material-symbols-outlined">add</span>Thêm dịch vụ</button>
      </div>
    </div>
    {isLoading && <div className="admin-crud-empty"><div className="spinner-border text-primary" /><span>Đang tải dịch vụ...</span></div>}
    {!isLoading && error && <div className="admin-crud-empty"><p className="text-danger">{error}</p><button className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button></div>}
    {!isLoading && !error && (
      <div className="admin-management-table-card">
        <div className="admin-management-table-heading">
          <div>
            <h2>Danh sách dịch vụ</h2>
            <p>{filtered.length} kết quả phù hợp</p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table admin-management-table align-middle mb-0">
            <thead>
              <tr>
                <th>Mã dịch vụ</th>
                <th>Tên dịch vụ</th>
                <th>Chuyên khoa</th>
                <th>Đơn giá</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="fw-bold text-primary">{item.code}</td>
                  <td>
                    <div className="admin-management-entity">
                      <span className="admin-crud-icon">
                        <span className="material-symbols-outlined">{getServiceIcon(item.name)}</span>
                      </span>
                      <div>
                        <strong className="d-block">{item.name}</strong>
                        <small className="text-secondary">{item.description || 'Chưa có mô tả'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{item.specialty?.name ?? 'Dùng chung'}</td>
                  <td className="fw-semibold">{currency(item.price)}</td>
                  <td>{item.estimatedMinutes ? `${item.estimatedMinutes} phút` : 'Chưa đặt'}</td>
                  <td>
                    <span className={item.status === 'DANG_HOAT_DONG' ? 'badge-status-active' : 'badge-status-locked'}>
                      {item.status === 'DANG_HOAT_DONG' ? 'Hoạt động' : 'Ngừng hoạt động'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-crud-actions justify-content-end">
                      <button className="btn btn-sm btn-outline-primary" title="Xem" onClick={() => open('view', item)}>
                        <span className="material-symbols-outlined">visibility</span>Chi tiết
                      </button>
                      <button className="btn btn-sm btn-light" title="Sửa" onClick={() => open('edit', item)}>
                        <span className="material-symbols-outlined">edit</span>Sửa
                      </button>
                      <button className="btn btn-sm btn-light text-danger" title="Xóa" onClick={() => open('delete', item)}>
                        <span className="material-symbols-outlined">delete</span>Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="admin-crud-empty py-5">
            Không tìm thấy dịch vụ phù hợp.
          </div>
        )}
      </div>
    )}

    {(mode === 'create' || mode === 'edit') && <AppModal title={mode === 'create' ? 'Thêm dịch vụ' : 'Sửa dịch vụ'} size="lg" onClose={close} footer={<><button className="btn btn-outline-secondary" onClick={close}>Hủy</button><button className="btn btn-primary" form="service-form" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu dịch vụ'}</button></>}><form id="service-form" onSubmit={(event) => void submit(event)}><div className="row g-3"><div className="col-md-4"><label className="form-label">Mã dịch vụ *</label><input className="form-control" required pattern="[0-9]+" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></div><div className="col-md-8"><label className="form-label">Tên dịch vụ *</label><input className="form-control" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="col-12"><label className="form-label">Mô tả</label><textarea className="form-control" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div className="col-md-6"><label className="form-label">Chuyên khoa</label><select className="form-select" value={form.specialtyId ?? ''} onChange={(event) => setForm({ ...form, specialtyId: event.target.value ? Number(event.target.value) : undefined })}><option value="">Dịch vụ dùng chung</option>{specialties.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="col-md-3"><label className="form-label">Đơn giá (VNĐ) *</label><input className="form-control" required type="text" inputMode="numeric" value={formatNumberWithDots(form.price)} onChange={(event) => { const raw = event.target.value.replace(/\D/g, ''); setForm({ ...form, price: Number(raw) }); }} /></div><div className="col-md-3"><label className="form-label">Thời gian (phút)</label><input className="form-control" min="5" max="480" type="number" value={form.estimatedMinutes ?? ''} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value ? Number(event.target.value) : undefined })} /></div><div className="col-md-6"><label className="form-label">Trạng thái</label><select className="form-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ServiceStatus })}><option value="DANG_HOAT_DONG">Đang hoạt động</option><option value="NGUNG_HOAT_DONG">Ngừng hoạt động</option></select></div></div></form></AppModal>}
    {mode === 'view' && selected && <AppModal title="Chi tiết dịch vụ" onClose={close} footer={<button className="btn btn-outline-secondary" onClick={close}>Đóng</button>}><dl className="row mb-0"><dt className="col-5">Mã dịch vụ</dt><dd className="col-7">{selected.code}</dd><dt className="col-5">Tên dịch vụ</dt><dd className="col-7">{selected.name}</dd><dt className="col-5">Chuyên khoa</dt><dd className="col-7">{selected.specialty?.name ?? 'Dùng chung'}</dd><dt className="col-5">Đơn giá</dt><dd className="col-7">{currency(selected.price)}</dd><dt className="col-5">Thời gian dự kiến</dt><dd className="col-7">{selected.estimatedMinutes ?? 'Chưa đặt'} phút</dd><dt className="col-5">Mô tả</dt><dd className="col-7">{selected.description || 'Chưa có'}</dd></dl></AppModal>}
    {mode === 'delete' && selected && <AppModal title="Xác nhận xóa dịch vụ" onClose={close} footer={<><button className="btn btn-outline-secondary" onClick={close}>Hủy</button><button className="btn btn-danger" disabled={submitting} onClick={() => void remove()}>Xóa dịch vụ</button></>}><p className="mb-0">Bạn có chắc muốn xóa <strong>{selected.name}</strong>? Nếu đã xuất hiện trong hóa đơn hoặc gói khám, hệ thống sẽ không cho xóa và bạn nên chuyển sang ngừng hoạt động.</p></AppModal>}
  </div>;
}
