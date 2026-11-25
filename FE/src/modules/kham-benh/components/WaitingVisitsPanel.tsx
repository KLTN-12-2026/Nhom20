import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';
import { useWaitingVisits } from '../hooks/use-waiting-visits';

export function WaitingVisitsPanel() {
  const user = useAuthStore((s) => s.user);
  const allowed = Boolean(user?.roles.includes('DOCTOR') && hasPermission(user, 'BENH_AN.VIEW'));
  const state = useWaitingVisits(allowed);
  if (!allowed) return null;
  return <section className="doctor-panel p-3 mb-4" aria-label="Lượt chờ kết quả">
    <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h5 mb-0">Lượt chờ kết quả</h2>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={state.loading}
        onClick={state.reload}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
        Làm mới lượt chờ
      </button></div>
    {state.loading ? <p role="status">Đang tải lượt chờ...</p> : state.error ? <p role="status" className="text-danger">{state.error}</p> : <>
      {!state.items.length ? <p className="text-secondary">Không có lượt chờ kết quả.</p> : <div className="table-responsive"><table className="table align-middle">
        <thead><tr><th>Lượt khám</th><th>Bệnh nhân</th><th>Chỉ định</th><th>Thao tác</th></tr></thead>
        <tbody>{state.items.map((v) => <tr key={v.id}><td>{v.code}</td><td>{v.patientName}<small className="d-block text-secondary">{v.patientCode}</small></td>
          <td>{v.pendingOrders ? `${v.pendingOrders} chưa xử lý` : 'Đã xử lý hết — chờ bác sĩ kết luận'}</td>
          <td><Link className="btn btn-sm btn-primary" to={`/bac-si/kham-benh?luotKhamId=${v.id}`}>Mở lượt khám</Link></td></tr>)}</tbody>
      </table></div>}
      <div className="d-flex gap-2 align-items-center"><button type="button" className="btn btn-sm btn-outline-primary" disabled={state.page === 1} onClick={() => state.setPage((p) => p - 1)}>Lượt chờ: trang trước</button>
        <span>Trang {state.page}</span><button type="button" className="btn btn-sm btn-outline-primary" disabled={state.page * 10 >= state.total} onClick={() => state.setPage((p) => p + 1)}>Lượt chờ: trang sau</button></div>
    </>}
  </section>;
}
