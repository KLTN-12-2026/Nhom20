import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import AppModal from '@/components/ui/AppModal';
import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
import { maHoaNoiDung, moCuaSoIn } from '@/utils/in-an';
import { dispensingApi } from '../../api/dispensing.api';
import PharmacyPageHeader from '../../components/PharmacyPageHeader';
import type {
  BatchAllocationDto,
  DispensingPrescription,
} from '../../types/dispensing.types';
import '../../pharmacist-workspace.css';

type AllocationMap = Record<number, BatchAllocationDto[]>;

export default function TrangXuLyDonThuoc() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const invalidRouteReported = useRef(false);
  const [prescription, setPrescription] =
    useState<DispensingPrescription | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [allocations, setAllocations] = useState<AllocationMap>({});
  const [notes, setNotes] = useState('');
  const [refusalReason, setRefusalReason] = useState('');
  const [isRefusalModalOpen, setIsRefusalModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      if (!invalidRouteReported.current) {
        invalidRouteReported.current = true;
        showToast('Đường dẫn đơn thuốc không hợp lệ', 'danger');
      }
      navigate('/duoc-si/dang-xu-ly', { replace: true });
      return;
    }

    void dispensingApi
      .findOne(numericId)
      .then((response) => {
        const data = response.data.data;
        setPrescription(data);
        setAllocations(
          Object.fromEntries(
            data.items.map((item) => [item.id, item.suggestedAllocations]),
          ),
        );
      })
      .catch((error) =>
        showToast(getApiErrorMessage(error, 'Không thể tải đơn thuốc'), 'danger'),
      );
  }, [id, navigate, showToast]);

  if (!prescription) {
    return <div className="p-5 text-center">Đang tải chi tiết đơn thuốc...</div>;
  }

  const allChecked = checked.length === prescription.items.length;
  const selectBatch = (itemId: number, batchId: number, quantity: number) => {
    setAllocations((current) => ({
      ...current,
      [itemId]: [{ batchId, quantity }],
    }));
  };

  const handleDispense = async () => {
    if (!allChecked || isSubmitting) return;
    const invalidItem = prescription.items.find(
      (item) =>
        allocations[item.id]?.reduce((sum, batch) => sum + batch.quantity, 0) !==
        item.quantity,
    );
    if (invalidItem) {
      showToast(
        `Vui lòng chọn lô đủ ${invalidItem.quantity} ${invalidItem.medicine.unit} cho ${invalidItem.medicine.name}.`,
        'danger',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await dispensingApi.dispense(prescription.id, {
        items: prescription.items.map((item) => ({
          prescriptionItemId: item.id,
          batches: allocations[item.id] ?? [],
        })),
        notes: notes.trim() || undefined,
      });
      showToast('Đã hoàn tất cấp thuốc và chuyển Thu ngân.', 'success');
      navigate('/duoc-si/dang-xu-ly');
    } catch (error) {
      showToast(
        getApiErrorMessage(error, 'Có lỗi khi hoàn tất cấp thuốc'),
        'danger',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefuse = async () => {
    const reason = refusalReason.trim();
    if (reason.length < 5 || isSubmitting) {
      showToast('Vui lòng nhập lý do từ chối ít nhất 5 ký tự.', 'danger');
      return;
    }

    setIsSubmitting(true);
    try {
      await dispensingApi.refuse(prescription.id, reason);
      showToast('Đã từ chối cấp thuốc và lưu lý do.', 'success');
      navigate('/duoc-si/dang-xu-ly');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể từ chối cấp thuốc'), 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // In hướng dẫn cấp thuốc từ đơn thật đang được dược sĩ xử lý.
  const handlePrintInstructions = () => {
    const medicineRows = prescription.items
      .map(
        (item) =>
          `<tr><td>${maHoaNoiDung(item.medicine.name)}</td><td class="so">${item.quantity} ${maHoaNoiDung(item.medicine.unit)}</td><td>${maHoaNoiDung(item.dosage)}${item.frequency ? ` · ${maHoaNoiDung(item.frequency)}` : ''}${item.days ? ` · ${item.days} ngày` : ''}</td><td>${maHoaNoiDung(item.instructions ?? 'Theo hướng dẫn của bác sĩ')}</td></tr>`,
      )
      .join('');

    moCuaSoIn(
      `Phiếu cấp thuốc ${prescription.code}`,
      `<header class="thuong-hieu"><h1>SMART CLINIC</h1><p>PHIẾU CẤP THUỐC</p></header><p class="meta">Mã đơn: ${maHoaNoiDung(prescription.code)} · Ngày lập: ${maHoaNoiDung(dinhDangNgay(prescription.createdAt))}</p><h2>Thông tin bệnh nhân</h2><div class="dong"><span>Họ và tên</span><strong>${maHoaNoiDung(prescription.patient.fullName)}</strong></div><div class="dong"><span>Bác sĩ kê đơn</span><strong>${maHoaNoiDung(prescription.doctor.fullName)} · ${maHoaNoiDung(prescription.doctor.specialty)}</strong></div><div class="dong"><span>Chẩn đoán</span><strong>${maHoaNoiDung(prescription.diagnosis ?? '—')}</strong></div><h2>Danh sách thuốc</h2><table><thead><tr><th>Thuốc</th><th class="so">Số lượng</th><th>Liều dùng</th><th>Hướng dẫn</th></tr></thead><tbody>${medicineRows}</tbody></table><div class="chu-ky"><div><strong>Bác sĩ kê đơn</strong><p>(Ký, ghi rõ họ tên)</p></div><div></div><div><strong>Dược sĩ cấp</strong><p>(Ký, ghi rõ họ tên)</p></div></div>`,
    );
  };

  return (
    <div className="pharmacy-page">
      <PharmacyPageHeader
        title={`Cấp thuốc · ${prescription.code}`}
        description="Dược sĩ kiểm tra thuốc, chủ động chọn lô còn hạn trước khi cấp."
        actions={
          <Link className="btn btn-outline-secondary" to="/duoc-si/dang-xu-ly">
            Quay lại
          </Link>
        }
      />

      <div className="pharmacy-detail-grid">
        <section className="pharmacy-panel">
          <div className="pharmacy-patient">
            <div>
              <small>Bệnh nhân</small>
              <h2>{prescription.patient.fullName}</h2>
              <span>
                {prescription.doctor.specialty} · {prescription.doctor.fullName}
              </span>
            </div>
          </div>

          <div className="pharmacy-medicine-list">
            {prescription.items.map((item) => {
              const selected = allocations[item.id]?.[0]?.batchId ?? 0;
              return (
                <label
                  key={item.id}
                  className={checked.includes(item.id) ? 'selected' : ''}
                >
                  <input
                    type="checkbox"
                    checked={checked.includes(item.id)}
                    onChange={() =>
                      setChecked((current) =>
                        current.includes(item.id)
                          ? current.filter((value) => value !== item.id)
                          : [...current, item.id],
                      )
                    }
                  />
                  <div>
                    <strong>{item.medicine.name}</strong>
                    <span>
                      {item.dosage}
                      {item.instructions ? ` · ${item.instructions}` : ''}
                    </span>
                    <select
                      className="form-select mt-2"
                      value={selected}
                      onChange={(event) =>
                        selectBatch(item.id, Number(event.target.value), item.quantity)
                      }
                    >
                      <option value={0}>Chọn lô cấp thuốc</option>
                      {item.availableBatches.map((batch) => (
                        <option
                          key={batch.batchId}
                          value={batch.batchId}
                          disabled={batch.remainingStock < item.quantity}
                        >
                          {batch.batchCode} · còn {batch.remainingStock} · HSD{' '}
                          {dinhDangNgay(batch.expiryDate)}
                        </option>
                      ))}
                    </select>
                    {!item.isStockSufficient && (
                      <small className="text-danger">
                        Tồn kho hiện không đủ để cấp thuốc này.
                      </small>
                    )}
                  </div>
                  <b>
                    x{item.quantity} {item.medicine.unit}
                  </b>
                </label>
              );
            })}
          </div>
        </section>

        <aside className="pharmacy-panel pharmacy-summary">
          <h2>Kiểm tra cấp thuốc</h2>
          <div>
            <span>Số loại thuốc</span>
            <strong>{prescription.items.length}</strong>
          </div>
          <div>
            <span>Đã kiểm tra</span>
            <strong>
              {checked.length}/{prescription.items.length}
            </strong>
          </div>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Ghi chú cho thu ngân hoặc bệnh nhân..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-primary w-100 mb-2"
            onClick={handlePrintInstructions}
          >
            In hướng dẫn thuốc
          </button>
          <button
            type="button"
            className="btn btn-outline-danger w-100 mb-2"
            disabled={isSubmitting}
            onClick={() => setIsRefusalModalOpen(true)}
          >
            Từ chối cấp thuốc
          </button>
          <button
            type="button"
            className="btn btn-primary w-100"
            disabled={!allChecked || isSubmitting}
            onClick={() => void handleDispense()}
          >
            {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất & chuyển Thu ngân'}
          </button>
        </aside>
      </div>

      {isRefusalModalOpen && (
        <AppModal
          title="Từ chối cấp thuốc"
          onClose={() => setIsRefusalModalOpen(false)}
          footer={
            <>
              <button
                className="btn btn-outline-secondary"
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsRefusalModalOpen(false)}
              >
                Hủy
              </button>
              <button
                className="btn btn-danger"
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleRefuse()}
              >
                {isSubmitting ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </button>
            </>
          }
        >
          <p className="mb-3 text-secondary">
            Lý do này sẽ hiển thị trong hồ sơ bệnh nhân để bác sĩ và Trưởng khoa theo dõi.
          </p>
          <label className="form-label fw-semibold" htmlFor="refusal-reason">
            Lý do từ chối <span className="text-danger">*</span>
          </label>
          <textarea
            id="refusal-reason"
            className="form-control"
            rows={4}
            maxLength={500}
            value={refusalReason}
            onChange={(event) => setRefusalReason(event.target.value)}
            placeholder="Ví dụ: Thuốc kê đơn hiện tạm hết hàng."
          />
        </AppModal>
      )}
    </div>
  );
}
