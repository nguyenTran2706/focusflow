import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { useAuthStore } from '../lib/auth-store';
import { api } from '../lib/api';

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '3 workspaces',
      '5 boards per workspace',
      'Basic Kanban board',
      'Email support',
    ],
    missing: [
      'AI task breakdown',
      'Real-time collaboration',
      'Priority support',
      'Custom labels & fields',
      'Advanced analytics',
    ],
    accent: '#6366f1',
    popular: false,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For professionals who need more',
    features: [
      'Unlimited workspaces',
      'Unlimited boards',
      'AI task breakdown',
      'Real-time collaboration',
      'Priority support',
      'Custom labels & fields',
    ],
    missing: [
      'Advanced analytics',
    ],
    accent: '#fbbf24',
    popular: true,
  },
  {
    key: 'PRO_MAX',
    name: 'Pro Max',
    price: '$29',
    period: '/month',
    description: 'Everything, unlimited',
    features: [
      'Everything in Pro',
      'Advanced analytics dashboard',
      'Dedicated support channel',
      'Custom integrations',
      'Team management tools',
      'Audit logs',
    ],
    missing: [],
    accent: '#34d399',
    popular: false,
  },
];

export function PricingPage() {
  const { isSignedIn } = useAuth();
  const dbUser = useAuthStore((s) => s.dbUser);
  const currentPlan = dbUser?.subscription ?? 'FREE';
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

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
      // silently fail
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
      // silently fail
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav title="Pricing" />
        <div className="flex-1 p-6 flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-[2rem] font-bold text-text-primary mb-3">
              Choose your plan
            </h1>
            <p className="text-text-secondary text-[0.95rem] max-w-[480px] mx-auto">
              Start free and scale as your team grows. Upgrade anytime to unlock powerful features.
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
                  className="relative flex flex-col rounded-2xl border p-6 transition-all duration-200 animate-fade-in"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    borderColor: plan.popular
                      ? 'rgba(251,191,36,0.35)'
                      : 'rgba(255,255,255,0.07)',
                    background: plan.popular
                      ? 'linear-gradient(160deg, rgba(251,191,36,0.06) 0%, rgba(30,30,34,1) 40%)'
                      : '#1e1e22',
                  }}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      Most Popular
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-6 mt-2">
                    <h3
                      className="text-[1.1rem] font-bold mb-1"
                      style={{ color: plan.accent }}
                    >
                      {plan.name}
                    </h3>
                    <p className="text-text-muted text-[0.8rem]">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-[2.5rem] font-bold text-text-primary leading-none">
                      {plan.price}
                    </span>
                    <span className="text-text-muted text-[0.85rem] ml-1">
                      {plan.period}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-3 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[0.85rem]">
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
                        <span className="text-text-primary">{f}</span>
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[0.85rem]">
                        <svg
                          className="mt-0.5 shrink-0"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#5c5d6a"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span className="text-text-muted line-through">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <button
                      className="w-full py-3 rounded-lg text-[0.85rem] font-semibold border transition-colors"
                      style={{
                        borderColor: 'rgba(255,255,255,0.1)',
                        color: '#9394a0',
                        cursor: currentPlan === 'FREE' ? 'default' : 'pointer',
                      }}
                      onClick={currentPlan !== 'FREE' ? handleManage : undefined}
                    >
                      {currentPlan === 'FREE' ? 'Current Plan' : 'Manage Subscription'}
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
                          Redirecting…
                        </span>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-text-muted text-[0.75rem] mt-8 text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
            All plans include a 14-day free trial. Cancel anytime. Prices in USD.
          </p>
        </div>
      </main>
    </div>
  );
}
