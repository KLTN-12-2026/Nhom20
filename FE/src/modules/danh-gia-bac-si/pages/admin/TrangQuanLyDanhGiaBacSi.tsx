import { useEffect, useMemo, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/components/ui/admin-crud.css';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { doctorReviewsApi, type DoctorReview, type DoctorReviewStatus } from '../../api/doctor-reviews.api';

const statusLabels: Record<DoctorReviewStatus, string> = {
  CHO_DUYET: 'Chờ duyệt', DA_HIEN_THI: 'Đang hiển thị', DA_AN: 'Đã ẩn',
};

const date = (value: string) => dinhDangNgayGio(value);

export default function TrangQuanLyDanhGiaBacSi() {
  const { showToast } = useAppToast();
  const [reviews, setReviews] = useState<DoctorReview[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DoctorReviewStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DoctorReview | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try { const response = await doctorReviewsApi.getAll({ search: search.trim() || undefined, status }); setReviews(response.data); }
    catch (requestError) { setError(getApiErrorMessage(requestError, 'Không thể tải danh sách đánh giá')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [status]);

  const totals = useMemo(() => ({
    pending: reviews.filter((item) => item.status === 'CHO_DUYET').length,
    visible: reviews.filter((item) => item.status === 'DA_HIEN_THI').length,
    hidden: reviews.filter((item) => item.status === 'DA_AN').length,
  }), [reviews]);

  const changeStatus = async (review: DoctorReview, nextStatus: Exclude<DoctorReviewStatus, 'CHO_DUYET'>) => {
    setUpdatingId(review.id);
    try {
      const response = await doctorReviewsApi.updateStatus(review.id, nextStatus);
      showToast(response.message);
      setReviews((current) => current.map((item) => item.id === review.id ? { ...item, status: nextStatus } : item));
      setSelected((current) => current?.id === review.id ? { ...current, status: nextStatus } : current);
    } catch (requestError) { showToast(getApiErrorMessage(requestError, 'Không thể cập nhật đánh giá'), 'danger'); }
    finally { setUpdatingId(null); }
  };

  return <div className="admin-crud-page">
    <div className="admin-crud-heading"><h1>QUẢN LÝ ĐÁNH GIÁ BÁC SĨ</h1><p className="text-secondary mb-0">Duyệt nội dung đánh giá sau khám; đánh giá ẩn không hiển thị công khai.</p></div>
    <div className="row g-3 mb-4"><div className="col-md-4"><div className="admin-crud-card"><small className="text-secondary">Chờ duyệt</small><strong className="d-block fs-3 text-warning-emphasis">{totals.pending}</strong></div></div><div className="col-md-4"><div className="admin-crud-card"><small className="text-secondary">Đang hiển thị</small><strong className="d-block fs-3 text-success">{totals.visible}</strong></div></div><div className="col-md-4"><div className="admin-crud-card"><small className="text-secondary">Đã ẩn</small><strong className="d-block fs-3 text-secondary">{totals.hidden}</strong></div></div></div>
    <div className="admin-crud-toolbar align-items-end"><div className="admin-crud-search"><span className="material-symbols-outlined">search</span><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(); }} placeholder="Tìm bệnh nhân, bác sĩ hoặc nội dung..." /></div><select className="form-select" style={{ maxWidth: 230 }} value={status} onChange={(event) => setStatus(event.target.value as DoctorReviewStatus | '')}><option value="">Tất cả trạng thái</option><option value="CHO_DUYET">Chờ duyệt</option><option value="DA_HIEN_THI">Đang hiển thị</option><option value="DA_AN">Đã ẩn</option></select><button className="btn btn-outline-primary ms-auto" onClick={() => void load()}>Tìm kiếm</button></div>
    {loading && <div className="admin-crud-empty"><div className="spinner-border text-primary" /><span>Đang tải đánh giá...</span></div>}
    {!loading && error && <div className="admin-crud-empty"><p className="text-danger">{error}</p><button className="btn btn-outline-primary" onClick={() => void load()}>Thử lại</button></div>}
    {!loading && !error && (
      <div className="admin-management-table-card">
        <div className="admin-management-table-heading">
          <div>
            <h2>Danh sách đánh giá</h2>
            <p>{reviews.length} đánh giá</p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table admin-management-table align-middle mb-0">
            <thead>
              <tr>
                <th>Bệnh nhân</th>
                <th>Bác sĩ / Chuyên khoa</th>
                <th>Đánh giá</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <strong className="d-block">{review.patient.name}</strong>
                    <small className="text-secondary">{review.patient.code} · {review.visit.code}</small>
                  </td>
                  <td>
                    <strong className="d-block">{review.doctor.name}</strong>
                    <small className="text-secondary">{review.doctor.specialty ?? 'Chưa cập nhật'}</small>
                  </td>
                  <td>
                    <span className="text-warning fs-5">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    <small className="d-block text-secondary text-truncate" style={{ maxWidth: 260 }}>{review.comment || 'Không có nhận xét'}</small>
                  </td>
                  <td>{date(review.createdAt)}</td>
                  <td>
                    <span className={review.status === 'DA_HIEN_THI' ? 'badge-status-active' : review.status === 'DA_AN' ? 'badge-status-locked' : 'badge-status-pending'}>
                      {statusLabels[review.status]}
                    </span>
                  </td>
                  <td>
                    <div className="admin-crud-actions justify-content-end">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setSelected(review)} title="Xem chi tiết">
                        <span className="material-symbols-outlined">visibility</span>Chi tiết
                      </button>
                      {review.status !== 'DA_HIEN_THI' && (
                        <button className="btn btn-sm btn-success text-nowrap" disabled={updatingId === review.id} onClick={() => void changeStatus(review, 'DA_HIEN_THI')}>
                          Duyệt
                        </button>
                      )}
                      {review.status !== 'DA_AN' && (
                        <button className="btn btn-sm btn-outline-danger text-nowrap" disabled={updatingId === review.id} onClick={() => void changeStatus(review, 'DA_AN')}>
                          Ẩn
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reviews.length === 0 && (
          <div className="admin-crud-empty py-5">
            Không tìm thấy đánh giá phù hợp.
          </div>
        )}
      </div>
    )}
    {selected && <AppModal title="Chi tiết đánh giá bác sĩ" onClose={() => setSelected(null)} footer={<><button className="btn btn-outline-secondary" onClick={() => setSelected(null)}>Đóng</button>{selected.status !== 'DA_HIEN_THI' && <button className="btn btn-success" disabled={updatingId === selected.id} onClick={() => void changeStatus(selected, 'DA_HIEN_THI')}>Duyệt hiển thị</button>}{selected.status !== 'DA_AN' && <button className="btn btn-outline-danger" disabled={updatingId === selected.id} onClick={() => void changeStatus(selected, 'DA_AN')}>Ẩn đánh giá</button>}</>}><dl className="row mb-3"><dt className="col-sm-4">Bệnh nhân</dt><dd className="col-sm-8">{selected.patient.name} ({selected.patient.code})</dd><dt className="col-sm-4">Bác sĩ</dt><dd className="col-sm-8">{selected.doctor.name} · {selected.doctor.specialty ?? 'Chưa cập nhật'}</dd><dt className="col-sm-4">Lượt khám</dt><dd className="col-sm-8">{selected.visit.code}</dd><dt className="col-sm-4">Số sao</dt><dd className="col-sm-8"><span className="text-warning fs-4">{'★'.repeat(selected.rating)}{'☆'.repeat(5 - selected.rating)}</span></dd><dt className="col-sm-4">Trạng thái</dt><dd className="col-sm-8">{statusLabels[selected.status]}</dd></dl><p className="fw-semibold mb-1">Nhận xét</p><div className="border rounded-3 p-3 bg-light">{selected.comment || 'Bệnh nhân không để lại nhận xét.'}</div></AppModal>}
  </div>;
}
