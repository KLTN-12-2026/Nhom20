import './notification-bell.css';

const states = ['Mặc định', 'Hover', 'Focus', 'Đã mở', 'Đang tải', 'Lỗi', 'Thành công', 'Vô hiệu hóa'] as const;

// Bản xem nhanh các trạng thái chính của nút thông báo, không được gắn vào router sản phẩm.
export default function NotificationBellPreview() {
  return (
    <section className="notification-bell-preview" aria-label="Bản xem trước trạng thái thông báo">
      {states.map((state) => {
        const stateKey = state === 'Vô hiệu hóa' ? 'disabled' : state === 'Thành công' ? 'success' : state === 'Lỗi' ? 'error' : 'default';
        return (
          <div className="notification-bell-preview__state" data-state={stateKey} key={state}>
            <button className="notification-bell__btn" type="button" aria-label={`Thông báo: ${state}`}>
              <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
              {state !== 'Vô hiệu hóa' && <span className="notification-bell__badge">3</span>}
            </button>
            <span>{state}</span>
          </div>
        );
      })}
    </section>
  );
}
