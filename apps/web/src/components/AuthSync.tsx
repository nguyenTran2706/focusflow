import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { setTokenGetter, api } from '../lib/api';
import { useAuthStore, type UserProfile } from '../lib/auth-store';

export function AuthSync() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const setDbUser = useAuthStore((s) => s.setDbUser);

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
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
    };

    syncUser();
  }, [isLoaded, user, setDbUser]);

  return null;
}
