import { PageEnter } from '@/components/motion';

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <PageEnter>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="card">
        <div className="empty">
          <div className="empty-title">En construcción</div>
          <p className="muted">Esta sección estará disponible pronto.</p>
        </div>
      </div>
    </PageEnter>
  );
}
