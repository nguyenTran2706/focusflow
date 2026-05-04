import { useSidebarStore } from '../lib/sidebar-store';

interface TopNavProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopNav({ title, subtitle, actions }: TopNavProps) {
  const toggle = useSidebarStore((s) => s.toggle);

  return (
    <header className="min-h-[var(--spacing-topnav)] flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2 border-b border-border-subtle bg-bg-root sticky top-0 z-50">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={toggle}
          aria-label="Open menu"
          className="md:hidden w-9 h-9 rounded-md flex items-center justify-center text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0 min-w-0">
          <h1 className="text-[1rem] font-semibold truncate">{title}</h1>
          {subtitle && <span className="text-[0.75rem] sm:text-[0.8rem] text-text-muted truncate">{subtitle}</span>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
