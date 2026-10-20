import { Link } from 'react-router-dom';
import { useServices } from '../hooks/use-services';
import { getServiceIcon } from '@/utils/icon-mapper';
import './services.css';

function currency(value: number) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value); }

export default function ServiceCards({ limit }: { limit?: number }) {
  const { services, isLoading, error, reload } = useServices('DANG_HOAT_DONG');
  const items = limit ? services.slice(0, limit) : services;
  if (isLoading) return <div className="service-public-state"><div className="spinner-border text-primary" /><span>Đang tải dịch vụ...</span></div>;
  if (error) return <div className="service-public-state"><span className="text-danger">{error}</span><button className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button></div>;
  if (!items.length) return <div className="service-public-state">Chưa có dịch vụ đang hoạt động.</div>;
  return <div className="service-public-grid">{items.map((item) => <article className="service-public-card" key={item.id}><span className="material-symbols-outlined service-public-card__icon">{getServiceIcon(item.name)}</span><small>{item.specialty?.name ?? 'Dịch vụ phòng khám'}</small><h3>{item.name}</h3><p>{item.description || 'Thông tin dịch vụ đang được cập nhật.'}</p><div className="service-public-card__meta"><strong>{currency(item.price)}</strong><span>{item.estimatedMinutes ? `Khoảng ${item.estimatedMinutes} phút` : 'Theo tình trạng khám'}</span></div><Link className="btn btn-outline-primary w-100" to={`/dat-lich${item.specialty ? `?chuyenKhoaId=${item.specialty.id}` : ''}`}>Đặt lịch dịch vụ</Link></article>)}</div>;
}
