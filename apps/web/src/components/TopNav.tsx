import './TopNav.css';

interface TopNavProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopNav({ title, subtitle, actions }: TopNavProps) {
  return (
    <header className="topnav">
      <div className="topnav-info">
        <h1 className="topnav-title">{title}</h1>
        {subtitle && <span className="topnav-subtitle">{subtitle}</span>}
      </div>
      {actions && <div className="topnav-actions">{actions}</div>}
    </header>
  );
}
