import { BadRequestException, Injectable } from '@nestjs/common';

import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { AdminReportsRepository } from './admin-reports.repository';

type CountItem = { label: string; value: number };

@Injectable()
export class AdminReportsService {
  constructor(private readonly repository: AdminReportsRepository) {}

  async getOverview(query: AdminReportQueryDto) {
    const { from, to, toExclusive } = this.resolveDateRange(query);
    const [appointments, visits, payments, reviews] = await Promise.all([
      this.repository.findAppointments(from, toExclusive),
      this.repository.findVisits(from, toExclusive),
      this.repository.findSuccessfulPayments(from, toExclusive),
      this.repository.findReviews(from, toExclusive),
    ]);

    const revenue = payments.reduce(
      (total, payment) => total + Number(payment.soTien),
      0,
    );
    const completedVisits = visits.filter(
      (visit) => visit.trangThai === 'DA_HOAN_TAT',
    ).length;
    const pendingAppointments = appointments.filter(
      (appointment) => appointment.trangThai === 'CHO_XAC_NHAN',
    ).length;
    const averageRating = reviews.length
      ? Number(
          (
            reviews.reduce((total, review) => total + review.soSao, 0) /
            reviews.length
          ).toFixed(1),
        )
      : null;

    return {
      message: 'Lấy báo cáo thống kê thành công',
      data: {
        period: { from, to },
        summary: {
          appointmentCount: appointments.length,
          pendingAppointmentCount: pendingAppointments,
          completedVisitCount: completedVisits,
          patientCount: new Set(
            appointments.map((appointment) => appointment.benhNhanId),
          ).size,
          revenue,
          paymentCount: payments.length,
          reviewCount: reviews.length,
          averageRating,
        },
        appointmentsByDay: this.groupAppointmentsByDay(appointments, from, to),
        appointmentsByStatus: this.toCountItems(
          appointments.map((item) => item.trangThai),
        ),
        visitsBySpecialty: this.toCountItems(
          visits.map((visit) => visit.chuyenKhoa.tenChuyenKhoa),
        ),
        revenueByDay: this.groupRevenueByDay(payments, from, to),
        paymentMethods: this.toCountItems(
          payments.map((payment) => payment.phuongThuc),
          payments.map((payment) => Number(payment.soTien)),
        ),
      },
    };
  }

  private resolveDateRange(query: AdminReportQueryDto) {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const from = query.from ? this.startOfDay(query.from) : defaultFrom;
    const to = query.to ? this.startOfDay(query.to) : this.startOfDay(now);
    if (from > to) {
      throw new BadRequestException(
        'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
      );
    }
    const toExclusive = new Date(to);
    toExclusive.setDate(toExclusive.getDate() + 1);
    return { from, to, toExclusive };
  }

  private startOfDay(value: string | Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private groupAppointmentsByDay(
    appointments: { ngayHen: Date }[],
    from: Date,
    to: Date,
  ): CountItem[] {
    const counts = new Map<string, number>();
    for (const appointment of appointments) {
      const key = this.formatDate(appointment.ngayHen);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return this.buildDateRange(from, to).map((date) => ({
      label: this.formatDate(date),
      value: counts.get(this.formatDate(date)) ?? 0,
    }));
  }

  private groupRevenueByDay(
    payments: {
      soTien: { toString(): string };
      thoiGianThanhToan: Date | null;
    }[],
    from: Date,
    to: Date,
  ): CountItem[] {
    const amounts = new Map<string, number>();
    for (const payment of payments) {
      if (!payment.thoiGianThanhToan) continue;
      const key = this.formatDate(payment.thoiGianThanhToan);
      amounts.set(key, (amounts.get(key) ?? 0) + Number(payment.soTien));
    }
    return this.buildDateRange(from, to).map((date) => ({
      label: this.formatDate(date),
      value: amounts.get(this.formatDate(date)) ?? 0,
    }));
  }

  private toCountItems(labels: string[], values?: number[]): CountItem[] {
    const counts = new Map<string, number>();
    labels.forEach((label, index) => {
      counts.set(label, (counts.get(label) ?? 0) + (values?.[index] ?? 1));
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  private buildDateRange(from: Date, to: Date) {
    const dates: Date[] = [];
    const current = new Date(from);
    while (current <= to) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
