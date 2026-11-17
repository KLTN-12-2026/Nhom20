import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';
import { useServiceOrders } from '../hooks/use-service-orders';
import type { ServiceOrderStatus } from '../types/service-order.types';
import { CreateOrderModal, ProcessOrderModal } from './ServiceOrderModals';
import { money, RESULT_NOTICE } from '../utils/service-order-display';

const STATUS: Record<ServiceOrderStatus, { label: string; color: string }> = {
  CHO_THUC_HIEN: { label: 'Chờ thực hiện', color: 'text-bg-warning' },
  DA_HOAN_TAT: { label: 'Đã có kết quả', color: 'text-bg-success' },
  DA_HUY: { label: 'Đã hủy', color: 'text-bg-secondary' },
};

export function ServiceOrdersPanel(props: { visitId: number; visitStatus: string; patientName: string; disabled?: boolean }) {
  const user = useAuthStore((state) => state.user);
  if (!user?.roles.includes('DOCTOR') || !hasPermission(user, 'BENH_AN.VIEW')) return null;
  // Tách state theo lượt khám: không giữ modal/kết quả của bệnh nhân A khi chuyển sang B.
  return <VisitServiceOrders key={props.visitId} {...props} />;
}

function VisitServiceOrders({ visitId, visitStatus, patientName, disabled }: {
  visitId: number; visitStatus: string; patientName: string; disabled?: boolean;
}) {
  const state = useServiceOrders(visitId);
  const [creating, setCreating] = useState(false);
  const [modal, setModal] = useState<{ id: number; mode: 'result' | 'cancel' | 'view' } | null>(null);
  const editable = ['DA_VAO_PHONG', 'CHO_KET_QUA'].includes(visitStatus) && !disabled;
  const blocked = !editable || state.busy || state.loading || Boolean(state.error);
  const selected = state.orders.find((order) => order.id === modal?.id);
  const pendingCount = state.orders.filter((order) => order.status === 'CHO_THUC_HIEN').length;

  // Modal nằm ngoài form phiếu khám; chặn bubbling để không kích hoạt autosave ICD/đơn thuốc.
  return <section className="doctor-form-section" aria-labelledby="service-orders-title" onChange={(event) => event.stopPropagation()}>
    <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
      <h2 id="service-orders-title" className="mb-0">Chỉ định dịch vụ cận lâm sàng</h2>
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-outline-primary btn-sm" disabled={state.busy || state.loading} onClick={() => void state.reload()}>Làm mới chỉ định</button>
        {editable && <button type="button" className="btn btn-primary btn-sm" disabled={blocked} onClick={() => setCreating(true)}>Thêm chỉ định</button>}
      </div>
    </div>
    <p className="small text-secondary">{RESULT_NOTICE}</p>
    {!editable && <p className="small text-secondary">Chỉ được xử lý chỉ định khi đang khám hoặc chờ kết quả, và không đang lưu phiếu.</p>}
    {state.loading && <p role="status">Đang tải chỉ định...</p>}
    {state.error ? <div className="mb-3"><p role="status" className="text-danger">{state.error}</p>
      <button type="button" className="btn btn-outline-primary btn-sm" disabled={state.loading} onClick={() => void state.reload()}>Thử lại chỉ định</button>
    </div> : !state.loading && !state.orders.length && <p className="text-secondary py-3">Lượt khám chưa có chỉ định dịch vụ.</p>}
    {pendingCount > 0 && !state.error && <p className="small text-warning-emphasis">Có {pendingCount} chỉ định chờ thực hiện. Cần nhập kết quả hoặc hủy hợp lệ trước khi hoàn tất khám.</p>}
    {state.orders.length > 0 && <div className="table-responsive">
      <table className="table table-bordered align-middle" aria-label="Chỉ định của lượt khám">
        <thead><tr><th>Dịch vụ</th><th>Đơn giá đã lưu</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{state.orders.map((order) => <tr key={order.id}>
          <td><strong>{order.service.name}</strong><small className="d-block text-secondary">#{order.id} · {order.service.code}</small></td>
          <td className="text-nowrap">{money(order.priceSnapshot)}</td>
          <td><span className={`badge ${STATUS[order.status]?.color ?? 'text-bg-secondary'}`}>{STATUS[order.status]?.label ?? order.status}</span></td>
          <td><div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline-primary btn-sm" disabled={state.busy} onClick={() => setModal({ id: order.id, mode: 'view' })}>Xem chi tiết</button>
            {editable && order.status === 'CHO_THUC_HIEN' && <>
              <button type="button" className="btn btn-primary btn-sm" disabled={blocked} onClick={() => setModal({ id: order.id, mode: 'result' })}>Nhập kết quả</button>
              <button type="button" className="btn btn-outline-danger btn-sm" disabled={blocked} onClick={() => setModal({ id: order.id, mode: 'cancel' })}>Hủy chỉ định</button>
            </>}
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {creating && createPortal(<CreateOrderModal patientName={patientName} busy={state.busy} onClose={() => setCreating(false)}
      onCreate={(payload) => editable ? state.create(payload) : Promise.resolve(null)} />, document.body)}
    {modal && selected && createPortal(<ProcessOrderModal key={`${modal.id}-${modal.mode}`} order={selected} mode={modal.mode}
      patientName={patientName} busy={state.busy} editable={editable && !state.error} onClose={() => setModal(null)}
      onSave={(text) => modal.mode === 'result' ? state.saveResult(selected.id, text) : state.cancel(selected.id, text)} />, document.body)}
  </section>;
}
