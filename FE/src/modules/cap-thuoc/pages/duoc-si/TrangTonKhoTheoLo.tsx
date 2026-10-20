import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import PharmacyPageHeader from '../../components/PharmacyPageHeader';
import { medicinesApi, type MedicineBatchRow } from '../../api/medicines.api';
import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '../../pharmacist-workspace.css';

interface FormState { medicineId: string; batchCode: string; quantity: string; importPrice: string; manufactureDate: string; expiryDate: string; supplier: string; }
const EMPTY: FormState = { medicineId: '', batchCode: '', quantity: '', importPrice: '', manufactureDate: '', expiryDate: '', supplier: '' };
const fmt = (value: string) => dinhDangNgay(value);

export default function TrangTonKhoTheoLo() {
  const { showToast } = useAppToast();
  const [filter, setFilter] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [batches, setBatches] = useState<MedicineBatchRow[]>([]);
  const [medicines, setMedicines] = useState<Array<{ id: number; name: string; unit: string }>>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, medicineRes] = await Promise.all([medicinesApi.batches({ search: search.trim() || undefined }), medicinesApi.list({ limit: 100 })]);
      setBatches(batchRes.data.data);
      setMedicines(medicineRes.data.data.map((m) => ({ id: m.id, name: m.tenThuoc, unit: m.donViTinh })));
    } catch (error) { showToast(getApiErrorMessage(error, 'Không thể tải tồn kho'), 'danger'); }
    finally { setLoading(false); }
  }, [search, showToast]);
  useEffect(() => { void load(); }, [load]);
  const rows = useMemo(() => filter === 'Tất cả' ? batches : batches.filter((b) => filter === 'Sắp hết hạn' ? b.status === 'SẮP HẾT HẠN' : b.status === 'HẾT HÀNG'), [batches, filter]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setPage(1); }, [filter, pageSize, search]);
  const selected = medicines.find((m) => String(m.id) === form.medicineId);
  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const close = () => { setShowModal(false); setForm(EMPTY); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    try {
      await medicinesApi.stockIn(selected.id, { batchCode: form.batchCode, quantity: Number(form.quantity), purchasePrice: Number(form.importPrice), manufactureDate: form.manufactureDate, expiryDate: form.expiryDate, supplier: form.supplier });
      showToast('Nhập lô thuốc thành công', 'success'); close(); await load();
    } catch (error) { showToast(getApiErrorMessage(error, 'Không thể nhập lô thuốc'), 'danger'); }
  };
  return <div className="pharmacy-page">
    <PharmacyPageHeader title="Tồn kho theo lô" description="Theo dõi số lượng, hạn dùng và nhà cung cấp của từng lô thuốc." actions={<button className="btn btn-primary" type="button" onClick={() => setShowModal(true)}><span className="material-symbols-outlined me-2">add_box</span>Nhập lô mới</button>} />
    <section className="pharmacy-panel">
      <div className="pharmacy-filter mb-3"><div className="input-group"><span className="input-group-text"><span className="material-symbols-outlined">search</span></span><input className="form-control" placeholder="Tìm mã lô hoặc tên thuốc..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
      <div className="pharmacy-tabs">{['Tất cả', 'Sắp hết hạn', 'Hết hàng'].map((tab) => <button type="button" key={tab} className={filter === tab ? 'active' : ''} onClick={() => setFilter(tab)}>{tab}</button>)}</div>
      <div className="table-responsive"><table className="table pharmacy-table"><thead><tr><th>Mã lô</th><th>Thuốc</th><th>Tồn kho</th><th>Hạn dùng</th><th>Nhà cung cấp</th><th>Trạng thái</th></tr></thead><tbody>{visibleRows.map((item) => <tr key={item.id}><td><strong>{item.batchCode}</strong></td><td>{item.medicine}<small>Đơn vị: {item.unit}</small></td><td>{item.stock}</td><td>{fmt(item.expiryDate)}</td><td>{item.supplier}</td><td><span className={`pharmacy-badge pharmacy-badge--${item.status === 'CÒN HẠN' ? 'green' : item.status === 'SẮP HẾT HẠN' ? 'amber' : 'red'}`}>{item.status}</span></td></tr>)}</tbody></table></div>
      <footer className="pharmacy-pagination">
        <span>Trang {safePage}/{totalPages} · {rows.length} lô thuốc</span>
        <div>
          <button type="button" className="btn btn-outline-primary" aria-label="Trang trước" disabled={safePage <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}><span className="material-symbols-outlined">chevron_left</span></button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => <button type="button" className={`btn ${safePage === pageNumber ? 'btn-primary' : 'btn-outline-primary'}`} disabled={loading} onClick={() => setPage(pageNumber)} key={pageNumber}>{pageNumber}</button>)}
          <button type="button" className="btn btn-outline-primary" aria-label="Trang sau" disabled={safePage >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
        <select className="form-select" aria-label="Số dòng mỗi trang" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          <option value={10}>10 dòng</option>
          <option value={20}>20 dòng</option>
        </select>
      </footer>
      {loading && <div className="text-secondary small mt-2">Đang tải dữ liệu...</div>}
    </section>
    {showModal && <><div className="modal fade show d-block" tabIndex={-1}><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content border-0 shadow"><form onSubmit={submit}><div className="modal-header"><h2 className="modal-title fs-5">Nhập lô thuốc mới</h2><button type="button" className="btn-close" onClick={close} /></div><div className="modal-body p-4"><div className="row g-3"><div className="col-md-8"><label className="form-label fw-semibold">Thuốc *</label><select className="form-select" required value={form.medicineId} onChange={(e) => update('medicineId', e.target.value)}><option value="">Chọn thuốc trong danh mục</option>{medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div><div className="col-md-4"><label className="form-label fw-semibold">Đơn vị tính</label><input className="form-control" value={selected?.unit ?? ''} disabled /></div><div className="col-md-6"><label className="form-label fw-semibold">Mã lô *</label><input className="form-control text-uppercase" required value={form.batchCode} onChange={(e) => update('batchCode', e.target.value)} /></div><div className="col-md-3"><label className="form-label fw-semibold">Số lượng *</label><input className="form-control" type="number" min={1} required value={form.quantity} onChange={(e) => update('quantity', e.target.value)} /></div><div className="col-md-3"><label className="form-label fw-semibold">Giá nhập *</label><input className="form-control" type="number" min={0} required value={form.importPrice} onChange={(e) => update('importPrice', e.target.value)} /></div><div className="col-md-6"><label className="form-label fw-semibold">Ngày sản xuất</label><input className="form-control" type="date" value={form.manufactureDate} onChange={(e) => update('manufactureDate', e.target.value)} /></div><div className="col-md-6"><label className="form-label fw-semibold">Hạn dùng *</label><input className="form-control" type="date" min={form.manufactureDate || undefined} required value={form.expiryDate} onChange={(e) => update('expiryDate', e.target.value)} /></div><div className="col-12"><label className="form-label fw-semibold">Nhà cung cấp *</label><input className="form-control" required value={form.supplier} onChange={(e) => update('supplier', e.target.value)} /></div></div></div><div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={close}>Hủy</button><button type="submit" className="btn btn-primary" disabled={loading}>Thêm lô thuốc</button></div></form></div></div></div><div className="modal-backdrop fade show" onClick={close} /></>}
  </div>;
}
