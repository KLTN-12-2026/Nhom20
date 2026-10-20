import ServiceCards from '../components/ServiceCards';
import '../components/services.css';
import '@/modules/trang-chu/public-pages.css';

export default function TrangDichVu() { return <div className="public-directory-page"><section className="public-directory-hero"><div className="container public-directory-hero__content"><span className="public-directory-hero__eyebrow">Dịch vụ đang cung cấp</span><h1>Dịch vụ khám rõ ràng, chi phí minh bạch</h1><p>Danh sách chỉ gồm những dịch vụ phòng khám hiện có chuyên khoa và bác sĩ tiếp nhận.</p></div></section><div className="container public-directory-content"><div className="service-public-panel"><div className="service-public-heading"><span className="text-primary fw-bold text-uppercase small">Danh mục dịch vụ</span><h2 className="mt-2">Lựa chọn dịch vụ phù hợp</h2><p className="text-secondary mb-0">Mức giá hiển thị được đồng bộ từ hệ thống quản lý.</p></div><ServiceCards /></div></div></div>; }
