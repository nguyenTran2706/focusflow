import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../../components/Sidebar';
import { useWhiteboard, useUpdateWhiteboard } from './hooks/useWhiteboard';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { toast } from 'sonner';
import debounce from 'lodash.debounce';
import { useRealtime } from '../../hooks/useRealtime';
import { useThemeStore, getEffectiveTheme } from '../../lib/theme-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = { getSceneElements(): any[]; getAppState(): Record<string, any>; getFiles(): Record<string, any> };

export function WhiteboardEditorPage() {
  const { t } = useTranslation('whiteboard');
  const { t: tc } = useTranslation('common');
  const { boardId, wbId } = useParams<{ boardId: string; wbId: string }>();
  useRealtime(boardId);
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);
  const effectiveTheme = getEffectiveTheme(themeMode);
  const { data: wb, isLoading } = useWhiteboard(wbId);
  const updateMut = useUpdateWhiteboard(wbId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const excalidrawRef = useRef<ExcalidrawAPI | null>(null);

  // Stable ref for mutation (same pattern as diagram)
  const updateMutRef = useRef(updateMut);
  updateMutRef.current = updateMut;

  const hasPendingChanges = useRef(false);
  const isInitializedRef = useRef(false);

  // ── Refs that always hold latest scene (same pattern as diagram's nodesRef/edgesRef) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef = useRef<{ elements: any[]; appState: Record<string, any>; files: Record<string, any> } | null>(null);

  // ── Save (debounced, reads from ref — identical pattern to diagram) ────
  const debouncedSave = useMemo(
    () =>
      debounce(async () => {
        if (!isInitializedRef.current || !sceneRef.current) return;
        const { elements, appState, files } = sceneRef.current;
        const liveElements = elements.filter((el: { isDeleted?: boolean }) => !el.isDeleted);
        setIsSaving(true);
        setSaveError(null);
        try {
          await updateMutRef.current.mutateAsync({
            scene: {
              elements: liveElements,
              appState: { viewBackgroundColor: appState.viewBackgroundColor },
              files,
            },
          });
          hasPendingChanges.current = false;
        } catch (error) {
          console.error('Failed to save whiteboard:', error);
          setSaveError('Save failed');
          toast.error(tc('status.autoSaveFailed'));
        } finally {
          setIsSaving(false);
        }
      }, 800),
    [] // stable — uses refs exclusively
  );

  // Flush on unmount
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

  // Mark initialized after Excalidraw mounts
  useEffect(() => {
    if (wb && !isInitializedRef.current) {
      const timer = setTimeout(() => { isInitializedRef.current = true; }, 500);
      return () => clearTimeout(timer);
    }
  }, [wb]);

  // ── onChange: cache scene in ref + trigger save ──
  const handleExcalidrawChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: Record<string, any>, files: Record<string, any>) => {
      if (!isInitializedRef.current) return;
      if (elements.length === 0 && !hasPendingChanges.current) return;

      // Always keep ref up to date (like diagram's nodesRef/edgesRef)
      sceneRef.current = { elements: [...elements], appState, files };
      triggerSave();
    },
    [triggerSave]
  );

  // ── Ctrl+S ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        debouncedSave.flush();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [debouncedSave]);

  // ── Export PNG ──
  const handleExportPNG = useCallback(async () => {
    const api = excalidrawRef.current;
    if (!api) return;
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: effectiveTheme === 'dark' },
        files,
        mimeType: 'image/png',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${wb?.name ?? 'whiteboard'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export whiteboard:', err);
    }
  }, [wb, effectiveTheme]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[var(--spacing-sidebar)] flex items-center justify-center min-h-screen">
          <div className="text-text-muted text-[0.875rem]">{t('loading')}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen h-screen">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-root">
          <div className="flex items-center gap-3">
            <button
              className="p-1.5 rounded-md text-text-muted hover:bg-white/10 hover:text-text-primary transition-colors"
              onClick={async () => {
                debouncedSave.cancel();
                if (sceneRef.current) {
                  try {
                    const { elements, appState, files } = sceneRef.current;
                    const liveElements = elements.filter((el: { isDeleted?: boolean }) => !el.isDeleted);
                    await updateMut.mutateAsync({ scene: { elements: liveElements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files } });
                  } catch { /* best-effort */ }
                }
                navigate(`/boards/${boardId}/whiteboards`);
              }}
              title={t('toolbar.backToWhiteboards')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-[0.875rem] font-semibold text-text-primary">{wb?.name ?? 'Whiteboard'}</h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Export button */}
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.75rem] font-medium text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
              onClick={handleExportPNG}
              title={t('toolbar.exportPng')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('toolbar.exportPng')}
            </button>
            {/* Save status */}
            <div className="text-[0.75rem] font-medium text-text-muted">
              {isSaving ? (
                <span className="flex items-center gap-1.5 text-accent-light animate-pulse">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  {tc('actions.saving')}
                </span>
              ) : saveError ? (
                <span className="flex items-center gap-1.5 text-danger">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                  {saveError}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 opacity-60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  {tc('actions.saved')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 w-full h-full relative">
          <Excalidraw
            excalidrawAPI={(api) => { excalidrawRef.current = api as unknown as ExcalidrawAPI; }}
            initialData={{
              ...(wb?.scene ?? {}),
              appState: {
                ...(wb?.scene?.appState ?? {}),
                currentItemStrokeColor: effectiveTheme === 'dark' ? '#a78bfa' : '#7c3aed',
                activeTool: { type: 'freedraw', lastActiveTool: null, locked: false, customType: null },
                viewBackgroundColor: effectiveTheme === 'dark' ? '#161822' : '#f8f8fc',
              },
            }}
            onChange={handleExcalidrawChange}
            theme={effectiveTheme === 'light' ? 'light' : 'dark'}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
              },
            }}
          />
        </div>
      </main>
    </div>
  );
}
