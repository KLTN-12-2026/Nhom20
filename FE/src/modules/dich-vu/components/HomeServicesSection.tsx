import { Link } from 'react-router-dom';
import ServiceCards from './ServiceCards';
import '@/modules/trang-chu/public-pages.css';

export default function HomeServicesSection() {
  return (
    <section className="home-directory-section">
      <div className="container">
        <div className="home-section-heading">
          <div>
            <span className="public-directory-hero__eyebrow text-primary">Dịch vụ nổi bật</span>
            <h2>Chọn dịch vụ phù hợp</h2>
            <p className="text-secondary mb-0">Mức phí và chuyên khoa được đồng bộ từ hệ thống quản lý.</p>
          </div>
          <Link to="/dich-vu" className="btn btn-outline-primary">Xem tất cả dịch vụ</Link>
        </div>
        <ServiceCards />
      </div>
    </section>
  );
}
