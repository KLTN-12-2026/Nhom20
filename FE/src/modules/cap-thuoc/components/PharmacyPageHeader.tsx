import type { ReactNode } from 'react';

interface Props {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export default function PharmacyPageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <header className="pharmacy-page-header">
      <div>
        {eyebrow && <p className="admin-management-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="admin-management-description">{description}</p>
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
