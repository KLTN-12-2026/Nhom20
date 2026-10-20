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
import { Link } from 'react-router-dom';

import { dinhDangNgay, giaTriInputNgay } from '@/utils/dinh-dang-ngay';
import { BaoCaoDateInput } from '../../components/BaoCaoDateInput';
import { useAdminReport } from '../../hooks/use-admin-report';
import type { ReportMetricItem } from '../../types/admin-report.types';
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
  DA_CAP_PHIEU: 'Đã cấp phiếu',
  DA_CHECK_IN: 'Đã check-in',
  DANG_KHAM: 'Đang khám',
  DA_HOAN_TAT: 'Đã hoàn tất',
  DA_HUY: 'Đã hủy',
  KHONG_DEN: 'Không đến',
};

const PAYMENT_LABELS: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt',
  CHUYEN_KHOAN: 'Chuyển khoản',
  SEPAY: 'SePay',
};

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function startOfCurrentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
}

function hasChartData(items: ReportMetricItem[]) {
  return items.some((item) => item.value > 0);
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="admin-dashboard-empty-chart">
      <span className="material-symbols-outlined">insert_chart_outlined</span>
      <p>{message}</p>
    </div>
  );
}

export default function TrangTongQuanAdmin() {
  const [from, setFrom] = useState(startOfCurrentMonth);
  const [to, setTo] = useState(() => giaTriInputNgay());
  const { data, isLoading, error, reload } = useAdminReport(from, to);

  const setFromDate = (value: string) => {
    setFrom(value);
    if (value > to) setTo(value);
  };

  const setToDate = (value: string) => {
    setTo(value);
    if (value < from) setFrom(value);
  };

  const appointmentByDayData = useMemo(() => ({
    labels: data?.appointmentsByDay.map((item) => dinhDangNgay(item.label)) ?? [],
    datasets: [{
      label: 'Lịch hẹn',
      data: data?.appointmentsByDay.map((item) => item.value) ?? [],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      pointBackgroundColor: '#2563eb',
      pointBorderWidth: 2,
      pointRadius: 3,
      fill: true,
      tension: 0.35,
    }],
  }), [data]);

  const appointmentStatusData = useMemo(() => ({
    labels: data?.appointmentsByStatus.map((item) => STATUS_LABELS[item.label] ?? item.label) ?? [],
    datasets: [{
      data: data?.appointmentsByStatus.map((item) => item.value) ?? [],
      backgroundColor: CHART_COLORS,
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 5,
    }],
  }), [data]);

  const specialtyData = useMemo(() => ({
    labels: data?.visitsBySpecialty.map((item) => item.label) ?? [],
    datasets: [{
      label: 'Lượt khám hoàn tất',
      data: data?.visitsBySpecialty.map((item) => item.value) ?? [],
      backgroundColor: '#2563eb',
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 54,
    }],
  }), [data]);

  const revenueByDayData = useMemo(() => ({
    labels: data?.revenueByDay.map((item) => dinhDangNgay(item.label)) ?? [],
    datasets: [{
      label: 'Doanh thu',
      data: data?.revenueByDay.map((item) => item.value) ?? [],
      borderColor: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.12)',
      pointBackgroundColor: '#059669',
      pointBorderWidth: 2,
      pointRadius: 3,
      fill: true,
      tension: 0.35,
    }],
  }), [data]);

  const paymentMethodData = useMemo(() => ({
    labels: data?.paymentMethods.map((item) => PAYMENT_LABELS[item.label] ?? item.label) ?? [],
    datasets: [{
      data: data?.paymentMethods.map((item) => item.value) ?? [],
      backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'],
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 5,
    }],
  }), [data]);

  if (isLoading && !data) {
    return (
      <div className="admin-dashboard-state">
        <div className="spinner-border text-primary" role="status" />
        <span>Đang tải dữ liệu Dashboard...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-dashboard-state">
        <span>{error || 'Không thể tải dữ liệu Dashboard.'}</span>
        <button type="button" className="btn btn-outline-primary" onClick={() => void reload()}>
          Thử lại
        </button>
      </div>
    );
  }

  const metricItems = [
    {
      icon: 'event_note',
      label: 'Tổng lịch hẹn',
      value: data.summary.appointmentCount,
      detail: `${data.summary.pendingAppointmentCount} lịch chờ xác nhận`,
      tone: 'blue',
    },
    {
      icon: 'clinical_notes',
      label: 'Lượt khám hoàn tất',
      value: data.summary.completedVisitCount,
      detail: `${data.summary.patientCount} bệnh nhân có lịch hẹn`,
      tone: 'green',
    },
    {
      icon: 'payments',
      label: 'Doanh thu đã thu',
      value: formatCurrency(data.summary.revenue),
      detail: `${data.summary.paymentCount} giao dịch thành công`,
      tone: 'amber',
    },
    {
      icon: 'star',
      label: 'Đánh giá bác sĩ',
      value: data.summary.averageRating ? `${data.summary.averageRating}/5` : '—',
      detail: `${data.summary.reviewCount} đánh giá trong kỳ`,
      tone: 'violet',
    },
  ] as const;

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
    },
  };

  return (
    <main className="admin-dashboard-page">
      <header className="admin-dashboard-heading">
        <div className="admin-dashboard-heading__intro">
          <p>Tổng quan vận hành</p>
          <h1>Dashboard quản trị</h1>
          <span>Theo dõi nhanh lịch hẹn, lượt khám, doanh thu và chất lượng phục vụ.</span>
        </div>
        <div className="admin-dashboard-heading__actions">
          <Link className="btn btn-outline-primary" to="/admin/bao-cao">
            <span className="material-symbols-outlined">analytics</span>
            Xem báo cáo chi tiết
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => void reload()} disabled={isLoading}>
            <span className="material-symbols-outlined">refresh</span>
            Làm mới
          </button>
        </div>
      </header>

      <section className="admin-dashboard-filter" aria-label="Bộ lọc dữ liệu Dashboard">
        <div>
          <label htmlFor="dashboard-from">Từ ngày</label>
          <BaoCaoDateInput id="dashboard-from" value={from} max={to} onChange={setFromDate} />
        </div>
        <div>
          <label htmlFor="dashboard-to">Đến ngày</label>
          <BaoCaoDateInput id="dashboard-to" value={to} min={from} onChange={setToDate} />
        </div>
        <p>
          <span className="material-symbols-outlined">date_range</span>
          Dữ liệu thay đổi theo khoảng ngày bạn chọn.
        </p>
      </section>

      {isLoading && <div className="admin-dashboard-refreshing">Đang cập nhật số liệu...</div>}

      <section className="admin-dashboard-metrics" aria-label="Chỉ số tổng quan">
        {metricItems.map((item) => (
          <article className="metric-card" key={item.label}>
            <span className={`admin-dashboard-metrics__icon admin-dashboard-metrics__icon--${item.tone}`}>
              <span className="material-symbols-outlined">{item.icon}</span>
            </span>
            <div>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <span>{item.detail}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-grid" aria-label="Biểu đồ tổng quan">
        <article className="admin-dashboard-panel admin-dashboard-panel--span-8">
          <header className="admin-dashboard-panel__header">
            <div>
              <p className="admin-dashboard-panel__eyebrow">Xu hướng</p>
              <h2>Lịch hẹn theo ngày</h2>
              <span>Lịch phát sinh trong khoảng thời gian đã chọn.</span>
            </div>
            <Link to="/admin/lich-hen">Quản lý lịch hẹn</Link>
          </header>
          <div className="admin-dashboard-chart">
            {hasChartData(data.appointmentsByDay)
              ? <Line data={appointmentByDayData} options={lineOptions} />
              : <EmptyChart message="Chưa có lịch hẹn trong khoảng ngày này." />}
          </div>
        </article>

        <article className="admin-dashboard-panel admin-dashboard-panel--span-4">
          <header className="admin-dashboard-panel__header">
            <div>
              <p className="admin-dashboard-panel__eyebrow">Điều phối</p>
              <h2>Trạng thái lịch hẹn</h2>
              <span>Phân bổ theo trạng thái hiện tại.</span>
            </div>
          </header>
          <div className="admin-dashboard-chart admin-dashboard-chart--donut">
            {hasChartData(data.appointmentsByStatus)
              ? <Doughnut data={appointmentStatusData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14 } } } }} />
              : <EmptyChart message="Chưa có dữ liệu trạng thái lịch hẹn." />}
          </div>
        </article>

        <article className="admin-dashboard-panel admin-dashboard-panel--span-8">
          <header className="admin-dashboard-panel__header">
            <div>
              <p className="admin-dashboard-panel__eyebrow">Tài chính</p>
              <h2>Doanh thu theo ngày</h2>
              <span>Chỉ tính các giao dịch thanh toán thành công.</span>
            </div>
            <Link to="/admin/bao-cao">Phân tích chi tiết</Link>
          </header>
          <div className="admin-dashboard-chart">
            {hasChartData(data.revenueByDay)
              ? <Line data={revenueByDayData} options={{ ...lineOptions, scales: { ...lineOptions.scales, y: { beginAtZero: true, ticks: { callback: (value: string | number) => `${Number(value).toLocaleString('vi-VN')} đ` } } } }} />
              : <EmptyChart message="Chưa có giao dịch thanh toán trong khoảng ngày này." />}
          </div>
        </article>

        <article className="admin-dashboard-panel admin-dashboard-panel--span-4">
          <header className="admin-dashboard-panel__header">
            <div>
              <p className="admin-dashboard-panel__eyebrow">Thanh toán</p>
              <h2>Phương thức thanh toán</h2>
              <span>Tổng tiền theo phương thức thanh toán.</span>
            </div>
          </header>
          <div className="admin-dashboard-chart admin-dashboard-chart--donut">
            {hasChartData(data.paymentMethods)
              ? <Doughnut data={paymentMethodData} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14 } } } }} />
              : <EmptyChart message="Chưa có dữ liệu thanh toán trong khoảng ngày này." />}
          </div>
        </article>

        <article className="admin-dashboard-panel admin-dashboard-panel--span-12">
          <header className="admin-dashboard-panel__header">
            <div>
              <p className="admin-dashboard-panel__eyebrow">Chuyên môn</p>
              <h2>Lượt khám theo chuyên khoa</h2>
              <span>Số lượt khám đã hoàn tất trong khoảng thời gian đã chọn.</span>
            </div>
          </header>
          <div className="admin-dashboard-chart admin-dashboard-chart--bar">
            {hasChartData(data.visitsBySpecialty)
              ? <Bar data={specialtyData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } }} />
              : <EmptyChart message="Chưa có lượt khám hoàn tất trong khoảng ngày này." />}
          </div>
        </article>
      </section>
    </main>
  );
}
