import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { dispensingApi } from '../../api/dispensing.api';
import PharmacyPageHeader from '../../components/PharmacyPageHeader';
import type { DispensingPrescription } from '../../types/dispensing.types';
import '../../pharmacist-workspace.css';

export default function TrangDonThuocDangXuLy() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<DispensingPrescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProcessing = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dispensingApi.getProcessing();
      setItems(response.data.data.items);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Không thể tải đơn thuốc đang xử lý');
      setError(message);
      showToast(message, 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadProcessing(); }, [loadProcessing]);

  const rows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    if (!keyword) return items;
    return items.filter((item) => `${item.code} ${item.patient.fullName} ${item.doctor.fullName}`.toLocaleLowerCase('vi').includes(keyword));
  }, [items, search]);

  return <div className="pharmacy-page">
    <PharmacyPageHeader title="Đơn thuốc đang xử lý" description="Các đơn bạn đã tiếp nhận được giữ tại đây để có thể tiếp tục cấp thuốc sau khi tải lại trang." />
    <section className="pharmacy-panel">
      <div className="pharmacy-filter"><div className="input-group"><span className="input-group-text"><span className="material-symbols-outlined">search</span></span><input className="form-control" placeholder="Tìm mã đơn, bệnh nhân hoặc bác sĩ..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
      {isLoading ? <div className="p-5 text-center">Đang tải đơn thuốc...</div> : error ? <div className="p-5 text-center"><p className="text-danger mb-3">{error}</p><button className="btn btn-outline-primary" type="button" onClick={() => void loadProcessing()}>Thử lại</button></div> : rows.length === 0 ? <div className="p-5 text-center text-secondary"><span className="material-symbols-outlined fs-1 d-block mb-2">inventory</span>Không có đơn thuốc nào đang xử lý.</div> : <div className="table-responsive"><table className="table pharmacy-table mb-0"><thead><tr><th>Mã đơn</th><th>Bệnh nhân</th><th>Bác sĩ / Chuyên khoa</th><th>Số thuốc</th><th>Tiếp nhận lúc</th><th>Thao tác</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.code}</strong></td><td>{item.patient.fullName}<small>{item.patient.code}</small></td><td>{item.doctor.fullName}<small>{item.doctor.specialty}</small></td><td>{item.items.length}</td><td>{dinhDangNgayGio(item.createdAt)}</td><td><button className="btn btn-sm btn-primary" type="button" onClick={() => navigate(`/duoc-si/dang-xu-ly/${item.id}`)}>Tiếp tục cấp thuốc</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
