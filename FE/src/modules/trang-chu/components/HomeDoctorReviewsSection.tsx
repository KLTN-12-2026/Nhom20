import { useState } from 'react';
import { usePublicDoctorReviews } from '@/modules/danh-gia-bac-si/hooks/use-public-doctor-reviews';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import '../public-pages.css';

const PAGE_SIZE = 3; // 3 reviews/trang → 1 hàng, nút < > hiển thị từ review thứ 4

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="home-review-card__stars" aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? '#f59e0b' : '#d1d5db', fontSize: '1.1rem' }}>★</span>
      ))}
    </span>
  );
}

export default function HomeDoctorReviewsSection() {
  const { reviews, isLoading, error, reload } = usePublicDoctorReviews();
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(reviews.length / PAGE_SIZE);
  const paged = reviews.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const goNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const goPrev = () => setPage((p) => Math.max(0, p - 1));

  return (
    <section className="home-directory-section home-directory-section--tint">
      <div className="container">

        {/* Heading */}
        <div className="home-section-heading">
          <div>
            <span className="public-directory-hero__eyebrow text-primary">Phản hồi người bệnh</span>
            <h2>Đánh giá từ bệnh nhân</h2>
            <p className="text-secondary mb-0">Những phản hồi đã được Smart Clinic kiểm duyệt.</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="public-page-empty">
            <div className="spinner-border text-primary" role="status" />
            Đang tải đánh giá...
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="public-page-empty">
            <span className="text-danger">{error}</span>
            <button className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && reviews.length === 0 && (
          <div className="public-page-empty">Chưa có đánh giá được duyệt để hiển thị.</div>
        )}

        {/* Review cards (3 cột) + fade animation */}
        {!isLoading && !error && reviews.length > 0 && (
          <div className="home-review-grid hd-review-paged">
            {paged.map((review) => (
              <article className="home-review-card" key={review.id}>
                <ReviewStars rating={review.rating} />
                <p className="home-review-card__quote">
                  "{review.comment || 'Bệnh nhân đã đánh giá tích cực sau khi thăm khám.'}"
                </p>
                <div className="home-review-card__doctor">
                  <strong>BS. {review.doctor.name}</strong>
                  <span>
                    {review.doctor.specialty || 'Smart Clinic'} · {dinhDangNgay(review.createdAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Navigation: ◀ dots ▶ — chỉ hiện khi có > 1 trang */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="hd-review-nav">
            <div className="hd-page-nav">
              {/* Nút trái */}
              <button
                className={`hd-slider-btn${page === 0 ? ' hd-slider-btn--disabled' : ''}`}
                onClick={goPrev}
                disabled={page === 0}
                aria-label="Trang trước"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              {/* Dots chỉ trang */}
              <div style={{ display: 'flex', gap: 8 }}>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`hd-page-dot${i === page ? ' hd-page-dot--active' : ''}`}
                    onClick={() => setPage(i)}
                    aria-label={`Trang ${i + 1}`}
                  />
                ))}
              </div>

              {/* Nút phải */}
              <button
                className={`hd-slider-btn${page >= totalPages - 1 ? ' hd-slider-btn--disabled' : ''}`}
                onClick={goNext}
                disabled={page >= totalPages - 1}
                aria-label="Trang sau"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
