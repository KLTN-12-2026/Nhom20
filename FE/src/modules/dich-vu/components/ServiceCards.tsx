import { Link } from 'react-router-dom';
import { useMemo, useState, Fragment } from 'react';
import { useServices } from '../hooks/use-services';
import { getServiceIcon } from '@/utils/icon-mapper';
import '@/modules/trang-chu/public-pages.css';

function currency(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

const PAGE_SIZE = 4; // 4 cards/trang — 1 hàng grid 4 cột

function getPageNumbers(current: number, total: number) {
  return [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

function ServiceCard({ item }: { item: ReturnType<typeof useServices>['services'][number] }) {
  return (
    <article className="public-info-card">
      <div className="public-info-card__icon">
        <span className="material-symbols-outlined">{getServiceIcon(item.name)}</span>
      </div>
      <span className="public-info-card__kicker">{item.specialty?.name ?? 'Dịch vụ phòng khám'}</span>
      <h3>{item.name}</h3>
      <p>{item.description || 'Thông tin dịch vụ đang được cập nhật.'}</p>
      {item.estimatedMinutes && (
        <span style={{ fontSize: '.8rem', color: '#667085', marginBottom: 8, display: 'block' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 4 }}>schedule</span>
          Khoảng {item.estimatedMinutes} phút
        </span>
      )}
      <div className="public-info-card__footer">
        <span className="public-info-card__price">{currency(item.price)}</span>
        <Link
          className="btn btn-sm btn-primary"
          to={`/dat-lich${item.specialty ? `?chuyenKhoaId=${item.specialty.id}` : ''}`}
        >
          Đặt lịch
        </Link>
      </div>
    </article>
  );
}

export default function ServiceCards({ limit }: { limit?: number }) {
  const { services, isLoading, error, reload } = useServices('DANG_HOAT_DONG');
  const [page, setPage] = useState(1);

  const items = services;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const visible = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [items, currentPage],
  );

  if (isLoading) return (
    <div className="public-page-empty">
      <div className="spinner-border text-primary" /><span>Đang tải dịch vụ...</span>
    </div>
  );
  if (error) return (
    <div className="public-page-empty">
      <span className="text-danger">{error}</span>
      <button className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button>
    </div>
  );
  if (!items.length) return <div className="public-page-empty">Chưa có dịch vụ đang hoạt động.</div>;

  return (
    <>
      {/* Grid cards */}
      <div className="public-card-grid">
        {visible.map((item) => <ServiceCard key={item.id} item={item} />)}
      </div>

      {/* Phân trang số 1, 2, 3... — chỉ hiện khi > 1 trang */}
      {totalPages > 1 && (
        <nav className="d-flex justify-content-center mt-4" aria-label="Phân trang dịch vụ">
          <ul className="pagination mb-0 flex-wrap">
            {/* Nút « */}
            <li className={`page-item${currentPage <= 1 ? ' disabled' : ''}`}>
              <button type="button" className="page-link" disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước">
                <span aria-hidden="true">«</span>
              </button>
            </li>

            {/* Số trang */}
            {pageNumbers.map((num, idx) => (
              <Fragment key={num}>
                {idx > 0 && num - pageNumbers[idx - 1] > 1 && (
                  <li className="page-item disabled" aria-hidden="true">
                    <span className="page-link">…</span>
                  </li>
                )}
                <li className={`page-item${num === currentPage ? ' active' : ''}`}>
                  <button type="button" className="page-link"
                    aria-current={num === currentPage ? 'page' : undefined}
                    onClick={() => setPage(num)}>
                    {num}
                  </button>
                </li>
              </Fragment>
            ))}

            {/* Nút » */}
            <li className={`page-item${currentPage >= totalPages ? ' disabled' : ''}`}>
              <button type="button" className="page-link" disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau">
                <span aria-hidden="true">»</span>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
