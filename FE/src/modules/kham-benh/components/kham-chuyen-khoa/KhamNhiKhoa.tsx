import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamNhiKhoa(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Nhi khoa" fields={[
    { key: 'canNang', label: 'Cân nặng (kg)', placeholder: '15', type: 'number', min: 0, max: 300, step: 0.1 },
    { key: 'chieuCao', label: 'Chiều cao (cm)', placeholder: '100', type: 'number', min: 0, max: 250, step: 0.1 },
    { key: 'tinhTrangDinhDuong', label: 'Tình trạng dinh dưỡng', placeholder: 'Bình thường, cần theo dõi...' },
    { key: 'tiemChung', label: 'Tiêm chủng', placeholder: 'Thông tin tiêm chủng cần lưu ý...' },
  ]} />;
}
