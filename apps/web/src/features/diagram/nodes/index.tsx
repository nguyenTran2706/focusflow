import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

// ── Shared node wrapper ─────────────────────────────────────────────────────

function NodeWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[0.8rem] font-medium transition-shadow ${className}`}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-bg-root" />
      {children}
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-bg-root" />
    </div>
  );
}

// ── Process Node (rectangle) ────────────────────────────────────────────────

export const ProcessNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-5 py-3 rounded-lg bg-bg-card border-2 border-accent/40 text-text-primary shadow-md min-w-[120px] text-center">
      {(data as any).label ?? 'Process'}
    </div>
  </NodeWrapper>
));
ProcessNode.displayName = 'ProcessNode';

// ── Decision Node (diamond shape via clip-path) ─────────────────────────────

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
      {(data as any).label ?? 'Decision'}
    </div>
  </div>
));
DecisionNode.displayName = 'DecisionNode';

// ── Terminator Node (pill/rounded) ──────────────────────────────────────────

export const TerminatorNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-6 py-2.5 rounded-full bg-bg-card border-2 border-success/40 text-text-primary shadow-md min-w-[100px] text-center">
      {(data as any).label ?? 'Start/End'}
    </div>
  </NodeWrapper>
));
TerminatorNode.displayName = 'TerminatorNode';

// ── Data Node (parallelogram) ───────────────────────────────────────────────

export const DataNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div
      className="px-7 py-3 bg-bg-card border-2 border-[#8b5cf6]/40 text-text-primary shadow-md min-w-[120px] text-center"
      style={{ clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' }}
    >
      {(data as any).label ?? 'Data'}
    </div>
  </NodeWrapper>
));
DataNode.displayName = 'DataNode';

// ── Service Node (rounded rect with icon) ───────────────────────────────────

export const ServiceNode = memo(({ data }: NodeProps) => (
  <NodeWrapper>
    <div className="px-4 py-3 rounded-xl bg-bg-card border-2 border-[#ec4899]/40 text-text-primary shadow-md min-w-[130px] flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-md bg-[#ec4899]/15 flex items-center justify-center shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </div>
      <span>{(data as any).label ?? 'Service'}</span>
    </div>
  </NodeWrapper>
));
ServiceNode.displayName = 'ServiceNode';

// ── Node type map ───────────────────────────────────────────────────────────

export const customNodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  terminator: TerminatorNode,
  data: DataNode,
  service: ServiceNode,
};
