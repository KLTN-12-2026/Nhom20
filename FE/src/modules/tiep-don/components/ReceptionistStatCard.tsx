interface ReceptionistStatCardProps {
  icon: string;
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'blue' | 'green' | 'amber' | 'red';
}

export default function ReceptionistStatCard({
  icon,
  label,
  value,
  helper,
  tone = 'blue',
}: ReceptionistStatCardProps) {
  return (
    <article className={`reception-stat reception-stat--${tone}`}>
      <span className="material-symbols-outlined reception-stat__icon">
        {icon}
      </span>
      <div>
        <div className="reception-stat__label">{label}</div>
        <strong>{value}</strong>
        {helper && <div className="reception-stat__helper">{helper}</div>}
      </div>
    </article>
  );
}

