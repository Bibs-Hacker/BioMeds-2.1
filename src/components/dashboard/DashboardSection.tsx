import type { ReactNode } from "react";
export function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dashboard-section">
      <div className="page-title">
        <div>
          <h2>{title}</h2>
          {description && <p className="muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
