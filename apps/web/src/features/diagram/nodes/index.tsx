/* eslint-disable react-refresh/only-export-components */
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface LabelData {
  label?: string;
  description?: string;
  technology?: string;
  fields?: { name: string; type: string; pk?: boolean }[];
  properties?: string[];
  methods?: string[];
  collapsed?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  bgColor?: string;
  [key: string]: unknown;
}

const d = (data: Record<string, unknown>) => data as LabelData;

// ── Shared helpers ─────────────────────────────────────────────────────────

export type NodeAction = 'toggle' | 'edit' | 'delete';

function dispatchNodeAction(id: string, action: NodeAction) {
  window.dispatchEvent(new CustomEvent('diagram:node-action', { detail: { id, action } }));
}

function wrapperStyle(data: LabelData): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (typeof data.fontSize === 'number') s.fontSize = `${data.fontSize}px`;
  if (data.fontFamily) s.fontFamily = data.fontFamily;
  if (data.textColor) s.color = data.textColor;
  return s;
}

function bodyStyle(data: LabelData): React.CSSProperties {
  return data.bgColor ? { background: data.bgColor } : {};
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

function NodeToolbar({ id, collapsed }: { id: string; collapsed: boolean }) {
  return (
    <div
      className="absolute -top-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 data-[selected=true]:opacity-100 transition-opacity z-20 pointer-events-auto nodrag"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dispatchNodeAction(id, 'toggle'); }}
        className="w-6 h-6 rounded-md bg-bg-card border border-border-subtle text-text-secondary hover:bg-accent hover:text-white shadow-sm flex items-center justify-center"
        title={collapsed ? 'Expand' : 'Minimise'}
      >
        {collapsed ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 9V5a2 2 0 012-2h4M21 9V5a2 2 0 00-2-2h-4M3 15v4a2 2 0 002 2h4M21 15v4a2 2 0 01-2 2h-4" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 3v4a2 2 0 01-2 2H3M15 3v4a2 2 0 002 2h4M9 21v-4a2 2 0 00-2-2H3M15 21v-4a2 2 0 012-2h4" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dispatchNodeAction(id, 'edit'); }}
        className="w-6 h-6 rounded-md bg-bg-card border border-border-subtle text-text-secondary hover:bg-accent hover:text-white shadow-sm flex items-center justify-center"
        title="Edit"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dispatchNodeAction(id, 'delete'); }}
        className="w-6 h-6 rounded-md bg-bg-card border border-border-subtle text-text-secondary hover:bg-error hover:text-white shadow-sm flex items-center justify-center"
        title="Delete"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
        </svg>
      </button>
    </div>
  );
}

// ── Compact pill (collapsed view) ──────────────────────────────────────────

function CollapsedPill({ data, accent, icon }: { data: LabelData; accent: string; icon?: React.ReactNode }) {
  return (
    <div
      className="px-3 py-1.5 rounded-full border-2 shadow-md flex items-center gap-2 min-w-[100px] max-w-[200px]"
      style={{
        borderColor: `${accent}80`,
        background: data.bgColor ?? 'var(--color-bg-card)',
        ...wrapperStyle(data),
      }}
    >
      {icon && <span className="shrink-0" style={{ color: accent }}>{icon}</span>}
      <span className="text-[0.78rem] font-medium truncate flex-1">{data.label ?? 'Node'}</span>
    </div>
  );
}

// ── NodeShell ──────────────────────────────────────────────────────────────

interface NodeShellProps {
  id: string;
  selected?: boolean;
  data: LabelData;
  accent?: string;
  icon?: React.ReactNode;
  handles?: 'tb' | 'all' | 'none';
  handleColor?: string;
  className?: string;
  children: React.ReactNode;
}

function NodeShell({
  id,
  selected,
  data,
  accent = '#a78bfa',
  icon,
  handles = 'tb',
  handleColor,
  className = '',
  children,
}: NodeShellProps) {
  const collapsed = !!data.collapsed;
  const ringColor = handleColor ?? accent;

  const handleClass = '!w-2.5 !h-2.5 !border-2 !border-bg-root';
  const handleStyle = { background: ringColor };

  return (
    <div
      data-selected={!!selected}
      className={`group relative transition-shadow ${selected ? 'drop-shadow-[0_0_0_2px_rgba(167,139,250,0.6)]' : ''} ${className}`}
      style={wrapperStyle(data)}
    >
      {selected && (
        <div
          aria-hidden
          className="absolute -inset-1 rounded-xl pointer-events-none"
          style={{ boxShadow: `0 0 0 2px ${ringColor}, 0 0 0 4px rgba(0,0,0,0.05)` }}
        />
      )}

      {handles !== 'none' && (
        <>
          {/* Visible handles */}
          <Handle id="t" type="target" position={Position.Top} className={handleClass} style={handleStyle} />
          <Handle id="b" type="source" position={Position.Bottom} className={handleClass} style={handleStyle} />
          {/* Invisible mate-handles so drag can initiate from either side */}
          <Handle id="t-src" type="source" position={Position.Top} className={`${handleClass} !opacity-0`} style={handleStyle} />
          <Handle id="b-tgt" type="target" position={Position.Bottom} className={`${handleClass} !opacity-0`} style={handleStyle} />
          {handles === 'all' && (
            <>
              <Handle id="l" type="target" position={Position.Left} className={handleClass} style={handleStyle} />
              <Handle id="r" type="source" position={Position.Right} className={handleClass} style={handleStyle} />
              <Handle id="l-src" type="source" position={Position.Left} className={`${handleClass} !opacity-0`} style={handleStyle} />
              <Handle id="r-tgt" type="target" position={Position.Right} className={`${handleClass} !opacity-0`} style={handleStyle} />
            </>
          )}
        </>
      )}

      <NodeToolbar id={id} collapsed={collapsed} />

      {collapsed ? <CollapsedPill data={data} accent={accent} icon={icon} /> : children}
    </div>
  );
}

// ── Small inline icons (used for collapsed pills) ──────────────────────────
const I = {
  process: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>,
  decision: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2l10 10-10 10L2 12z" /></svg>,
  terminator: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="6" width="20" height="12" rx="6" /></svg>,
  data: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 4h14l-2 16H7z" /></svg>,
  service: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M12 8v8M8 12h8" /></svg>,
  table: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18" /></svg>,
  class: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
  component: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h4M3 15h4" /></svg>,
  package: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 4h8l2 3h8" /></svg>,
  actor: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="12" y1="16" x2="8" y2="21" /><line x1="12" y1="16" x2="16" y2="21" /></svg>,
  useCase: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="7" /></svg>,
  iface: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>,
  note: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>,
  person: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  system: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>,
  server: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /></svg>,
  database: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  cloud: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" /></svg>,
  lb: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6" /></svg>,
  api: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" /></svg>,
  queue: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="5" height="12" rx="1" /><rect x="9.5" y="6" width="5" height="12" rx="1" /><rect x="17" y="6" width="5" height="12" rx="1" /></svg>,
  docker: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="10" width="22" height="11" rx="2" /></svg>,
  group: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 2" /></svg>,
  text: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  rectangle: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" /></svg>,
  rounded: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="4" /></svg>,
  circle: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>,
  triangle: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 22,21 2,21" /></svg>,
  diamond: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 22,12 12,22 2,12" /></svg>,
  hexagon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="6,3 18,3 23,12 18,21 6,21 1,12" /></svg>,
  star: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" /></svg>,
  cylinder: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  arrow: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8h8v-4l6 8-6 8v-4H5z" /></svg>,
  cross: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></svg>,
};

// ── Flowchart Nodes ────────────────────────────────────────────────────────

export const ProcessNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#6366f1" icon={I.process}>
    <div
      className="px-5 py-3 rounded-lg bg-bg-card border-2 border-accent/40 text-text-primary shadow-md min-w-[120px] text-center"
      style={bodyStyle(d(data))}
    >
      {d(data).label ?? 'Process'}
    </div>
  </NodeShell>
));
ProcessNode.displayName = 'ProcessNode';

export const DecisionNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#f59e0b" icon={I.decision} handles="all" handleColor="#f59e0b">
    <div
      className="w-[120px] h-[120px] flex items-center justify-center bg-bg-card border-2 border-warning/50 text-text-primary shadow-md text-[0.75rem] font-medium text-center p-2"
      style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', ...bodyStyle(d(data)) }}
    >
      {d(data).label ?? 'Decision'}
    </div>
  </NodeShell>
));
DecisionNode.displayName = 'DecisionNode';

export const TerminatorNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#34d399" icon={I.terminator} handleColor="#34d399">
    <div
      className="px-6 py-2.5 rounded-full bg-bg-card border-2 border-success/40 text-text-primary shadow-md min-w-[100px] text-center"
      style={bodyStyle(d(data))}
    >
      {d(data).label ?? 'Start/End'}
    </div>
  </NodeShell>
));
TerminatorNode.displayName = 'TerminatorNode';

export const DataNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#8b5cf6" icon={I.data}>
    <div
      className="px-7 py-3 bg-bg-card border-2 border-[#8b5cf6]/40 text-text-primary shadow-md min-w-[120px] text-center"
      style={{ clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)', ...bodyStyle(d(data)) }}
    >
      {d(data).label ?? 'Data'}
    </div>
  </NodeShell>
));
DataNode.displayName = 'DataNode';

export const ServiceNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#ec4899" icon={I.service}>
    <div
      className="px-4 py-3 rounded-xl bg-bg-card border-2 border-[#ec4899]/40 text-text-primary shadow-md min-w-[130px] flex items-center gap-2.5"
      style={bodyStyle(d(data))}
    >
      <div className="w-6 h-6 rounded-md bg-[#ec4899]/15 flex items-center justify-center shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </div>
      <span>{d(data).label ?? 'Service'}</span>
    </div>
  </NodeShell>
));
ServiceNode.displayName = 'ServiceNode';

// ── ERD Entity Node ────────────────────────────────────────────────────────

export const ErdEntityNode = memo(({ id, selected, data }: NodeProps) => {
  const dd = d(data);
  const tableName = dd.label ?? 'Entity';
  const fields: { name: string; type: string; pk?: boolean }[] = dd.fields ?? [
    { name: 'id', type: 'INT', pk: true },
    { name: 'name', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
  ];

  return (
    <NodeShell id={id} selected={selected} data={dd} accent="#06b6d4" icon={I.table} handles="all" handleColor="#06b6d4">
      <div className="min-w-[180px] rounded-lg border-2 border-[#06b6d4]/50 shadow-lg overflow-hidden" style={bodyStyle(dd)}>
        <div className="px-3 py-2 bg-[#06b6d4]/15 border-b border-[#06b6d4]/30">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" />
            </svg>
            <span className="text-[0.78rem] font-bold text-text-primary uppercase tracking-wide">{tableName}</span>
          </div>
        </div>
        <div className="bg-bg-card">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle last:border-b-0 text-[0.72rem]">
              {f.pk && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              )}
              <span className={`font-medium ${f.pk ? 'text-warning' : 'text-text-primary'}`}>{f.name}</span>
              <span className="ml-auto text-text-muted font-mono text-[0.65rem]">{f.type}</span>
            </div>
          ))}
        </div>
      </div>
    </NodeShell>
  );
});
ErdEntityNode.displayName = 'ErdEntityNode';

// ── Class Diagram Node ─────────────────────────────────────────────────────

export const ClassNode = memo(({ id, selected, data }: NodeProps) => {
  const cd = d(data);
  const className_ = cd.label ?? 'ClassName';
  const properties: string[] = cd.properties ?? ['- id: int', '- name: string'];
  const methods: string[] = cd.methods ?? ['+ getId(): int', '+ getName(): string'];

  return (
    <NodeShell id={id} selected={selected} data={cd} accent="#a855f7" icon={I.class} handles="all" handleColor="#a855f7">
      <div className="min-w-[200px] rounded-lg border-2 border-[#a855f7]/50 shadow-lg overflow-hidden" style={bodyStyle(cd)}>
        <div className="px-3 py-2 bg-[#a855f7]/15 border-b border-[#a855f7]/30 text-center">
          <span className="text-[0.8rem] font-bold text-text-primary">{className_}</span>
        </div>
        <div className="bg-bg-card border-b border-border-subtle px-3 py-1.5">
          {properties.map((p, i) => (
            <div key={i} className="text-[0.7rem] font-mono text-text-secondary py-0.5">{p}</div>
          ))}
        </div>
        <div className="bg-bg-card px-3 py-1.5">
          {methods.map((m, i) => (
            <div key={i} className="text-[0.7rem] font-mono text-text-secondary py-0.5">{m}</div>
          ))}
        </div>
      </div>
    </NodeShell>
  );
});
ClassNode.displayName = 'ClassNode';

// ── UML Nodes ──────────────────────────────────────────────────────────────

export const ComponentNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#3b82f6" icon={I.component}>
    <div className="px-4 py-3 rounded-lg bg-bg-card border-2 border-[#3b82f6]/40 text-text-primary shadow-md min-w-[140px] relative" style={bodyStyle(d(data))}>
      <div className="absolute -top-0.5 right-2 flex flex-col gap-0.5">
        <div className="w-3 h-1.5 border border-[#3b82f6]/60 bg-bg-card rounded-[1px]" />
        <div className="w-3 h-1.5 border border-[#3b82f6]/60 bg-bg-card rounded-[1px]" />
      </div>
      <div className="text-[0.7rem] text-[#3b82f6] mb-0.5">«component»</div>
      <div className="text-[0.8rem] font-bold">{d(data).label ?? 'Component'}</div>
    </div>
  </NodeShell>
));
ComponentNode.displayName = 'ComponentNode';

export const PackageNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#f59e0b" icon={I.package}>
    <div className="min-w-[180px] min-h-[80px] rounded-lg border-2 border-[#f59e0b]/40 bg-bg-card/50 shadow-md relative pt-7 px-4 pb-3" style={bodyStyle(d(data))}>
      <div className="absolute top-0 left-0 px-3 py-1 bg-[#f59e0b]/15 border-b-2 border-r-2 border-[#f59e0b]/40 rounded-tl-lg rounded-br-lg text-[0.7rem] font-bold text-[#f59e0b]">
        {d(data).label ?? 'Package'}
      </div>
      <div className="text-[0.72rem] text-text-muted mt-1">{d(data).description ?? 'Drag nodes inside'}</div>
    </div>
  </NodeShell>
));
PackageNode.displayName = 'PackageNode';

export const ActorNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#10b981" icon={I.actor} handleColor="#10b981">
    <div className="flex flex-col items-center gap-1 px-3 py-2 min-w-[60px]" style={bodyStyle(d(data))}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#10b981]">
        <circle cx="12" cy="5" r="3" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="11" x2="16" y2="11" /><line x1="12" y1="16" x2="8" y2="21" /><line x1="12" y1="16" x2="16" y2="21" />
      </svg>
      <span className="text-[0.72rem] font-medium text-text-primary">{d(data).label ?? 'Actor'}</span>
    </div>
  </NodeShell>
));
ActorNode.displayName = 'ActorNode';

export const UseCaseNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#8b5cf6" icon={I.useCase}>
    <div className="px-6 py-3 rounded-[50%] bg-bg-card border-2 border-[#8b5cf6]/40 text-text-primary shadow-md min-w-[130px] text-center text-[0.78rem] font-medium" style={bodyStyle(d(data))}>
      {d(data).label ?? 'Use Case'}
    </div>
  </NodeShell>
));
UseCaseNode.displayName = 'UseCaseNode';

export const NoteNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#eab308" icon={I.note} handleColor="#eab308">
    <div
      className="px-4 py-3 bg-[#fef3c7] border border-[#f59e0b]/40 text-[#92400e] shadow-md min-w-[120px] text-[0.75rem] relative"
      style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)', ...bodyStyle(d(data)) }}
    >
      {d(data).label ?? 'Note text here...'}
    </div>
  </NodeShell>
));
NoteNode.displayName = 'NoteNode';

export const InterfaceNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#06b6d4" icon={I.iface} handleColor="#06b6d4">
    <div className="px-4 py-3 rounded-lg bg-bg-card border-2 border-dashed border-[#06b6d4]/50 text-text-primary shadow-md min-w-[130px] text-center" style={bodyStyle(d(data))}>
      <div className="text-[0.65rem] text-[#06b6d4] mb-0.5">«interface»</div>
      <div className="text-[0.8rem] font-bold">{d(data).label ?? 'Interface'}</div>
    </div>
  </NodeShell>
));
InterfaceNode.displayName = 'InterfaceNode';

// ── C4 Nodes ───────────────────────────────────────────────────────────────

export const C4PersonNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#08427b" icon={I.person}>
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg bg-[#08427b] border-2 border-[#08427b] shadow-lg min-w-[120px]" style={bodyStyle(d(data))}>
      <div className="w-8 h-8 rounded-full bg-[#1a6bc4] flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      </div>
      <span className="text-[0.78rem] font-bold text-white">{d(data).label ?? 'Person'}</span>
      <span className="text-[0.6rem] text-blue-200 text-center">{d(data).description ?? 'Description'}</span>
    </div>
  </NodeShell>
));
C4PersonNode.displayName = 'C4PersonNode';

export const C4SystemNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#1168bd" icon={I.system}>
    <div className="px-5 py-4 rounded-lg bg-[#1168bd] border-2 border-[#0b4884] shadow-lg min-w-[160px] text-center" style={bodyStyle(d(data))}>
      <div className="text-[0.82rem] font-bold text-white">{d(data).label ?? 'System'}</div>
      <div className="text-[0.65rem] text-blue-200 mt-1">{d(data).description ?? 'Software System'}</div>
    </div>
  </NodeShell>
));
C4SystemNode.displayName = 'C4SystemNode';

export const C4ContainerNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#438dd5" icon={I.system}>
    <div className="px-5 py-4 rounded-lg bg-[#438dd5] border-2 border-[#2d6da3] shadow-lg min-w-[160px] text-center" style={bodyStyle(d(data))}>
      <div className="text-[0.82rem] font-bold text-white">{d(data).label ?? 'Container'}</div>
      <div className="text-[0.6rem] text-blue-100 mt-0.5">{d(data).technology ?? 'Technology'}</div>
      <div className="text-[0.6rem] text-blue-200 mt-1">{d(data).description ?? 'Description'}</div>
    </div>
  </NodeShell>
));
C4ContainerNode.displayName = 'C4ContainerNode';

// ── Cloud / Infrastructure Nodes ───────────────────────────────────────────

export const ServerNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#64748b" icon={I.server}>
    <div className="px-4 py-3 rounded-lg bg-bg-card border-2 border-[#64748b]/40 shadow-md min-w-[120px] flex items-center gap-2.5" style={bodyStyle(d(data))}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><circle cx="6" cy="6" r="1" fill="#64748b" /><circle cx="6" cy="18" r="1" fill="#64748b" /></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Server'}</span>
    </div>
  </NodeShell>
));
ServerNode.displayName = 'ServerNode';

export const DatabaseNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#47a248" icon={I.database} handleColor="#47a248">
    <div className="flex flex-col items-center gap-0 min-w-[100px]" style={bodyStyle(d(data))}>
      <svg width="60" height="40" viewBox="0 0 60 40" className="shrink-0">
        <ellipse cx="30" cy="8" rx="28" ry="7" fill="none" stroke="#47a248" strokeWidth="2" />
        <path d="M2 8 v24 c0 3.87 12.54 7 28 7 s28-3.13 28-7 V8" fill="none" stroke="#47a248" strokeWidth="2" />
        <ellipse cx="30" cy="32" rx="28" ry="7" fill="none" stroke="#47a248" strokeWidth="2" opacity="0.3" />
      </svg>
      <span className="text-[0.75rem] font-medium text-text-primary mt-1">{d(data).label ?? 'Database'}</span>
    </div>
  </NodeShell>
));
DatabaseNode.displayName = 'DatabaseNode';

export const CloudNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#38bdf8" icon={I.cloud}>
    <div className="px-5 py-3 rounded-2xl bg-bg-card border-2 border-[#38bdf8]/40 shadow-md min-w-[130px] flex items-center gap-2.5" style={bodyStyle(d(data))}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" /></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Cloud Service'}</span>
    </div>
  </NodeShell>
));
CloudNode.displayName = 'CloudNode';

export const LoadBalancerNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#f59e0b" icon={I.lb}>
    <div className="px-4 py-3 rounded-lg bg-[#f59e0b]/10 border-2 border-[#f59e0b]/40 shadow-md min-w-[130px] flex items-center gap-2.5" style={bodyStyle(d(data))}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" /></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Load Balancer'}</span>
    </div>
  </NodeShell>
));
LoadBalancerNode.displayName = 'LoadBalancerNode';

export const ApiGatewayNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#f97316" icon={I.api}>
    <div className="px-4 py-3 rounded-lg bg-[#f97316]/10 border-2 border-[#f97316]/40 shadow-md min-w-[130px] flex items-center gap-2.5" style={bodyStyle(d(data))}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" /></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'API Gateway'}</span>
    </div>
  </NodeShell>
));
ApiGatewayNode.displayName = 'ApiGatewayNode';

export const QueueNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#7c3aed" icon={I.queue}>
    <div className="px-4 py-3 rounded-lg bg-[#7c3aed]/10 border-2 border-[#7c3aed]/40 shadow-md min-w-[130px] flex items-center gap-2.5" style={bodyStyle(d(data))}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><rect x="2" y="6" width="5" height="12" rx="1" /><rect x="9.5" y="6" width="5" height="12" rx="1" /><rect x="17" y="6" width="5" height="12" rx="1" /></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Message Queue'}</span>
    </div>
  </NodeShell>
));
QueueNode.displayName = 'QueueNode';

export const ContainerDockerNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#0ea5e9" icon={I.docker}>
    <div className="px-4 py-3 rounded-lg bg-[#0ea5e9]/10 border-2 border-[#0ea5e9]/40 shadow-md min-w-[130px] flex items-center gap-2.5" style={bodyStyle(d(data))}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5"><rect x="1" y="10" width="22" height="11" rx="2" /><rect x="4" y="4" width="4" height="4" rx="0.5" /><rect x="10" y="4" width="4" height="4" rx="0.5" /><rect x="16" y="6" width="4" height="2" rx="0.5" /></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Container'}</span>
    </div>
  </NodeShell>
));
ContainerDockerNode.displayName = 'ContainerDockerNode';

// ── Swimlane / Group Node ──────────────────────────────────────────────────

export const GroupNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.group} handleColor="#94a3b8">
    <div className="min-w-[250px] min-h-[150px] rounded-xl border-2 border-dashed border-[#94a3b8]/50 bg-[#94a3b8]/5 p-3" style={bodyStyle(d(data))}>
      <div className="text-[0.7rem] font-bold text-[#94a3b8] uppercase tracking-wider">{d(data).label ?? 'Group'}</div>
    </div>
  </NodeShell>
));
GroupNode.displayName = 'GroupNode';

// ── Text Annotation Node ───────────────────────────────────────────────────

export const TextAnnotationNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.text}>
    <div className="px-3 py-2 min-w-[80px]" style={bodyStyle(d(data))}>
      <div className="text-[0.82rem] text-text-primary font-medium whitespace-pre-wrap">{d(data).label ?? 'Text'}</div>
    </div>
  </NodeShell>
));
TextAnnotationNode.displayName = 'TextAnnotationNode';

// ── Standard Geometric Shapes ──────────────────────────────────────────────

export const RectangleNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.rectangle}>
    <div className="px-5 py-3 bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md min-w-[100px] text-center" style={bodyStyle(d(data))}>
      {d(data).label ?? 'Rectangle'}
    </div>
  </NodeShell>
));
RectangleNode.displayName = 'RectangleNode';

export const RoundedRectNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.rounded}>
    <div className="px-5 py-3 rounded-xl bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md min-w-[100px] text-center" style={bodyStyle(d(data))}>
      {d(data).label ?? 'Rounded'}
    </div>
  </NodeShell>
));
RoundedRectNode.displayName = 'RoundedRectNode';

export const CircleNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.circle}>
    <div className="w-[90px] h-[90px] rounded-full bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md flex items-center justify-center text-center text-[0.75rem]" style={bodyStyle(d(data))}>
      {d(data).label ?? 'Circle'}
    </div>
  </NodeShell>
));
CircleNode.displayName = 'CircleNode';

export const TriangleNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.triangle}>
    <div className="w-[100px] h-[90px] flex items-center justify-center text-text-primary text-[0.75rem] text-center relative" style={bodyStyle(d(data))}>
      <svg viewBox="0 0 100 90" className="absolute inset-0 w-full h-full"><polygon points="50,5 95,85 5,85" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /></svg>
      <span className="relative z-10 mt-3">{d(data).label ?? '△'}</span>
    </div>
  </NodeShell>
));
TriangleNode.displayName = 'TriangleNode';

export const HexagonNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.hexagon}>
    <div
      className="px-6 py-3 bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md min-w-[110px] text-center text-[0.78rem]"
      style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', ...bodyStyle(d(data)) }}
    >
      {d(data).label ?? 'Hexagon'}
    </div>
  </NodeShell>
));
HexagonNode.displayName = 'HexagonNode';

export const DiamondNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.diamond}>
    <div
      className="w-[90px] h-[90px] bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md flex items-center justify-center text-[0.7rem] text-center"
      style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', ...bodyStyle(d(data)) }}
    >
      {d(data).label ?? '◇'}
    </div>
  </NodeShell>
));
DiamondNode.displayName = 'DiamondNode';

export const StarNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.star}>
    <div className="w-[90px] h-[90px] flex items-center justify-center text-text-primary text-[0.7rem] relative" style={bodyStyle(d(data))}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /></svg>
      <span className="relative z-10">{d(data).label ?? '★'}</span>
    </div>
  </NodeShell>
));
StarNode.displayName = 'StarNode';

export const CylinderNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.cylinder}>
    <div className="flex flex-col items-center min-w-[80px]" style={bodyStyle(d(data))}>
      <svg width="80" height="70" viewBox="0 0 80 70"><ellipse cx="40" cy="10" rx="38" ry="9" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /><rect x="2" y="10" width="76" height="45" fill="var(--color-bg-card)" /><line x1="2" y1="10" x2="2" y2="55" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /><line x1="78" y1="10" x2="78" y2="55" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /><ellipse cx="40" cy="55" rx="38" ry="9" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /></svg>
      <span className="text-[0.75rem] text-text-primary -mt-8 relative z-10">{d(data).label ?? 'Cylinder'}</span>
    </div>
  </NodeShell>
));
CylinderNode.displayName = 'CylinderNode';

export const ArrowShapeNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.arrow}>
    <div
      className="w-[120px] h-[50px] flex items-center justify-center text-text-primary text-[0.75rem]"
      style={{ clipPath: 'polygon(0% 20%, 70% 20%, 70% 0%, 100% 50%, 70% 100%, 70% 80%, 0% 80%)', background: d(data).bgColor ?? 'var(--color-bg-card)', border: '2px solid rgba(148,163,184,0.3)' }}
    >
      {d(data).label ?? '→'}
    </div>
  </NodeShell>
));
ArrowShapeNode.displayName = 'ArrowShapeNode';

export const CrossNode = memo(({ id, selected, data }: NodeProps) => (
  <NodeShell id={id} selected={selected} data={d(data)} accent="#94a3b8" icon={I.cross}>
    <div
      className="w-[80px] h-[80px] flex items-center justify-center text-text-primary text-[0.7rem]"
      style={{ clipPath: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)', background: d(data).bgColor ?? 'var(--color-bg-card)', border: '2px solid rgba(148,163,184,0.3)' }}
    >
      {d(data).label ?? '+'}
    </div>
  </NodeShell>
));
CrossNode.displayName = 'CrossNode';

// ── Node type map ───────────────────────────────────────────────────────────

export const customNodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  terminator: TerminatorNode,
  data: DataNode,
  service: ServiceNode,
  erdEntity: ErdEntityNode,
  class: ClassNode,
  component: ComponentNode,
  package: PackageNode,
  actor: ActorNode,
  useCase: UseCaseNode,
  note: NoteNode,
  interface: InterfaceNode,
  c4Person: C4PersonNode,
  c4System: C4SystemNode,
  c4Container: C4ContainerNode,
  server: ServerNode,
  database: DatabaseNode,
  cloud: CloudNode,
  loadBalancer: LoadBalancerNode,
  apiGateway: ApiGatewayNode,
  queue: QueueNode,
  containerDocker: ContainerDockerNode,
  group: GroupNode,
  textAnnotation: TextAnnotationNode,
  rectangle: RectangleNode,
  roundedRect: RoundedRectNode,
  circle: CircleNode,
  triangle: TriangleNode,
  hexagon: HexagonNode,
  diamond: DiamondNode,
  star: StarNode,
  cylinder: CylinderNode,
  arrowShape: ArrowShapeNode,
  cross: CrossNode,
};
