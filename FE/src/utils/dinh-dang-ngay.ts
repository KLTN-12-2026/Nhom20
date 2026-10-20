// Chuẩn hóa ngày hiển thị cho toàn bộ giao diện, không thay đổi giá trị API/Database.
export type GiaTriNgay = string | number | Date | null | undefined;

function layNgay(value: GiaTriNgay): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function dinhDangNgay(value: GiaTriNgay, giaTriRong = '—') {
  const date = layNgay(value);
  if (!date) return giaTriRong;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function dinhDangNgayGio(value: GiaTriNgay, giaTriRong = '—') {
  const date = layNgay(value);
  if (!date) return giaTriRong;
  return `${dinhDangNgay(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Giá trị kỹ thuật cho input type="date" phải luôn là YYYY-MM-DD.
export function giaTriInputNgay(value: GiaTriNgay = new Date()) {
  const date = layNgay(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
