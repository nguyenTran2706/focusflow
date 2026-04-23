import { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/api';

interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

interface SprintPlanningModalProps {
  boardId: string;
  sprint: Sprint | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SprintPlanningModal({ boardId, sprint, onClose, onSaved }: SprintPlanningModalProps) {
  const isEdit = !!sprint;
  const [name, setName] = useState(sprint?.name ?? '');
  const [goal, setGoal] = useState(sprint?.goal ?? '');
  const [startDate, setStartDate] = useState(
    sprint?.startDate ? new Date(sprint.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    sprint?.endDate
      ? new Date(sprint.endDate).toISOString().split('T')[0]
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.patch(`/sprints/${sprint.id}`, { name, goal: goal || undefined, startDate, endDate });
      } else {
        await api.post(`/boards/${boardId}/sprints`, { name, goal: goal || undefined, startDate, endDate });
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save sprint';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const durationDays = Math.max(0, Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  ));

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Sprint' : 'Create Sprint'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-medium text-text-secondary">Sprint Name</label>
          <input
            className="px-3 py-2 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] outline-none focus:border-border-focus placeholder:text-text-muted transition-colors"
            placeholder="Sprint 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-medium text-text-secondary">Sprint Goal (optional)</label>
          <textarea
            className="px-3 py-2 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] outline-none focus:border-border-focus placeholder:text-text-muted transition-colors resize-none"
            placeholder="What do you want to accomplish in this sprint?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium text-text-secondary">Start Date</label>
            <input
              type="date"
              className="px-3 py-2 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] outline-none focus:border-border-focus transition-colors"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium text-text-secondary">End Date</label>
            <input
              type="date"
              className="px-3 py-2 rounded-md border border-border-subtle bg-bg-input text-text-primary text-[0.85rem] outline-none focus:border-border-focus transition-colors"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <p className="text-[0.75rem] text-text-muted">
          Duration: {durationDays} day{durationDays !== 1 ? 's' : ''} ({Math.round(durationDays / 7 * 10) / 10} weeks)
        </p>

        {error && (
          <p className="text-[0.8rem] text-danger">{error}</p>
        )}

        <button
          type="submit"
          className="mt-2 w-full py-2.5 rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-50"
          disabled={saving || !name.trim()}
        >
          {saving ? 'Saving…' : isEdit ? 'Update Sprint' : 'Create Sprint'}
        </button>
      </form>
    </Modal>
  );
}
