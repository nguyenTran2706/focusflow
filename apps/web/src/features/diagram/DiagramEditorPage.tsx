import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { useDiagram, useUpdateDiagram } from './hooks/useDiagram';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type EdgeTypes,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';
import { toPng, toSvg } from 'html-to-image';
import { useRealtime } from '../../hooks/useRealtime';
import { useThemeStore, getEffectiveTheme } from '../../lib/theme-store';
import { customNodeTypes } from './nodes';
import { DIAGRAM_TEMPLATES, type DiagramTemplate } from './DiagramTemplates';

// ── Edge / Arrow type options ───────────────────────────────────────────────
interface EdgeData { label?: string; [key: string]: unknown }
interface NodeData { label?: string; fontSize?: number; fontFamily?: string; textColor?: string; bgColor?: string; [key: string]: unknown }

type EdgeStyle = 'bezier' | 'straight' | 'smoothstep' | 'step';

type ArrowType = 'arrow' | 'open-arrow' | 'none' | 'dashed' | 'dotted' | 'bidirectional' | 'erd-1-1' | 'erd-1-n' | 'erd-n-m';

type LineWeight = 1 | 2 | 3 | 4;

function getEdgeStyle(arrowType: ArrowType, weight: LineWeight = 2): React.CSSProperties {
  const base: React.CSSProperties = { strokeWidth: weight };
  if (arrowType === 'dashed') return { ...base, strokeDasharray: '8 4' };
  if (arrowType === 'dotted') return { ...base, strokeDasharray: '2 3' };
  return base;
}

function getMarkerEnd(arrowType: ArrowType): string {
  if (arrowType === 'none') return '';
  if (arrowType === 'open-arrow') return 'url(#open-arrow)';
  if (arrowType === 'erd-1-1') return 'url(#erd-one)';
  if (arrowType === 'erd-1-n') return 'url(#erd-many)';
  if (arrowType === 'erd-n-m') return 'url(#erd-many)';
  return 'url(#arrow)';
}

function getMarkerStart(arrowType: ArrowType): string {
  if (arrowType === 'bidirectional') return 'url(#arrow-rev)';
  if (arrowType === 'erd-n-m') return 'url(#erd-many-rev)';
  if (arrowType === 'erd-1-1') return 'url(#erd-one-rev)';
  if (arrowType === 'erd-1-n') return 'url(#erd-one-rev)';
  return '';
}

function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b6f85" />
        </marker>
        <marker id="arrow-rev" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 10 0 L 0 5 L 10 10 z" fill="#6b6f85" />
        </marker>
        <marker id="open-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#6b6f85" strokeWidth="1.5" />
        </marker>
        <marker id="erd-one" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
          <line x1="8" y1="0" x2="8" y2="10" stroke="#6b6f85" strokeWidth="2" />
        </marker>
        <marker id="erd-one-rev" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
          <line x1="2" y1="0" x2="2" y2="10" stroke="#6b6f85" strokeWidth="2" />
        </marker>
        <marker id="erd-many" viewBox="0 0 12 10" refX="10" refY="5" markerWidth="12" markerHeight="10" orient="auto-start-reverse">
          <path d="M 0 5 L 10 0 M 0 5 L 10 10 M 0 5 L 10 5" fill="none" stroke="#6b6f85" strokeWidth="1.5" />
        </marker>
        <marker id="erd-many-rev" viewBox="0 0 12 10" refX="2" refY="5" markerWidth="12" markerHeight="10" orient="auto-start-reverse">
          <path d="M 12 5 L 2 0 M 12 5 L 2 10 M 12 5 L 2 5" fill="none" stroke="#6b6f85" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  );
}

// ── Custom labeled edges for each style ────────────────────────────────────
function LabeledBezierEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, markerStart, style }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      {(data as EdgeData)?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}
            className="px-1.5 py-0.5 rounded bg-bg-card border border-border-subtle text-[0.6rem] font-medium text-text-secondary shadow-sm">
            {(data as EdgeData).label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function LabeledStraightEdge({ id, sourceX, sourceY, targetX, targetY, data, markerEnd, markerStart, style }: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      {(data as EdgeData)?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}
            className="px-1.5 py-0.5 rounded bg-bg-card border border-border-subtle text-[0.6rem] font-medium text-text-secondary shadow-sm">
            {(data as EdgeData).label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function LabeledSmoothStepEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, markerStart, style }: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      {(data as EdgeData)?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}
            className="px-1.5 py-0.5 rounded bg-bg-card border border-border-subtle text-[0.6rem] font-medium text-text-secondary shadow-sm">
            {(data as EdgeData).label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const customEdgeTypes: EdgeTypes = {
  labeled: LabeledBezierEdge,
  'labeled-straight': LabeledStraightEdge,
  'labeled-smoothstep': LabeledSmoothStepEdge,
};

// ── Visual Toolbar Popovers (Lucidchart-style) ────────────────────────────

function LineStylePicker({ edgeStyle, setEdgeStyle, arrowType, setArrowType, lineWeight, setLineWeight, onClose, anchorRef }: {
  edgeStyle: EdgeStyle; setEdgeStyle: (s: EdgeStyle) => void;
  arrowType: ArrowType; setArrowType: (a: ArrowType) => void;
  lineWeight: LineWeight; setLineWeight: (w: LineWeight) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
  }, [anchorRef]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div className="fixed z-[9999] bg-[#1e2235] border border-white/15 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 w-[280px] max-h-[70vh] overflow-y-auto"
        style={{ top: pos.top, left: pos.left }}
        onClick={(e) => e.stopPropagation()}>
        {/* Line Route */}
        <div className="mb-3">
          <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-wider mb-2">Line Route</p>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              { key: 'bezier' as EdgeStyle, icon: <svg width="28" height="16" viewBox="0 0 28 16"><path d="M2 14 C10 14 18 2 26 2" fill="none" stroke="currentColor" strokeWidth="2"/></svg> },
              { key: 'straight' as EdgeStyle, icon: <svg width="28" height="16" viewBox="0 0 28 16"><line x1="2" y1="14" x2="26" y2="2" stroke="currentColor" strokeWidth="2"/></svg> },
              { key: 'smoothstep' as EdgeStyle, icon: <svg width="28" height="16" viewBox="0 0 28 16"><path d="M2 14 L2 8 Q2 2 8 2 L26 2" fill="none" stroke="currentColor" strokeWidth="2"/></svg> },
              { key: 'step' as EdgeStyle, icon: <svg width="28" height="16" viewBox="0 0 28 16"><path d="M2 14 L2 8 L26 8 L26 2" fill="none" stroke="currentColor" strokeWidth="2"/></svg> },
            ]).map((s) => (
              <button key={s.key} className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center ${edgeStyle === s.key ? 'border-accent bg-accent/10 text-accent' : 'border-transparent hover:bg-white/[0.06] text-text-secondary'}`}
                onClick={() => setEdgeStyle(s.key)} title={s.key}>
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Line Pattern */}
        <div className="mb-3">
          <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-wider mb-2">Line Pattern</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { key: 'arrow' as ArrowType, label: 'Solid', icon: <svg width="36" height="8" viewBox="0 0 36 8"><line x1="0" y1="4" x2="36" y2="4" stroke="currentColor" strokeWidth="2"/></svg> },
              { key: 'dashed' as ArrowType, label: 'Dashed', icon: <svg width="36" height="8" viewBox="0 0 36 8"><line x1="0" y1="4" x2="36" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3"/></svg> },
              { key: 'dotted' as ArrowType, label: 'Dotted', icon: <svg width="36" height="8" viewBox="0 0 36 8"><line x1="0" y1="4" x2="36" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3"/></svg> },
            ]).map((p) => (
              <button key={p.key} className={`px-2 py-2 rounded-lg border-2 transition-all flex items-center justify-center ${arrowType === p.key || (p.key === 'arrow' && !['dashed','dotted'].includes(arrowType)) ? 'border-accent bg-accent/10 text-accent' : 'border-transparent hover:bg-white/[0.06] text-text-secondary'}`}
                onClick={() => { if (p.key === 'arrow' && ['dashed','dotted'].includes(arrowType)) setArrowType('arrow'); else setArrowType(p.key); }}>
                {p.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Line Weight */}
        <div className="mb-3">
          <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-wider mb-2">Weight</p>
          <div className="grid grid-cols-4 gap-1.5">
            {([1, 2, 3, 4] as LineWeight[]).map((w) => (
              <button key={w} className={`py-2.5 rounded-lg border-2 transition-all flex items-center justify-center ${lineWeight === w ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-white/[0.06]'}`}
                onClick={() => setLineWeight(w)}>
                <div className="w-6 rounded-full bg-text-secondary" style={{ height: w }} />
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border-subtle pt-2.5 mt-1">
          <p className="text-[0.55rem] text-text-muted text-center">Select line style before connecting nodes</p>
        </div>
      </div>
    </>,
    document.body
  );
}

function ArrowEndpointPicker({ arrowType, setArrowType, onClose, anchorRef }: {
  arrowType: ArrowType; setArrowType: (a: ArrowType) => void; onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
  }, [anchorRef]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div className="fixed z-[9999] bg-[#1e2235] border border-white/15 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 w-[220px] max-h-[70vh] overflow-y-auto"
        style={{ top: pos.top, left: pos.left }}
        onClick={(e) => e.stopPropagation()}>
        <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-wider mb-2">Arrow Endpoints</p>
        <div className="space-y-0.5">
          {([
            { key: 'none' as ArrowType, label: 'None', icon: <svg width="40" height="14" viewBox="0 0 40 14"><line x1="2" y1="7" x2="38" y2="7" stroke="currentColor" strokeWidth="2"/></svg> },
            { key: 'arrow' as ArrowType, label: 'Arrow', icon: <svg width="40" height="14" viewBox="0 0 40 14"><line x1="2" y1="7" x2="32" y2="7" stroke="currentColor" strokeWidth="2"/><polygon points="32,2 40,7 32,12" fill="currentColor"/></svg> },
            { key: 'open-arrow' as ArrowType, label: 'Open Arrow', icon: <svg width="40" height="14" viewBox="0 0 40 14"><line x1="2" y1="7" x2="32" y2="7" stroke="currentColor" strokeWidth="2"/><polyline points="32,2 40,7 32,12" fill="none" stroke="currentColor" strokeWidth="2"/></svg> },
            { key: 'bidirectional' as ArrowType, label: 'Both Ends', icon: <svg width="40" height="14" viewBox="0 0 40 14"><line x1="10" y1="7" x2="30" y2="7" stroke="currentColor" strokeWidth="2"/><polygon points="10,2 2,7 10,12" fill="currentColor"/><polygon points="30,2 38,7 30,12" fill="currentColor"/></svg> },
          ]).map((a) => (
            <button key={a.key} className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all ${arrowType === a.key ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/[0.06]'}`}
              onClick={() => { setArrowType(a.key); onClose(); }}>
              <span className="shrink-0">{a.icon}</span>
              <span className="text-[0.72rem] font-medium">{a.label}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-border-subtle mt-2 pt-2">
          <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-wider mb-2">ERD Cardinality</p>
          <div className="space-y-0.5">
            {([
              { key: 'erd-1-1' as ArrowType, label: 'One-to-One', icon: <svg width="40" height="14" viewBox="0 0 40 14"><line x1="8" y1="7" x2="32" y2="7" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="2" x2="6" y2="12" stroke="currentColor" strokeWidth="2.5"/><line x1="34" y1="2" x2="34" y2="12" stroke="currentColor" strokeWidth="2.5"/></svg> },
              { key: 'erd-1-n' as ArrowType, label: 'One-to-Many', icon: <svg width="40" height="14" viewBox="0 0 40 14"><line x1="8" y1="7" x2="30" y2="7" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="2" x2="6" y2="12" stroke="currentColor" strokeWidth="2.5"/><path d="M30 7 L38 2 M30 7 L38 12 M30 7 L38 7" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> },
              { key: 'erd-n-m' as ArrowType, label: 'Many-to-Many', icon: <svg width="40" height="14" viewBox="0 0 40 14"><line x1="10" y1="7" x2="30" y2="7" stroke="currentColor" strokeWidth="2"/><path d="M10 7 L2 2 M10 7 L2 12 M10 7 L2 7" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M30 7 L38 2 M30 7 L38 12 M30 7 L38 7" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> },
            ]).map((e) => (
              <button key={e.key} className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all ${arrowType === e.key ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/[0.06]'}`}
                onClick={() => { setArrowType(e.key); onClose(); }}>
                <span className="shrink-0">{e.icon}</span>
                <span className="text-[0.72rem] font-medium">{e.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Inline Node Editor (double-click) ─────────────────────────────────────

function InlineNodeEditor({ node, onSave, onClose }: {
  node: Node; onSave: (id: string, data: NodeData) => void; onClose: () => void;
}) {
  const d = node.data as NodeData;
  const [label, setLabel] = useState<string>(d.label ?? '');
  const [fontSize, setFontSize] = useState<number>(d.fontSize ?? 14);
  const [fontFamily, setFontFamily] = useState<string>(d.fontFamily ?? 'default');
  const [textColor, setTextColor] = useState<string>(d.textColor ?? '');
  const [bgColor, setBgColor] = useState<string>(d.bgColor ?? '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const handleSave = () => {
    onSave(node.id, {
      ...d,
      label,
      fontSize,
      fontFamily: fontFamily === 'default' ? undefined : fontFamily,
      textColor: textColor || undefined,
      bgColor: bgColor || undefined,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/30" onClick={handleSave} />
      <div className="fixed z-[100] bg-bg-card border border-border-subtle rounded-xl shadow-2xl p-4 w-[300px]"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[0.8rem] font-bold text-text-primary">Edit Node</h4>
          <button className="p-1 rounded text-text-muted hover:bg-white/10" onClick={handleSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Text */}
        <div className="mb-3">
          <label className="text-[0.6rem] font-bold text-text-muted uppercase block mb-1">Text</label>
          <textarea ref={inputRef} className="w-full text-[0.82rem] bg-bg-surface border border-border-subtle rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent resize-none min-h-[60px]"
            value={label} onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } if (e.key === 'Escape') handleSave(); }}
          />
        </div>

        {/* Font Size */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-[0.6rem] font-bold text-text-muted uppercase block mb-1">Size</label>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 rounded-md bg-white/[0.06] text-text-secondary hover:bg-white/10 flex items-center justify-center text-sm font-bold"
                onClick={() => setFontSize(Math.max(8, fontSize - 1))}>−</button>
              <input type="number" className="w-12 text-center text-[0.78rem] bg-bg-surface border border-border-subtle rounded-md py-1 text-text-primary focus:outline-none focus:border-accent"
                value={fontSize} onChange={(e) => setFontSize(Math.max(8, Math.min(72, Number(e.target.value))))} />
              <button className="w-7 h-7 rounded-md bg-white/[0.06] text-text-secondary hover:bg-white/10 flex items-center justify-center text-sm font-bold"
                onClick={() => setFontSize(Math.min(72, fontSize + 1))}>+</button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[0.6rem] font-bold text-text-muted uppercase block mb-1">Font</label>
            <select className="w-full text-[0.75rem] bg-bg-surface border border-border-subtle rounded-md px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent"
              value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              <option value="default">Default</option>
              <option value="monospace">Monospace</option>
              <option value="serif">Serif</option>
              <option value="cursive">Cursive</option>
            </select>
          </div>
        </div>

        {/* Colors */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-[0.6rem] font-bold text-text-muted uppercase block mb-1">Text Color</label>
            <div className="flex items-center gap-2">
              <input type="color" className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                value={textColor || '#f0f0f5'} onChange={(e) => setTextColor(e.target.value)} />
              {textColor && <button className="text-[0.6rem] text-text-muted hover:text-text-primary" onClick={() => setTextColor('')}>Reset</button>}
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[0.6rem] font-bold text-text-muted uppercase block mb-1">Fill Color</label>
            <div className="flex items-center gap-2">
              <input type="color" className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                value={bgColor || '#1c1f2e'} onChange={(e) => setBgColor(e.target.value)} />
              {bgColor && <button className="text-[0.6rem] text-text-muted hover:text-text-primary" onClick={() => setBgColor('')}>Reset</button>}
            </div>
          </div>
        </div>

        <button className="w-full py-2 rounded-lg bg-accent text-white text-[0.78rem] font-semibold hover:bg-accent/90 transition-colors"
          onClick={handleSave}>
          Apply
        </button>
      </div>
    </>
  );
}

// ── Node palette config ─────────────────────────────────────────────────────

const NODE_SECTIONS = [
  {
    title: 'Standard',
    nodes: [
      { type: 'rectangle', label: 'Rectangle', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14"/></svg> },
      { type: 'roundedRect', label: 'Rounded Rect', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="4"/></svg> },
      { type: 'circle', label: 'Circle', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg> },
      { type: 'triangle', label: 'Triangle', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 22,21 2,21"/></svg> },
      { type: 'diamond', label: 'Diamond', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 22,12 12,22 2,12"/></svg> },
      { type: 'hexagon', label: 'Hexagon', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="6,3 18,3 23,12 18,21 6,21 1,12"/></svg> },
      { type: 'star', label: 'Star', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"/></svg> },
      { type: 'cylinder', label: 'Cylinder', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
      { type: 'arrowShape', label: 'Arrow Shape', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8h8v-4l6 8-6 8v-4H5z"/></svg> },
      { type: 'cross', label: 'Cross', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg> },
    ],
  },
  {
    title: 'Flowchart',
    nodes: [
      { type: 'process', label: 'Process', color: '#6366f1', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3" /></svg> },
      { type: 'decision', label: 'Decision', color: '#f59e0b', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l10 10-10 10L2 12z" /></svg> },
      { type: 'terminator', label: 'Start / End', color: '#34d399', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="20" height="12" rx="6" /></svg> },
      { type: 'data', label: 'Data', color: '#8b5cf6', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 4h14l-2 16H7z" /></svg> },
    ],
  },
  {
    title: 'UML',
    nodes: [
      { type: 'component', label: 'Component', color: '#3b82f6', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h4M3 15h4"/></svg> },
      { type: 'package', label: 'Package', color: '#f59e0b', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 4h8l2 3h8"/></svg> },
      { type: 'actor', label: 'Actor', color: '#10b981', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="12" y1="16" x2="8" y2="21"/><line x1="12" y1="16" x2="16" y2="21"/></svg> },
      { type: 'useCase', label: 'Use Case', color: '#8b5cf6', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="7"/></svg> },
      { type: 'interface', label: 'Interface', color: '#06b6d4', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg> },
      { type: 'note', label: 'Note', color: '#eab308', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> },
    ],
  },
  {
    title: 'C4 Model',
    nodes: [
      { type: 'c4Person', label: 'Person', color: '#08427b', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
      { type: 'c4System', label: 'System', color: '#1168bd', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="3"/></svg> },
      { type: 'c4Container', label: 'Container', color: '#438dd5', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20"/></svg> },
    ],
  },
  {
    title: 'ERD',
    nodes: [
      {
        type: 'erdEntity', label: 'Entity Table', color: '#06b6d4',
        defaultData: { label: 'TableName', fields: [{ name: 'id', type: 'INT', pk: true }, { name: 'name', type: 'VARCHAR(255)' }, { name: 'created_at', type: 'TIMESTAMP' }] },
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /></svg>,
      },
    ],
  },
  {
    title: 'Class Diagram',
    nodes: [
      {
        type: 'class', label: 'Class', color: '#a855f7',
        defaultData: { label: 'ClassName', properties: ['- id: int', '- name: string'], methods: ['+ getId(): int', '+ setName(n: string): void'] },
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="1" width="18" height="22" rx="2" /><path d="M3 8h18" /><path d="M3 15h18" /></svg>,
      },
    ],
  },
  {
    title: 'Cloud / Infra',
    nodes: [
      { type: 'server', label: 'Server', color: '#64748b', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg> },
      { type: 'database', label: 'Database', color: '#47a248', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
      { type: 'cloud', label: 'Cloud Service', color: '#38bdf8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg> },
      { type: 'loadBalancer', label: 'Load Balancer', color: '#f59e0b', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg> },
      { type: 'apiGateway', label: 'API Gateway', color: '#f97316', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg> },
    ],
  },
  {
    title: 'DevOps',
    nodes: [
      { type: 'queue', label: 'Message Queue', color: '#7c3aed', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="5" height="12" rx="1"/><rect x="9.5" y="6" width="5" height="12" rx="1"/><rect x="17" y="6" width="5" height="12" rx="1"/></svg> },
      { type: 'containerDocker', label: 'Docker', color: '#0ea5e9', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="10" width="22" height="11" rx="2"/><rect x="4" y="4" width="4" height="4" rx="0.5"/><rect x="10" y="4" width="4" height="4" rx="0.5"/></svg> },
      { type: 'service', label: 'Microservice', color: '#ec4899', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M12 8v8M8 12h8" /></svg> },
    ],
  },
  {
    title: 'Misc',
    nodes: [
      { type: 'textAnnotation', label: 'Text Label', color: '#71717a', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg> },
      { type: 'group', label: 'Group / Lane', color: '#94a3b8', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"><rect x="2" y="2" width="20" height="20" rx="3"/></svg> },
    ],
  },
];

const defaultNodes: Node[] = [
  { id: '1', type: 'terminator', position: { x: 250, y: 50 }, data: { label: 'Start' } },
  { id: '2', type: 'process', position: { x: 225, y: 180 }, data: { label: 'Process' } },
  { id: '3', type: 'terminator', position: { x: 250, y: 320 }, data: { label: 'End' } },
];

const defaultEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

// ── Draggable palette item ──────────────────────────────────────────────────

function PaletteItem({ type, label, color, icon, defaultData }: {
  type: string; label: string; color: string; icon: React.ReactNode; defaultData?: Record<string, unknown>;
}) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow-type', type);
    e.dataTransfer.setData('application/reactflow-label', label);
    if (defaultData) e.dataTransfer.setData('application/reactflow-data', JSON.stringify(defaultData));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-white/[0.08] transition-all group select-none"
      title={`Drag to add ${label}`}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      <span className="text-[0.78rem] font-medium text-text-primary">{label}</span>
    </div>
  );
}

// ── Inner Editor (needs ReactFlowProvider) ──────────────────────────────────

function DiagramEditor() {
  const { boardId, dgId } = useParams<{ boardId: string; dgId: string }>();
  useRealtime(boardId);
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);
  const effectiveTheme = getEffectiveTheme(themeMode);
  const isDark = effectiveTheme === 'dark';
  const { data: dg, isLoading } = useDiagram(dgId);
  const updateMut = useUpdateDiagram(dgId);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const lineStyleBtnRef = useRef<HTMLButtonElement>(null);
  const arrowBtnRef = useRef<HTMLButtonElement>(null);

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = useRef(false);
  const hasPendingChanges = useRef(false);
  const [showPalette, setShowPalette] = useState(true);
  const nodeIdCounter = useRef(100);

  // Lucidchart features
  const [edgeStyle, setEdgeStyleRaw] = useState<EdgeStyle>('bezier');
  const [arrowType, setArrowTypeRaw] = useState<ArrowType>('arrow');
  const [lineWeight, setLineWeightRaw] = useState<LineWeight>(2);
  const [showLineStylePicker, setShowLineStylePicker] = useState(false);
  const [showArrowPicker, setShowArrowPicker] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPropsPanel, setShowPropsPanel] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<Node | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const undoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const redoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);


  // Refs to always hold latest state (fixes stale closure in save)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Stable mutation ref
  const updateMutRef = useRef(updateMut);
  updateMutRef.current = updateMut;

  // Init from API
  useEffect(() => {
    if (dg?.data && !isInitialized) {
      setNodes(dg.data.nodes ?? defaultNodes);
      setEdges(dg.data.edges ?? defaultEdges);
      setIsInitialized(true);
      isInitializedRef.current = true;
    } else if (dg && !dg.data && !isInitialized) {
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      setIsInitialized(true);
      isInitializedRef.current = true;
    }
  }, [dg, setNodes, setEdges, isInitialized]);

  // ── Save (debounced, uses refs for latest state) ─────────────────────────

  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const debouncedSave = useMemo(
    () =>
      debounce(async () => {
        if (!isInitializedRef.current) return;
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        if (isMountedRef.current) {
          setIsSaving(true);
          setSaveError(null);
        }
        try {
          await updateMutRef.current.mutateAsync({ data: { nodes: currentNodes, edges: currentEdges } });
          hasPendingChanges.current = false;
        } catch (error) {
          console.error('Failed to save diagram:', error);
          if (isMountedRef.current) {
            setSaveError('Save failed');
            toast.error('Auto-save failed');
          }
        } finally {
          if (isMountedRef.current) {
            setIsSaving(false);
          }
        }
      }, 800),
    [] // stable — uses refs exclusively, no deps needed
  );

  useEffect(() => () => { debouncedSave.flush(); }, [debouncedSave]);

  // Save before tab/window close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges.current) {
        debouncedSave.flush();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [debouncedSave]);

  const triggerSave = useCallback(() => { hasPendingChanges.current = true; debouncedSave(); }, [debouncedSave]);

  // Helper: get edge type string from EdgeStyle
  const getEdgeType = useCallback((style: EdgeStyle) => {
    return style === 'bezier' ? 'labeled' : style === 'straight' ? 'labeled-straight' : style === 'smoothstep' ? 'labeled-smoothstep' : style;
  }, []);

  // Wrapper: apply edge style change to selected edges (or all if none selected)
  const setEdgeStyle = useCallback((style: EdgeStyle) => {
    setEdgeStyleRaw(style);
    setEdges((eds) => {
      const selected = eds.filter((e) => e.selected);
      const targets = selected.length > 0 ? new Set(selected.map((e) => e.id)) : null;
      return eds.map((e) => (!targets || targets.has(e.id)) ? { ...e, type: getEdgeType(style) } : e);
    });
    triggerSave();
  }, [setEdges, triggerSave, getEdgeType]);

  // Wrapper: apply arrow type change to selected edges (or all if none selected)
  const setArrowType = useCallback((arrow: ArrowType) => {
    setArrowTypeRaw(arrow);
    setEdges((eds) => {
      const selected = eds.filter((e) => e.selected);
      const targets = selected.length > 0 ? new Set(selected.map((e) => e.id)) : null;
      return eds.map((e) => (!targets || targets.has(e.id)) ? {
        ...e,
        animated: arrow === 'arrow' || arrow === 'open-arrow',
        style: getEdgeStyle(arrow, lineWeight),
        markerEnd: getMarkerEnd(arrow),
        markerStart: getMarkerStart(arrow),
      } : e);
    });
    triggerSave();
  }, [setEdges, triggerSave, lineWeight]);

  // Wrapper: apply line weight change to selected edges (or all if none selected)
  const setLineWeight = useCallback((weight: LineWeight) => {
    setLineWeightRaw(weight);
    setEdges((eds) => {
      const selected = eds.filter((e) => e.selected);
      const targets = selected.length > 0 ? new Set(selected.map((e) => e.id)) : null;
      return eds.map((e) => (!targets || targets.has(e.id)) ? {
        ...e,
        style: getEdgeStyle(arrowType, weight),
      } : e);
    });
    triggerSave();
  }, [setEdges, triggerSave, arrowType]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        return next;
      });
      triggerSave();
    },
    [setNodes, triggerSave]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        return next;
      });
      triggerSave();
    },
    [setEdges, triggerSave]
  );

  const onConnect = useCallback(
    (connection: Connection | Edge) => {
      setEdges((eds) => {
        const newEdge = {
          ...connection,
          animated: arrowType === 'arrow' || arrowType === 'open-arrow',
          style: getEdgeStyle(arrowType, lineWeight),
          markerEnd: getMarkerEnd(arrowType),
          markerStart: getMarkerStart(arrowType),
        };
        return addEdge(newEdge, eds);
      });
      triggerSave();
    },
    [setEdges, triggerSave, arrowType, lineWeight]
  );

  // ── Drag & Drop from palette ──────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow-type');
      if (!type) return;

      const label = e.dataTransfer.getData('application/reactflow-label') || type;
      const rawData = e.dataTransfer.getData('application/reactflow-data');
      const defaultData = rawData ? JSON.parse(rawData) : undefined;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const id = `node-${Date.now()}-${nodeIdCounter.current++}`;
      const newNode: Node = {
        id,
        type,
        position,
        data: defaultData ?? { label },
      };

      setNodes((nds) => [...nds, newNode]);
      triggerSave();
    },
    [reactFlowInstance, setNodes, triggerSave]
  );

  // ── Toolbar actions ───────────────────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    setNodes((nds) => {
      const next = nds.filter((n) => !n.selected);
      setEdges((eds) => {
        const removedIds = new Set(nds.filter((n) => n.selected).map((n) => n.id));
        return eds.filter(
          (e) => !e.selected && !removedIds.has(e.source) && !removedIds.has(e.target)
        );
      });
      return next;
    });
    triggerSave();
  }, [setNodes, setEdges, triggerSave]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dg?.name ?? 'diagram'}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, dg]);

  const handleClearAll = useCallback(() => {
    if (!confirm('Clear all nodes and edges?')) return;
    setNodes([]);
    setEdges([]);
    triggerSave();
  }, [setNodes, setEdges, triggerSave]);

  const handleManualSave = useCallback(async () => {
    debouncedSave.cancel();
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateMutRef.current.mutateAsync({ data: { nodes: nodesRef.current, edges: edgesRef.current } });
      hasPendingChanges.current = false;
    } catch (error) {
      console.error('Manual save failed:', error);
      setSaveError('Save failed');
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [debouncedSave]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const pushUndo = useCallback(() => {
    undoStack.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, [nodes, edges]);

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    setNodes(prev.nodes);
    setEdges(prev.edges);
    triggerSave();
  }, [nodes, edges, setNodes, setEdges, triggerSave]);

  const handleRedo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    setNodes(next.nodes);
    setEdges(next.edges);
    triggerSave();
  }, [nodes, edges, setNodes, setEdges, triggerSave]);

  // ── Export PNG / SVG ──────────────────────────────────────────────────────
  const handleExportImage = useCallback(async (format: 'png' | 'svg') => {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const fn = format === 'png' ? toPng : toSvg;
      const dataUrl = await fn(el, { quality: 1, backgroundColor: '#1a1b23' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${dg?.name ?? 'diagram'}.${format}`;
      a.click();
    } catch (e) { console.error('Export failed:', e); }
    setShowExportMenu(false);
  }, [dg]);

  // ── Alignment tools ───────────────────────────────────────────────────────
  const alignNodes = useCallback((dir: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const sel = nodes.filter((n) => n.selected);
    if (sel.length < 2) return;
    pushUndo();
    const positions = sel.map((n) => n.position);
    let target = 0;
    if (dir === 'left') target = Math.min(...positions.map((p) => p.x));
    else if (dir === 'right') target = Math.max(...positions.map((p) => p.x));
    else if (dir === 'center') target = positions.reduce((a, p) => a + p.x, 0) / positions.length;
    else if (dir === 'top') target = Math.min(...positions.map((p) => p.y));
    else if (dir === 'bottom') target = Math.max(...positions.map((p) => p.y));
    else if (dir === 'middle') target = positions.reduce((a, p) => a + p.y, 0) / positions.length;
    setNodes((nds) => {
      return nds.map((n) => {
        if (!n.selected) return n;
        const pos = { ...n.position };
        if (dir === 'left' || dir === 'center' || dir === 'right') pos.x = target;
        else pos.y = target;
        return { ...n, position: pos };
      });
    });
    triggerSave();
  }, [nodes, setNodes, triggerSave, pushUndo]);

  // ── Duplicate selected ────────────────────────────────────────────────────
  const duplicateSelected = useCallback(() => {
    pushUndo();
    const sel = nodes.filter((n) => n.selected);
    if (sel.length === 0) return;
    const newNodes = sel.map((n) => ({
      ...n,
      id: `node-${Date.now()}-${nodeIdCounter.current++}`,
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: false,
      data: { ...n.data },
    }));
    setNodes((nds) => [...nds, ...newNodes]);
    triggerSave();
  }, [nodes, setNodes, triggerSave, pushUndo]);

  // ── Select All ────────────────────────────────────────────────────────────
  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
  }, [setNodes, setEdges]);

  // ── Load template ─────────────────────────────────────────────────────────
  const loadTemplate = useCallback((t: DiagramTemplate) => {
    pushUndo();
    setNodes(t.nodes);
    setEdges(t.edges);
    triggerSave();
    setShowTemplates(false);
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.3, duration: 300 }), 100);
  }, [setNodes, setEdges, triggerSave, reactFlowInstance, pushUndo]);

  // ── Track selected node for properties panel ──────────────────────────────
  const onSelectionChange = useCallback(({ nodes: selNodes }: { nodes: Node[] }) => {
    if (selNodes.length === 1) { setSelectedNodeForEdit(selNodes[0]); setShowPropsPanel(true); }
    else { setSelectedNodeForEdit(null); setShowPropsPanel(false); }
  }, []);

  // ── Double click to edit node ─────────────────────────────────────────────
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setEditingNode(node);
  }, []);

  // ── Save node edits ───────────────────────────────────────────────────────
  const handleNodeEditSave = useCallback((nodeId: string, newData: NodeData) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: newData } : n));
    triggerSave();
  }, [setNodes, triggerSave]);

  // ── Update node label from props panel ────────────────────────────────────
  const updateNodeLabel = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n));
    triggerSave();
  }, [setNodes, triggerSave]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleManualSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, duplicateSelected, selectAll, handleManualSave]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--spacing-sidebar)] flex items-center justify-center min-h-screen">
          <div className="text-text-muted text-[0.875rem]">Loading diagram...</div>
        </main>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasSelection = nodes.some((n) => n.selected) || edges.some((e) => e.selected);
  const edgeTypeForFlow = edgeStyle === 'bezier' ? 'labeled' : edgeStyle === 'straight' ? 'labeled-straight' : edgeStyle === 'smoothstep' ? 'labeled-smoothstep' : edgeStyle;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <EdgeMarkerDefs />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen h-screen">
        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-root">
          <div className="flex items-center gap-3">
            <button
              className="p-1.5 rounded-md text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
              onClick={async () => {
                debouncedSave.cancel();
                setIsSaving(true);
                try { await updateMutRef.current.mutateAsync({ data: { nodes: nodesRef.current, edges: edgesRef.current } }); } catch { /* */ }
                finally { setIsSaving(false); }
                navigate(`/boards/${boardId}/diagrams`);
              }}
              title="Back to diagrams"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-[0.875rem] font-semibold text-text-primary">{dg?.name ?? 'Diagram'}</h3>
            <span className="text-[0.72rem] text-text-muted">
              {nodes.length} nodes · {edges.length} edges
            </span>
          </div>
          <div className="flex items-center gap-1.5">

            <div className="text-[0.72rem] font-medium text-text-muted mr-2">
              {isSaving ? (
                <span className="flex items-center gap-1.5 text-accent-light animate-pulse">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Saving...
                </span>
              ) : saveError ? (
                <span className="flex items-center gap-1.5 text-danger">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                  {saveError}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 opacity-60">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border-subtle bg-bg-root/80 backdrop-blur-sm overflow-visible flex-wrap">
          {/* Shapes toggle */}
          <button className={`shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[0.72rem] font-medium transition-colors ${showPalette ? 'bg-accent/15 text-accent-light' : 'text-text-secondary hover:bg-white/10'}`}
            onClick={() => setShowPalette(!showPalette)} title="Toggle shapes (Sidebar)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Shapes
          </button>

          <button className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[0.72rem] font-medium text-text-secondary hover:bg-white/10 transition-colors"
            onClick={() => setShowTemplates(true)} title="Load template">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            Templates
          </button>

          <div className="w-px h-5 bg-border-subtle mx-0.5 shrink-0" />

          {/* Undo / Redo */}
          <button className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors disabled:opacity-30"
            onClick={handleUndo} title="Undo (Ctrl+Z)" disabled={undoStack.current.length === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
          </button>
          <button className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors disabled:opacity-30"
            onClick={handleRedo} title="Redo (Ctrl+Shift+Z)" disabled={redoStack.current.length === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/></svg>
          </button>

          <div className="w-px h-5 bg-border-subtle mx-0.5 shrink-0" />

          {/* Delete */}
          <button className={`p-1.5 rounded-md transition-colors ${hasSelection ? 'text-danger hover:bg-danger/10' : 'text-text-muted opacity-30'}`}
            onClick={deleteSelected} disabled={!hasSelection} title="Delete (Del)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>

          {/* Duplicate */}
          <button className={`p-1.5 rounded-md transition-colors ${hasSelection ? 'text-text-secondary hover:bg-white/10' : 'text-text-muted opacity-30'}`}
            onClick={duplicateSelected} disabled={!hasSelection} title="Duplicate (Ctrl+D)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>

          <div className="w-px h-5 bg-border-subtle mx-0.5 shrink-0" />

          {/* Alignment */}
          <div className="flex items-center gap-0">
            <button className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors" onClick={() => alignNodes('left')} title="Align left">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="2" x2="4" y2="22"/><rect x="8" y="4" width="12" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/></svg>
            </button>
            <button className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors" onClick={() => alignNodes('center')} title="Align center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><rect x="6" y="4" width="12" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/></svg>
            </button>
            <button className="p-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors" onClick={() => alignNodes('top')} title="Align top">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="4" x2="22" y2="4"/><rect x="4" y="8" width="6" height="12" rx="1"/><rect x="14" y="8" width="6" height="8" rx="1"/></svg>
            </button>
          </div>

          <div className="w-px h-5 bg-border-subtle mx-0.5 shrink-0" />

          {/* Line Style Picker (Lucidchart-style) */}
          <div className="shrink-0">
            <button ref={lineStyleBtnRef} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors"
              onClick={() => { setShowLineStylePicker(!showLineStylePicker); setShowArrowPicker(false); }} title="Line style & pattern">
              <svg width="24" height="14" viewBox="0 0 24 14">
                {arrowType === 'dashed' ? (
                  <line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth={lineWeight} strokeDasharray="5 3"/>
                ) : arrowType === 'dotted' ? (
                  <line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth={lineWeight} strokeDasharray="2 3"/>
                ) : (
                  <line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth={lineWeight}/>
                )}
              </svg>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showLineStylePicker && (
              <LineStylePicker edgeStyle={edgeStyle} setEdgeStyle={setEdgeStyle} arrowType={arrowType} setArrowType={setArrowType} lineWeight={lineWeight} setLineWeight={setLineWeight} onClose={() => setShowLineStylePicker(false)} anchorRef={lineStyleBtnRef} />
            )}
          </div>

          {/* Arrow Endpoint Picker (Lucidchart-style) */}
          <div className="shrink-0">
            <button ref={arrowBtnRef} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors"
              onClick={() => { setShowArrowPicker(!showArrowPicker); setShowLineStylePicker(false); }} title="Arrow endpoints">
              <svg width="24" height="14" viewBox="0 0 24 14">
                <line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="2"/>
                <polygon points="16,3 24,7 16,11" fill="currentColor"/>
              </svg>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showArrowPicker && (
              <ArrowEndpointPicker arrowType={arrowType} setArrowType={setArrowType} onClose={() => setShowArrowPicker(false)} anchorRef={arrowBtnRef} />
            )}
          </div>

          <div className="w-px h-5 bg-border-subtle mx-0.5 shrink-0" />

          {/* Snap to grid */}
          <button className={`shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[0.72rem] font-medium transition-colors ${snapToGrid ? 'bg-accent/15 text-accent-light' : 'text-text-secondary hover:bg-white/10'}`}
            onClick={() => setSnapToGrid(!snapToGrid)} title="Snap to grid">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            Grid
          </button>

          <div className="w-px h-5 bg-border-subtle mx-0.5 shrink-0" />

          <button className="shrink-0 p-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors" onClick={handleFitView} title="Fit view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
          </button>

          <button className="shrink-0 p-1.5 rounded-md text-text-secondary hover:bg-white/10 transition-colors" onClick={handleClearAll} title="Clear all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          </button>

          <div className="flex-1" />

          {/* Export dropdown */}
          <div className="relative shrink-0">
            <button className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[0.72rem] font-medium text-text-secondary hover:bg-white/10 transition-colors"
              onClick={() => setShowExportMenu(!showExportMenu)} title="Export">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute top-full right-0 mt-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                  <button className="w-full text-left px-3 py-1.5 text-[0.75rem] font-medium text-text-primary hover:bg-white/10" onClick={handleExportJSON}>JSON</button>
                  <button className="w-full text-left px-3 py-1.5 text-[0.75rem] font-medium text-text-primary hover:bg-white/10" onClick={() => handleExportImage('png')}>PNG Image</button>
                  <button className="w-full text-left px-3 py-1.5 text-[0.75rem] font-medium text-text-primary hover:bg-white/10" onClick={() => handleExportImage('svg')}>SVG Vector</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Canvas + Palette ────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          {showPalette && (
            <div className="w-[200px] shrink-0 border-r border-border-subtle bg-bg-root overflow-y-auto py-3">
              <p className="px-3 mb-2 text-[0.65rem] font-bold text-text-muted uppercase tracking-wider">
                Drag shapes to canvas
              </p>
              {NODE_SECTIONS.map((section) => (
                <div key={section.title} className="mb-3">
                  <p className="px-3 py-1 text-[0.6rem] font-semibold text-text-muted uppercase tracking-wider opacity-60">
                    {section.title}
                  </p>
                  {section.nodes.map((n) => (
                    <PaletteItem
                      key={n.type}
                      type={n.type}
                      label={n.label}
                      color={n.color}
                      icon={n.icon}
                      defaultData={(n as { defaultData?: Record<string, unknown> }).defaultData}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ReactFlow canvas */}
          <div className="flex-1 w-full h-full relative bg-bg-root" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={customNodeTypes}
              edgeTypes={customEdgeTypes}
              onSelectionChange={onSelectionChange}
              onNodeDoubleClick={onNodeDoubleClick}
              fitView
              snapToGrid={snapToGrid}
              snapGrid={[25, 25]}
              deleteKeyCode={['Backspace', 'Delete']}
              className="focus-theme"
              colorMode={isDark ? 'dark' : 'light'}
              defaultEdgeOptions={{ animated: true, type: edgeTypeForFlow }}
            >
              <Background color={isDark ? '#5c5d6a' : '#c0c0c8'} gap={snapToGrid ? 25 : 16} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeStrokeColor={isDark ? '#2c2d33' : '#cccccc'}
                nodeColor={isDark ? '#1a1b23' : '#e8e8ec'}
                maskColor={isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(200, 200, 200, 0.4)'}
              />
            </ReactFlow>
          </div>

          {/* ── Node Properties Panel (right sidebar) ────────────────── */}
          {showPropsPanel && selectedNodeForEdit && (
            <div className="w-[220px] shrink-0 border-l border-border-subtle bg-bg-root overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[0.75rem] font-bold text-text-primary uppercase tracking-wider">Properties</h4>
                <button className="p-1 rounded text-text-muted hover:bg-white/10" onClick={() => setShowPropsPanel(false)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[0.65rem] font-semibold text-text-muted uppercase block mb-1">Type</label>
                  <div className="text-[0.75rem] text-text-secondary bg-white/5 px-2 py-1 rounded">{selectedNodeForEdit.type}</div>
                </div>
                <div>
                  <label className="text-[0.65rem] font-semibold text-text-muted uppercase block mb-1">Label</label>
                  <input
                    className="w-full text-[0.78rem] bg-bg-card border border-border-subtle rounded-md px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent"
                    value={(selectedNodeForEdit.data as NodeData)?.label ?? ''}
                    onChange={(e) => updateNodeLabel(selectedNodeForEdit.id, e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[0.65rem] font-semibold text-text-muted uppercase block mb-1">Position</label>
                  <div className="text-[0.7rem] text-text-muted font-mono">
                    x: {Math.round(selectedNodeForEdit.position.x)}, y: {Math.round(selectedNodeForEdit.position.y)}
                  </div>
                </div>
                <button className="w-full py-1.5 rounded-md text-[0.72rem] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  onClick={() => setEditingNode(selectedNodeForEdit)}>
                  Edit Text & Style
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Templates Modal ──────────────────────────────────────────── */}
        {showTemplates && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTemplates(false)}>
            <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-[560px] max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-[0.95rem] font-bold text-text-primary">Choose a Template</h3>
                <button className="p-1.5 rounded-md text-text-muted hover:bg-white/10" onClick={() => setShowTemplates(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3 overflow-y-auto max-h-[60vh]">
                {DIAGRAM_TEMPLATES.map((t) => (
                  <button key={t.id} className="text-left p-4 rounded-xl border border-border-subtle hover:border-accent/50 hover:bg-accent-subtle transition-all group"
                    onClick={() => loadTemplate(t)}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{t.icon}</span>
                      <span className="text-[0.82rem] font-bold text-text-primary group-hover:text-accent">{t.name}</span>
                    </div>
                    <p className="text-[0.7rem] text-text-muted">{t.description}</p>
                    <div className="mt-2 text-[0.6rem] font-mono text-text-muted opacity-60">
                      {t.nodes.length} nodes · {t.edges.length} edges
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Inline Node Editor ─────────────────────────────────────────── */}
        {editingNode && (
          <InlineNodeEditor
            node={editingNode}
            onSave={handleNodeEditSave}
            onClose={() => setEditingNode(null)}
          />
        )}
      </main>
    </div>
  );
}

// ── Page wrapper (provides ReactFlow context) ───────────────────────────────

export function DiagramEditorPage() {
  return (
    <ReactFlowProvider>
      <DiagramEditor />
    </ReactFlowProvider>
  );
}
