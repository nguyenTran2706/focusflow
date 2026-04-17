interface TopNavProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopNav({ title, subtitle, actions }: TopNavProps) {
  return (
    <header className="h-[var(--spacing-topnav)] flex items-center justify-between px-6 border-b border-border-subtle bg-bg-root sticky top-0 z-50">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[1rem] font-semibold">{title}</h1>
        {subtitle && <span className="text-[0.8rem] text-text-muted">{subtitle}</span>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
