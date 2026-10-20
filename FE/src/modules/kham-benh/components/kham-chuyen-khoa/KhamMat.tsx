import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamMat(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Mắt" fields={[
    { key: 'thiLucMatTrai', label: 'Thị lực mắt trái', placeholder: 'Ví dụ: 8/10' },
    { key: 'thiLucMatPhai', label: 'Thị lực mắt phải', placeholder: 'Ví dụ: 10/10' },
    { key: 'nhanAp', label: 'Nhãn áp', placeholder: 'mmHg' },
    { key: 'khamDayMat', label: 'Khám đáy mắt', placeholder: 'Ghi nhận khi cần...' },
  ]} />;
}
