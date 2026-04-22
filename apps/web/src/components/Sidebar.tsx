import { NavLink } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useAuthStore } from '../lib/auth-store';

export function Sidebar() {
  const dbUser = useAuthStore((s) => s.dbUser);

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

        <NavLink
          to="/profile"
          className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </NavLink>

        <NavLink
          to="/pricing"
          className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Pricing
        </NavLink>

        {dbUser?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Admin
          </NavLink>
        )}
      </nav>

      {/* User section with Clerk UserButton */}
      <div className="flex items-center gap-[10px] py-3 px-2 border-t border-border-subtle mt-2">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-[30px] h-[30px]',
              userButtonPopoverCard: 'bg-bg-surface border border-border-subtle',
            },
          }}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[0.8rem] font-medium text-text-primary truncate">{dbUser?.name ?? 'Loading...'}</span>
          <span className="text-[0.7rem] text-text-muted truncate">{dbUser?.email ?? ''}</span>
        </div>
      </div>
    </aside>
  );
}
