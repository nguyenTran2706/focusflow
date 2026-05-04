import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { useAuthStore } from '../lib/auth-store';
import { api } from '../lib/api';

const PLANS = [
  {
    key: 'FREE',
    nameKey: 'plans.free.name',
    priceKey: 'plans.free.price',
    periodKey: 'plans.free.period',
    descKey: 'plans.free.description',
    featureKeys: ['features.workspaces3', 'features.boards5', 'features.basicKanban', 'features.emailSupport'],
    missingKeys: ['features.aiTaskBreakdown', 'features.realtimeCollab', 'features.prioritySupport', 'features.customLabels', 'features.advancedAnalytics'],
    accent: '#6366f1',
    popular: false,
  },
  {
    key: 'PRO',
    nameKey: 'plans.pro.name',
    priceKey: 'plans.pro.price',
    periodKey: 'plans.pro.period',
    descKey: 'plans.pro.description',
    featureKeys: ['features.unlimitedWorkspaces', 'features.unlimitedBoards', 'features.aiTaskBreakdown', 'features.realtimeCollab', 'features.prioritySupport', 'features.customLabels'],
    missingKeys: ['features.advancedAnalytics'],
    accent: '#fbbf24',
    popular: true,
  },
  {
    key: 'PRO_MAX',
    nameKey: 'plans.proMax.name',
    priceKey: 'plans.proMax.price',
    periodKey: 'plans.proMax.period',
    descKey: 'plans.proMax.description',
    featureKeys: ['features.everythingInPro', 'features.analyticsDashboard', 'features.dedicatedSupport', 'features.customIntegrations', 'features.teamManagement', 'features.auditLogs'],
    missingKeys: [] as string[],
    accent: '#34d399',
    popular: false,
  },
];

export function PricingPage() {
  const { t } = useTranslation('pricing');
  const { t: te } = useTranslation('errors');
  const { isSignedIn } = useAuth();
  const dbUser = useAuthStore((s) => s.dbUser);
  const currentPlan = dbUser?.subscription ?? 'FREE';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('checkout') === 'cancelled') {
      setSearchParams({}, { replace: true });
      toast.info('Checkout cancelled. Your plan was not changed.');
    }
  }, [searchParams, setSearchParams]);

  const handleUpgrade = async (planKey: string) => {
    if (!isSignedIn) return;

    const priceMap: Record<string, string | undefined> = {
      PRO: import.meta.env.VITE_STRIPE_PRICE_ID_PRO,
      PRO_MAX: import.meta.env.VITE_STRIPE_PRICE_ID_PRO_MAX,
    };
    const priceId = priceMap[planKey];
    if (!priceId) return;

    setLoadingPlan(planKey);
    try {
      const res = await api.post<{ url: string }>('/stripe/checkout', { priceId });
      if (res.url) window.location.href = res.url;
    } catch {
      toast.error(te('generic'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManage = async () => {
    setLoadingPlan('manage');
    try {
      const res = await api.post<{ url: string }>('/stripe/portal');
      if (res.url) window.location.href = res.url;
    } catch {
      toast.error(te('generic'));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav title={t('title')} />
        <div className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-[2rem] font-bold text-text-primary mb-3">
              {t('heading')}
            </h1>
            <p className="text-text-secondary text-[0.95rem] max-w-[480px] mx-auto">
              {t('subtitle')}
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[960px] w-full">
            {PLANS.map((plan, i) => {
              const isCurrent = currentPlan === plan.key;
              const isDowngrade =
                (currentPlan === 'PRO_MAX' && plan.key !== 'PRO_MAX') ||
                (currentPlan === 'PRO' && plan.key === 'FREE');

              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 animate-fade-in ${
                    plan.popular
                      ? 'border-warning/35 bg-bg-card'
                      : 'border-border-subtle bg-bg-card'
                  }`}
                  style={{
                    animationDelay: `${i * 80}ms`,
                    ...(plan.popular && {
                      backgroundImage: 'linear-gradient(160deg, rgba(251,191,36,0.08) 0%, transparent 40%)',
                    }),
                  }}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      {t('badges.mostPopular')}
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-6 mt-2">
                    <h3
                      className="text-[1.1rem] font-bold mb-1"
                      style={{ color: plan.accent }}
                    >
                      {t(plan.nameKey)}
                    </h3>
                    <p className="text-text-muted text-[0.8rem]">{t(plan.descKey)}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-[2.5rem] font-bold text-text-primary leading-none">
                      {t(plan.priceKey)}
                    </span>
                    <span className="text-text-muted text-[0.85rem] ml-1">
                      {t(plan.periodKey)}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-3 mb-6">
                    {plan.featureKeys.map((fk) => (
                      <li key={fk} className="flex items-start gap-2.5 text-[0.85rem]">
                        <svg
                          className="mt-0.5 shrink-0"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={plan.accent}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-text-primary">{t(fk)}</span>
                      </li>
                    ))}
                    {plan.missingKeys.map((fk) => (
                      <li key={fk} className="flex items-start gap-2.5 text-[0.85rem]">
                        <svg
                          className="mt-0.5 shrink-0 text-text-muted"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span className="text-text-muted line-through">{t(fk)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <button
                      className="w-full py-3 rounded-lg text-[0.85rem] font-semibold border border-border-subtle text-text-secondary transition-colors hover:bg-bg-card-hover"
                      style={{ cursor: currentPlan === 'FREE' ? 'default' : 'pointer' }}
                      onClick={currentPlan !== 'FREE' ? handleManage : undefined}
                    >
                      {currentPlan === 'FREE' ? t('badges.currentPlan') : t('cta.manageSubscription')}
                    </button>
                  ) : isDowngrade ? (
                    <button
                      className="w-full py-3 rounded-lg text-[0.85rem] font-semibold border border-border-subtle text-text-muted cursor-default"
                    >
                      —
                    </button>
                  ) : (
                    <button
                      className="w-full py-3 rounded-lg text-[0.85rem] font-semibold transition-all duration-200 hover:brightness-110 disabled:opacity-50"
                      style={{
                        background: plan.popular
                          ? `linear-gradient(135deg, ${plan.accent}, #e09100)`
                          : plan.accent,
                        color: plan.popular ? '#1a1a1a' : '#fff',
                      }}
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={loadingPlan === plan.key}
                    >
                      {loadingPlan === plan.key ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="animate-spin-fast w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <circle cx="12" cy="12" r="10" strokeDasharray="62" strokeDashoffset="20" />
                          </svg>
                          {t('cta.redirecting')}
                        </span>
                      ) : (
                        t('cta.upgrade', { plan: t(plan.nameKey) })
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-text-muted text-[0.75rem] mt-8 text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
            {t('footer')}
          </p>
        </div>
      </main>
    </div>
  );
}
