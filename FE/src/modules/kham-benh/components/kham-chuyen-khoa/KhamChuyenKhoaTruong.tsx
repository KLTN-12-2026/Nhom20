export interface KhamChuyenKhoaTruongProps {
  title: string;
  fields: Array<{
    key: string;
    label: string;
    placeholder?: string;
    type?: 'text' | 'number';
    min?: number;
    max?: number;
    step?: string | number;
  }>;
  value: Record<string, string | number | null>;
  onChange: (value: Record<string, string | number | null>) => void;
}

// Hiển thị các trường đúng theo mẫu khám đã được Backend validate.
export function KhamChuyenKhoaTruong({ title, fields, value, onChange }: KhamChuyenKhoaTruongProps) {
  return (
    <section className="doctor-form-section">
      <h2>{title}</h2>
      <div className="row g-3">
        {fields.map((field) => (
          <div className="col-md-4" key={field.key}>
            <label className="form-label" htmlFor={`kham-chuyen-khoa-${field.key}`}>{field.label}</label>
            <input
              id={`kham-chuyen-khoa-${field.key}`}
              className="form-control"
              type={field.type ?? 'text'}
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={field.placeholder}
              value={value[field.key] ?? ''}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
