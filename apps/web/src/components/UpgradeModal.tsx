import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription?: string;
}

export function UpgradeModal({ open, onClose, featureName, featureDescription }: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="flex flex-col items-center text-center py-4 px-2">
        {/* Lock icon with gradient glow */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-warning/30 to-accent/20 blur-xl scale-150" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-warning/20 to-accent/10 border border-warning/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[1.15rem] font-bold text-text-primary mb-2">
          {featureName} is a Pro Feature
        </h2>

        {/* Description */}
        <p className="text-text-secondary text-[0.85rem] mb-6 max-w-[340px] leading-relaxed">
          {featureDescription ||
            `Unlock ${featureName} and more powerful features by upgrading to the Pro or Pro Max plan.`}
        </p>

        {/* Feature highlights */}
        <div className="w-full bg-white/[0.04] border border-border-subtle rounded-xl p-4 mb-6">
          <p className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider mb-3">Included with Pro</p>
          <ul className="space-y-2.5 text-left">
            {[
              'Unlimited boards & workspaces',
              'Scrum boards & sprint planning',
              'Whiteboards & diagram editors',
              'AI-powered task breakdown',
              'Real-time collaboration',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[0.82rem]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-text-primary">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            className="flex-1 py-2.5 rounded-lg text-[0.85rem] font-semibold bg-gradient-to-r from-warning to-[#e09100] text-black hover:brightness-110 transition-all"
            onClick={() => { onClose(); navigate('/pricing'); }}
          >
            View Plans
          </button>
          <button
            className="flex-1 py-2.5 rounded-lg text-[0.85rem] font-medium text-text-secondary border border-border-subtle hover:bg-white/[0.06] transition-colors"
            onClick={onClose}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </Modal>
  );
}
