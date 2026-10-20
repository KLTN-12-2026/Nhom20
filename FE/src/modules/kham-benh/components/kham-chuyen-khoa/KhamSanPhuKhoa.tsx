import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamSanPhuKhoa(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Sản Phụ khoa" fields={[
    { key: 'ngayDauKyKinhCuoi', label: 'Ngày đầu kỳ kinh cuối', placeholder: 'dd/mm/yyyy' },
    { key: 'tuanThai', label: 'Tuần thai (nếu có)', placeholder: 'Ví dụ: 20', type: 'number', min: 0, max: 50 },
    { key: 'tienSuSanKhoa', label: 'Tiền sử sản khoa', placeholder: 'Số lần mang thai, sinh con...' },
    { key: 'soLanMangThai', label: 'Số lần mang thai', placeholder: 'Ví dụ: 1', type: 'number', min: 0, max: 30 },
  ]} />;
}
