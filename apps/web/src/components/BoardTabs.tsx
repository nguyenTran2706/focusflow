import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../lib/auth-store';
import { UpgradeModal } from './UpgradeModal';

const TABS = [
  { key: 'kanban', labelKey: 'tabs.board', path: '', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', proOnly: false },
  { key: 'scrum', labelKey: 'tabs.scrum', path: '/scrum', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', proOnly: true },
  { key: 'whiteboards', labelKey: 'tabs.whiteboards', path: '/whiteboards', icon: 'M2 2h20v20H2zM7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z', proOnly: true },
  { key: 'diagrams', labelKey: 'tabs.diagrams', path: '/diagrams', icon: 'M6 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 18a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.5 8.5l7 7', proOnly: true },
] as const;

export function BoardTabs({ boardId }: { boardId: string }) {
  const { t } = useTranslation('board');
  const location = useLocation();
  const navigate = useNavigate();
  const dbUser = useAuthStore((s) => s.dbUser);
  const isFree = dbUser?.subscription === 'FREE';
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string }>({ open: false, feature: '' });

  const basePath = `/boards/${boardId}`;

  const activeKey = (() => {
    const path = location.pathname;
    if (path.includes('/whiteboards')) return 'whiteboards';
    if (path.includes('/diagrams')) return 'diagrams';
    if (path.includes('/scrum')) return 'scrum';
    return 'kanban';
  })();

  const handleTabClick = (tab: typeof TABS[number]) => {
    if (isFree && tab.proOnly) {
      setUpgradeModal({ open: true, feature: t(tab.labelKey) });
      return;
    }
    navigate(`${basePath}${tab.path}`);
  };

  return (
    <>
      <div className="flex gap-1 px-6 border-b border-border-subtle bg-bg-root">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[0.82rem] font-medium rounded-t-lg border-b-2 transition-colors ${
              activeKey === tab.key
                ? 'border-accent text-accent-light bg-accent-subtle'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.12]'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
            {t(tab.labelKey)}
            {isFree && tab.proOnly && (
              <span className="ml-0.5 px-[5px] py-[1px] rounded text-[0.6rem] font-bold uppercase tracking-wide bg-warning/15 text-warning">
                Pro
              </span>
            )}
          </button>
        ))}
      </div>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, feature: '' })}
        featureName={upgradeModal.feature}
      />
    </>
  );
}
