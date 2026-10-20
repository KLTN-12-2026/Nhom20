import { useEffect, useMemo, useState } from 'react';
import ReceptionistPageHeader from '@/modules/tiep-don/components/ReceptionistPageHeader';
import ReceptionistStatCard from '@/modules/tiep-don/components/ReceptionistStatCard';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/modules/tiep-don/receptionist-workspace.css';

const CHECKLIST = ['Đã kiểm đếm quỹ tiền mặt', 'Đã đối chiếu giao dịch chuyển khoản', 'Đã ghi nhận phiếu còn chờ xử lý', 'Đã bàn giao chìa khóa và công cụ'];
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
const parseMoney = (value: string) => Number(value.replace(/\D/g, '')) || 0;
const formatMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
};

export default function TrangBaoCaoCaTruc() {
  const { showToast } = useAppToast();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [actualCash, setActualCash] = useState('');
  const [differenceReason, setDifferenceReason] = useState('');
  const [receiver, setReceiver] = useState('');
  const [note, setNote] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [status, setStatus] = useState('Bản nháp');
  const [isSaving, setIsSaving] = useState(false);
  const [availableReceivers, setAvailableReceivers] = useState<Array<{ id: number; fullName: string; shift: string; group?: string }>>([]);
  const [systemCash, setSystemCash] = useState(0);
  const [transferAmount, setTransferAmount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  useEffect(() => {
    void Promise.all([
      axiosClient.get('/receptionist-schedules/next-shift'),
      axiosClient.get('/receptionist-schedules/shift-report'),
    ]).then(([nextShift, report]) => {
      setAvailableReceivers(nextShift.data.data.staff || []);
      const data = report.data.data;
      setSystemCash(data.systemCash || 0);
      setTransferAmount(data.transferAmount || 0);
      setTransactions(data.transactions || []);
      setPendingItems(data.pendingItems || []);
    }).catch((error) => showToast(getApiErrorMessage(error, 'Không thể tải báo cáo ca'), 'danger'));
  }, [showToast]);

  const groupedReceivers = useMemo(() => {
    const groups: Record<string, typeof availableReceivers> = {};
    for (const item of availableReceivers) {
      const key = item.group || item.shift;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [availableReceivers]);

  const actualCashValue = parseMoney(actualCash);
  const difference = actualCash ? actualCashValue - systemCash : 0;
  const totalRevenue = systemCash + transferAmount;
  const canSubmit = checkedItems.length === CHECKLIST.length && Boolean(receiver) && Boolean(actualCash) && (difference === 0 || Boolean(differenceReason.trim()));
  // Backend tự tính chênh lệch từ số tiền kiểm đếm để tránh dữ liệu bàn giao bị sai lệch.
  const payload = useMemo(() => ({ receiverId: receiver ? Number(receiver) : null, actualCash: actualCash ? actualCashValue : null, differenceReason, checklist: checkedItems, note }), [receiver, actualCash, actualCashValue, differenceReason, checkedItems, note]);

  const saveDraft = async () => {
    setIsSaving(true);
    try { await axiosClient.put('/receptionist-schedules/handover/draft', payload); setStatus('Bản nháp'); showToast('Đã lưu bản nháp bàn giao'); }
    catch (error) { showToast(getApiErrorMessage(error, 'Không thể lưu bản nháp'), 'danger'); }
    finally { setIsSaving(false); }
  };

  const submitHandover = async () => {
    setIsSaving(true);
    try { await axiosClient.post('/receptionist-schedules/handover/submit', payload); setStatus('Chờ người nhận xác nhận'); setIsConfirmOpen(false); showToast('Đã gửi bàn giao thành công'); }
    catch (error) { showToast(getApiErrorMessage(error, 'Không thể gửi bàn giao'), 'danger'); }
    finally { setIsSaving(false); }
  };

  return <div className="reception-page">
    <ReceptionistPageHeader eyebrow="Kết ca và bàn giao" title="Báo cáo ca trực" description="Đối chiếu doanh thu, kiểm quỹ và bàn giao cho ca tiếp theo." actions={<span className="reception-badge reception-badge--amber">{status}</span>} />
    <div className="reception-stats"><ReceptionistStatCard icon="payments" label="Tổng doanh thu" value={money(totalRevenue)} tone="green" /><ReceptionistStatCard icon="payments" label="Tiền mặt hệ thống" value={money(systemCash)} /><ReceptionistStatCard icon="account_balance" label="Chuyển khoản" value={money(transferAmount)} /><ReceptionistStatCard icon="pending_actions" label="Phiếu chờ xử lý" value={pendingItems.length} tone="amber" /></div>
    <div className="reception-grid reception-grid--handover">
      <div className="d-grid gap-3">
        <section className="reception-card"><div className="reception-card__header"><h2>Đối chiếu doanh thu và quỹ</h2></div><div className="reception-card__body"><div className="row g-3"><div className="col-md-6"><span>Tiền mặt hệ thống</span><strong className="d-block">{money(systemCash)}</strong></div><div className="col-md-6"><span>Chuyển khoản</span><strong className="d-block">{money(transferAmount)}</strong></div><div className="col-md-6"><label className="form-label fw-semibold">Tiền mặt kiểm đếm thực tế *</label><input className="form-control" type="text" inputMode="numeric" value={actualCash} onChange={(event) => setActualCash(formatMoneyInput(event.target.value))} placeholder="Ví dụ: 10.000.000" /></div><div className="col-md-6"><label className="form-label fw-semibold">Chênh lệch tiền mặt</label><div className={`form-control fw-bold ${difference === 0 ? 'text-success' : 'text-danger'}`}>{actualCash ? money(difference) : 'Chưa kiểm đếm'}</div></div>{actualCash && difference !== 0 && <div className="col-12"><label className="form-label fw-semibold">Lý do chênh lệch *</label><textarea className="form-control" rows={2} value={differenceReason} onChange={(event) => setDifferenceReason(event.target.value)} /></div>}</div></div></section>
        <section className="reception-card overflow-hidden"><div className="reception-card__header"><h2>Giao dịch trong ca</h2></div><div className="table-responsive"><table className="table reception-table"><thead><tr><th>Thời gian</th><th>Bệnh nhân</th><th>Mã hóa đơn</th><th>Số tiền</th><th>Phương thức</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.invoiceCode}><td>{item.time}</td><td>{item.patientName}</td><td>{item.invoiceCode}</td><td>{money(item.amount)}</td><td>{item.method}</td></tr>)}</tbody></table></div></section>
      </div>
      <aside className="reception-card align-self-start"><div className="reception-card__header"><h2>Thông tin bàn giao</h2></div><div className="reception-card__body"><label className="form-label fw-semibold">Người nhận bàn giao *</label><select className="form-select mb-2" value={receiver} onChange={(event) => setReceiver(event.target.value)}><option value="">Chọn nhân viên ca tiếp theo</option>{Object.keys(groupedReceivers).length > 1 ? Object.entries(groupedReceivers).map(([groupLabel, items]) => <optgroup key={groupLabel} label={groupLabel}>{items.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</optgroup>) : availableReceivers.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select>{receiver && <div className="alert alert-light border py-2 px-3 mb-3 d-flex align-items-center justify-content-between"><div className="small text-muted">Ca nhận: <strong className="text-primary">{availableReceivers.find((item) => String(item.id) === receiver)?.shift}</strong></div><span className="badge bg-primary-subtle text-primary border border-primary-subtle">{availableReceivers.find((item) => String(item.id) === receiver)?.fullName}</span></div>}<div className="reception-checklist">{CHECKLIST.map((item) => <label key={item}><input className="form-check-input" type="checkbox" checked={checkedItems.includes(item)} onChange={() => setCheckedItems((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} /><strong>{item}</strong></label>)}</div><label className="form-label fw-semibold mt-3">Ghi chú cho ca sau</label><textarea className="form-control" rows={3} value={note} onChange={(event) => setNote(event.target.value)} /><div className="small text-secondary mt-2">Đã hoàn tất {checkedItems.length}/{CHECKLIST.length} mục.</div><div className="d-grid gap-2 mt-3"><button className="btn btn-outline-primary" type="button" disabled={isSaving} onClick={() => void saveDraft()}>Lưu bản nháp</button><button className="btn btn-primary" type="button" disabled={!canSubmit || isSaving} onClick={() => setIsConfirmOpen(true)}>Gửi bàn giao</button></div></div></aside>
    </div>
    <section className="reception-card mt-3"><div className="reception-card__header"><h2>Phiếu chờ xử lý</h2><span className="text-muted">{pendingItems.length} phiếu</span></div><div className="table-responsive"><table className="table reception-table mb-0"><thead><tr><th>Mã phiếu</th><th>Nội dung cần xử lý</th><th>Trạng thái</th></tr></thead><tbody>{pendingItems.length === 0 ? <tr><td colSpan={3} className="text-center text-muted py-4">Không có phiếu tồn.</td></tr> : pendingItems.map((item) => <tr key={item.code}><td className="fw-semibold text-primary">{item.code}</td><td>{item.content}</td><td><span className="reception-badge reception-badge--amber">{item.status}</span></td></tr>)}</tbody></table></div></section>
    {isConfirmOpen && <div className="modal d-block reception-modal" role="dialog" aria-modal="true"><div className="modal-backdrop show reception-modal__backdrop" onClick={() => setIsConfirmOpen(false)} /><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h2 className="modal-title fs-5">Xác nhận gửi bàn giao</h2><button className="btn-close" onClick={() => setIsConfirmOpen(false)} /></div><div className="modal-body"><p>Người nhận sẽ kiểm tra tiền mặt, giao dịch và checklist trước khi xác nhận bàn giao.</p><strong>Người nhận: {availableReceivers.find((item) => String(item.id) === receiver)?.fullName}</strong></div><div className="modal-footer"><button className="btn btn-outline-secondary" onClick={() => setIsConfirmOpen(false)}>Quay lại</button><button className="btn btn-primary" disabled={isSaving} onClick={() => void submitHandover()}>Xác nhận gửi</button></div></div></div></div>}
  </div>;
}
