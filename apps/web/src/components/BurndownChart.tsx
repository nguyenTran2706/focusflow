import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface BurndownData {
  totalPoints: number;
  totalDays: number;
  ideal: { day: number; points: number }[];
  actual: { day: number; points: number }[];
  sprint: {
    name: string;
    startDate: string;
    endDate: string;
  };
}

export function BurndownChart({ sprintId }: { sprintId: string }) {
  const [data, setData] = useState<BurndownData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<BurndownData>(`/sprints/${sprintId}/burndown`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sprintId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.totalPoints === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-[0.9rem]">
        No story points assigned to cards in this sprint yet
      </div>
    );
  }

  const { totalPoints, totalDays, ideal, actual, sprint } = data;
  const chartW = 600;
  const chartH = 300;
  const padL = 50;
  const padR = 20;
  const padT = 30;
  const padB = 40;
  const w = chartW - padL - padR;
  const h = chartH - padT - padB;

  const toX = (day: number) => padL + (day / totalDays) * w;
  const toY = (pts: number) => padT + (1 - pts / totalPoints) * h;

  const idealPath = ideal.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.day)},${toY(p.points)}`).join(' ');
  const actualPath = actual.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.day)},${toY(p.points)}`).join(' ');

  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((totalPoints / tickCount) * i));
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[700px] mx-auto">
        <h2 className="text-[1.05rem] font-bold text-text-primary mb-1">Sprint Burndown</h2>
        <p className="text-text-muted text-[0.75rem] mb-6">
          {sprint.name} · {new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}
        </p>

        <div className="bg-bg-surface border border-border-subtle rounded-xl p-6">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full">
            {/* Grid lines */}
            {yTicks.map((tick) => (
              <g key={tick}>
                <line x1={padL} y1={toY(tick)} x2={chartW - padR} y2={toY(tick)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
                <text x={padL - 8} y={toY(tick) + 4} textAnchor="end" fill="#6b6f85" fontSize="11">{tick}</text>
              </g>
            ))}

            {/* X axis labels */}
            {[0, Math.floor(totalDays / 2), totalDays].map((day) => (
              <text key={day} x={toX(day)} y={chartH - 8} textAnchor="middle" fill="#6b6f85" fontSize="11">
                Day {day}
              </text>
            ))}

            {/* Ideal line */}
            <path d={idealPath} fill="none" stroke="#6b7280" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />

            {/* Actual line */}
            <path d={actualPath} fill="none" stroke="#7c3aed" strokeWidth="2.5" />

            {/* Actual dots */}
            {actual.map((p, i) => (
              <circle key={i} cx={toX(p.day)} cy={toY(p.points)} r="4" fill="#7c3aed" />
            ))}

            {/* Labels */}
            <text x={padL + 8} y={padT - 10} fill="#6b6f85" fontSize="11">Story Points</text>
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-[#6b7280]" style={{ borderTop: '2px dashed #6b7280' }} />
              <span className="text-[0.75rem] text-text-muted">Ideal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-[2.5px] rounded bg-accent" />
              <span className="text-[0.75rem] text-text-muted">Actual</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-center">
            <p className="text-[1.3rem] font-bold text-text-primary">{totalPoints}</p>
            <p className="text-[0.7rem] text-text-muted">Total Points</p>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-center">
            <p className="text-[1.3rem] font-bold text-success">{totalPoints - (actual[actual.length - 1]?.points ?? totalPoints)}</p>
            <p className="text-[0.7rem] text-text-muted">Completed</p>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-center">
            <p className="text-[1.3rem] font-bold text-warning">{actual[actual.length - 1]?.points ?? totalPoints}</p>
            <p className="text-[0.7rem] text-text-muted">Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
