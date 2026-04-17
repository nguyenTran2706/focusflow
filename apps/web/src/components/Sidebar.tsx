import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/auth-store';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[var(--spacing-sidebar)] flex flex-col p-4 z-[100] bg-bg-surface border-r border-border-subtle">
      {/* Logo */}
      <div className="flex items-center gap-[10px] py-2 px-3 mb-6">
        <div className="w-[32px] h-[32px] flex items-center justify-center bg-accent rounded-md">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="8" height="8" rx="2" fill="#8b5cf6" />
            <rect x="14" y="2" width="8" height="8" rx="2" fill="#a78bfa" opacity="0.7" />
            <rect x="2" y="14" width="8" height="8" rx="2" fill="#a78bfa" opacity="0.5" />
            <rect x="14" y="14" width="8" height="8" rx="2" fill="#c4b5fd" opacity="0.3" />
          </svg>
        </div>
        <span className="text-[1.05rem] font-bold text-text-primary">FocusFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-[2px]">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </NavLink>
      </nav>

      {/* User */}
      <div className="flex items-center gap-[10px] py-3 px-2 border-t border-border-subtle mt-2">
        <div className="w-[30px] h-[30px] rounded-full bg-accent flex items-center justify-center font-semibold text-[0.8rem] text-white shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[0.8rem] font-medium text-text-primary truncate">{user?.name ?? 'User'}</span>
          <span className="text-[0.7rem] text-text-muted truncate">{user?.email ?? ''}</span>
        </div>
        <button 
          className="flex items-center justify-center gap-[6px] p-1 bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors rounded-md border-none cursor-pointer" 
          onClick={handleLogout} 
          title="Log out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
