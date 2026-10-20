import { useRef } from 'react';

import { dinhDangNgay } from '@/utils/dinh-dang-ngay';

type BaoCaoDateInputProps = {
  id: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
};

// Hiển thị ngày theo định dạng Việt Nam nhưng vẫn dùng input date chuẩn cho dữ liệu API.
export function BaoCaoDateInput({ id, value, min, max, onChange }: BaoCaoDateInputProps) {
  const nativeDateRef = useRef<HTMLInputElement>(null);

  const openCalendar = () => {
    const input = nativeDateRef.current;
    if (!input) return;

    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (picker.showPicker) picker.showPicker();
    else input.click();
  };

  return (
    <div className="admin-report-date-input">
      <input
        id={id}
        className="form-control"
        type="text"
        value={value ? dinhDangNgay(value) : ''}
        placeholder="dd/MM/yyyy"
        readOnly
        onClick={openCalendar}
      />
      <input
        ref={nativeDateRef}
        className="admin-report-date-input__native"
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
      <button type="button" className="admin-report-date-input__button" onClick={openCalendar} aria-label="Chọn ngày">
        <span className="material-symbols-outlined">calendar_month</span>
      </button>
    </div>
  );
}
