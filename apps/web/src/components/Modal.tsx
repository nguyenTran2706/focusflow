import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handler);
      return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-bg-overlay flex items-center justify-center z-[1000] p-6" onClick={onClose}>
      <div className="w-full max-w-[440px] bg-bg-surface border border-border-subtle rounded-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-[1.05rem]">{title}</h3>
          <button 
            className="w-[28px] h-[28px] rounded-sm bg-transparent text-text-muted text-[0.9rem] flex items-center justify-center transition-colors hover:bg-white/10 hover:text-text-primary" 
            onClick={onClose} 
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5 [&>.input-group+.input-group]:mt-3 [&_.btn]:mt-5">
          {children}
        </div>
      </div>
    </div>
  );
}
