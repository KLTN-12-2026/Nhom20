export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

export function getCurrentMonday() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return formatLocalDate(date);
}

export function addScheduleDays(value: string, days: number) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function shiftScheduleWeek(value: string, offset: number) {
  return addScheduleDays(value, offset * 7);
}

export function formatScheduleDate(value: string) {
  return dinhDangNgay(value);
}
import { dinhDangNgay } from '@/utils/dinh-dang-ngay';
