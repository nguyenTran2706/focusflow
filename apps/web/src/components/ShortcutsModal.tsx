import { Modal } from './Modal';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Open search' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal / panel' },
  { keys: ['Ctrl', 'Enter'], description: 'Submit comment' },
] as const;

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <div className="flex flex-col gap-3 py-2">
        {SHORTCUTS.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-1 border-b border-border-subtle last:border-0"
          >
            <span className="text-[0.85rem] text-text-secondary">{s.description}</span>
            <div className="flex items-center gap-1.5">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="min-w-[28px] h-7 inline-flex items-center justify-center px-2 rounded-md bg-white/[0.08] border border-border-subtle text-[0.7rem] font-mono text-text-primary"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
