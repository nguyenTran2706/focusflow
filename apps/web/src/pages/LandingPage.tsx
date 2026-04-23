import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    title: 'Kanban Boards',
    description: 'Organize work visually with drag-and-drop cards, columns, and real-time updates.',
  },
  {
    icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    title: 'Scrum & Sprints',
    description: 'Plan sprints, track velocity, and manage backlogs with built-in Scrum tools.',
  },
  {
    icon: 'M2 2h20v20H2zM7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z',
    title: 'Whiteboards',
    description: 'Sketch ideas and brainstorm with collaborative infinite canvas whiteboards.',
  },
  {
    icon: 'M6 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 18a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.5 8.5l7 7',
    title: 'Diagrams',
    description: 'Create flowcharts, architecture diagrams, and user flows with React Flow.',
  },
  {
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    title: 'AI Chat Assistant',
    description: 'Break down tasks, get suggestions, and speed up planning with AI-powered chat.',
  },
  {
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    title: 'Team Collaboration',
    description: 'Invite members, assign tasks, and collaborate in real-time across workspaces.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-root text-text-primary overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#a855f7] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="text-[1.1rem] font-bold tracking-tight">FocusFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-md text-[0.85rem] font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
            onClick={() => navigate('/sign-in')}
          >
            Sign in
          </button>
          <button
            className="px-5 py-2 rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors"
            onClick={() => navigate('/sign-up')}
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-8 pt-16 pb-20 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[0.75rem] font-medium mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            Now with AI-powered task breakdown
          </div>
          <h1 className="text-[3rem] md:text-[3.5rem] font-bold leading-[1.1] mb-6 tracking-tight">
            Manage projects with
            <br />
            <span className="bg-gradient-to-r from-accent via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">
              clarity and speed
            </span>
          </h1>
          <p className="text-text-secondary text-[1.05rem] max-w-[560px] mx-auto mb-10 leading-relaxed">
            FocusFlow brings Kanban boards, Scrum sprints, whiteboards, diagrams, and AI together
            in one beautiful workspace — so your team can ship faster.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              className="px-7 py-3.5 rounded-xl text-[0.95rem] font-semibold bg-gradient-to-r from-accent to-[#a855f7] text-white hover:brightness-110 transition-all shadow-lg shadow-accent/25"
              onClick={() => navigate('/sign-up')}
            >
              Start Free — No Credit Card
            </button>
            <button
              className="px-7 py-3.5 rounded-xl text-[0.95rem] font-medium text-text-secondary border border-border-subtle hover:bg-white/[0.06] transition-colors"
              onClick={() => navigate('/pricing')}
            >
              View Pricing
            </button>
          </div>
        </div>

        {/* Hero visual placeholder */}
        <div className="mt-16 mx-auto max-w-[900px] rounded-2xl border border-border-subtle bg-bg-card/50 p-1 shadow-2xl animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="rounded-xl bg-gradient-to-br from-bg-card to-bg-root p-8 min-h-[320px] flex items-center justify-center">
            <div className="grid grid-cols-4 gap-3 w-full max-w-[700px]">
              {['To Do', 'In Progress', 'Review', 'Done'].map((col, i) => (
                <div key={col} className="flex flex-col gap-2 animate-fade-in" style={{ animationDelay: `${300 + i * 100}ms` }}>
                  <div className="text-[0.72rem] font-semibold text-text-muted uppercase tracking-wider mb-1">{col}</div>
                  {Array.from({ length: 3 - i }).map((_, j) => (
                    <div key={j} className="h-[52px] rounded-lg bg-white/[0.06] border border-border-subtle" />
                  ))}
                  {i === 3 && (
                    <>
                      <div className="h-[52px] rounded-lg bg-success/10 border border-success/20" />
                      <div className="h-[52px] rounded-lg bg-success/10 border border-success/20" />
                      <div className="h-[52px] rounded-lg bg-success/10 border border-success/20" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-[2rem] font-bold mb-3">Everything you need to ship</h2>
          <p className="text-text-secondary text-[0.95rem] max-w-[480px] mx-auto">
            From ideation to delivery — all the tools your team needs in one place.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="bg-bg-card border border-border-subtle rounded-xl p-6 hover:bg-bg-card-hover hover:-translate-y-[2px] transition-all animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent-light mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <h3 className="text-[0.95rem] font-semibold text-text-primary mb-2">{f.title}</h3>
              <p className="text-text-secondary text-[0.825rem] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-8 py-20">
        <div className="bg-gradient-to-br from-accent/10 via-bg-card to-[#a855f7]/10 border border-border-subtle rounded-2xl p-12 text-center">
          <h2 className="text-[1.8rem] font-bold mb-3">Ready to get focused?</h2>
          <p className="text-text-secondary text-[0.95rem] max-w-[420px] mx-auto mb-8">
            Join teams who ship faster with FocusFlow. Start free, upgrade when you're ready.
          </p>
          <button
            className="px-8 py-3.5 rounded-xl text-[0.95rem] font-semibold bg-accent text-white hover:bg-[#5558e6] transition-colors shadow-lg shadow-accent/20"
            onClick={() => navigate('/sign-up')}
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8 px-8 max-w-[1200px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-muted text-[0.8rem]">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-accent to-[#a855f7] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          © {new Date().getFullYear()} FocusFlow
        </div>
        <div className="flex items-center gap-4 text-[0.8rem] text-text-muted">
          <button className="hover:text-text-primary transition-colors" onClick={() => navigate('/pricing')}>Pricing</button>
          <button className="hover:text-text-primary transition-colors" onClick={() => navigate('/sign-in')}>Sign in</button>
        </div>
      </footer>
    </div>
  );
}
