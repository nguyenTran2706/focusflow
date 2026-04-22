import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { AuthSync } from './components/AuthSync';
import { DashboardPage } from './pages/DashboardPage';
import { WorkspacePage, BoardPage } from './pages/BoardPage';
import { ProfilePage } from './pages/ProfilePage';
import { PricingPage } from './pages/PricingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ChatWidget } from './components/ChatWidget';
import { AdminPage } from './pages/AdminPage';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoutes() {
  return (
    <>
      <SignedIn>
        <AuthSync />
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ChatWidget />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function App() {
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
      appearance={{
        variables: {
          colorPrimary: '#6366f1',
          colorBackground: '#18181b',
          colorText: '#ececef',
          colorInputBackground: '#18181b',
          colorInputText: '#ececef',
          borderRadius: '8px',
        },
        elements: {
          formButtonPrimary: 'bg-accent hover:bg-[#5558e6]',
          card: 'bg-bg-surface border border-border-subtle shadow-xl',
          headerTitle: 'text-text-primary',
          headerSubtitle: 'text-text-secondary',
          socialButtonsBlockButton: 'border-border-subtle bg-bg-input text-text-primary hover:bg-bg-card',
          formFieldInput: 'border-border-subtle bg-bg-input text-text-primary',
          footerActionLink: 'text-accent hover:text-accent-light',
          identityPreviewEditButton: 'text-accent',
          userButtonPopoverCard: 'bg-[#1e1e22] border border-[#2a2a2e]',
          userButtonPopoverActionButton: 'text-[#ececef] hover:bg-[#2a2a2e]',
          userButtonPopoverActionButtonText: 'text-[#ececef]',
          userButtonPopoverActionButtonIcon: 'text-[#a0a0a8]',
          userButtonPopoverFooter: '[&]:bg-[#1e1e22] [&_span]:text-[#9394a0] [&_a]:text-[#818cf8]',
        },
      }}
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
