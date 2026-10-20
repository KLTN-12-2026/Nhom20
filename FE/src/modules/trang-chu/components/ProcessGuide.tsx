

const STEPS = [
  {
    number: 1,
    title: 'Chọn chuyên khoa',
    desc: 'Chọn chuyên khoa phù hợp',
    isLast: false,
  },
  {
    number: 2,
    title: 'Chọn ngày & giờ',
    desc: 'Chọn thời gian mong muốn',
    isLast: false,
  },
  {
    number: 3,
    title: 'Nhận xác nhận',
    desc: 'Phòng khám phân công bác sĩ',
    isLast: false,
  },
  {
    number: 4,
    title: 'Theo dõi hàng chờ',
    desc: 'Đến khám đúng giờ',
    isLast: true,
  },
];

export default function ProcessGuide() {
  return (
    <section style={{ backgroundColor: '#F8FAFC', padding: '64px 0' }}>
      <div className="container" style={{ maxWidth: 1140 }}>
        {/* Phần tiêu đề */}
        <div className="text-center" style={{ marginBottom: 40 }}>
          <h2 className="text-headline-md fw-bold text-on-surface mb-2">
            Quy trình đơn giản, tiết kiệm thời gian
          </h2>
          <p
            className="text-body-md text-on-surface-variant mx-auto mb-0"
            style={{ maxWidth: 640 }}
          >
            Trải nghiệm khám chữa bệnh liền mạch từ lúc đặt lịch đến khi nhận kết quả.
          </p>
        </div>

        {/* Timeline */}
        <div className="row g-4 position-relative">
          {/* Connector line (Desktop only) */}
          <div
            className="d-none d-md-block position-absolute"
            style={{
              top: 20, /* Center of the 40px circle */
              left: '12.5%',
              width: '75%',
              height: 1,
              backgroundColor: 'var(--sc-outline-variant)',
              zIndex: 0,
            }}
          />

          {STEPS.map((step) => (
            <div
              className="col-12 col-md-3 position-relative text-center d-flex flex-row flex-md-column align-items-center"
              key={step.number}
            >
              {/* Vòng tròn đánh số */}
              <div
                className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 position-relative"
                style={{
                  width: 40,
                  height: 40,
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: step.isLast ? 'var(--sc-primary)' : '#ffffff',
                  color: step.isLast ? '#ffffff' : 'var(--sc-primary)',
                  border: step.isLast
                    ? '1px solid var(--sc-primary)'
                    : '1px solid var(--sc-outline-variant)',
                  zIndex: 1,
                }}
              >
                {step.number}
              </div>

              {/* Mũi tên kết nối (Desktop only) */}
              {!step.isLast && (
                <div
                  className="d-none d-md-flex align-items-center justify-content-center position-absolute"
                  style={{
                    top: 8,
                    right: '-12px',
                    width: 24,
                    height: 24,
                    backgroundColor: '#F8FAFC',
                    color: 'var(--sc-outline)',
                    zIndex: 2,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    chevron_right
                  </span>
                </div>
              )}

              {/* Mũi tên dọc (Mobile only) */}
              {!step.isLast && (
                <div
                  className="d-flex d-md-none align-items-center justify-content-center ms-3"
                  style={{ color: 'var(--sc-outline-variant)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    arrow_downward
                  </span>
                </div>
              )}

              {/* Nội dung */}
              <div className="text-start text-md-center mt-0 mt-md-3 ms-3 ms-md-0 flex-grow-1">
                <h3 className="text-label-md fw-bold text-on-surface mb-1">
                  {step.title}
                </h3>
                <p 
                  className="text-body-sm text-on-surface-variant mb-0 mx-auto"
                  style={{ maxWidth: 200, lineHeight: 1.5 }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
