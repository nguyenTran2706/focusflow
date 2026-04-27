import { useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { setTokenGetter, api } from '../lib/api';
import { useAuthStore, type UserProfile } from '../lib/auth-store';

/**
 * Re-fetch the user profile from the API and update the store.
 * Callable externally (e.g. after a successful Stripe checkout).
 */
export async function refreshDbUser(): Promise<UserProfile | null> {
  try {
    const user = await api.get<UserProfile>('/auth/me');
    useAuthStore.getState().setDbUser(user);
    return user;
  } catch {
    return null;
  }
}

export function AuthSync() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const setDbUser = useAuthStore((s) => s.setDbUser);

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  const syncUser = useCallback(async () => {
    if (!user) return;
    try {
      await api.post('/auth/sync', {
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        name: user.fullName ?? user.firstName ?? 'User',
        imageUrl: user.imageUrl,
      });

      const dbUser = await api.get<UserProfile>('/auth/me');
      setDbUser(dbUser);
    } catch {
      // Sync failed - user may need to retry
    }
  }, [user, setDbUser]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    syncUser();
  }, [isLoaded, user, syncUser]);

  return null;
}
