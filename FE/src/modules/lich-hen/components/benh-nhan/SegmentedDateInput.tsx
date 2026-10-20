import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

import './SegmentedDateInput.css';

type DatePart = 'day' | 'month' | 'year';

type SegmentedDateInputProps = {
  id: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  autoComplete?: string;
};

const onlyDigits = (value: string, maxLength: number) =>
  value.replace(/\D/g, '').slice(0, maxLength);

const toIsoDate = (day: string, month: string, year: string) => {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return '';
  }

  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

  if (
    date.getUTCFullYear() !== yearNumber ||
    date.getUTCMonth() !== monthNumber - 1 ||
    date.getUTCDate() !== dayNumber
  ) {
    return '';
  }

  return `${year}-${month}-${day}`;
};

const fromIsoDate = (value: string) => {
  const [year = '', month = '', day = ''] = value.split('-');
  return { day, month, year };
};

export default function SegmentedDateInput({
  id,
  name,
  value,
  onChange,
  min,
  max,
  required = false,
  autoComplete,
}: SegmentedDateInputProps) {
  const generatedId = useId();
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const initialParts = value ? fromIsoDate(value) : { day: '', month: '', year: '' };
  const [day, setDay] = useState(initialParts.day);
  const [month, setMonth] = useState(initialParts.month);
  const [year, setYear] = useState(initialParts.year);

  const prevValueRef = useRef(value);
  if (value !== prevValueRef.current) {
    prevValueRef.current = value;
    if (value !== undefined) {
      const parts = fromIsoDate(value);
      setDay(parts.day);
      setMonth(parts.month);
      setYear(parts.year);
    }
  }

  const isoDate = toIsoDate(day, month, year);
  const isComplete = day.length === 2 && month.length === 2 && year.length === 4;
  const isInRange =
    Boolean(isoDate) && (!min || isoDate >= min) && (!max || isoDate <= max);
  const submittedValue = isInRange ? isoDate : '';

  useEffect(() => {
    const form = rootRef.current?.closest('form');
    if (!form) return;

    const reset = () => {
      setDay('');
      setMonth('');
      setYear('');
    };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, []);

  useEffect(() => {
    const input = dayRef.current;
    if (!input) return;

    let message = '';
    if (isComplete && !isoDate) {
      message = 'Ngày không hợp lệ.';
    } else if (isoDate && min && isoDate < min) {
      message = 'Ngày đã chọn phải từ ngày cho phép trở đi.';
    } else if (isoDate && max && isoDate > max) {
      message = 'Ngày đã chọn không được vượt quá ngày hôm nay.';
    }
    input.setCustomValidity(message);
  }, [isComplete, isoDate, max, min]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Call onChange when isoDate changes and is valid or complete
  useEffect(() => {
    if (onChangeRef.current && isComplete && isInRange) {
      if (isoDate !== value) {
        onChangeRef.current(isoDate);
      }
    } else if (onChangeRef.current && !isComplete && day === '' && month === '' && year === '') {
      if (value !== '') {
        onChangeRef.current(''); // clear
      }
    }
  }, [isoDate, isComplete, isInRange, day, month, year, value]);

  const updatePart = (
    part: DatePart,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const maxLength = part === 'year' ? 4 : 2;
    const val = onlyDigits(event.target.value, maxLength);

    if (part === 'day') {
      setDay(val);
      if (val.length === 2) monthRef.current?.focus();
    } else if (part === 'month') {
      setMonth(val);
      if (val.length === 2) yearRef.current?.focus();
    } else {
      setYear(val);
    }
  };

  const handleBackspace = (
    part: DatePart,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== 'Backspace' || event.currentTarget.value) return;

    if (part === 'month') dayRef.current?.focus();
    if (part === 'year') monthRef.current?.focus();
  };

  const handlePickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.value) return;
    const selected = fromIsoDate(event.target.value);
    setDay(selected.day);
    setMonth(selected.month);
    setYear(selected.year);
    if (onChange) onChange(event.target.value);
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;

    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      id={id}
      className="segmented-date"
      data-complete={isComplete}
    >
      <input
        ref={dayRef}
        id={`${id}-${generatedId}-day`}
        className="segmented-date__part segmented-date__day"
        type="text"
        inputMode="numeric"
        placeholder="dd"
        aria-label="Ngày"
        autoComplete={autoComplete ? `${autoComplete}-day` : undefined}
        value={day}
        onChange={(event) => updatePart('day', event)}
        onKeyDown={(event) => handleBackspace('day', event)}
        maxLength={2}
        required={required}
      />
      <span aria-hidden="true">/</span>
      <input
        ref={monthRef}
        className="segmented-date__part segmented-date__month"
        type="text"
        inputMode="numeric"
        placeholder="mm"
        aria-label="Tháng"
        autoComplete={autoComplete ? `${autoComplete}-month` : undefined}
        value={month}
        onChange={(event) => updatePart('month', event)}
        onKeyDown={(event) => handleBackspace('month', event)}
        maxLength={2}
        required={required}
      />
      <span aria-hidden="true">/</span>
      <input
        ref={yearRef}
        className="segmented-date__part segmented-date__year"
        type="text"
        inputMode="numeric"
        placeholder="yyyy"
        aria-label="Năm"
        autoComplete={autoComplete ? `${autoComplete}-year` : undefined}
        value={year}
        onChange={(event) => updatePart('year', event)}
        onKeyDown={(event) => handleBackspace('year', event)}
        maxLength={4}
        required={required}
      />

      <input name={name} type="hidden" value={submittedValue} />
      <input
        ref={pickerRef}
        className="segmented-date__picker"
        type="date"
        value={submittedValue}
        min={min}
        max={max}
        onChange={handlePickerChange}
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        className="segmented-date__calendar"
        type="button"
        aria-label="Mở lịch chọn ngày"
        onClick={openPicker}
      >
        <span className="material-symbols-outlined">calendar_month</span>
      </button>
    </div>
  );
}
