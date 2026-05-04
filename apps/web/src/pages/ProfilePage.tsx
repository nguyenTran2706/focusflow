import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { useAuthStore, type UserProfile } from '../lib/auth-store';
import { refreshDbUser } from '../components/AuthSync';
import { api } from '../lib/api';

const SUB_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  FREE: { label: 'Free', color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  PRO: { label: 'Pro', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  PRO_MAX: { label: 'Pro Max', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
};

export function ProfilePage() {
  const { t } = useTranslation('profile');
  const { t: tc } = useTranslation('common');
  const { user: clerkUser } = useUser();
  const dbUser = useAuthStore((s) => s.dbUser);
  const setDbUser = useAuthStore((s) => s.setDbUser);
  const [searchParams, setSearchParams] = useSearchParams();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (!editing || uploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !clerkUser) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      await clerkUser.setProfileImage({ file });
      await clerkUser.reload();
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postal, setPostal] = useState('');
  const [country, setCountry] = useState('');

  // ── Post-checkout success handling ──────────────────────────────────────
  const checkoutHandled = useRef(false);

  useEffect(() => {
    if (searchParams.get('checkout') !== 'success' || checkoutHandled.current) return;
    checkoutHandled.current = true;

    // Clean up the URL
    setSearchParams({}, { replace: true });

    setCheckoutPending(true);
    toast.success('🎉 Payment successful! Activating your plan…');

    // Poll for the plan to update (webhook may take a moment)
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000;

    const poll = async () => {
      attempts++;
      const updated = await refreshDbUser();
      if (updated && updated.subscription !== 'FREE') {
        setCheckoutPending(false);
        toast.success(`Your ${SUB_LABELS[updated.subscription]?.label ?? updated.subscription} plan is now active!`);
        return;
      }
      if (attempts < maxAttempts) {
        setTimeout(poll, pollInterval);
      } else {
        setCheckoutPending(false);
        toast.info('Your plan will be updated shortly. Please refresh if needed.');
      }
    };

    // Start polling after a short delay to give the webhook time
    setTimeout(poll, 1500);
  }, [searchParams, setSearchParams]);

  // ── Form sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name ?? '');
      setPhone(dbUser.phone ?? '');
      setStreet(dbUser.addressStreet ?? '');
      setCity(dbUser.addressCity ?? '');
      setState(dbUser.addressState ?? '');
      setPostal(dbUser.addressPostal ?? '');
      setCountry(dbUser.addressCountry ?? '');
    }
  }, [dbUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<UserProfile>('/auth/profile', {
        name: name.trim(),
        phone: phone.trim(),
        addressStreet: street.trim(),
        addressCity: city.trim(),
        addressState: state.trim(),
        addressPostal: postal.trim(),
        addressCountry: country.trim(),
      });
      setDbUser({ ...dbUser!, ...updated });
      setEditing(false);
      toast.success(t('messages.updateSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messages.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (dbUser) {
      setName(dbUser.name ?? '');
      setPhone(dbUser.phone ?? '');
      setStreet(dbUser.addressStreet ?? '');
      setCity(dbUser.addressCity ?? '');
      setState(dbUser.addressState ?? '');
      setPostal(dbUser.addressPostal ?? '');
      setCountry(dbUser.addressCountry ?? '');
    }
  };

  const subInfo = SUB_LABELS[dbUser?.subscription ?? 'FREE'];
  const inputCls = (editable: boolean) =>
    `px-3 py-[9px] rounded-md border text-[0.875rem] transition-colors outline-none w-full ${
      editable
        ? 'border-border-subtle bg-bg-input text-text-primary focus:border-border-focus'
        : 'border-transparent bg-transparent text-text-primary cursor-default'
    }`;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-[var(--spacing-sidebar)] flex flex-col min-h-screen">
        <TopNav
          title={t('title')}
          actions={
            editing ? (
              <div className="flex items-center gap-2">
                <button className="px-4 py-[7px] rounded-md text-[0.85rem] font-medium text-text-secondary hover:bg-white/10 transition-colors" onClick={handleCancel}>{tc('actions.cancel')}</button>
                <button className="px-4 py-[7px] rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors disabled:opacity-50" onClick={handleSave} disabled={saving}>
                  {saving ? tc('actions.saving') : t('saveChanges')}
                </button>
              </div>
            ) : (
              <button className="px-4 py-[7px] rounded-md text-[0.85rem] font-medium bg-accent text-white hover:bg-[#5558e6] transition-colors" onClick={() => setEditing(true)}>
                <svg className="inline mr-1.5 -mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                {t('editProfile')}
              </button>
            )
          }
        />

        <div className="flex-1 p-3 sm:p-4 md:p-6 max-w-[720px]">
          {/* Checkout pending banner */}
          {checkoutPending && (
            <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border border-accent/30 bg-accent/5 animate-fade-in">
              <svg className="animate-spin-fast w-5 h-5 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="62" strokeDashoffset="20" />
              </svg>
              <span className="text-[0.85rem] text-text-secondary">Activating your subscription plan…</span>
            </div>
          )}

          {/* Avatar & Name Header */}
          <div className="flex items-center gap-5 mb-8 animate-fade-in">
            <div
              className={`relative w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-border-subtle shrink-0 group ${editing ? 'cursor-pointer' : ''}`}
              onClick={handleAvatarClick}
              role={editing ? 'button' : undefined}
              aria-label={editing ? 'Change profile photo' : undefined}
            >
              {clerkUser?.imageUrl ? (
                <img src={clerkUser.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-accent flex items-center justify-center text-[1.5rem] font-bold text-white">
                  {(dbUser?.name ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              {editing && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingAvatar ? (
                    <svg className="animate-spin-fast w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeDasharray="62" strokeDashoffset="20" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <h2 className="text-[1.25rem] font-semibold text-text-primary">{dbUser?.name ?? tc('actions.loading')}</h2>
              <p className="text-text-secondary text-[0.85rem]">{dbUser?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: subInfo?.color, background: subInfo?.bg }}>
                  {t('subscription.plan', { plan: subInfo?.label })}
                </span>
                {dbUser?.role === 'ADMIN' && (
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/10 text-warning">{tc('nav.admin')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <section className="bg-bg-card border border-border-subtle rounded-xl p-6 mb-6 animate-fade-in">
            <h3 className="text-[0.95rem] font-semibold text-text-primary mb-5 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              {t('personalInfo.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('personalInfo.fullName')}</label>
                <input className={inputCls(editing)} value={name} onChange={(e) => setName(e.target.value)} readOnly={!editing} placeholder={t('personalInfo.fullName')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('personalInfo.email')}</label>
                <input className={inputCls(false)} value={dbUser?.email ?? ''} readOnly title={t('personalInfo.managedByClerk')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('personalInfo.phone')}</label>
                <input className={inputCls(editing)} value={phone} onChange={(e) => setPhone(e.target.value)} readOnly={!editing} placeholder={t('personalInfo.phone')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('personalInfo.accountCreated')}</label>
                <input className={inputCls(false)} value={dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''} readOnly />
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="bg-bg-card border border-border-subtle rounded-xl p-6 mb-6 animate-fade-in" style={{ animationDelay: '60ms' }}>
            <h3 className="text-[0.95rem] font-semibold text-text-primary mb-5 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {t('address.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('address.street')}</label>
                <input className={inputCls(editing)} value={street} onChange={(e) => setStreet(e.target.value)} readOnly={!editing} placeholder="123 Main St" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('address.city')}</label>
                <input className={inputCls(editing)} value={city} onChange={(e) => setCity(e.target.value)} readOnly={!editing} placeholder={t('address.city')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('address.state')}</label>
                <input className={inputCls(editing)} value={state} onChange={(e) => setState(e.target.value)} readOnly={!editing} placeholder={t('address.state')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('address.postal')}</label>
                <input className={inputCls(editing)} value={postal} onChange={(e) => setPostal(e.target.value)} readOnly={!editing} placeholder="12345" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-semibold text-text-muted uppercase tracking-wider">{t('address.country')}</label>
                <input className={inputCls(editing)} value={country} onChange={(e) => setCountry(e.target.value)} readOnly={!editing} placeholder={t('address.country')} />
              </div>
            </div>
          </section>

          {/* Subscription */}
          <section className="bg-bg-card border border-border-subtle rounded-xl p-6 animate-fade-in" style={{ animationDelay: '120ms' }}>
            <h3 className="text-[0.95rem] font-semibold text-text-primary mb-5 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
              {t('subscription.title')}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary font-medium">{t('subscription.plan', { plan: subInfo?.label })}</p>
                <p className="text-text-muted text-[0.8rem] mt-1">
                  {dbUser?.subscription === 'FREE' ? t('subscription.free') :
                   dbUser?.subscription === 'PRO' ? t('subscription.pro') :
                   t('subscription.proMax')}
                </p>
              </div>
              <a href="/pricing" className="px-4 py-[7px] rounded-md text-[0.85rem] font-medium border border-accent text-accent hover:bg-accent hover:text-white transition-colors">
                {dbUser?.subscription === 'FREE' ? t('subscription.upgrade') : t('subscription.manage')}
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
