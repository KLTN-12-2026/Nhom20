import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamCoXuongKhop(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Cơ Xương Khớp" fields={[
    { key: 'viTriDau', label: 'Vị trí đau', placeholder: 'Khớp gối, cột sống...' },
    { key: 'mucDoDau', label: 'Mức độ đau (0–10)', placeholder: '0–10', type: 'number', min: 0, max: 10 },
    { key: 'khaNangVanDong', label: 'Khả năng vận động', placeholder: 'Gấp, duỗi, hạn chế vận động...' },
    { key: 'tienSuChanThuong', label: 'Tiền sử chấn thương', placeholder: 'Nếu có...' },
  ]} />;
}
