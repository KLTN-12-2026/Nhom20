import { useCallback, useEffect, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import ReceptionistPageHeader from '@/modules/tiep-don/components/ReceptionistPageHeader';
import { axiosClient, getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import '@/modules/tiep-don/receptionist-workspace.css';

type PendingHandover = {
  id: number;
  sender: string;
  senderPhone: string | null;
  shift: string;
  workingDate: string;
  submittedAt: string | null;
  systemCash: number;
  actualCash: number | null;
  transferAmount: number;
  difference: number | null;
  differenceReason: string | null;
  pendingItemCount: number;
  checklist: string[];
  note: string | null;
};

const money = (value: number | null) =>
  value === null ? 'Chưa kiểm đếm' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;

function formatDate(value: string | null) {
  return value ? dinhDangNgayGio(value) : 'Chưa gửi';
}

export default function TrangNhanBanGiaoCa() {
  const { showToast } = useAppToast();
  const [handovers, setHandovers] = useState<PendingHandover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<PendingHandover | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const loadHandovers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get<{ data: PendingHandover[] }>('/receptionist-schedules/handover/pending');
      setHandovers(response.data.data ?? []);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải bàn giao đang chờ'), 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadHandovers(); }, [loadHandovers]);

  const confirmReceipt = async () => {
    if (!selected) return;
    setIsConfirming(true);
    try {
      await axiosClient.post(`/receptionist-schedules/handover/${selected.id}/confirm-receipt`);
      setHandovers((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      showToast('Đã xác nhận nhận bàn giao ca', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể xác nhận bàn giao'), 'danger');
    } finally {
      setIsConfirming(false);
    }
  };

  return <div className="reception-page">
    <ReceptionistPageHeader
      eyebrow="NHẬN CA VÀ ĐỐI CHIẾU"
      title="Nhận bàn giao ca"
      description="Kiểm tra quỹ tiền mặt, giao dịch và công việc tồn trước khi xác nhận nhận ca."
      actions={<button type="button" className="btn btn-outline-primary" onClick={() => void loadHandovers()} disabled={isLoading}>Làm mới</button>}
    />

    <section className="reception-card">
      <div className="reception-card__header">
        <div><h2>Bàn giao chờ bạn xác nhận</h2><p className="mb-0 text-secondary small">Chỉ bạn — người được chọn nhận ca — mới có thể xác nhận.</p></div>
        <span className="reception-badge reception-badge--amber">{handovers.length} chờ xác nhận</span>
      </div>
      <div className="table-responsive">
        <table className="table reception-table mb-0">
          <thead><tr><th>Người bàn giao</th><th>Ca làm việc</th><th>Thời gian gửi</th><th>Tiền mặt thực tế</th><th>Chênh lệch</th><th className="text-end">Thao tác</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center text-secondary py-5">Đang tải bàn giao ca...</td></tr>}
            {!isLoading && handovers.length === 0 && <tr><td colSpan={6} className="text-center text-secondary py-5">Bạn chưa có bàn giao ca nào cần xác nhận.</td></tr>}
            {!isLoading && handovers.map((item) => <tr key={item.id}>
              <td><strong>{item.sender}</strong><span className="d-block text-secondary small">{item.senderPhone ?? 'Không có số điện thoại'}</span></td>
              <td>{item.shift}<span className="d-block text-secondary small">{formatDate(item.workingDate)}</span></td>
              <td>{formatDate(item.submittedAt)}</td>
              <td>{money(item.actualCash)}</td>
              <td className={item.difference ? 'text-danger fw-semibold' : 'text-success fw-semibold'}>{money(item.difference)}</td>
              <td className="text-end"><button type="button" className="btn btn-primary btn-sm" onClick={() => setSelected(item)}>Xem & xác nhận</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {selected && <AppModal
      size="lg"
      title="Xác nhận nhận bàn giao"
      onClose={() => !isConfirming && setSelected(null)}
      footer={<><button type="button" className="btn btn-outline-secondary" disabled={isConfirming} onClick={() => setSelected(null)}>Quay lại</button><button type="button" className="btn btn-primary" disabled={isConfirming} onClick={() => void confirmReceipt()}>{isConfirming ? 'Đang xác nhận...' : 'Xác nhận đã nhận ca'}</button></>}
    >
      <div className="row g-3">
        <div className="col-md-6"><small className="text-secondary d-block">Người bàn giao</small><strong>{selected.sender}</strong></div>
        <div className="col-md-6"><small className="text-secondary d-block">Ca làm việc</small><strong>{selected.shift} · {formatDate(selected.workingDate)}</strong></div>
        <div className="col-md-4"><small className="text-secondary d-block">Tiền mặt hệ thống</small><strong>{money(selected.systemCash)}</strong></div>
        <div className="col-md-4"><small className="text-secondary d-block">Tiền mặt thực tế</small><strong>{money(selected.actualCash)}</strong></div>
        <div className="col-md-4"><small className="text-secondary d-block">Chênh lệch</small><strong className={selected.difference ? 'text-danger' : 'text-success'}>{money(selected.difference)}</strong></div>
        <div className="col-12"><div className="border rounded-3 p-3"><strong>Checklist bàn giao</strong><ul className="mb-0 mt-2 ps-3">{selected.checklist.length ? selected.checklist.map((item) => <li key={item}>{item}</li>) : <li>Chưa có checklist.</li>}</ul></div></div>
        {(selected.note || selected.differenceReason || selected.pendingItemCount > 0) && <div className="col-12"><div className="border rounded-3 p-3"><strong>Lưu ý từ ca trước</strong>{selected.note && <p className="mb-1 mt-2">{selected.note}</p>}{selected.differenceReason && <p className="mb-1 text-danger">Lý do chênh lệch: {selected.differenceReason}</p>}{selected.pendingItemCount > 0 && <p className="mb-0 text-warning-emphasis">Còn {selected.pendingItemCount} phiếu chờ xử lý.</p>}</div></div>}
      </div>
      <p className="small text-secondary mt-3 mb-0">Khi xác nhận, trạng thái bàn giao chuyển thành “Đã bàn giao” và hệ thống lưu thời điểm xác nhận.</p>
    </AppModal>}
  </div>;
}
