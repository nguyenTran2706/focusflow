import { type ReactNode } from 'react';
import { useCan } from '../hooks/useCan';
import type { Action, Resource } from '../lib/permissions';

interface CanProps {
  action: Action;
  resource: Resource;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ action, resource, children, fallback = null }: CanProps) {
  const allowed = useCan(action, resource);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
