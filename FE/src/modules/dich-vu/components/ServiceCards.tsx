import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useServices } from '../hooks/use-services';
import { getServiceIcon } from '@/utils/icon-mapper';
import './services.css';

function currency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

const ITEM_W = 265;

export default function ServiceCards({ limit }: { limit?: number }) {
  const { services, isLoading, error, reload } = useServices('DANG_HOAT_DONG');
  const items = limit ? services : services; // Lấy tất cả để slider hoạt động
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const scroll = (dir: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'next' ? (ITEM_W + 20) * 2 : -(ITEM_W + 20) * 2, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  if (isLoading) return (
    <div className="service-public-state">
      <div className="spinner-border text-primary" /><span>Đang tải dịch vụ...</span>
    </div>
  );
  if (error) return (
    <div className="service-public-state">
      <span className="text-danger">{error}</span>
      <button className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button>
    </div>
  );
  if (!items.length) return <div className="service-public-state">Chưa có dịch vụ đang hoạt động.</div>;

  /* Nếu ≤ 4 item dùng grid, nhiều hơn dùng slider */
  if (items.length <= 4) {
    return (
      <div className="service-public-grid">
        {items.map((item) => <ServiceCard key={item.id} item={item} />)}
      </div>
    );
  }

  return (
    <div className="svc-slider-wrap">
      <button
        className={`hd-slider-btn${canPrev ? '' : ' hd-slider-btn--disabled'}`}
        onClick={() => scroll('prev')}
        disabled={!canPrev}
        aria-label="Trang trước"
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>

      <div className="svc-slider-track" ref={trackRef} onScroll={onScroll}>
        {items.map((item) => (
          <div key={item.id} className="svc-slider-item" style={{ minWidth: ITEM_W }}>
            <ServiceCard item={item} />
          </div>
        ))}
      </div>

      <button
        className={`hd-slider-btn${canNext ? '' : ' hd-slider-btn--disabled'}`}
        onClick={() => scroll('next')}
        disabled={!canNext}
        aria-label="Trang sau"
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
}

function ServiceCard({ item }: { item: ReturnType<typeof useServices>['services'][number] }) {
  return (
    <article className="service-public-card">
      <span className="material-symbols-outlined service-public-card__icon">{getServiceIcon(item.name)}</span>
      <small>{item.specialty?.name ?? 'Dịch vụ phòng khám'}</small>
      <h3>{item.name}</h3>
      <p>{item.description || 'Thông tin dịch vụ đang được cập nhật.'}</p>
      <div className="service-public-card__meta">
        <strong>{currency(item.price)}</strong>
        <span>{item.estimatedMinutes ? `Khoảng ${item.estimatedMinutes} phút` : 'Theo tình trạng khám'}</span>
      </div>
      <Link
        className="btn btn-outline-primary w-100"
        to={`/dat-lich${item.specialty ? `?chuyenKhoaId=${item.specialty.id}` : ''}`}
      >
        Đặt lịch dịch vụ
      </Link>
    </article>
  );
}
