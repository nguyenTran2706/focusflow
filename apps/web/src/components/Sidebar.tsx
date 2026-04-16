import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/auth-store';
import './Sidebar.css';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar glass">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="8" height="8" rx="2" fill="#8b5cf6" />
            <rect x="14" y="2" width="8" height="8" rx="2" fill="#a78bfa" opacity="0.7" />
            <rect x="2" y="14" width="8" height="8" rx="2" fill="#a78bfa" opacity="0.5" />
            <rect x="14" y="14" width="8" height="8" rx="2" fill="#c4b5fd" opacity="0.3" />
          </svg>
        </div>
        <span className="sidebar-logo-text">FocusFlow</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </NavLink>
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name truncate">{user?.name ?? 'User'}</span>
          <span className="sidebar-user-email truncate">{user?.email ?? ''}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
