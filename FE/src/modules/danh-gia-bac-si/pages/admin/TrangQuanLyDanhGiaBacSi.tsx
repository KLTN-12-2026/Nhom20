import { Fragment, useEffect, useMemo, useState } from 'react';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/components/ui/admin-crud.css';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { doctorReviewsApi, type DoctorReview, type DoctorReviewStatus } from '../../api/doctor-reviews.api';

const REVIEWS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

const statusLabels: Record<DoctorReviewStatus, string> = {
  CHO_DUYET: 'Chờ duyệt',
  DA_HIEN_THI: 'Đang hiển thị',
  DA_AN: 'Đã ẩn',
};

const date = (value: string) => dinhDangNgayGio(value);

export default function TrangQuanLyDanhGiaBacSi() {
  const { showToast } = useAppToast();
  const [allReviews, setAllReviews] = useState<DoctorReview[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DoctorReviewStatus | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DoctorReview | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await doctorReviewsApi.getAll({});
      setAllReviews(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách đánh giá'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredReviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return allReviews.filter((item) => {
      const matchSearch =
        !keyword ||
        item.patient.name.toLowerCase().includes(keyword) ||
        item.patient.code.toLowerCase().includes(keyword) ||
        item.doctor.name.toLowerCase().includes(keyword) ||
        (item.doctor.specialty && item.doctor.specialty.toLowerCase().includes(keyword)) ||
        (item.comment && item.comment.toLowerCase().includes(keyword)) ||
        item.visit.code.toLowerCase().includes(keyword);

      const matchStatus = !status || item.status === status;

      return matchSearch && matchStatus;
    });
  }, [allReviews, search, status]);

  const totals = useMemo(
    () => ({
      pending: allReviews.filter((item) => item.status === 'CHO_DUYET').length,
      visible: allReviews.filter((item) => item.status === 'DA_HIEN_THI').length,
      hidden: allReviews.filter((item) => item.status === 'DA_AN').length,
    }),
    [allReviews],
  );

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    filteredReviews.length === 0 ? 0 : (currentPage - 1) * REVIEWS_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * REVIEWS_PER_PAGE, filteredReviews.length);
  const visibleReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
    return filteredReviews.slice(startIndex, startIndex + REVIEWS_PER_PAGE);
  }, [currentPage, filteredReviews]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const changeStatus = async (review: DoctorReview, nextStatus: Exclude<DoctorReviewStatus, 'CHO_DUYET'>) => {
    setUpdatingId(review.id);
    try {
      const response = await doctorReviewsApi.updateStatus(review.id, nextStatus);
      showToast(response.message);
      setAllReviews((current) => current.map((item) => (item.id === review.id ? { ...item, status: nextStatus } : item)));
      setSelected((current) => (current?.id === review.id ? { ...current, status: nextStatus } : current));
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Không thể cập nhật đánh giá'), 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Chất lượng dịch vụ</p>
          <h1>QUẢN LÝ ĐÁNH GIÁ BÁC SĨ</h1>
          <p className="admin-management-description">
            Theo dõi phản hồi, mức độ hài lòng và chất lượng khám chữa bệnh của bác sĩ thông qua đánh giá từ bệnh nhân.
          </p>
        </div>
      </div>
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="admin-crud-card">
            <small className="text-secondary">Chờ duyệt</small>
            <strong className="d-block fs-3 text-warning-emphasis">{totals.pending}</strong>
          </div>
        </div>
        <div className="col-md-4">
          <div className="admin-crud-card">
            <small className="text-secondary">Đang hiển thị</small>
            <strong className="d-block fs-3 text-success">{totals.visible}</strong>
          </div>
        </div>
        <div className="col-md-4">
          <div className="admin-crud-card">
            <small className="text-secondary">Đã ẩn</small>
            <strong className="d-block fs-3 text-secondary">{totals.hidden}</strong>
          </div>
        </div>
      </div>
      <div className="admin-crud-toolbar">
        <div className="admin-crud-search">
          <span className="material-symbols-outlined">search</span>
          <input
            className="form-control"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm bệnh nhân, bác sĩ hoặc nội dung..."
          />
        </div>
        <select
          className="form-select"
          style={{ maxWidth: 230 }}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as DoctorReviewStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="CHO_DUYET">Chờ duyệt</option>
          <option value="DA_HIEN_THI">Đang hiển thị</option>
          <option value="DA_AN">Đã ẩn</option>
        </select>
        <button
          className="btn btn-primary d-flex align-items-center gap-2 ms-auto text-white"
          onClick={() => {
            void load();
            setPage(1);
          }}
          disabled={loading}
        >
          <span className="material-symbols-outlined">refresh</span>
          Làm mới
        </button>
      </div>
      {loading && (
        <div className="admin-crud-empty">
          <div className="spinner-border text-primary" />
          <span>Đang tải đánh giá...</span>
        </div>
      )}
      {!loading && error && (
        <div className="admin-crud-empty">
          <p className="text-danger">{error}</p>
          <button className="btn btn-outline-primary" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && (
        <div className="admin-management-table-card">
          <div className="admin-management-table-heading">
            <div>
              <h2>Danh sách đánh giá</h2>
              <p>Hiển thị {filteredReviews.length} kết quả phù hợp</p>
            </div>
          </div>
          <div className="table-responsive">
            <table
              className="table admin-management-table align-middle mb-0"
              style={{ tableLayout: 'fixed', minWidth: '1140px', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '18%', minWidth: '180px' }} />
                <col style={{ width: '18%', minWidth: '180px' }} />
                <col style={{ width: '26%', minWidth: '240px' }} />
                <col style={{ width: '13%', minWidth: '130px' }} />
                <col style={{ width: '11%', minWidth: '110px' }} />
                <col style={{ width: '14%', minWidth: '200px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '18%', minWidth: '180px' }}>Bệnh nhân</th>
                  <th style={{ width: '18%', minWidth: '180px' }}>Bác sĩ / Chuyên khoa</th>
                  <th style={{ width: '26%', minWidth: '240px' }}>Đánh giá</th>
                  <th style={{ width: '13%', minWidth: '130px' }}>Ngày gửi</th>
                  <th style={{ width: '11%', minWidth: '110px' }}>Trạng thái</th>
                  <th className="text-end text-nowrap" style={{ width: '14%', minWidth: '200px' }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleReviews.map((review) => (
                  <tr key={review.id}>
                    <td>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <strong className="d-block text-truncate" title={review.patient.name}>
                          {review.patient.name}
                        </strong>
                        <small className="text-secondary text-truncate d-block" title={`${review.patient.code} · ${review.visit.code}`}>
                          {review.patient.code} · {review.visit.code}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <strong className="d-block text-truncate" title={review.doctor.name}>
                          {review.doctor.name}
                        </strong>
                        <small className="text-secondary text-truncate d-block" title={review.doctor.specialty ?? 'Chưa cập nhật'}>
                          {review.doctor.specialty ?? 'Chưa cập nhật'}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="text-warning fs-5 text-nowrap">
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </span>
                      <small className="d-block text-secondary text-truncate" title={review.comment || 'Không có nhận xét'}>
                        {review.comment || 'Không có nhận xét'}
                      </small>
                    </td>
                    <td className="text-nowrap">{date(review.createdAt)}</td>
                    <td>
                      <span
                        className={`${
                          review.status === 'DA_HIEN_THI'
                            ? 'badge-status-active'
                            : review.status === 'DA_AN'
                              ? 'badge-status-locked'
                              : 'badge-status-pending'
                        } text-nowrap`}
                      >
                        {statusLabels[review.status]}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="admin-crud-actions justify-content-end flex-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary text-nowrap"
                          onClick={() => setSelected(review)}
                          title="Xem chi tiết"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                          Chi tiết
                        </button>
                        {review.status !== 'DA_HIEN_THI' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success text-nowrap"
                            disabled={updatingId === review.id}
                            onClick={() => void changeStatus(review, 'DA_HIEN_THI')}
                          >
                            {review.status === 'CHO_DUYET' ? 'Duyệt' : 'Hiển thị lại'}
                          </button>
                        )}
                        {review.status !== 'DA_AN' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger text-nowrap"
                            disabled={updatingId === review.id}
                            onClick={() => void changeStatus(review, 'DA_AN')}
                          >
                            Ẩn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReviews.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-secondary">
                      Không tìm thấy đánh giá phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredReviews.length > 0 && (
            <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
              <span className="text-secondary small">
                Hiển thị {displayedFrom}–{displayedTo} trong tổng số {filteredReviews.length} đánh giá
              </span>
              <nav className="align-self-md-auto align-self-start" aria-label="Phân trang đánh giá">
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
      {selected && (
        <AppModal
          title="Chi tiết đánh giá bác sĩ"
          onClose={() => setSelected(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setSelected(null)}>
                Đóng
              </button>
              {selected.status !== 'DA_HIEN_THI' && (
                <button
                  className="btn btn-success"
                  disabled={updatingId === selected.id}
                  onClick={() => void changeStatus(selected, 'DA_HIEN_THI')}
                >
                  {selected.status === 'CHO_DUYET'
                    ? 'Duyệt hiển thị'
                    : 'Hiển thị lại'}
                </button>
              )}
              {selected.status !== 'DA_AN' && (
                <button
                  className="btn btn-danger"
                  disabled={updatingId === selected.id}
                  onClick={() => void changeStatus(selected, 'DA_AN')}
                >
                  Ẩn đánh giá
                </button>
              )}
            </>
          }
        >
          <dl className="row mb-3">
            <dt className="col-sm-4">Bệnh nhân</dt>
            <dd className="col-sm-8">
              {selected.patient.name} ({selected.patient.code})
            </dd>
            <dt className="col-sm-4">Bác sĩ</dt>
            <dd className="col-sm-8">
              {selected.doctor.name} · {selected.doctor.specialty ?? 'Chưa cập nhật'}
            </dd>
            <dt className="col-sm-4">Lượt khám</dt>
            <dd className="col-sm-8">{selected.visit.code}</dd>
            <dt className="col-sm-4">Số sao</dt>
            <dd className="col-sm-8">
              <span className="text-warning fs-4">
                {'★'.repeat(selected.rating)}
                {'☆'.repeat(5 - selected.rating)}
              </span>
            </dd>
            <dt className="col-sm-4">Trạng thái</dt>
            <dd className="col-sm-8">{statusLabels[selected.status]}</dd>
          </dl>
          <p className="fw-semibold mb-1">Nhận xét</p>
          <div className="border rounded-3 p-3 bg-light">
            {selected.comment || 'Bệnh nhân không để lại nhận xét.'}
          </div>
        </AppModal>
      )}
    </div>
  );
}
