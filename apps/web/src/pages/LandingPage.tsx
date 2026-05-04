import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

const FEATURES = [
  { icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', key: 'kanban' },
  { icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', key: 'scrum' },
  { icon: 'M2 2h20v20H2zM7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z', key: 'whiteboards' },
  { icon: 'M6 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 18a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.5 8.5l7 7', key: 'diagrams' },
  { icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', key: 'ai' },
  { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', key: 'collaboration' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { t: tc, i18n } = useTranslation('common');
  const { t: tl } = useTranslation('landing');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <div className="min-h-screen bg-bg-root text-text-primary overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between gap-2 px-4 sm:px-6 md:px-8 py-4 sm:py-5 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#a855f7] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="text-[1.1rem] font-bold tracking-tight">FocusFlow</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Language switcher */}
          <div className="relative">
            <button
              className="px-3 py-2 rounded-md text-[0.85rem] font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors flex items-center gap-1.5"
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-label={tc('language.switchTo')}
            >
              <span>{currentLang.flag}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                <div className="absolute top-full right-0 mt-1 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`w-full text-left px-3 py-2 text-[0.8rem] font-medium flex items-center gap-2 rounded-md ${i18n.language === lang.code ? 'text-accent bg-accent-subtle' : 'text-text-primary hover:bg-white/10'}`}
                      onClick={() => { i18n.changeLanguage(lang.code); document.documentElement.lang = lang.code; setShowLangMenu(false); }}
                    >
                      <span>{lang.flag}</span> {lang.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            className="px-2 sm:px-4 py-2 rounded-md text-[0.8rem] sm:text-[0.85rem] font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors whitespace-nowrap"
            onClick={() => navigate('/sign-in')}
          >
            {tc('nav.signIn')}
          </button>
          <button
            className="px-3 sm:px-5 py-2 rounded-md text-[0.8rem] sm:text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors whitespace-nowrap"
            onClick={() => navigate('/sign-up')}
          >
            {tc('nav.getStarted')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pt-10 sm:pt-16 pb-12 sm:pb-20 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[0.75rem] font-medium mb-6">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            {tl('hero.badge')}
          </div>
          <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] font-bold leading-[1.1] mb-4 sm:mb-6 tracking-tight">
            {tl('hero.titleLine1')}
            <br />
            <span className="bg-gradient-to-r from-accent via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">
              {tl('hero.titleLine2')}
            </span>
          </h1>
          <p className="text-text-secondary text-[1.05rem] max-w-[560px] mx-auto mb-10 leading-relaxed">
            {tl('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <button
              className="px-6 sm:px-7 py-3.5 rounded-xl text-[0.95rem] font-semibold bg-gradient-to-r from-accent to-[#a855f7] text-white hover:brightness-110 transition-all shadow-lg shadow-accent/25"
              onClick={() => navigate('/sign-up')}
            >
              {tl('hero.cta')}
            </button>
            <button
              className="px-6 sm:px-7 py-3.5 rounded-xl text-[0.95rem] font-medium text-text-secondary border border-border-subtle hover:bg-white/[0.06] transition-colors"
              onClick={() => navigate('/pricing')}
            >
              {tc('actions.viewPlans')}
            </button>
          </div>
        </div>

        {/* Hero visual placeholder */}
        <div className="mt-10 sm:mt-16 mx-auto max-w-[900px] rounded-2xl border border-border-subtle bg-bg-card/50 p-1 shadow-2xl animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="rounded-xl bg-gradient-to-br from-bg-card to-bg-root p-3 sm:p-6 md:p-8 min-h-[240px] sm:min-h-[320px] flex items-center justify-center">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-[700px]">
              {(['kanbanDemo.todo', 'kanbanDemo.inProgress', 'kanbanDemo.review', 'kanbanDemo.done'] as const).map((colKey, i) => (
                <div key={colKey} className="flex flex-col gap-2 animate-fade-in" style={{ animationDelay: `${300 + i * 100}ms` }}>
                  <div className="text-[0.72rem] font-semibold text-text-muted uppercase tracking-wider mb-1">{tl(colKey)}</div>
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
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-14">
          <h2 className="text-[2rem] font-bold mb-3">{tl('features.heading')}</h2>
          <p className="text-text-secondary text-[0.95rem] max-w-[480px] mx-auto">
            {tl('features.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.key}
              className="bg-bg-card border border-border-subtle rounded-xl p-6 hover:bg-bg-card-hover hover:-translate-y-[2px] transition-all animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent-light mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <h3 className="text-[0.95rem] font-semibold text-text-primary mb-2">{tl(`features.${f.key}.title`)}</h3>
              <p className="text-text-secondary text-[0.825rem] leading-relaxed">{tl(`features.${f.key}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
        <div className="bg-gradient-to-br from-accent/10 via-bg-card to-[#a855f7]/10 border border-border-subtle rounded-2xl p-6 sm:p-8 md:p-12 text-center">
          <h2 className="text-[1.8rem] font-bold mb-3">{tl('cta.heading')}</h2>
          <p className="text-text-secondary text-[0.95rem] max-w-[420px] mx-auto mb-8">
            {tl('cta.subtitle')}
          </p>
          <button
            className="px-8 py-3.5 rounded-xl text-[0.95rem] font-semibold bg-accent text-white hover:bg-[#5558e6] transition-colors shadow-lg shadow-accent/20"
            onClick={() => navigate('/sign-up')}
          >
            {tl('cta.button')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6 sm:py-8 px-4 sm:px-6 md:px-8 max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-text-muted text-[0.8rem]">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-accent to-[#a855f7] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          {tc('footer.copyright', { year: new Date().getFullYear() })}
        </div>
        <div className="flex items-center gap-4 text-[0.8rem] text-text-muted">
          <button className="hover:text-text-primary transition-colors" onClick={() => navigate('/pricing')}>{tc('nav.pricing')}</button>
          <button className="hover:text-text-primary transition-colors" onClick={() => navigate('/sign-in')}>{tc('nav.signIn')}</button>
        </div>
      </footer>
    </div>
  );
}
