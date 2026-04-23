import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { useWhiteboard, useUpdateWhiteboard } from './hooks/useWhiteboard';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import debounce from 'lodash.debounce';
import { useRealtime } from '../../hooks/useRealtime';
import { useThemeStore, getEffectiveTheme } from '../../lib/theme-store';

export function WhiteboardEditorPage() {
  const { boardId, wbId } = useParams<{ boardId: string; wbId: string }>();
  useRealtime(boardId);
  const navigate = useNavigate();
  const themeMode = useThemeStore((s) => s.mode);
  const effectiveTheme = getEffectiveTheme(themeMode);
  const { data: wb, isLoading } = useWhiteboard(wbId);
  const updateMut = useUpdateWhiteboard(wbId);
  const [isSaving, setIsSaving] = useState(false);
  const excalidrawRef = useRef<any>(null);

  const debouncedSave = useMemo(
    () =>
      debounce(async (elements, appState, files) => {
        setIsSaving(true);
        try {
          const scenePayload = {
            elements,
            appState: { viewBackgroundColor: appState.viewBackgroundColor },
            files,
          };
          await updateMut.mutateAsync({ scene: scenePayload });
        } catch (error) {
          console.error('Failed to autosave whiteboard:', error);
        } finally {
          setIsSaving(false);
        }
      }, 1500),
    [updateMut]
  );

  const handleExcalidrawChange = (elements: readonly any[], appState: any, files: any) => {
    debouncedSave(elements, appState, files);
  };

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
          <div className="text-text-muted text-[0.875rem]">Loading whiteboard...</div>
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
              onClick={() => navigate(`/boards/${boardId}/whiteboards`)}
              title="Back to whiteboards"
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
              title="Export as PNG"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export PNG
            </button>
            {/* Save status */}
            <div className="text-[0.75rem] font-medium text-text-muted">
              {isSaving ? (
                <span className="flex items-center gap-1.5 text-accent-light animate-pulse">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 opacity-60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 w-full h-full relative">
          <Excalidraw
            excalidrawAPI={(api: any) => { excalidrawRef.current = api; }}
            initialData={wb?.scene ?? {}}
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
