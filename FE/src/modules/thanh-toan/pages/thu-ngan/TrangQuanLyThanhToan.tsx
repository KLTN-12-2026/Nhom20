import { Fragment, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import ReceptionistPageHeader from '@/modules/tiep-don/components/ReceptionistPageHeader';
import ReceptionistStatCard from '@/modules/tiep-don/components/ReceptionistStatCard';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { useAppToast } from '@/components/ui/use-app-toast';
import confetti from 'canvas-confetti';
import { paymentApi } from '../../api/payment.api';
import { dinhDangNgay, dinhDangNgayGio, giaTriInputNgay } from '@/utils/dinh-dang-ngay';
import { inBillRawBT58mm, inBillSunmi58mm, khoiDongMayInSunmi, maHoaNoiDung, moCuaSoInBill58mm } from '@/utils/in-an';
import '@/modules/tiep-don/receptionist-workspace.css';

type PaymentMethod = 'TIEN_MAT' | 'CHUYEN_KHOAN';
type InvoiceStatus = 'Chưa thanh toán' | 'Thanh toán một phần' | 'Đã thanh toán' | 'Đã hủy';

interface Invoice {
  id: number;
  code: string; patient: string; phone: string; createdAt: string;
  createdDateKey: string;
  total: number; paid: number; status: InvoiceStatus;
  items: { id: string | number; kind: string; name: string; quantity: number; unitPrice: number }[];
  payments: { time: string; amount: number; method: string; collector: string; reference?: string }[];
}

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;

const formatNumberWithDots = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(numStr));
};

const INVOICES_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
}

const dateKey = (value: Date) => giaTriInputNgay(value);
const displayDate = (key: string) => dinhDangNgay(key, '');

function formatDateText(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join('/');
}

function toIsoDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';
  const [, day, month, year] = match;
  const dateValue = new Date(`${year}-${month}-${day}T00:00:00`);
  if (
    dateValue.getFullYear() !== Number(year) ||
    dateValue.getMonth() + 1 !== Number(month) ||
    dateValue.getDate() !== Number(day)
  ) {
    return '';
  }
  return `${year}-${month}-${day}`;
}

export default function TrangQuanLyThanhToan() {
  const { showToast } = useAppToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [dateInput, setDateInput] = useState(() => displayDate(dateKey(new Date())));
  const datePickerRef = useRef<HTMLInputElement>(null);
  const todayKey = useMemo(() => dateKey(new Date()), []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await paymentApi.getInvoices();
      const mapped: Invoice[] = res.data.map((h: unknown) => {
        const hData = h as Record<string, unknown>;
        const thanhToan = (hData.thanhToan as Record<string, unknown>[]) || [];
        const benhNhan = (hData.benhNhan as Record<string, unknown>) || {};
        const chiTiet = (hData.chiTiet as Record<string, unknown>[]) || [];

        const paid = thanhToan.filter((t) => t.trangThai === 'THANH_CONG').reduce((sum: number, t) => sum + Number(t.soTien), 0);
        const total = Number(hData.tongTien);
        const status = hData.trangThai === 'DA_THANH_TOAN' ? 'Đã thanh toán' : paid > 0 ? 'Thanh toán một phần' : 'Chưa thanh toán';

        // Luôn hiển thị snapshot chi tiết hóa đơn đã chốt khi cấp thuốc.
        // Không lấy lại đơn thuốc để tránh lệch hóa đơn cũ khi bác sĩ chỉnh đơn mới.
        const items = chiTiet.map((item) => ({
          id: String(item.id),
          kind: String(item.loaiMuc),
          name: String(item.tenMuc),
          quantity: Number(item.soLuong),
          unitPrice: Number(item.donGia),
        }));

        return {
          id: Number(hData.id),
          code: String(hData.maHoaDon),
          patient: String(benhNhan.hoTen || 'Khách vãng lai'),
          phone: String(benhNhan.soDienThoai || ''),
          createdAt: dinhDangNgayGio(String(hData.createdAt)),
          createdDateKey: dateKey(new Date(String(hData.createdAt))),
          total,
          paid,
          status: status as InvoiceStatus,
          items,
          payments: thanhToan.map((t) => ({
            time: dinhDangNgayGio(String(t.thoiGianThanhToan)),
            amount: Number(t.soTien),
            method: t.phuongThuc === 'TIEN_MAT' ? 'Tiền mặt' : 'Chuyển khoản',
            collector: 'Hệ thống',
            reference: String(t.maGiaoDich || '')
          }))
        };
      });
      setInvoices(mapped);
    } catch (e) {
      console.error(e);
      showToast('Không thể tải danh sách hóa đơn', 'danger');
    }
  }, [showToast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    void khoiDongMayInSunmi().catch((error) => {
      // Không chặn nghiệp vụ thu ngân trên trình duyệt không có Sunmi Printer Service.
      console.info('Sunmi Printer Service chưa sẵn sàng:', error);
    });
  }, []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('TIEN_MAT');
  const [amount, setAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');

  useRealtimeEvent<{ maHoaDon: string, soTien: number, maGiaoDich: string }>('payment.success', useCallback((payload) => {
    fetchInvoices();
    showToast(`Nhận thành công ${money(payload.soTien)} cho hóa đơn ${payload.maHoaDon}`, 'success');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    // Tự đóng modal khi hóa đơn đang mở đã thanh toán đủ.
    setSelectedCode((currentCode) => {
      if (currentCode === payload.maHoaDon) {
        // Giữ modal mở để người dùng xem trạng thái thanh toán thành công.
        return currentCode;
      }
      return currentCode;
    });
  }, [showToast, fetchInvoices]));

  useRealtimeEvent<{ code: string; patient: { fullName: string } }>('prescription.dispensed', useCallback((payload) => {
    void fetchInvoices();
    showToast(`Đã nhận hóa đơn chờ thanh toán của ${payload.patient.fullName}`);
  }, [fetchInvoices, showToast]));

  const targetInvoices = useMemo(() => {
    if (!selectedDate) return invoices;
    return invoices.filter((invoice) => invoice.createdDateKey === selectedDate);
  }, [invoices, selectedDate]);

  const filtered = useMemo(() => targetInvoices.filter((invoice) => {
    const matchesSearch = `${invoice.code} ${invoice.patient} ${invoice.phone}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === 'Tất cả' || invoice.status === filter);
  }).sort((a, b) => (a.paid < a.total ? 0 : 1) - (b.paid < b.total ? 0 : 1)), [filter, targetInvoices, search]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, selectedDate]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / INVOICES_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    filtered.length === 0 ? 0 : (currentPage - 1) * INVOICES_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * INVOICES_PER_PAGE,
    filtered.length,
  );
  const visibleInvoices = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * INVOICES_PER_PAGE,
        currentPage * INVOICES_PER_PAGE,
      ),
    [currentPage, filtered],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const selected = invoices.find((invoice) => invoice.code === selectedCode);
  const remaining = selected ? selected.total - selected.paid : 0;
  const paymentAmount = Number(amount || 0);
  // Không sinh QR khi chưa có tài khoản thụ hưởng thật để tránh khách quét nhầm mã.
  const sepayAccount = import.meta.env.VITE_SEPAY_ACCOUNT?.trim();
  const sepayBank = import.meta.env.VITE_SEPAY_BANK?.trim();
  const sepayHolder = import.meta.env.VITE_SEPAY_HOLDER?.trim();
  const sepayStore = import.meta.env.VITE_SEPAY_STORE?.trim();
  const qrSePayUrl = selected && paymentAmount > 0 && sepayAccount && sepayBank
    ? `https://vietqr.app/img?${new URLSearchParams({
      bank: sepayBank,
      acc: sepayAccount,
      template: 'compact',
      showinfo: 'true',
      ...(sepayHolder ? { holder: sepayHolder } : {}),
      ...(sepayStore ? { store: sepayStore } : {}),
      amount: String(Math.trunc(paymentAmount)),
      des: selected.code,
    }).toString()}`
    : null;
  const change = method === 'TIEN_MAT' ? Math.max(0, Number(cashReceived || 0) - paymentAmount) : 0;
  const revenue = targetInvoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  const receivable = targetInvoices.reduce((sum, item) => sum + item.total - item.paid, 0);
  const paidCount = targetInvoices.filter((item) => item.status === 'Đã thanh toán').length;

  const openInvoice = (invoice: Invoice) => {
    setSelectedCode(invoice.code); setMethod('TIEN_MAT'); setAmount(String(invoice.total - invoice.paid)); setCashReceived('');
  };



  // In hóa đơn nhiệt khổ 58mm chuyên dụng cho máy in POS cầm tay Sunmi V2.
  const inHoaDon58mm = async (invoiceToPrint?: Invoice) => {
    const inv = invoiceToPrint || selected;
    if (!inv) return;
    const remainingAmount = inv.total - inv.paid;
    const giaoDichGanNhat = inv.payments[inv.payments.length - 1];
    const phuongThucGanNhat = giaoDichGanNhat
      ? giaoDichGanNhat.method === 'TIEN_MAT'
        ? 'Tiền mặt'
        : 'Chuyển khoản'
      : (inv.paid > 0 ? 'Đã thu' : 'Chưa có giao dịch');

    const billIn = {
      code: inv.code,
      createdAt: inv.createdAt,
      patient: inv.patient,
      phone: inv.phone,
      status: inv.status,
      items: inv.items,
      total: inv.total,
      paid: inv.paid,
      remaining: remainingAmount,
      paymentMethod: phuongThucGanNhat,
    };

    if (inBillRawBT58mm(billIn)) {
      showToast('Dang mo RawBT de in bill', 'success');
      return;
    }

    try {
      const daInTrucTiep = await inBillSunmi58mm(billIn);

      if (daInTrucTiep) {
        showToast('Da gui bill toi may in Sunmi', 'success');
        return;
      }
    } catch (error) {
      console.error('Loi in truc tiep Sunmi:', error);
      const message = error instanceof Error ? error.message : 'Khong the ket noi may in Sunmi.';
      showToast(message, 'danger');
      return;
    }

    const itemsHtml = inv.items.map((item, idx) => `
      <div class="bill-item">
        <div class="bill-item__name">${idx + 1}. ${maHoaNoiDung(item.name)}</div>
        <div class="bill-item__detail">
          <span>${item.quantity} x ${new Intl.NumberFormat('vi-VN').format(item.unitPrice)}</span>
          <span class="bill-bold">${money(item.quantity * item.unitPrice)}</span>
        </div>
      </div>
    `).join('');

    moCuaSoInBill58mm(`Phiếu thanh toán ${inv.code}`, `
      <div class="bill-header">
        <h1>SMART CLINIC</h1>
        <p>Hệ thống Y tế & Khám chữa bệnh</p>
        <p>Hotline: 1900 8888</p>
      </div>
      <div class="bill-divider"></div>
      <div class="bill-title">PHIẾU THANH TOÁN</div>
      <div class="bill-center"><small style="font-size:10px">${inv.createdAt}</small></div>
      <div class="bill-divider"></div>
      <div class="bill-row"><span>Mã HĐ:</span><span class="bill-bold">${maHoaNoiDung(inv.code)}</span></div>
      <div class="bill-row"><span>Bệnh nhân:</span><span class="bill-bold">${maHoaNoiDung(inv.patient)}</span></div>
      ${inv.phone ? `<div class="bill-row"><span>SĐT:</span><span>${maHoaNoiDung(inv.phone)}</span></div>` : ''}
      <div class="bill-row"><span>Trạng thái:</span><span class="bill-bold">${maHoaNoiDung(inv.status)}</span></div>
      <div class="bill-divider"></div>
      <div style="font-weight:700;margin-bottom:4px;font-size:10.5px">CHI TIẾT KHOẢN THU:</div>
      ${itemsHtml || '<div class="bill-center" style="font-size:10px;margin:4px 0">Không có chi tiết</div>'}
      <div class="bill-totals">
        <div class="bill-row"><span>Tổng hóa đơn:</span><span class="bill-bold">${money(inv.total)}</span></div>
        <div class="bill-row"><span>Đã thanh toán:</span><span class="bill-bold">${money(inv.paid)}</span></div>
        ${remainingAmount > 0 ? `<div class="bill-row bill-grand"><span>Còn phải thu:</span><span class="bill-bold">${money(remainingAmount)}</span></div>` : ''}
        <div class="bill-row"><span>Phương thức:</span><span>${phuongThucGanNhat}</span></div>
      </div>
      <div class="bill-divider"></div>
      <div class="bill-footer">
        <p style="margin:2px 0;font-weight:600">Cảm ơn Quý khách!</p>
        <p style="margin:2px 0">Chúc Quý khách mau bình phục!</p>
        <p style="margin:4px 0 0;font-size:9px">Smart Clinic POS 58mm</p>
      </div>
      <div style="height:12mm"></div>
    `);
  };

  const recordPayment = async () => {
    if (!selected) {
      showToast('Không tìm thấy hóa đơn', 'danger');
      return;
    }
    if (paymentAmount <= 0) {
      showToast('Số tiền thanh toán phải lớn hơn 0', 'danger');
      return;
    }
    if (paymentAmount > remaining) {
      showToast('Số tiền thanh toán không được vượt quá số tiền còn lại', 'danger');
      return;
    }
    if (method === 'TIEN_MAT' && Number(cashReceived) < paymentAmount) {
      showToast('Tiền khách đưa không được nhỏ hơn số tiền thanh toán', 'danger');
      return;
    }
    
    try {
      if (method === 'CHUYEN_KHOAN') {
        await paymentApi.collectTransfer(selected.id, paymentAmount, `BRUNO-${Date.now()}`);
      } else {
        await paymentApi.collectCash(selected.id, paymentAmount);
      }
      showToast('Thu tiền thành công', 'success');
      await fetchInvoices();
      setSelectedCode(null);
    } catch (e: unknown) {
      console.error('Lỗi khi thu tiền:', e);
      const err = e as { response?: { data?: { message?: string } }, message?: string };
      showToast(err.response?.data?.message || err.message || 'Có lỗi xảy ra', 'danger');
    }
  };

  return <div className="reception-page">
    <ReceptionistPageHeader eyebrow="Tài chính trong ca" title="Quản lý thanh toán" description="Thu tiền, theo dõi công nợ và lịch sử thanh toán của từng hóa đơn." />
    <div className="reception-stats">
      <ReceptionistStatCard icon="account_balance_wallet" label={selectedDate ? `Doanh thu ${displayDate(selectedDate)}` : 'Tổng doanh thu'} value={money(revenue)} tone="green" />
      <ReceptionistStatCard icon="pending_actions" label="Còn phải thu" value={money(receivable)} tone="amber" />
      <ReceptionistStatCard icon="receipt_long" label="Tổng hóa đơn" value={targetInvoices.length} />
      <ReceptionistStatCard icon="price_check" label="Đã thanh toán" value={paidCount} tone="green" />
    </div>
    <section className="reception-card overflow-hidden">
      <div className="reception-filter">
        <div className="reception-filter__search"><label className="form-label fw-semibold">Tìm hóa đơn</label><div className="app-search-field"><span className="material-symbols-outlined">search</span><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã hóa đơn, tên hoặc số điện thoại..." /></div></div>
        <div><label className="form-label fw-semibold">Trạng thái</label><select className="form-select" value={filter} onChange={(event) => setFilter(event.target.value)}><option>Tất cả</option><option>Chưa thanh toán</option><option>Thanh toán một phần</option><option>Đã thanh toán</option><option>Đã hủy</option></select></div>
        <div>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label fw-semibold mb-0">Ngày lập</label>
            <div className="reception-date-quick-chips mb-0">
              <button
                type="button"
                className={`reception-date-chip ${selectedDate === todayKey ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDate(todayKey);
                  setDateInput(displayDate(todayKey));
                }}
              >
                Hôm nay
              </button>
              <button
                type="button"
                className={`reception-date-chip ${!selectedDate ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDate('');
                  setDateInput('');
                }}
              >
                Xem tất cả
              </button>
            </div>
          </div>
          <div className="input-group">
            <input
              className="form-control"
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={dateInput}
              aria-label="Ngày lập"
              onChange={(event) => {
                const nextText = formatDateText(event.target.value);
                setDateInput(nextText);
                setSelectedDate(nextText ? toIsoDate(nextText) : '');
              }}
            />
            {selectedDate && (
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center"
                title="Xóa lọc ngày (Xem tất cả)"
                onClick={() => {
                  setSelectedDate('');
                  setDateInput('');
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary d-flex align-items-center"
              aria-label="Chọn ngày"
              title="Chọn ngày"
              onClick={() => datePickerRef.current?.showPicker?.()}
            >
              <span className="material-symbols-outlined">calendar_month</span>
            </button>
            <input
              ref={datePickerRef}
              type="date"
              className="visually-hidden"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setSelectedDate(nextDate);
                setDateInput(nextDate ? displayDate(nextDate) : '');
              }}
              aria-label="Chọn ngày lập"
            />
          </div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="reception-empty p-4 text-center">
          <span className="material-symbols-outlined fs-1 text-secondary mb-2">event_busy</span>
          <div className="fw-semibold text-secondary mb-1">
            {selectedDate
              ? `Không có hóa đơn nào trong ngày ${displayDate(selectedDate)}`
              : 'Không tìm thấy hóa đơn phù hợp'}
          </div>
          {selectedDate && (
            <div className="mt-2">
              <small className="text-muted d-block mb-2">
                Hệ thống đang lọc theo ngày đã chọn. Bấm "Xem tất cả" để xem toàn bộ lịch sử hóa đơn.
              </small>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  setSelectedDate('');
                  setDateInput('');
                }}
              >
                <span className="material-symbols-outlined align-middle fs-6 me-1">calendar_view_month</span>
                Xem tất cả hóa đơn
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Giao diện Desktop / Màn hình rộng (Bảng 8 cột) */}
          <div className="d-none d-md-block table-responsive">
            <table className="table reception-table">
              <thead>
                <tr>
                  <th>Mã hóa đơn</th>
                  <th>Bệnh nhân</th>
                  <th>Ngày lập</th>
                  <th>Tổng tiền</th>
                  <th>Đã thu</th>
                  <th>Còn lại</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.map((invoice) => (
                  <tr key={invoice.code}>
                    <td className="fw-bold text-primary">{invoice.code}</td>
                    <td>
                      <strong className="d-block">{invoice.patient}</strong>
                      <small className="text-secondary">{invoice.phone}</small>
                    </td>
                    <td>{invoice.createdAt}</td>
                    <td className="fw-bold">{money(invoice.total)}</td>
                    <td>{money(invoice.paid)}</td>
                    <td className="fw-bold">{money(invoice.total - invoice.paid)}</td>
                    <td>
                      <span
                        className={`reception-badge reception-badge--${
                          invoice.status === 'Đã thanh toán'
                            ? 'green'
                            : invoice.status === 'Thanh toán một phần'
                            ? 'amber'
                            : 'red'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button className="btn btn-sm btn-primary text-white" onClick={() => openInvoice(invoice)}>
                          {invoice.status === 'Đã thanh toán' ? 'Xem chi tiết' : 'Thu tiền'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          title="In bill 58mm (máy Sunmi POS)"
                          onClick={() => inHoaDon58mm(invoice)}
                        >
                          <span className="material-symbols-outlined align-middle" style={{ fontSize: 16 }}>receipt_long</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Giao diện Mobile & Máy in cầm tay Sunmi V2 (Dạng thẻ) */}
          <div className="d-md-none reception-invoice-cards">
            {visibleInvoices.map((invoice) => {
              const invRemaining = invoice.total - invoice.paid;
              return (
                <div key={invoice.code} className="reception-invoice-card">
                  <div className="reception-invoice-card__header">
                    <span className="reception-invoice-card__code">{invoice.code}</span>
                    <span
                      className={`reception-badge reception-badge--${
                        invoice.status === 'Đã thanh toán'
                          ? 'green'
                          : invoice.status === 'Thanh toán một phần'
                          ? 'amber'
                          : 'red'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <div className="reception-invoice-card__patient">
                    <strong>{invoice.patient}</strong>
                    <small>{invoice.phone ? `${invoice.phone} · ` : ''}{invoice.createdAt}</small>
                  </div>
                  <div className="reception-invoice-card__grid">
                    <div>
                      <span>Tổng tiền</span>
                      <strong>{money(invoice.total)}</strong>
                    </div>
                    <div>
                      <span>Đã thu</span>
                      <strong className="text-success">{money(invoice.paid)}</strong>
                    </div>
                    <div>
                      <span>Còn lại</span>
                      <strong className={invRemaining > 0 ? 'text-danger' : 'text-muted'}>
                        {money(invRemaining)}
                      </strong>
                    </div>
                  </div>
                  <div className="reception-invoice-card__actions">
                    <button
                      type="button"
                      className="btn btn-primary text-white"
                      onClick={() => openInvoice(invoice)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {invoice.status === 'Đã thanh toán' ? 'visibility' : 'payments'}
                      </span>
                      {invoice.status === 'Đã thanh toán' ? 'Xem chi tiết' : 'Thu tiền'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark"
                      onClick={() => inHoaDon58mm(invoice)}
                      title="In bill 58mm máy Sunmi V2"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>
                      In 58mm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length > 0 && (
            <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-top">
              <span className="text-secondary small">
                Hiển thị {displayedFrom}–{displayedTo} trong tổng số {filtered.length} hóa đơn
              </span>
              <nav className="align-self-md-auto align-self-start" aria-label="Phân trang hóa đơn">
                <ul className="pagination mb-0 flex-wrap">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang trước"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <span aria-hidden="true">«</span>
                    </button>
                  </li>
                  {pageNumbers.map((pageNumber, index) => (
                    <Fragment key={pageNumber}>
                      {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                        <li className="page-item disabled" aria-hidden="true">
                          <span className="page-link">…</span>
                        </li>
                      )}
                      <li className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          aria-current={pageNumber === currentPage ? 'page' : undefined}
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    </Fragment>
                  ))}
                  <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      aria-label="Trang sau"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    >
                      <span aria-hidden="true">»</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </footer>
          )}
        </>
      )}
    </section>
    {selected && <div className="modal d-block reception-modal" role="dialog" aria-modal="true"><div className="modal-backdrop show reception-modal__backdrop" onClick={() => setSelectedCode(null)} /><div className="modal-dialog modal-lg modal-dialog-centered"><div className="modal-content"><div className="modal-header"><div><h2 className="modal-title fs-5">Chi tiết hóa đơn</h2><small className="text-secondary">{selected.code} · {selected.patient}</small></div><button className="btn-close" onClick={() => setSelectedCode(null)} /></div><div className="modal-body">
      <h3 className="h6 fw-bold">Các khoản thanh toán</h3><div className="table-responsive border rounded-3"><table className="table table-sm mb-0"><thead><tr><th>Khoản thu</th><th>Loại</th><th>SL</th><th className="text-end">Đơn giá</th><th className="text-end">Thành tiền</th></tr></thead><tbody>{selected.items.length ? selected.items.map((item) => <tr key={item.id}><td>{item.name}</td><td><span className="text-secondary small">{item.kind === 'PHI_KHAM' ? 'Phí khám' : item.kind === 'TIEN_THUOC' ? 'Thuốc' : item.kind === 'DICH_VU' ? 'Dịch vụ' : 'Khác'}</span></td><td>{item.quantity}</td><td className="text-end">{money(item.unitPrice)}</td><td className="text-end fw-semibold">{money(item.quantity * item.unitPrice)}</td></tr>) : <tr><td colSpan={5} className="text-center text-secondary py-3">Hóa đơn này chưa có chi tiết được lưu.</td></tr>}</tbody></table></div>
      <div className="row g-3 mt-1">
        <div className="col-md-5">
          <div className="reception-finance-box">
            <span>Tổng hóa đơn</span><strong>{money(selected.total)}</strong>
            <span>Đã thanh toán</span><strong>{money(selected.paid)}</strong>
            <span>Còn phải thu</span><strong className="text-danger">{money(remaining)}</strong>
          </div>
        </div>
        <div className="col-md-7">
          {remaining > 0 ? (
            <>
              <label className="form-label fw-semibold">Phương thức cho lần thu mới</label>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {([['TIEN_MAT', 'Tiền mặt'], ['CHUYEN_KHOAN', 'Chuyển khoản MB Bank']] as const).map(([value, label]) => (
                  <button key={value} type="button" className={`btn ${method === value ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => {
                    setMethod(value);
                    if (value === 'CHUYEN_KHOAN') setAmount(String(remaining));
                  }}>{label}</button>
                ))}
              </div>
              {method === 'TIEN_MAT' && (
                <>
                  <label className="form-label fw-semibold">Số tiền thanh toán</label>
                  <input
                    className="form-control mb-3"
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithDots(amount)}
                    onChange={(event) => {
                      const raw = event.target.value.replace(/\D/g, '');
                      setAmount(Number(raw) > remaining ? String(remaining) : raw);
                    }}
                  />
                </>
              )}
              {method === 'TIEN_MAT' ? (
                <>
                  <label className="form-label fw-semibold">Tiền khách đưa</label>
                  <input
                    className="form-control"
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithDots(cashReceived)}
                    onChange={(event) => setCashReceived(event.target.value.replace(/\D/g, ''))}
                  />
                  <small className="d-block text-secondary mt-2">Tiền thừa: {money(change)}</small>
                </>
              ) : (
                <div className="d-flex flex-column align-items-center text-center p-4 border rounded-3 bg-light">
                  <h4 className="h6 fw-bold mb-3 text-primary">Quét mã QR để thanh toán</h4>
                  {qrSePayUrl ? (
                    <img
                      src={qrSePayUrl}
                      alt={`Mã QR thanh toán hóa đơn ${selected.code}`}
                      className="img-fluid rounded shadow-sm mb-3"
                      style={{ maxWidth: '300px' }}
                    />
                  ) : paymentAmount > 0 ? (
                    <div className="alert alert-warning mb-0 text-start" role="alert">
                      Chưa cấu hình tài khoản nhận tiền SePay. Không thể tạo mã QR thanh toán.
                    </div>
                  ) : (
                    <div className="text-secondary p-4">Vui lòng nhập số tiền hợp lệ</div>
                  )}
                  <div>
                    <strong>Chuyển khoản SePay</strong>
                    <small className="d-block mt-1 fw-semibold text-dark">Số tiền cần chuyển: {money(paymentAmount)}</small>
                    <small className="d-block mt-1">Hệ thống sẽ tự động chuyển sang màu xanh và đóng hóa đơn khi nhận được thông báo tiền vào tài khoản từ Ngân hàng qua SePay.</small>
                    <div className="d-flex justify-content-center align-items-center mt-2 text-success" style={{ gap: '6px' }}>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                      <small className="fw-semibold">Đang chờ thanh toán...</small>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="reception-payment-readonly">
              <span className="material-symbols-outlined">verified</span>
              <div><strong>Hóa đơn đã thanh toán</strong><small>Phương thức thực tế được khóa theo lịch sử thanh toán bên dưới.</small></div>
            </div>
          )}
        </div>
      </div>
      {selected.payments.length > 0 && (
        <div className="mt-4">
          <h3 className="h6 fw-bold">Lịch sử thanh toán</h3>
          {selected.payments.map((payment, index) => (
            <div className="reception-payment-history" key={`${payment.time}-${index}`}>
              <div>
                <strong>{money(payment.amount)}</strong>
                <small>{payment.method} · {payment.time}</small>
              </div>
              <div className="text-end">
                <span>{payment.collector}</span>
                {payment.reference && <small>{payment.reference}</small>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
      <div className="modal-footer flex-wrap gap-2">
        <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedCode(null)}>
          Đóng
        </button>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center"
          onClick={() => inHoaDon58mm()}
          title="In hoá đơn 58mm"
        >
          <span className="material-symbols-outlined me-1" style={{ fontSize: 18 }}>receipt_long</span>
          In bill 58mm
        </button>
        {remaining > 0 && (
          method === 'TIEN_MAT' ? (
            <button
              type="button"
              className="btn btn-success"
              disabled={paymentAmount <= 0 || paymentAmount > remaining || Number(cashReceived) < paymentAmount}
              onClick={recordPayment}
            >
              Xác nhận thu tiền mặt
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline-success"
              disabled={paymentAmount <= 0 || paymentAmount > remaining}
              onClick={recordPayment}
            >
              Xác nhận thủ công (Bỏ qua tự động)
            </button>
          )
        )}
      </div>
    </div>
  </div>
</div>}
  </div>;
}
