export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function Card({
  title,
  children,
  footer,
}: {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-paper">
      {title ? (
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
      {footer ? (
        <div className="border-t border-line px-4 py-3 text-sm text-muted">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Label netral untuk atribut non-status (aktif, role, dsb). */
export function Pill({
  children,
  tone = "netral",
}: {
  children: React.ReactNode;
  tone?: "netral" | "redup";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        tone === "netral"
          ? "bg-surface text-ink ring-line"
          : "bg-paper text-muted ring-line"
      }`}
    >
      {children}
    </span>
  );
}
