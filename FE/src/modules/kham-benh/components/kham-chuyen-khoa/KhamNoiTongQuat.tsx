import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamNoiTongQuat(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Nội tổng quát" fields={[
    { key: 'tinhTrangChung', label: 'Tình trạng chung', placeholder: 'Ghi nhận tình trạng toàn thân...' },
    { key: 'trieuChungChinh', label: 'Triệu chứng chính', placeholder: 'Triệu chứng nổi bật...' },
    { key: 'viTriDau', label: 'Vị trí đau (nếu có)', placeholder: 'Đầu, ngực, bụng...' },
    { key: 'mucDoDau', label: 'Mức độ đau (0–10)', placeholder: '0–10', type: 'number', min: 0, max: 10 },
  ]} />;
}
