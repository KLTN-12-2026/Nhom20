import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamDaLieu(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Da liễu" fields={[
    { key: 'viTriTonThuong', label: 'Vị trí tổn thương', placeholder: 'Mặt, tay, thân mình...' },
    { key: 'dacDiemTonThuong', label: 'Đặc điểm tổn thương', placeholder: 'Màu sắc, kích thước, dạng tổn thương...' },
    { key: 'mucDoNgua', label: 'Mức độ ngứa (0–10)', placeholder: '0–10', type: 'number', min: 0, max: 10 },
    { key: 'thoiGianXuatHien', label: 'Thời gian xuất hiện', placeholder: 'Ví dụ: 3 ngày...' },
  ]} />;
}
