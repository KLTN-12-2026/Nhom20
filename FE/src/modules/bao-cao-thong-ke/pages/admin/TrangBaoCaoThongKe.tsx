import { useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx-js-style';

import { useAppToast } from '@/components/ui/use-app-toast';
import { dinhDangNgay, giaTriInputNgay } from '@/utils/dinh-dang-ngay';
import { moCuaSoIn } from '@/utils/in-an';
import { useAdminReport } from '../../hooks/use-admin-report';
import type { ReportMetricItem } from '../../types/admin-report.types';
import { BaoCaoDateInput } from '../../components/BaoCaoDateInput';
import '../../admin-reports.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const STATUS_LABELS: Record<string, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  DA_CHECK_IN: 'Đã check-in',
  DA_HUY: 'Đã hủy',
  DA_TU_CHOI: 'Đã từ chối',
  KHONG_DEN: 'Không đến',
};

const PAYMENT_LABELS: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt',
  CHUYEN_KHOAN: 'Chuyển khoản',
  SEPAY: 'SePay',
};

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function displayDate(value: string) {
  return dinhDangNgay(value);
}

type ExcelValue = string | number;

const EXCEL_BORDER = {
  top: { style: 'thin', color: { rgb: 'D9E2F3' } },
  bottom: { style: 'thin', color: { rgb: 'D9E2F3' } },
  left: { style: 'thin', color: { rgb: 'D9E2F3' } },
  right: { style: 'thin', color: { rgb: 'D9E2F3' } },
};

function formatExcelDate(value: string) {
  return dinhDangNgay(value);
}

function createReportSheet(
  title: string,
  period: string,
  headers: string[],
  rows: ExcelValue[][],
  widths: number[],
  currencyColumns: number[] = [],
) {
  const dataRows = rows.length ? rows : [['Chưa có dữ liệu', ...headers.slice(1).map(() => '')]];
  const sheet = XLSX.utils.aoa_to_sheet([[title], [`Kỳ báo cáo: ${period}`], [], headers, ...dataRows]);
  const lastColumnIndex = headers.length - 1;
  const lastColumn = XLSX.utils.encode_col(lastColumnIndex);
  const lastRow = 4 + dataRows.length;

  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumnIndex } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumnIndex } },
  ];
  sheet['!cols'] = widths.map((wch) => ({ wch }));
  sheet['!autofilter'] = { ref: `A4:${lastColumn}${lastRow}` };
  sheet['!sheetViews'] = [{ showGridLines: false }];
  sheet['!margins'] = { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5 };

  const titleCell = sheet.A1;
  if (titleCell) {
    titleCell.s = {
      fill: { fgColor: { rgb: '123A74' } },
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 15 },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  const periodCell = sheet.A2;
  if (periodCell) {
    periodCell.s = {
      fill: { fgColor: { rgb: 'EAF1FF' } },
      font: { italic: true, color: { rgb: '365A86' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  headers.forEach((_, columnIndex) => {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: 3, c: columnIndex })];
    if (!headerCell) return;
    headerCell.s = {
      fill: { fgColor: { rgb: '2563EB' } },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      border: EXCEL_BORDER,
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  });

  dataRows.forEach((_, rowIndex) => {
    headers.forEach((_, columnIndex) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex + 4, c: columnIndex })];
      if (!cell) return;
      cell.s = {
        border: EXCEL_BORDER,
        fill: { fgColor: { rgb: rowIndex % 2 === 0 ? 'FFFFFF' : 'F7FAFF' } },
        alignment: { horizontal: typeof cell.v === 'number' ? 'right' : 'left', vertical: 'center' },
      };
      if (currencyColumns.includes(columnIndex) && typeof cell.v === 'number') {
        cell.z = '#,##0 "đ"';
      }
    });
  });

  sheet['!rows'] = [{ hpt: 26 }, { hpt: 20 }, { hpt: 8 }, { hpt: 22 }];
  return sheet;
}

function DoughnutChart({ items, labels }: { items: ReportMetricItem[]; labels: Record<string, string> }) {
  if (!items.length) return <div className="admin-report-chart__empty">Chưa có dữ liệu trong khoảng thời gian này.</div>;
  return (
    <Doughnut
      data={{
        labels: items.map((item) => labels[item.label] ?? item.label),
        datasets: [{ data: items.map((item) => item.value), backgroundColor: CHART_COLORS, borderWidth: 0 }],
      }}
      options={{
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } } },
      }}
    />
  );
}

export default function TrangBaoCaoThongKe() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => giaTriInputNgay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(() => giaTriInputNgay(today));
  const { data, isLoading, error, reload } = useAdminReport(from, to);
  const { showToast } = useAppToast();

  const handleExportExcel = () => {
    if (!data) return;

    try {
      const workbook = XLSX.utils.book_new();
      const period = `${formatExcelDate(data.period.from)} đến ${formatExcelDate(data.period.to)}`;
      const summarySheet = createReportSheet(
        'BÁO CÁO VẬN HÀNH SMART CLINIC',
        period,
        ['Chỉ số', 'Giá trị'],
        [
          ['Tổng lịch hẹn', data.summary.appointmentCount],
          ['Lịch chờ xác nhận', data.summary.pendingAppointmentCount],
          ['Lượt khám hoàn tất', data.summary.completedVisitCount],
          ['Bệnh nhân có lịch hẹn', data.summary.patientCount],
          ['Doanh thu đã thu', data.summary.revenue],
          ['Giao dịch thành công', data.summary.paymentCount],
          ['Đánh giá bác sĩ', data.summary.reviewCount],
          ['Điểm đánh giá trung bình', data.summary.averageRating ?? 'Chưa có'],
        ],
        [34, 24],
        [1],
      );
      const appointmentSheet = createReportSheet(
        'LỊCH HẸN THEO NGÀY',
        period,
        ['Ngày', 'Số lịch hẹn'],
        data.appointmentsByDay.map((item) => [formatExcelDate(item.label), item.value]),
        [20, 18],
      );
      const specialtySheet = createReportSheet(
        'LƯỢT KHÁM THEO CHUYÊN KHOA',
        period,
        ['Chuyên khoa', 'Lượt khám'],
        data.visitsBySpecialty.map((item) => [item.label, item.value]),
        [30, 18],
      );
      const paymentSheet = createReportSheet(
        'PHƯƠNG THỨC THANH TOÁN',
        period,
        ['Phương thức', 'Số tiền'],
        data.paymentMethods.map((item) => [PAYMENT_LABELS[item.label] ?? item.label, item.value]),
        [30, 22],
        [1],
      );

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan');
      XLSX.utils.book_append_sheet(workbook, appointmentSheet, 'Lịch hẹn theo ngày');
      XLSX.utils.book_append_sheet(workbook, specialtySheet, 'Lượt khám theo khoa');
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Phương thức thanh toán');
      XLSX.writeFile(workbook, `bao-cao-smart-clinic_${from}_den_${to}.xlsx`);
      showToast('Đã xuất báo cáo Excel.');
    } catch {
      showToast('Không thể xuất báo cáo Excel.', 'danger');
    }
  };

  // In tóm tắt báo cáo từ đúng dữ liệu API đang hiển thị, không in dashboard quản trị.
  const handlePrintReport = () => {
    if (!data) return;
    const period = `${dinhDangNgay(data.period.from)} đến ${dinhDangNgay(data.period.to)}`;
    const rows = [
      ['Tổng lịch hẹn', data.summary.appointmentCount],
      ['Lịch chờ xác nhận', data.summary.pendingAppointmentCount],
      ['Lượt khám hoàn tất', data.summary.completedVisitCount],
      ['Bệnh nhân có lịch hẹn', data.summary.patientCount],
      ['Doanh thu đã thu', formatCurrency(data.summary.revenue)],
      ['Giao dịch thành công', data.summary.paymentCount],
      ['Đánh giá bác sĩ', data.summary.reviewCount],
    ].map(([label, value]) => `<tr><td>${label}</td><td class="so">${value}</td></tr>`).join('');
    moCuaSoIn('Báo cáo vận hành Smart Clinic', `<header class="thuong-hieu"><h1>SMART CLINIC</h1><p>BÁO CÁO VẬN HÀNH</p></header><h2>Báo cáo và thống kê</h2><p class="meta">Khoảng thời gian: ${period}</p><table><thead><tr><th>Chỉ số</th><th class="so">Giá trị</th></tr></thead><tbody>${rows}</tbody></table><p class="ghi-chu">Báo cáo được tổng hợp từ dữ liệu vận hành hiện có của hệ thống.</p>`);
  };

  const appointmentLineData = useMemo(() => ({
    labels: data?.appointmentsByDay.map((item) => displayDate(item.label)) ?? [],
    datasets: [{
      label: 'Lịch hẹn',
      data: data?.appointmentsByDay.map((item) => item.value) ?? [],
      fill: true,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.10)',
      pointBackgroundColor: '#2563eb',
      tension: 0.35,
    }],
  }), [data]);

  const revenueLineData = useMemo(() => ({
    labels: data?.revenueByDay.map((item) => displayDate(item.label)) ?? [],
    datasets: [{
      label: 'Doanh thu',
      data: data?.revenueByDay.map((item) => item.value) ?? [],
      borderColor: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.10)',
      pointBackgroundColor: '#059669',
      fill: true,
      tension: 0.35,
    }],
  }), [data]);

  const specialtyBarData = useMemo(() => ({
    labels: data?.visitsBySpecialty.map((item) => item.label) ?? [],
    datasets: [{
      label: 'Lượt khám',
      data: data?.visitsBySpecialty.map((item) => item.value) ?? [],
      backgroundColor: '#2563eb',
      borderRadius: 6,
      maxBarThickness: 42,
    }],
  }), [data]);

  return (
    <main className="admin-report-page">
      <header className="admin-report-heading">
        <div>
          <p className="admin-report-heading__eyebrow">Dữ liệu vận hành</p>
          <h1>Báo cáo và thống kê</h1>
          <p>Theo dõi lịch hẹn, lượt khám, doanh thu và chất lượng phục vụ từ dữ liệu thực tế.</p>
        </div>
        <div className="admin-report-heading__actions">
          <button type="button" className="btn btn-outline-primary admin-report-refresh" onClick={handlePrintReport} disabled={!data || isLoading}>
            <span className="material-symbols-outlined">print</span>
            In báo cáo
          </button>
          <button type="button" className="btn btn-outline-primary admin-report-refresh" onClick={handleExportExcel} disabled={!data || isLoading}>
            <span className="material-symbols-outlined">download</span>
            Xuất Excel
          </button>
          <button type="button" className="btn btn-outline-primary admin-report-refresh" onClick={() => void reload()} disabled={isLoading}>
            <span className="material-symbols-outlined">refresh</span>
            Làm mới
          </button>
        </div>
      </header>

      <section className="admin-report-filter" aria-label="Bộ lọc báo cáo">
        <div>
          <label htmlFor="report-from">Từ ngày</label>
          <BaoCaoDateInput id="report-from" value={from} max={to} onChange={setFrom} />
        </div>
        <div>
          <label htmlFor="report-to">Đến ngày</label>
          <BaoCaoDateInput id="report-to" value={to} min={from} onChange={setTo} />
        </div>
        <p><span className="material-symbols-outlined">info</span> Số liệu thay đổi theo khoảng ngày đã chọn.</p>
      </section>

      {isLoading && <div className="admin-report-loading"><div className="spinner-border text-primary" role="status" /><span>Đang tổng hợp dữ liệu...</span></div>}
      {!isLoading && error && <div className="admin-report-error"><span>{error}</span><button type="button" className="btn btn-outline-primary" onClick={() => void reload()}>Thử lại</button></div>}
      {!isLoading && !error && data && <>
        <section className="admin-report-metrics">
          <article><span className="admin-report-metrics__icon"><span className="material-symbols-outlined">event_note</span></span><div><span>Lịch hẹn</span><strong>{data.summary.appointmentCount}</strong><small>{data.summary.pendingAppointmentCount} lịch chờ xác nhận</small></div></article>
          <article><span className="admin-report-metrics__icon admin-report-metrics__icon--green"><span className="material-symbols-outlined">clinical_notes</span></span><div><span>Lượt khám hoàn tất</span><strong>{data.summary.completedVisitCount}</strong><small>{data.summary.patientCount} bệnh nhân có lịch hẹn</small></div></article>
          <article><span className="admin-report-metrics__icon admin-report-metrics__icon--amber"><span className="material-symbols-outlined">payments</span></span><div><span>Doanh thu đã thu</span><strong>{formatCurrency(data.summary.revenue)}</strong><small>{data.summary.paymentCount} giao dịch thành công</small></div></article>
          <article><span className="admin-report-metrics__icon admin-report-metrics__icon--violet"><span className="material-symbols-outlined">star</span></span><div><span>Đánh giá bác sĩ</span><strong>{data.summary.averageRating ?? '—'}{data.summary.averageRating ? '/5' : ''}</strong><small>{data.summary.reviewCount} đánh giá trong kỳ</small></div></article>
        </section>

        <section className="admin-report-grid">
          <article className="admin-report-panel admin-report-panel--wide">
            <div className="admin-report-panel__heading"><div><h2>Lịch hẹn theo ngày</h2><p>Lịch hẹn phát sinh trong khoảng đã chọn.</p></div><span className="material-symbols-outlined">show_chart</span></div>
            <div className="admin-report-chart"><Line data={appointmentLineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
          </article>
          <article className="admin-report-panel">
            <div className="admin-report-panel__heading"><div><h2>Trạng thái lịch hẹn</h2><p>Phân bổ theo trạng thái hiện tại.</p></div><span className="material-symbols-outlined">donut_large</span></div>
            <div className="admin-report-chart"><DoughnutChart items={data.appointmentsByStatus} labels={STATUS_LABELS} /></div>
          </article>
          <article className="admin-report-panel">
            <div className="admin-report-panel__heading"><div><h2>Doanh thu theo ngày</h2><p>Chỉ ghi nhận giao dịch thành công.</p></div><span className="material-symbols-outlined">monitoring</span></div>
            <div className="admin-report-chart"><Line data={revenueLineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => `${Number(value).toLocaleString('vi-VN')} đ` } } } }} /></div>
          </article>
          <article className="admin-report-panel">
            <div className="admin-report-panel__heading"><div><h2>Phương thức thanh toán</h2><p>Theo tổng tiền thanh toán thành công.</p></div><span className="material-symbols-outlined">account_balance_wallet</span></div>
            <div className="admin-report-chart"><DoughnutChart items={data.paymentMethods} labels={PAYMENT_LABELS} /></div>
          </article>
          <article className="admin-report-panel admin-report-panel--wide">
            <div className="admin-report-panel__heading"><div><h2>Lượt khám theo chuyên khoa</h2><p>Số lượt tiếp nhận đã phát sinh trong khoảng ngày.</p></div><span className="material-symbols-outlined">bar_chart</span></div>
            <div className="admin-report-chart"><Bar data={specialtyBarData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} /></div>
          </article>
        </section>
      </>}
    </main>
  );
}
