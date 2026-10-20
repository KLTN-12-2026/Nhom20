import type { ReactNode } from 'react';

interface ReceptionistPageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function ReceptionistPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: ReceptionistPageHeaderProps) {
  return (
    <header className="reception-page__header">
      <div>
        <div className="reception-page__eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="reception-page__actions">{actions}</div>}
    </header>
  );
}

