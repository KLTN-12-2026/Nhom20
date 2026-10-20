import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ReactNode } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';

import type { ReceptionDashboard } from '../types/reception.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
);

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  DA_CHECK_IN: 'Đã check-in',
  DA_TU_CHOI: 'Đã từ chối',
  DA_HUY: 'Đã hủy',
  KHONG_DEN: 'Không đến',
};

const QUEUE_STATUS_LABELS: Record<string, string> = {
  CHO_GOI: 'Chờ gọi',
  DANG_GOI: 'Đang gọi',
  DA_VAO_PHONG: 'Đã vào phòng',
  DA_HOAN_TAT: 'Đã hoàn tất',
  BO_QUA: 'Bỏ qua',
  DA_HUY: 'Đã hủy',
};

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ef4444', '#0891b2'];

interface ReceptionistDashboardChartsProps {
  dashboard: ReceptionDashboard | null;
  isLoading: boolean;
  error: string | null;
}

interface ChartPanelProps {
  title: string;
  description: string;
  icon: string;
  hasData: boolean;
  isLoading: boolean;
  error: string | null;
  children: ReactNode;
}

function ChartPanel({
  title,
  description,
  icon,
  hasData,
  isLoading,
  error,
  children,
}: ChartPanelProps) {
  return (
    <section className="reception-card reception-chart-card">
      <div className="reception-chart-card__header">
        <span className="material-symbols-outlined">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="reception-chart-card__body">
        {isLoading ? (
          <div className="reception-chart-state">Đang tải biểu đồ...</div>
        ) : error ? (
          <div className="reception-chart-state reception-chart-state--error">
            {error}
          </div>
        ) : !hasData ? (
          <div className="reception-chart-state">Chưa có dữ liệu trong khoảng này.</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function formatDateLabel(value: string) {
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
}

function displayLabel(value: string, labels: Record<string, string>) {
  return labels[value] ?? value.replaceAll('_', ' ');
}

function totalByStatus(
  items: Array<{ status: string; total: number }>,
  status: string,
) {
  return items.find((item) => item.status === status)?.total ?? 0;
}

export default function ReceptionistDashboardCharts({
  dashboard,
  isLoading,
  error,
}: ReceptionistDashboardChartsProps) {
  const appointmentsByDay = dashboard?.appointmentsByDay ?? [];
  const appointmentStatuses = dashboard?.appointmentStatuses ?? [];
  const queueStatuses = dashboard?.queueStatuses ?? [];
  const dashboardValue = (value: number) => (isLoading || error ? '—' : value);
  const stats = [
    {
      label: 'Tổng lịch hẹn 7 ngày',
      value: dashboardValue(appointmentsByDay.reduce((total, item) => total + item.total, 0)),
      icon: 'calendar_month',
      tone: 'blue',
    },
    {
      label: 'Chờ xác nhận',
      value: dashboardValue(totalByStatus(appointmentStatuses, 'CHO_XAC_NHAN')),
      icon: 'pending_actions',
      tone: 'amber',
    },
    {
      label: 'Đã check-in',
      value: dashboardValue(totalByStatus(appointmentStatuses, 'DA_CHECK_IN')),
      icon: 'how_to_reg',
      tone: 'green',
    },
    {
      label: 'Hàng đợi chờ gọi',
      value: dashboardValue(totalByStatus(queueStatuses, 'CHO_GOI')),
      icon: 'groups',
      tone: 'red',
    },
  ];

  return (
    <>
      <section className="reception-dashboard-stats" aria-label="Thống kê tiếp đón">
        {stats.map((stat) => (
          <article className={`reception-dashboard-stat reception-dashboard-stat--${stat.tone}`} key={stat.label}>
            <span className="material-symbols-outlined reception-dashboard-stat__icon">{stat.icon}</span>
            <div>
              <small>{stat.label}</small>
              <strong>{stat.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <div className="reception-chart-grid">
        <ChartPanel
          title="Lịch hẹn trong 7 ngày"
          description="Số lịch được ghi nhận theo từng ngày."
          icon="monitoring"
          hasData={appointmentsByDay.some((item) => item.total > 0)}
          isLoading={isLoading}
          error={error}
        >
          <Line
            data={{
              labels: appointmentsByDay.map((item) => formatDateLabel(item.date)),
              datasets: [
                {
                  label: 'Lịch hẹn',
                  data: appointmentsByDay.map((item) => item.total),
                  borderColor: '#2563eb',
                  backgroundColor: 'rgba(37, 99, 235, .12)',
                  borderWidth: 2.5,
                  fill: true,
                  tension: 0.35,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: true } },
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            }}
          />
        </ChartPanel>

        <ChartPanel
          title="Trạng thái lịch hẹn"
          description="Phân bổ lịch trong 7 ngày tới."
          icon="pie_chart"
          hasData={appointmentStatuses.some((item) => item.total > 0)}
          isLoading={isLoading}
          error={error}
        >
          <Doughnut
            data={{
              labels: appointmentStatuses.map((item) =>
                displayLabel(item.status, APPOINTMENT_STATUS_LABELS),
              ),
              datasets: [
                {
                  data: appointmentStatuses.map((item) => item.total),
                  backgroundColor: CHART_COLORS,
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' }, tooltip: { enabled: true } },
            }}
          />
        </ChartPanel>

        <ChartPanel
          title="Hàng đợi hôm nay"
          description="Tình trạng phiếu tiếp đón trong ngày."
          icon="groups"
          hasData={queueStatuses.some((item) => item.total > 0)}
          isLoading={isLoading}
          error={error}
        >
          <Doughnut
            data={{
              labels: queueStatuses.map((item) =>
                displayLabel(item.status, QUEUE_STATUS_LABELS),
              ),
              datasets: [
                {
                  data: queueStatuses.map((item) => item.total),
                  backgroundColor: ['#f59e0b', '#2563eb', '#16a34a', '#64748b', '#ef4444'],
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' }, tooltip: { enabled: true } },
            }}
          />
        </ChartPanel>
      </div>
    </>
  );
}
