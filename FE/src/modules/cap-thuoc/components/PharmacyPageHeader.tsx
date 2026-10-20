import type { ReactNode } from 'react';

interface Props {
  title: string;
  description: string;
  actions?: ReactNode;
}

export default function PharmacyPageHeader({ title, description, actions }: Props) {
  return (
    <header className="pharmacy-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
