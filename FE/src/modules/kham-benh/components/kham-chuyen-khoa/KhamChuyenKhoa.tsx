import { KhamCoXuongKhop } from './KhamCoXuongKhop';
import { KhamDaLieu } from './KhamDaLieu';
import { KhamMat } from './KhamMat';
import { KhamNhiKhoa } from './KhamNhiKhoa';
import { KhamNoiTongQuat } from './KhamNoiTongQuat';
import { KhamSanPhuKhoa } from './KhamSanPhuKhoa';
import { KhamTaiMuiHong } from './KhamTaiMuiHong';
import { KhamTimMach } from './KhamTimMach';
import type { KhamChuyenKhoaTruongProps } from './KhamChuyenKhoaTruong';

interface KhamChuyenKhoaProps extends Omit<KhamChuyenKhoaTruongProps, 'title' | 'fields'> {
  maChuyenKhoa?: string | null;
}

// Chỉ render form của chuyên khoa thật đang phụ trách lượt khám.
export function KhamChuyenKhoa({ maChuyenKhoa, ...props }: KhamChuyenKhoaProps) {
  switch (maChuyenKhoa) {
    case '101': case 'NOI_TONG_QUAT': return <KhamNoiTongQuat {...props} />;
    case '102': case 'NHI_KHOA': return <KhamNhiKhoa {...props} />;
    case '103': case 'DA_LIEU': return <KhamDaLieu {...props} />;
    case '104': case 'TIM_MACH': return <KhamTimMach {...props} />;
    case '105': case 'TAI_MUI_HONG': return <KhamTaiMuiHong {...props} />;
    case '106': case 'SAN_PHU_KHOA': return <KhamSanPhuKhoa {...props} />;
    case '107': case 'MAT': return <KhamMat {...props} />;
    case '108': case 'CO_XUONG_KHOP': return <KhamCoXuongKhop {...props} />;
    default: return null;
  }
}
