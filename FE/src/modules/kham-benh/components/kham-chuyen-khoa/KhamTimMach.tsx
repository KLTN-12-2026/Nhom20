import { KhamChuyenKhoaTruong, type KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

export function KhamTimMach(props: Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'>) {
  return <KhamChuyenKhoaTruong {...props} title="Khám Tim mạch" fields={[
    { key: 'spO2', label: 'SpO₂ (%)', placeholder: '98', type: 'number', min: 0, max: 100 },
    { key: 'dacDiemDauNguc', label: 'Đặc điểm đau ngực', placeholder: 'Vị trí, thời gian, mức độ...' },
    { key: 'ketQuaDienTim', label: 'Kết quả điện tim', placeholder: 'Nhịp xoang, bất thường...' },
    { key: 'tienSuTimMach', label: 'Tiền sử tim mạch', placeholder: 'Bệnh tim mạch đã ghi nhận...' },
  ]} />;
}
