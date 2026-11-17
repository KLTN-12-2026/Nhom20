import { useState, type FormEvent } from 'react';
import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { useClinicalCatalog } from '../hooks/use-service-orders';
import type { ClinicalService, CreateServiceOrder, ServiceOrder } from '../types/service-order.types';
import { money, RESULT_NOTICE } from '../utils/service-order-display';

export function CreateOrderModal({ patientName, busy, onClose, onCreate }: {
  patientName: string; busy: boolean; onClose: () => void;
  onCreate: (payload: Omit<CreateServiceOrder, 'idempotencyKey'>) => Promise<ServiceOrder | null>;
}) {
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ClinicalService | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const catalog = useClinicalCatalog(search, page);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); event.stopPropagation();
    if (busy) return;
    if (!selected || !reason.trim()) {
      showToast('Vui lòng chọn dịch vụ và nhập lý do chỉ định.', 'warning'); return;
    }
    if (await onCreate({ serviceId: selected.id, reason, note })) onClose();
  };
  return <AppModal title="Thêm chỉ định cận lâm sàng" size="lg" onClose={() => { if (!busy) onClose(); }} footer={<>
    <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>Đóng</button>
    <button type="submit" form="service-order-create" className="btn btn-primary" disabled={busy || !selected || !reason.trim()}>
      {busy ? 'Đang gửi...' : 'Xác nhận chỉ định'}
    </button>
  </>}>
    <p>Bệnh nhân: <strong>{patientName}</strong></p>
    <form id="service-order-create" onSubmit={(event) => void submit(event)}>
      <fieldset disabled={busy}>
        <label htmlFor="clinical-service-search" className="form-label">Tìm dịch vụ cận lâm sàng</label>
        <input id="clinical-service-search" className="form-control mb-3" maxLength={200} value={search}
          placeholder="Nhập tên hoặc mã dịch vụ..." onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        {catalog.loading ? <p role="status">Đang tải danh mục...</p> : catalog.error ? <div className="mb-3">
          <p className="text-danger" role="status">{catalog.error}</p>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={catalog.reload}>Thử lại danh mục</button>
        </div> : !catalog.items.length ? <p className="text-secondary">Không có dịch vụ cận lâm sàng phù hợp.</p> : <>
          <div className="list-group mb-2" aria-label="Danh mục cận lâm sàng">
            {catalog.items.map((service) => <label key={service.id} className="list-group-item d-flex align-items-center gap-3">
              <input type="radio" className="form-check-input flex-shrink-0 m-0" name="clinical-service" value={service.id}
                checked={selected?.id === service.id} onChange={() => setSelected(service)} />
              <span className="flex-grow-1 text-break"><strong>{service.name}</strong><small className="d-block text-secondary">{service.code}</small></span>
              <span className="text-nowrap">{money(service.price)}</span>
            </label>)}
          </div>
          <nav className="d-flex justify-content-between align-items-center gap-2 mb-3" aria-label="Phân trang danh mục chỉ định">
            <button type="button" className="btn btn-outline-primary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button>
            <span>Trang {page} / {Math.max(1, Math.ceil(catalog.total / 10))}</span>
            <button type="button" className="btn btn-outline-primary btn-sm" disabled={page * 10 >= catalog.total} onClick={() => setPage(page + 1)}>Trang sau</button>
          </nav>
        </>}
        {selected && <p className="border rounded p-2">Đã chọn: <strong>{selected.name}</strong> — {money(selected.price)}<br />
          <small className="text-secondary">Đơn giá được hệ thống xác nhận tại thời điểm lưu chỉ định.</small>
        </p>}
        <label htmlFor="service-order-reason" className="form-label">Lý do chỉ định <span className="text-danger">*</span></label>
        <textarea id="service-order-reason" className="form-control mb-3" required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        <label htmlFor="service-order-note" className="form-label">Ghi chú</label>
        <textarea id="service-order-note" className="form-control" maxLength={2000} rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      </fieldset>
    </form>
  </AppModal>;
}

export function ProcessOrderModal({ order, mode, patientName, busy, editable, onClose, onSave }: {
  order: ServiceOrder; mode: 'result' | 'cancel' | 'view'; patientName: string; busy: boolean; editable: boolean;
  onClose: () => void; onSave: (text: string) => Promise<ServiceOrder | null>;
}) {
  const [text, setText] = useState('');
  const canSubmit = editable && order.status === 'CHO_THUC_HIEN' && mode !== 'view';
  const isResult = mode === 'result';
  const title = mode === 'view' ? 'Chi tiết chỉ định' : isResult ? 'Nhập kết quả mô phỏng' : 'Hủy chỉ định';
  const submit = async (event: FormEvent) => {
    event.preventDefault(); event.stopPropagation();
    if (!canSubmit || busy || !text.trim()) return;
    if (await onSave(text)) onClose();
  };
  return <AppModal title={title} size="lg" onClose={() => { if (!busy) onClose(); }} footer={<>
    <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>Đóng</button>
    {mode !== 'view' && <button type="submit" form="service-order-process" className={`btn ${isResult ? 'btn-primary' : 'btn-danger'}`}
      disabled={busy || !canSubmit || !text.trim()}>{busy ? 'Đang gửi...' : isResult ? 'Lưu kết quả' : 'Xác nhận hủy'}</button>}
  </>}>
    <p>Bệnh nhân: <strong>{patientName}</strong></p>
    <p><strong>{order.service.name}</strong> · Chỉ định #{order.id} · {money(order.priceSnapshot)}</p>
    <p className="text-secondary">{order.resultNotice || RESULT_NOTICE}</p>
    <dl>
      <dt>Lý do chỉ định</dt><dd className="text-break" style={{ whiteSpace: 'pre-wrap' }}>{order.reason}</dd>
      <dt>Ghi chú</dt><dd className="text-break" style={{ whiteSpace: 'pre-wrap' }}>{order.note || 'Không có'}</dd>
      {order.result && <><dt>Kết quả mô phỏng</dt><dd className="text-break" style={{ whiteSpace: 'pre-wrap' }}>{order.result}</dd></>}
      {order.resultedAt && <><dt>Thời gian có kết quả</dt><dd>{new Date(order.resultedAt).toLocaleString('vi-VN')}</dd></>}
      {order.cancellationReason && <><dt>Lý do hủy</dt><dd className="text-break" style={{ whiteSpace: 'pre-wrap' }}>{order.cancellationReason}</dd></>}
      {order.canceledAt && <><dt>Thời gian hủy</dt><dd>{new Date(order.canceledAt).toLocaleString('vi-VN')}</dd></>}
    </dl>
    {mode !== 'view' && <form id="service-order-process" onSubmit={(event) => void submit(event)}>
      {!canSubmit && <p className="text-warning">Chỉ định hoặc lượt khám không còn cho phép thao tác này. Vui lòng đóng và tải lại danh sách.</p>}
      <label htmlFor="service-order-process-text" className="form-label">{isResult ? 'Nội dung kết quả mô phỏng' : 'Lý do hủy'} <span className="text-danger">*</span></label>
      <textarea id="service-order-process-text" className="form-control" required maxLength={isResult ? 10000 : 1000} rows={isResult ? 6 : 3}
        disabled={busy || !canSubmit} value={text} onChange={(event) => setText(event.target.value)} />
      <p className="small text-secondary mt-2">{isResult ? 'Kiểm tra nội dung trước khi lưu. MVP chưa hỗ trợ sửa kết quả đã hoàn tất.' : 'Chỉ hủy chỉ định chưa thực hiện. Không xóa dữ liệu chỉ định.'}</p>
    </form>}
  </AppModal>;
}
