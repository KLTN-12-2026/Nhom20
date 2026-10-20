import { Link } from 'react-router-dom';
import ServiceCards from './ServiceCards';
import './services.css';

export default function HomeServicesSection() { return <section className="service-public-section"><div className="container"><div className="d-flex flex-wrap justify-content-between align-items-end gap-3 service-public-heading mw-100"><div><span className="text-primary fw-bold text-uppercase small">Dịch vụ nổi bật</span><h2 className="mt-2 mb-1">Chọn dịch vụ phù hợp</h2><p className="text-secondary mb-0">Mức phí và chuyên khoa được đồng bộ từ hệ thống quản lý.</p></div><Link to="/dich-vu" className="btn btn-outline-primary">Xem tất cả dịch vụ</Link></div><ServiceCards limit={4} /></div></section>; }
