import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export default function HomeCardSlider({ children, itemWidth = 270 }: { children: ReactNode[]; itemWidth?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateNavigation = () => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 2);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateNavigation();
    const observer = new ResizeObserver(updateNavigation);
    observer.observe(track);

    // Wheel: cuộn ngang trực tiếp — không animate để tránh lag trên trackpad/chuột.
    // Chỉ intercept khi slider còn nội dung để cuộn; hai đầu cuộn trang bình thường.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const delta = rawDelta * (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? track.clientWidth : 1);
      const canScrollFwd = delta > 0 && track.scrollLeft + track.clientWidth < track.scrollWidth - 2;
      const canScrollBwd = delta < 0 && track.scrollLeft > 2;
      if (!canScrollFwd && !canScrollBwd) return;
      event.preventDefault();
      track.scrollLeft += delta;
    };

    track.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      track.removeEventListener('wheel', onWheel);
    };
  }, [children.length, itemWidth]);

  // Nút bấm: dùng scrollTo native (GPU-accelerated, smooth nhất có thể).
  const scroll = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.min((itemWidth + 20) * 2, track.clientWidth);
    track.scrollTo({ left: track.scrollLeft + direction * amount, behavior: 'smooth' });
  };

  return (
    <div className="hd-slider-wrap">
      <button
        type="button"
        className={`hd-slider-btn hd-slider-btn--prev${canPrev ? '' : ' hd-slider-btn--disabled'}`}
        disabled={!canPrev}
        aria-label="Cuộn sang trái"
        aria-controls={trackId}
        onClick={() => scroll(-1)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
      </button>
      <div
        id={trackId}
        className="hd-slider-track"
        ref={trackRef}
        onScroll={updateNavigation}
        tabIndex={0}
        aria-label="Danh sách cuộn ngang"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          scroll(event.key === 'ArrowRight' ? 1 : -1);
        }}
      >
        {children.map((child, index) => (
          <div key={index} className="hd-slider-item" style={{ width: itemWidth, maxWidth: '100%' }}>
            {child}
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`hd-slider-btn hd-slider-btn--next${canNext ? '' : ' hd-slider-btn--disabled'}`}
        disabled={!canNext}
        aria-label="Cuộn sang phải"
        aria-controls={trackId}
        onClick={() => scroll(1)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
      </button>
    </div>
  );
}
