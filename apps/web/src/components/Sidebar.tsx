import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../lib/auth-store';
import { useThemeStore, type ThemeMode } from '../lib/theme-store';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useChatNotifications, initAdminChatListener } from '../lib/chat-notifications';

const THEME_OPTIONS: { value: ThemeMode; labelKey: string }[] = [
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
  { value: 'system', labelKey: 'theme.system' },
];

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') return <SunIcon />;
  if (mode === 'dark') return <MoonIcon />;
  return <MonitorIcon />;
}

export function Sidebar() {
  const { t } = useTranslation('common');
  const dbUser = useAuthStore((s) => s.dbUser);
  const { mode, setMode } = useThemeStore();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const adminUnread = useChatNotifications((s) => s.adminUnread);

  useEffect(() => {
    if (dbUser?.role === 'ADMIN') initAdminChatListener();
  }, [dbUser?.role]);

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
          className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          {t('nav.dashboard')}
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          {t('nav.profile')}
        </NavLink>

        <NavLink
          to="/pricing"
          className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          {t('nav.pricing')}
        </NavLink>

        {dbUser?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.875rem] font-medium transition-colors duration-[120ms] ${isActive ? 'bg-accent-subtle text-accent-light' : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {t('nav.admin')}
            {adminUnread > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white" style={{ background: '#ef4444', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                {adminUnread > 9 ? '9+' : adminUnread}
              </span>
            )}
          </NavLink>
        )}
      </nav>

      {/* Language Switcher */}
      <div className="px-2 mb-1">
        <LanguageSwitcher />
      </div>

      {/* Theme Toggle */}
      <div className="relative px-2 mb-2" data-dropdown>
        <button
          className="w-full flex items-center gap-[10px] py-[8px] px-[12px] rounded-md text-[0.8rem] font-medium text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors duration-[120ms]"
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          aria-label={t('theme.light')}
        >
          <ThemeIcon mode={mode} />
          <span className="flex-1 text-left capitalize">{t(`theme.${mode}`)} mode</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </button>

        {showThemeMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-[110] py-1 animate-fade-in">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[0.8rem] font-medium transition-colors text-left rounded-md
                  ${mode === opt.value
                    ? 'text-accent bg-accent-subtle'
                    : 'text-text-primary hover:bg-white/10'
                  }`}
                onClick={() => { setMode(opt.value); setShowThemeMenu(false); }}
              >
                <ThemeIcon mode={opt.value} />
                {t(opt.labelKey)}
                {opt.value === 'system' && (
                  <span className="text-[0.65rem] text-text-muted ml-auto">auto by time</span>
                )}
                {mode === opt.value && (
                  <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User section with Clerk UserButton */}
      <div className="flex items-center gap-[10px] py-3 px-2 border-t border-border-subtle mt-2">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-[30px] h-[30px]',
              userButtonPopoverFooter: 'hidden',
            },
          }}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[0.8rem] font-medium text-text-primary truncate">{dbUser?.name ?? t('actions.loading')}</span>
          <span className="text-[0.7rem] text-text-muted truncate">{dbUser?.email ?? ''}</span>
        </div>
      </div>
    </aside>
  );
}
