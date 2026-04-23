import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import debounce from 'lodash.debounce';
import { useRealtime } from '../../hooks/useRealtime';
import { useThemeStore, getEffectiveTheme } from '../../lib/theme-store';
import { customNodeTypes } from './nodes';

// ── Node palette config ─────────────────────────────────────────────────────

const NODE_PALETTE = [
  {
    type: 'process',
    label: 'Process',
    color: '#6366f1',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
    ),
  },
  {
    type: 'decision',
    label: 'Decision',
    color: '#f59e0b',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2l10 10-10 10L2 12z" />
      </svg>
    ),
  },
  {
    type: 'terminator',
    label: 'Start / End',
    color: '#34d399',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="6" width="20" height="12" rx="6" />
      </svg>
    ),
  },
  {
    type: 'data',
    label: 'Data',
    color: '#8b5cf6',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 4h14l-2 16H7z" />
      </svg>
    ),
  },
  {
    type: 'service',
    label: 'Service',
    color: '#ec4899',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M12 8v8M8 12h8" />
      </svg>
    ),
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

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const nodeIdCounter = useRef(100);
  const addMenuRef = useRef<HTMLDivElement>(null);



  // Init from API
  useEffect(() => {
    if (dg?.data && !isInitialized) {
      setNodes(dg.data.nodes ?? defaultNodes);
      setEdges(dg.data.edges ?? defaultEdges);
      setIsInitialized(true);
    } else if (dg && !dg.data && !isInitialized) {
      setNodes(defaultNodes);
      setEdges(defaultEdges);
      setIsInitialized(true);
    }
  }, [dg, setNodes, setEdges, isInitialized]);

  // ── Autosave ──────────────────────────────────────────────────────────────

  const debouncedSave = useMemo(
    () =>
      debounce(async (n: Node[], e: Edge[]) => {
        if (!isInitialized) return;
        setIsSaving(true);
        try {
          await updateMut.mutateAsync({ data: { nodes: n, edges: e } });
        } catch (error) {
          console.error('Failed to autosave diagram:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1500),
    [updateMut, isInitialized]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        debouncedSave(next, edges);
        return next;
      });
    },
    [setNodes, debouncedSave, edges]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        debouncedSave(nodes, next);
        return next;
      });
    },
    [setEdges, debouncedSave, nodes]
  );

  const onConnect = useCallback(
    (connection: Connection | Edge) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, animated: true }, eds);
        debouncedSave(nodes, next);
        return next;
      });
    },
    [setEdges, debouncedSave, nodes]
  );

  // ── Toolbar actions ───────────────────────────────────────────────────────

  const addNode = useCallback(
    (type: string, label: string) => {
      const id = `node-${Date.now()}-${nodeIdCounter.current++}`;
      const viewport = reactFlowInstance.getViewport();
      const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
      const newNode: Node = {
        id,
        type,
        position: { x: centerX - 60 + Math.random() * 40, y: centerY - 30 + Math.random() * 40 },
        data: { label },
      };
      setNodes((nds) => {
        const next = [...nds, newNode];
        debouncedSave(next, edges);
        return next;
      });
      setShowAddMenu(false);
    },
    [reactFlowInstance, setNodes, debouncedSave, edges]
  );

  const deleteSelected = useCallback(() => {
    setNodes((nds) => {
      const next = nds.filter((n) => !n.selected);
      setEdges((eds) => {
        const removedIds = new Set(nds.filter((n) => n.selected).map((n) => n.id));
        const nextEdges = eds.filter(
          (e) => !e.selected && !removedIds.has(e.source) && !removedIds.has(e.target)
        );
        debouncedSave(next, nextEdges);
        return nextEdges;
      });
      return next;
    });
  }, [setNodes, setEdges, debouncedSave]);

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
    debouncedSave([], []);
  }, [setNodes, setEdges, debouncedSave]);

  // ── Loading state ─────────────────────────────────────────────────────────

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen h-screen">
        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-root">
          <div className="flex items-center gap-3">
            <button
              className="p-1.5 rounded-md text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
              onClick={() => navigate(`/boards/${boardId}/diagrams`)}
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
            {/* Save status */}
            <div className="text-[0.72rem] font-medium text-text-muted mr-2">
              {isSaving ? (
                <span className="flex items-center gap-1.5 text-accent-light animate-pulse">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Saving…
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
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle bg-bg-root/80 backdrop-blur-sm">
          {/* Add node dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-medium transition-colors ${
                showAddMenu
                  ? 'bg-accent/15 text-accent-light'
                  : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
              }`}
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Node
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showAddMenu && (
              <>
                {/* Invisible backdrop to close menu */}
                <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                <div
                  className="absolute left-0 top-full mt-1 w-[200px] bg-bg-card border border-border-subtle rounded-xl shadow-2xl z-50 py-1.5 animate-fade-in"
                >
                <p className="px-3 py-1.5 text-[0.65rem] font-semibold text-text-muted uppercase tracking-wider">Node types</p>
                {NODE_PALETTE.map((n) => (
                  <button
                    key={n.type}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-[0.8rem] text-text-primary hover:bg-white/[0.08] transition-colors"
                    onClick={() => addNode(n.type, n.label)}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${n.color}20`, color: n.color }}
                    >
                      {n.icon}
                    </div>
                    <span>{n.label}</span>
                  </button>
                ))}
              </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-border-subtle mx-1" />

          {/* Delete selected */}
          <button
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-medium transition-colors ${
              hasSelection
                ? 'text-danger hover:bg-danger/10'
                : 'text-text-muted cursor-not-allowed opacity-40'
            }`}
            onClick={deleteSelected}
            disabled={!hasSelection}
            title="Delete selected (Del)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </button>

          <div className="w-px h-5 bg-border-subtle mx-1" />

          {/* Fit view */}
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-medium text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
            onClick={handleFitView}
            title="Fit to view"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            Fit
          </button>

          {/* Clear all */}
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-medium text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
            onClick={handleClearAll}
            title="Clear all nodes"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            Clear
          </button>

          <div className="flex-1" />

          {/* Export */}
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-medium text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
            onClick={handleExportJSON}
            title="Export as JSON"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>

        {/* ── Canvas ───────────────────────────────────────────────────── */}
        <div className="flex-1 w-full h-full relative bg-bg-root">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={customNodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            className="focus-theme"
            colorMode={isDark ? 'dark' : 'light'}
            defaultEdgeOptions={{ animated: true }}
          >
            <Background color={isDark ? '#5c5d6a' : '#c0c0c8'} gap={16} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeColor={isDark ? '#2c2d33' : '#cccccc'}
              nodeColor={isDark ? '#1a1b23' : '#e8e8ec'}
              maskColor={isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(200, 200, 200, 0.4)'}
            />
          </ReactFlow>
        </div>
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
