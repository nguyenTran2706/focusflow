/* eslint-disable react-refresh/only-export-components */
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface LabelData { label?: string; description?: string; technology?: string; fields?: { name: string; type: string; pk?: boolean }[]; properties?: string[]; methods?: string[]; [key: string]: unknown }
const d = (data: Record<string, unknown>) => data as LabelData;

function NodeWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[0.8rem] font-medium transition-shadow ${className}`}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-bg-root" />
      {children}
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-bg-root" />
    </div>
  );
}

// ── Flowchart Nodes ────────────────────────────────────────────────────────

export const ProcessNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-5 py-3 rounded-lg bg-bg-card border-2 border-accent/40 text-text-primary shadow-md min-w-[120px] text-center">
      {d(data).label ?? 'Process'}
    </div>
  </NodeWrapper>
));
ProcessNode.displayName = 'ProcessNode';

export const DecisionNode = memo(({ data }: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-warning !border-2 !border-bg-root !top-0" />
    <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-warning !border-2 !border-bg-root !bottom-0" />
    <Handle type="source" position={Position.Right} id="right" className="!w-2.5 !h-2.5 !bg-warning !border-2 !border-bg-root" />
    <Handle type="source" position={Position.Left} id="left" className="!w-2.5 !h-2.5 !bg-warning !border-2 !border-bg-root" />
    <div
      className="w-[120px] h-[120px] flex items-center justify-center bg-bg-card border-2 border-warning/50 text-text-primary shadow-md text-[0.75rem] font-medium text-center p-2"
      style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
    >
      {d(data).label ?? 'Decision'}
    </div>
  </div>
));
DecisionNode.displayName = 'DecisionNode';

export const TerminatorNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-6 py-2.5 rounded-full bg-bg-card border-2 border-success/40 text-text-primary shadow-md min-w-[100px] text-center">
      {d(data).label ?? 'Start/End'}
    </div>
  </NodeWrapper>
));
TerminatorNode.displayName = 'TerminatorNode';

export const DataNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div
      className="px-7 py-3 bg-bg-card border-2 border-[#8b5cf6]/40 text-text-primary shadow-md min-w-[120px] text-center"
      style={{ clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' }}
    >
      {d(data).label ?? 'Data'}
    </div>
  </NodeWrapper>
));
DataNode.displayName = 'DataNode';

export const ServiceNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-xl bg-bg-card border-2 border-[#ec4899]/40 text-text-primary shadow-md min-w-[130px] flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-md bg-[#ec4899]/15 flex items-center justify-center shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </div>
      <span>{d(data).label ?? 'Service'}</span>
    </div>
  </NodeWrapper>
));
ServiceNode.displayName = 'ServiceNode';

// ── ERD Entity Node ────────────────────────────────────────────────────────

export const ErdEntityNode = memo(({ data }: NodeProps) => {
  const dd = d(data);
  const tableName = dd.label ?? 'Entity';
  const fields: { name: string; type: string; pk?: boolean }[] = dd.fields ?? [
    { name: 'id', type: 'INT', pk: true },
    { name: 'name', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
  ];

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-[#06b6d4] !border-2 !border-bg-root" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-[#06b6d4] !border-2 !border-bg-root" />
      <Handle type="target" position={Position.Left} id="left" className="!w-2.5 !h-2.5 !bg-[#06b6d4] !border-2 !border-bg-root" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2.5 !h-2.5 !bg-[#06b6d4] !border-2 !border-bg-root" />
      <div className="min-w-[180px] rounded-lg border-2 border-[#06b6d4]/50 shadow-lg overflow-hidden">
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
    </div>
  );
});
ErdEntityNode.displayName = 'ErdEntityNode';

// ── Class Diagram Node ─────────────────────────────────────────────────────

export const ClassNode = memo(({ data }: NodeProps) => {
  const cd = d(data);
  const className_ = cd.label ?? 'ClassName';
  const properties: string[] = cd.properties ?? ['- id: int', '- name: string'];
  const methods: string[] = cd.methods ?? ['+ getId(): int', '+ getName(): string'];

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-[#a855f7] !border-2 !border-bg-root" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-[#a855f7] !border-2 !border-bg-root" />
      <Handle type="target" position={Position.Left} id="left" className="!w-2.5 !h-2.5 !bg-[#a855f7] !border-2 !border-bg-root" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2.5 !h-2.5 !bg-[#a855f7] !border-2 !border-bg-root" />
      <div className="min-w-[200px] rounded-lg border-2 border-[#a855f7]/50 shadow-lg overflow-hidden">
        {/* Class name header */}
        <div className="px-3 py-2 bg-[#a855f7]/15 border-b border-[#a855f7]/30 text-center">
          <span className="text-[0.8rem] font-bold text-text-primary">{className_}</span>
        </div>
        {/* Properties */}
        <div className="bg-bg-card border-b border-border-subtle px-3 py-1.5">
          {properties.map((p, i) => (
            <div key={i} className="text-[0.7rem] font-mono text-text-secondary py-0.5">{p}</div>
          ))}
        </div>
        {/* Methods */}
        <div className="bg-bg-card px-3 py-1.5">
          {methods.map((m, i) => (
            <div key={i} className="text-[0.7rem] font-mono text-text-secondary py-0.5">{m}</div>
          ))}
        </div>
      </div>
    </div>
  );
});
ClassNode.displayName = 'ClassNode';

// ── UML Nodes ──────────────────────────────────────────────────────────────

export const ComponentNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-lg bg-bg-card border-2 border-[#3b82f6]/40 text-text-primary shadow-md min-w-[140px]">
      <div className="absolute -top-0.5 right-2 flex flex-col gap-0.5">
        <div className="w-3 h-1.5 border border-[#3b82f6]/60 bg-bg-card rounded-[1px]" />
        <div className="w-3 h-1.5 border border-[#3b82f6]/60 bg-bg-card rounded-[1px]" />
      </div>
      <div className="text-[0.7rem] text-[#3b82f6] mb-0.5">«component»</div>
      <div className="text-[0.8rem] font-bold">{d(data).label ?? 'Component'}</div>
    </div>
  </NodeWrapper>
));
ComponentNode.displayName = 'ComponentNode';

export const PackageNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="min-w-[180px] min-h-[80px] rounded-lg border-2 border-[#f59e0b]/40 bg-bg-card/50 shadow-md relative pt-7 px-4 pb-3">
      <div className="absolute top-0 left-0 px-3 py-1 bg-[#f59e0b]/15 border-b-2 border-r-2 border-[#f59e0b]/40 rounded-tl-lg rounded-br-lg text-[0.7rem] font-bold text-[#f59e0b]">
        {d(data).label ?? 'Package'}
      </div>
      <div className="text-[0.72rem] text-text-muted mt-1">{d(data).description ?? 'Drag nodes inside'}</div>
    </div>
  </NodeWrapper>
));
PackageNode.displayName = 'PackageNode';

export const ActorNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="flex flex-col items-center gap-1 px-3 py-2 min-w-[60px]">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#10b981]">
        <circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="8" y2="21"/><line x1="12" y1="16" x2="16" y2="21"/>
      </svg>
      <span className="text-[0.72rem] font-medium text-text-primary">{d(data).label ?? 'Actor'}</span>
    </div>
  </NodeWrapper>
));
ActorNode.displayName = 'ActorNode';

export const UseCaseNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-6 py-3 rounded-[50%] bg-bg-card border-2 border-[#8b5cf6]/40 text-text-primary shadow-md min-w-[130px] text-center text-[0.78rem] font-medium">
      {d(data).label ?? 'Use Case'}
    </div>
  </NodeWrapper>
));
UseCaseNode.displayName = 'UseCaseNode';

export const NoteNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 bg-[#fef3c7] border border-[#f59e0b]/40 text-[#92400e] shadow-md min-w-[120px] text-[0.75rem] relative" style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
      {d(data).label ?? 'Note text here...'}
    </div>
  </NodeWrapper>
));
NoteNode.displayName = 'NoteNode';

export const InterfaceNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-lg bg-bg-card border-2 border-dashed border-[#06b6d4]/50 text-text-primary shadow-md min-w-[130px] text-center">
      <div className="text-[0.65rem] text-[#06b6d4] mb-0.5">«interface»</div>
      <div className="text-[0.8rem] font-bold">{d(data).label ?? 'Interface'}</div>
    </div>
  </NodeWrapper>
));
InterfaceNode.displayName = 'InterfaceNode';

// ── C4 Nodes ───────────────────────────────────────────────────────────────

export const C4PersonNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg bg-[#08427b] border-2 border-[#08427b] shadow-lg min-w-[120px]">
      <div className="w-8 h-8 rounded-full bg-[#1a6bc4] flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <span className="text-[0.78rem] font-bold text-white">{d(data).label ?? 'Person'}</span>
      <span className="text-[0.6rem] text-blue-200 text-center">{d(data).description ?? 'Description'}</span>
    </div>
  </NodeWrapper>
));
C4PersonNode.displayName = 'C4PersonNode';

export const C4SystemNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-5 py-4 rounded-lg bg-[#1168bd] border-2 border-[#0b4884] shadow-lg min-w-[160px] text-center">
      <div className="text-[0.82rem] font-bold text-white">{d(data).label ?? 'System'}</div>
      <div className="text-[0.65rem] text-blue-200 mt-1">{d(data).description ?? 'Software System'}</div>
    </div>
  </NodeWrapper>
));
C4SystemNode.displayName = 'C4SystemNode';

export const C4ContainerNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-5 py-4 rounded-lg bg-[#438dd5] border-2 border-[#2d6da3] shadow-lg min-w-[160px] text-center">
      <div className="text-[0.82rem] font-bold text-white">{d(data).label ?? 'Container'}</div>
      <div className="text-[0.6rem] text-blue-100 mt-0.5">{d(data).technology ?? 'Technology'}</div>
      <div className="text-[0.6rem] text-blue-200 mt-1">{d(data).description ?? 'Description'}</div>
    </div>
  </NodeWrapper>
));
C4ContainerNode.displayName = 'C4ContainerNode';

// ── Cloud / Infrastructure Nodes ───────────────────────────────────────────

export const ServerNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-lg bg-bg-card border-2 border-[#64748b]/40 shadow-md min-w-[120px] flex items-center gap-2.5">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="#64748b"/><circle cx="6" cy="18" r="1" fill="#64748b"/></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Server'}</span>
    </div>
  </NodeWrapper>
));
ServerNode.displayName = 'ServerNode';

export const DatabaseNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="flex flex-col items-center gap-0 min-w-[100px]">
      <svg width="60" height="40" viewBox="0 0 60 40" className="shrink-0">
        <ellipse cx="30" cy="8" rx="28" ry="7" fill="none" stroke="#47a248" strokeWidth="2"/>
        <path d="M2 8 v24 c0 3.87 12.54 7 28 7 s28-3.13 28-7 V8" fill="none" stroke="#47a248" strokeWidth="2"/>
        <ellipse cx="30" cy="32" rx="28" ry="7" fill="none" stroke="#47a248" strokeWidth="2" opacity="0.3"/>
      </svg>
      <span className="text-[0.75rem] font-medium text-text-primary mt-1">{d(data).label ?? 'Database'}</span>
    </div>
  </NodeWrapper>
));
DatabaseNode.displayName = 'DatabaseNode';

export const CloudNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-5 py-3 rounded-2xl bg-bg-card border-2 border-[#38bdf8]/40 shadow-md min-w-[130px] flex items-center gap-2.5">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Cloud Service'}</span>
    </div>
  </NodeWrapper>
));
CloudNode.displayName = 'CloudNode';

export const LoadBalancerNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-lg bg-[#f59e0b]/10 border-2 border-[#f59e0b]/40 shadow-md min-w-[130px] flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Load Balancer'}</span>
    </div>
  </NodeWrapper>
));
LoadBalancerNode.displayName = 'LoadBalancerNode';

export const ApiGatewayNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-lg bg-[#f97316]/10 border-2 border-[#f97316]/40 shadow-md min-w-[130px] flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4"/></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'API Gateway'}</span>
    </div>
  </NodeWrapper>
));
ApiGatewayNode.displayName = 'ApiGatewayNode';

export const QueueNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-lg bg-[#7c3aed]/10 border-2 border-[#7c3aed]/40 shadow-md min-w-[130px] flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><rect x="2" y="6" width="5" height="12" rx="1"/><rect x="9.5" y="6" width="5" height="12" rx="1"/><rect x="17" y="6" width="5" height="12" rx="1"/></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Message Queue'}</span>
    </div>
  </NodeWrapper>
));
QueueNode.displayName = 'QueueNode';

export const ContainerDockerNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-lg bg-[#0ea5e9]/10 border-2 border-[#0ea5e9]/40 shadow-md min-w-[130px] flex items-center gap-2.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5"><rect x="1" y="10" width="22" height="11" rx="2"/><rect x="4" y="4" width="4" height="4" rx="0.5"/><rect x="10" y="4" width="4" height="4" rx="0.5"/><rect x="16" y="6" width="4" height="2" rx="0.5"/></svg>
      <span className="text-[0.78rem] font-medium text-text-primary">{d(data).label ?? 'Container'}</span>
    </div>
  </NodeWrapper>
));
ContainerDockerNode.displayName = 'ContainerDockerNode';

// ── Swimlane / Group Node ──────────────────────────────────────────────────

export const GroupNode = memo(({ data }: NodeProps) => (
  <div className="min-w-[250px] min-h-[150px] rounded-xl border-2 border-dashed border-[#94a3b8]/50 bg-[#94a3b8]/5 p-3 relative">
    <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-[#94a3b8] !border-2 !border-bg-root" />
    <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-[#94a3b8] !border-2 !border-bg-root" />
    <div className="text-[0.7rem] font-bold text-[#94a3b8] uppercase tracking-wider">{d(data).label ?? 'Group'}</div>
  </div>
));
GroupNode.displayName = 'GroupNode';

// ── Text Annotation Node ───────────────────────────────────────────────────

export const TextAnnotationNode = memo(({ data }: NodeProps) => (
  <div className="px-3 py-2 min-w-[80px]">
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-text-muted !border-2 !border-bg-root !opacity-0 hover:!opacity-100" />
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-text-muted !border-2 !border-bg-root !opacity-0 hover:!opacity-100" />
    <div className="text-[0.82rem] text-text-primary font-medium whitespace-pre-wrap">{d(data).label ?? 'Text'}</div>
  </div>
));
TextAnnotationNode.displayName = 'TextAnnotationNode';

// ── Standard Geometric Shapes ──────────────────────────────────────────────

export const RectangleNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-5 py-3 bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md min-w-[100px] text-center">{d(data).label ?? 'Rectangle'}</div>
  </NodeWrapper>
));
RectangleNode.displayName = 'RectangleNode';

export const RoundedRectNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-5 py-3 rounded-xl bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md min-w-[100px] text-center">{d(data).label ?? 'Rounded'}</div>
  </NodeWrapper>
));
RoundedRectNode.displayName = 'RoundedRectNode';

export const CircleNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="w-[90px] h-[90px] rounded-full bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md flex items-center justify-center text-center text-[0.75rem]">{d(data).label ?? 'Circle'}</div>
  </NodeWrapper>
));
CircleNode.displayName = 'CircleNode';

export const TriangleNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="w-[100px] h-[90px] flex items-center justify-center text-text-primary text-[0.75rem] text-center relative">
      <svg viewBox="0 0 100 90" className="absolute inset-0 w-full h-full"><polygon points="50,5 95,85 5,85" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /></svg>
      <span className="relative z-10 mt-3">{d(data).label ?? '△'}</span>
    </div>
  </NodeWrapper>
));
TriangleNode.displayName = 'TriangleNode';

export const HexagonNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-6 py-3 bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md min-w-[110px] text-center text-[0.78rem]"
      style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}>
      {d(data).label ?? 'Hexagon'}
    </div>
  </NodeWrapper>
));
HexagonNode.displayName = 'HexagonNode';

export const DiamondNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="w-[90px] h-[90px] bg-bg-card border-2 border-text-muted/30 text-text-primary shadow-md flex items-center justify-center text-[0.7rem] text-center"
      style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
      {d(data).label ?? '◇'}
    </div>
  </NodeWrapper>
));
DiamondNode.displayName = 'DiamondNode';

export const StarNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="w-[90px] h-[90px] flex items-center justify-center text-text-primary text-[0.7rem] relative">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40" /></svg>
      <span className="relative z-10">{d(data).label ?? '★'}</span>
    </div>
  </NodeWrapper>
));
StarNode.displayName = 'StarNode';

export const CylinderNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="flex flex-col items-center min-w-[80px]">
      <svg width="80" height="70" viewBox="0 0 80 70"><ellipse cx="40" cy="10" rx="38" ry="9" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40"/><rect x="2" y="10" width="76" height="45" fill="var(--color-bg-card)" /><line x1="2" y1="10" x2="2" y2="55" stroke="currentColor" strokeWidth="2" className="text-text-muted/40"/><line x1="78" y1="10" x2="78" y2="55" stroke="currentColor" strokeWidth="2" className="text-text-muted/40"/><ellipse cx="40" cy="55" rx="38" ry="9" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/40"/></svg>
      <span className="text-[0.75rem] text-text-primary -mt-8 relative z-10">{d(data).label ?? 'Cylinder'}</span>
    </div>
  </NodeWrapper>
));
CylinderNode.displayName = 'CylinderNode';

export const ArrowShapeNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="w-[120px] h-[50px] flex items-center justify-center text-text-primary text-[0.75rem]"
      style={{ clipPath: 'polygon(0% 20%, 70% 20%, 70% 0%, 100% 50%, 70% 100%, 70% 80%, 0% 80%)', background: 'var(--color-bg-card)', border: '2px solid rgba(148,163,184,0.3)' }}>
      {d(data).label ?? '→'}
    </div>
  </NodeWrapper>
));
ArrowShapeNode.displayName = 'ArrowShapeNode';

export const CrossNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="w-[80px] h-[80px] flex items-center justify-center text-text-primary text-[0.7rem]"
      style={{ clipPath: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)', background: 'var(--color-bg-card)', border: '2px solid rgba(148,163,184,0.3)' }}>
      {d(data).label ?? '+'}
    </div>
  </NodeWrapper>
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
