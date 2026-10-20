import { useEffect, useMemo, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { useChatAdmin } from '../../hooks/use-chat-admin';
import type { ChatAdminFilters, ChatAdminSession, ChatSessionFilter, ChatVisitorFilter } from '../../types/chat-admin.types';
import '../../chat-admin.css';

const DEFAULT_FILTERS: ChatAdminFilters = { search: '', visitorType: '', status: '', page: 1, limit: 12 };

const bookingLabel: Record<string, string> = {
  DANG_CHO_XAC_NHAN: 'Chờ xác nhận', DA_XAC_NHAN: 'Đã tạo lịch', DA_HUY: 'Đã hủy',
};

function formatDate(value: string) {
  return dinhDangNgayGio(value);
}

function statusClass(status: string | null) {
  if (status === 'THANH_CONG' || status === 'DA_XAC_NHAN') return 'is-success';
  if (status === 'THAT_BAI' || status === 'DA_HUY') return 'is-danger';
  return 'is-neutral';
}

export default function TrangQuanLyChatboxAI() {
  const { showToast } = useAppToast();
  const [filters, setFilters] = useState<ChatAdminFilters>(DEFAULT_FILTERS);
  const [draftSearch, setDraftSearch] = useState('');
  const { overview, sessions, detail, meta, isLoading, isLoadingDetail, setDetail, loadDashboard, loadDetail } = useChatAdmin();

  const requestFilters = useMemo(() => ({ ...filters, search: filters.search.trim() }), [filters]);

  const refresh = async (nextFilters = requestFilters) => {
    try {
      await loadDashboard(nextFilters);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải dữ liệu Chatbox AI'), 'danger');
    }
  };

  useEffect(() => { void refresh(DEFAULT_FILTERS); }, []);

  const submitSearch = () => {
    const next = { ...filters, search: draftSearch, page: 1 };
    setFilters(next);
    void refresh(next);
  };

  const changeFilter = (field: 'visitorType' | 'status', value: string) => {
    const next = { ...filters, [field]: value, page: 1 } as ChatAdminFilters;
    setFilters(next);
    void refresh(next);
  };

  const openDetail = async (session: ChatAdminSession) => {
    try {
      await loadDetail(session.id);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải chi tiết hội thoại'), 'danger');
    }
  };

  const goPage = (page: number) => {
    const next = { ...filters, page };
    setFilters(next);
    void refresh(next);
  };

  return (
    <div className="chat-admin-page">
      <header className="chat-admin-heading">
        <div>
          <p className="chat-admin-eyebrow">VẬN HÀNH TRỢ LÝ SỐ</p>
          <h1>Quản lý Chatbox AI</h1>
          <p>Theo dõi hội thoại thật, yêu cầu đặt lịch và tình trạng phản hồi của trợ lý Smart Clinic.</p>
        </div>
        <button className="btn btn-primary chat-admin-refresh" type="button" disabled={isLoading} onClick={() => void refresh()}>
          <span className="material-symbols-outlined">refresh</span>{isLoading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <section className="chat-admin-metrics" aria-label="Tổng quan Chatbox AI">
        <Metric icon="forum" label="Phiên chat hôm nay" value={overview?.todaySessionCount} tone="blue" />
        <Metric icon="chat" label="Tin nhắn hôm nay" value={overview?.todayMessageCount} tone="violet" />
        <Metric icon="event_available" label="Lịch tạo từ chat" value={overview?.confirmedBookingCount} tone="green" />
        <Metric icon="speed" label="Độ trễ AI trung bình" value={overview?.averageLatencyMs == null ? '—' : `${overview.averageLatencyMs} ms`} tone="amber" />
      </section>

      <section className="chat-admin-workbench">
        <div className="chat-admin-sessions">
          <div className="chat-admin-section-heading">
            <div><h2>Phiên hội thoại</h2><p>{meta.total} phiên phù hợp với bộ lọc hiện tại</p></div>
            <div className="chat-admin-health"><span className="chat-admin-dot" /> AI thành công {overview?.successfulRunCount ?? 0} · lỗi {overview?.failedRunCount ?? 0}</div>
          </div>
          <div className="chat-admin-filters">
            <label className="chat-admin-search">
              <span className="material-symbols-outlined">search</span>
              <input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submitSearch()} placeholder="Mã phiên, khách, số điện thoại..." />
            </label>
            <select value={filters.visitorType} onChange={(event) => changeFilter('visitorType', event.target.value as ChatVisitorFilter)} aria-label="Loại khách">
              <option value="">Tất cả người dùng</option><option value="GUEST">Khách vãng lai</option><option value="PATIENT">Bệnh nhân</option>
            </select>
            <select value={filters.status} onChange={(event) => changeFilter('status', event.target.value as ChatSessionFilter)} aria-label="Trạng thái phiên">
              <option value="">Tất cả trạng thái</option><option value="DANG_HOAT_DONG">Đang hoạt động</option><option value="DA_KET_THUC">Đã kết thúc</option>
            </select>
            <button type="button" className="btn btn-outline-primary" onClick={submitSearch}>Tìm</button>
          </div>
          {isLoading ? <div className="chat-admin-empty"><div className="spinner-border text-primary" /><span>Đang tải các phiên Chatbox AI...</span></div> : sessions.length === 0 ? <div className="chat-admin-empty"><span className="material-symbols-outlined">forum</span><strong>Chưa có phiên hội thoại phù hợp</strong><p>Hệ thống sẽ tự ghi nhận khi khách hoặc bệnh nhân bắt đầu trò chuyện.</p></div> : <div className="chat-admin-list">
            {sessions.map((session) => <button className="chat-admin-session" type="button" key={session.id} onClick={() => void openDetail(session)}>
              <div className="chat-admin-avatar">{session.visitor.fullName.slice(0, 1).toUpperCase()}</div>
              <div className="chat-admin-session-main"><strong>{session.visitor.fullName}</strong><span>{session.visitor.phoneNumber ?? session.code} · {session.messageCount} tin nhắn</span><p>{session.lastMessage?.content ?? 'Chưa có tin nhắn'}</p></div>
              <div className="chat-admin-session-state"><span className={`chat-admin-badge ${statusClass(session.latestRun?.status ?? null)}`}>{session.latestRun?.status === 'THAT_BAI' ? 'AI lỗi' : session.latestRun ? 'AI hoạt động' : 'Chưa gọi AI'}</span><time>{formatDate(session.updatedAt)}</time></div>
              <span className="material-symbols-outlined chat-admin-chevron">chevron_right</span>
            </button>)}
          </div>}
          <nav className="chat-admin-pagination" aria-label="Chuyển trang hội thoại">
            <span>Trang {meta.page}/{meta.totalPages}</span>
            <div><button type="button" disabled={meta.page <= 1 || isLoading} onClick={() => goPage(meta.page - 1)}><span className="material-symbols-outlined">chevron_left</span></button><button type="button" disabled={meta.page >= meta.totalPages || isLoading} onClick={() => goPage(meta.page + 1)}><span className="material-symbols-outlined">chevron_right</span></button></div>
          </nav>
        </div>
        <aside className="chat-admin-side">
          <section className="chat-admin-side-card"><div className="chat-admin-card-icon"><span className="material-symbols-outlined">groups</span></div><h2>Người đang dùng</h2><div className="chat-admin-stat-line"><span>Khách vãng lai</span><strong>{overview?.guestSessionCount ?? 0}</strong></div><div className="chat-admin-stat-line"><span>Bệnh nhân đăng nhập</span><strong>{overview?.patientSessionCount ?? 0}</strong></div></section>
          <section className="chat-admin-side-card"><div className="chat-admin-card-icon is-green"><span className="material-symbols-outlined">monitoring</span></div><h2>Trạng thái AI hôm nay</h2><div className="chat-admin-stat-line"><span>Phản hồi thành công</span><strong className="text-success">{overview?.successfulRunCount ?? 0}</strong></div><div className="chat-admin-stat-line"><span>Lần phản hồi lỗi</span><strong className={overview?.failedRunCount ? 'text-danger' : ''}>{overview?.failedRunCount ?? 0}</strong></div><p className="chat-admin-side-note">Số liệu được ghi trực tiếp từ lịch sử chạy AI, không phải dữ liệu mẫu.</p></section>
          <section className="chat-admin-side-card chat-admin-scope"><span className="material-symbols-outlined">shield</span><div><strong>Chỉ dành cho quản trị viên</strong><p>Trang này chỉ theo dõi vận hành; không can thiệp nội dung hoặc tồn kho.</p></div></section>
        </aside>
      </section>

      {detail && <AppModal size="xl" title={`Hội thoại ${detail.code}`} onClose={() => setDetail(null)} footer={<button className="btn btn-outline-secondary" onClick={() => setDetail(null)}>Đóng</button>}>
        {isLoadingDetail ? <div className="chat-admin-modal-loading"><div className="spinner-border text-primary" /> Đang tải chi tiết...</div> : <div className="chat-admin-detail">
          <section className="chat-admin-detail-summary"><div><small>Người dùng</small><strong>{detail.visitor.fullName}</strong><span>{detail.visitor.phoneNumber ?? detail.code}</span></div><div><small>Trạng thái lịch</small><strong>{detail.bookingStatus ? bookingLabel[detail.bookingStatus] ?? detail.bookingStatus : 'Chưa có'}</strong><span>{detail.appointmentId ? `Lịch hẹn #${detail.appointmentId}` : 'Chưa xác nhận lịch'}</span></div><div><small>Cập nhật gần nhất</small><strong>{formatDate(detail.updatedAt)}</strong><span>{detail.messageCount} tin nhắn</span></div></section>
          <div className="chat-admin-detail-grid"><section><h3>Nội dung hội thoại</h3><div className="chat-admin-transcript">{detail.messages.filter((message) => message.role !== 'CONG_CU').map((message) => <article key={message.id} className={`chat-admin-message ${message.role === 'NGUOI_DUNG' ? 'is-user' : 'is-ai'}`}><small>{message.role === 'NGUOI_DUNG' ? 'Người dùng' : 'Trợ lý Smart Clinic'} · {formatDate(message.createdAt)}</small><p>{message.content}</p></article>)}</div></section><section><h3>Lần chạy AI gần đây</h3><div className="chat-admin-runs">{detail.runs.length === 0 ? <p className="text-secondary">Chưa có lần chạy AI.</p> : detail.runs.map((run) => <article key={run.id}><span className={`chat-admin-badge ${statusClass(run.status)}`}>{run.status === 'THANH_CONG' ? 'Thành công' : 'Thất bại'}</span><strong>{run.model}</strong><small>{run.latencyMs == null ? 'Chưa có độ trễ' : `${run.latencyMs} ms`} · {formatDate(run.createdAt)}</small>{run.errorMessage && <p>{run.errorMessage}</p>}</article>)}</div></section></div>
        </div>}
      </AppModal>}
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: string; label: string; value: number | string | undefined; tone: string }) {
  return <article className={`chat-admin-metric is-${tone}`}><span className="material-symbols-outlined">{icon}</span><div><small>{label}</small><strong>{value ?? '—'}</strong></div></article>;
}
