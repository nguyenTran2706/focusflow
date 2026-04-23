import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import { AuthSync } from './components/AuthSync';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacePage, BoardPage } from './pages/BoardPage';
import { ProfilePage } from './pages/ProfilePage';
import { PricingPage } from './pages/PricingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ChatWidget } from './components/ChatWidget';
import { AdminPage } from './pages/AdminPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { LandingPage } from './pages/LandingPage';
import { ScrumPage } from './pages/ScrumPage';
import { WhiteboardListPage } from './features/whiteboard/WhiteboardListPage';
import { WhiteboardEditorPage } from './features/whiteboard/WhiteboardEditorPage';
import { DiagramListPage } from './features/diagram/DiagramListPage';
import { DiagramEditorPage } from './features/diagram/DiagramEditorPage';
import { useThemeStore, applyTheme, getEffectiveTheme } from './lib/theme-store';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// ── Clerk theme presets ──────────────────────────────────────────────────────

const CLERK_DARK = {
  variables: {
    colorPrimary: '#7c3aed',
    colorBackground: '#161822',
    colorText: '#f0f0f5',
    colorInputBackground: '#1a1d2b',
    colorInputText: '#f0f0f5',
    borderRadius: '8px',
  },
  elements: {
    formButtonPrimary: 'bg-accent hover:bg-[#6d28d9]',
    card: 'bg-bg-surface border border-border-subtle shadow-xl',
    headerTitle: 'text-text-primary',
    headerSubtitle: 'text-text-secondary',
    socialButtonsBlockButton: 'border-border-subtle bg-bg-input text-text-primary hover:bg-bg-card',
    formFieldInput: 'border-border-subtle bg-bg-input text-text-primary',
    footerActionLink: 'text-accent hover:text-accent-light',
    identityPreviewEditButton: 'text-accent',
    userButtonPopoverCard: 'bg-[#1c1f2e] border border-[rgba(255,255,255,0.10)]',
    userButtonPopoverActionButton: 'text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.08)]',
    userButtonPopoverActionButtonText: 'text-[#f0f0f5]',
    userButtonPopoverActionButtonIcon: 'text-[#a8abbe]',
    userButtonPopoverFooter: 'hidden',
  },
};

const CLERK_LIGHT = {
  variables: {
    colorPrimary: '#7c3aed',
    colorBackground: '#ffffff',
    colorText: '#1a1a2e',
    colorInputBackground: '#f5f5f7',
    colorInputText: '#1a1a2e',
    borderRadius: '8px',
  },
  elements: {
    formButtonPrimary: 'bg-accent hover:bg-[#6d28d9]',
    card: 'bg-white border border-[rgba(0,0,0,0.10)] shadow-xl',
    headerTitle: 'text-[#1a1a2e]',
    headerSubtitle: 'text-[#4a4a68]',
    socialButtonsBlockButton: 'border-[rgba(0,0,0,0.10)] bg-[#f5f5f7] text-[#1a1a2e] hover:bg-[#e8e8ec]',
    formFieldInput: 'border-[rgba(0,0,0,0.10)] bg-[#f5f5f7] text-[#1a1a2e]',
    footerActionLink: 'text-[#7c3aed] hover:text-[#6d28d9]',
    identityPreviewEditButton: 'text-[#7c3aed]',
    userButtonPopoverCard: 'bg-white border border-[rgba(0,0,0,0.10)]',
    userButtonPopoverActionButton: 'text-[#1a1a2e] hover:bg-[rgba(0,0,0,0.05)]',
    userButtonPopoverActionButtonText: 'text-[#1a1a2e]',
    userButtonPopoverActionButtonIcon: 'text-[#4a4a68]',
    userButtonPopoverFooter: 'hidden',
  },
};


import { SearchModal } from './components/SearchModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function ProtectedRoutes() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts({
    'ctrl+k': () => setSearchOpen(true),
    '?': () => setShortcutsOpen(true),
    'escape': () => { setSearchOpen(false); setShortcutsOpen(false); },
  });

  return (
    <>
      <SignedIn>
        <AuthSync />
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/boards/:boardId/scrum" element={<ScrumPage />} />
          <Route path="/boards/:boardId/whiteboards" element={<WhiteboardListPage />} />
          <Route path="/boards/:boardId/whiteboards/:wbId" element={<WhiteboardEditorPage />} />
          <Route path="/boards/:boardId/diagrams" element={<DiagramListPage />} />
          <Route path="/boards/:boardId/diagrams/:dgId" element={<DiagramEditorPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/invites/:token" element={<AcceptInvitePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ChatWidget />
        <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </SignedIn>
      <SignedOut>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </SignedOut>
    </>
  );
}

function App() {
  const themeMode = useThemeStore((s) => s.mode);

  // Apply theme on mount and whenever mode changes
  useEffect(() => {
    applyTheme(themeMode);

    // For "system" mode, re-check every minute in case the hour changes
    if (themeMode === 'system') {
      const interval = setInterval(() => applyTheme(themeMode), 60_000);
      return () => clearInterval(interval);
    }
  }, [themeMode]);

  // Pick the Clerk appearance based on effective theme
  const clerkAppearance = useMemo(() => {
    const effective = getEffectiveTheme(themeMode);
    return effective === 'light' ? CLERK_LIGHT : CLERK_DARK;
  }, [themeMode]);

  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-root text-text-primary p-8">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold mb-4">Missing Clerk Key</h1>
          <p className="text-text-secondary text-sm mb-4">
            Set <code className="px-1.5 py-0.5 rounded bg-bg-surface text-accent text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> in your <code className="px-1.5 py-0.5 rounded bg-bg-surface text-accent text-xs">.env</code> file.
          </p>
          <p className="text-text-muted text-xs">Get your key from <span className="text-accent">dashboard.clerk.com</span></p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
