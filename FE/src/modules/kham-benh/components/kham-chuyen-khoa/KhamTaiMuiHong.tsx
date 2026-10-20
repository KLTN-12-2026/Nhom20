import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamTaiMuiHong(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Tai Mũi Họng" fields={[
    { key: 'viTriTrieuChung', label: 'Vị trí triệu chứng', placeholder: 'Tai trái/phải, mũi, họng...' },
    { key: 'ketQuaNoiSoi', label: 'Kết quả nội soi', placeholder: 'Ghi nhận kết quả nội soi...' },
    { key: 'mucDoNghe', label: 'Mức độ nghe', placeholder: 'Bình thường, giảm nghe...' },
    { key: 'tinhTrangXoangMui', label: 'Tình trạng xoang mũi', placeholder: 'Ghi nhận khi cần...' },
  ]} />;
}
