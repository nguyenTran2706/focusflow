import { can, type Action, type Resource } from '../lib/permissions';
import { useAuthStore } from '../lib/auth-store';

export function useCan(action: Action, resource: Resource): boolean {
  const role = useAuthStore((s) => s.dbUser?.role ?? 'guest');
  return can(role, action, resource);
}
