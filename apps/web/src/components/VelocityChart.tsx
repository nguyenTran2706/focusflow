import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface VelocityData {
  sprints: {
    id: string;
    name: string;
    velocity: number | null;
    startDate: string;
    endDate: string;
  }[];
  avgVelocity: number;
}

export function VelocityChart({ boardId }: { boardId: string }) {
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<VelocityData>(`/boards/${boardId}/velocity`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [boardId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.sprints.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-[0.9rem]">
        No completed sprints yet — velocity data will appear after completing your first sprint
      </div>
    );
  }

  const { sprints, avgVelocity } = data;
  const maxVel = Math.max(...sprints.map((s) => s.velocity ?? 0), 1);

  const chartW = 600;
  const chartH = 280;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 60;
  const w = chartW - padL - padR;
  const h = chartH - padT - padB;
  const barWidth = Math.min(50, (w / sprints.length) * 0.6);
  const gap = (w - barWidth * sprints.length) / (sprints.length + 1);

  const toY = (vel: number) => padT + h - (vel / maxVel) * h;

  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((maxVel / tickCount) * i));
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-[700px] mx-auto">
        <h2 className="text-[1.05rem] font-bold text-text-primary mb-1">Sprint Velocity</h2>
        <p className="text-text-muted text-[0.75rem] mb-6">
          Average velocity: <span className="text-accent font-semibold">{avgVelocity} pts/sprint</span>
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

            {/* Average line */}
            <line
              x1={padL}
              y1={toY(avgVelocity)}
              x2={chartW - padR}
              y2={toY(avgVelocity)}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              opacity="0.7"
            />
            <text x={chartW - padR + 2} y={toY(avgVelocity) + 4} fill="#f59e0b" fontSize="10">avg</text>

            {/* Bars */}
            {sprints.map((sprint, i) => {
              const vel = sprint.velocity ?? 0;
              const x = padL + gap + i * (barWidth + gap);
              const barH = (vel / maxVel) * h;
              return (
                <g key={sprint.id}>
                  <rect
                    x={x}
                    y={toY(vel)}
                    width={barWidth}
                    height={barH}
                    rx={4}
                    fill="url(#velGrad)"
                    opacity={0.9}
                  />
                  <text x={x + barWidth / 2} y={toY(vel) - 6} textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="600">
                    {vel}
                  </text>
                  <text x={x + barWidth / 2} y={chartH - 20} textAnchor="middle" fill="#6b6f85" fontSize="10" transform={`rotate(-20, ${x + barWidth / 2}, ${chartH - 20})`}>
                    {sprint.name}
                  </text>
                </g>
              );
            })}

            {/* Gradient def */}
            <defs>
              <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm bg-accent" />
              <span className="text-[0.75rem] text-text-muted">Velocity (pts)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0 border-t-[1.5px] border-dashed border-warning" />
              <span className="text-[0.75rem] text-text-muted">Average ({avgVelocity})</span>
            </div>
          </div>
        </div>

        {/* Sprint table */}
        <div className="mt-4 rounded-lg border border-border-subtle overflow-hidden">
          <div className="flex items-center px-4 py-2.5 bg-bg-surface border-b border-border-subtle text-[0.7rem] font-semibold text-text-muted uppercase tracking-wider">
            <div className="flex-1">Sprint</div>
            <div className="w-24 text-center">Dates</div>
            <div className="w-20 text-right">Velocity</div>
          </div>
          {sprints.map((sprint) => (
            <div key={sprint.id} className="flex items-center px-4 py-2.5 border-b border-border-subtle last:border-b-0">
              <div className="flex-1 text-[0.82rem] text-text-primary font-medium">{sprint.name}</div>
              <div className="w-24 text-center text-[0.72rem] text-text-muted">
                {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="w-20 text-right text-[0.85rem] font-bold text-accent">{sprint.velocity ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
