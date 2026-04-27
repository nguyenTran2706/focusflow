/**
 * Frontend permission helpers for role-based access control.
 *
 * IMPORTANT: The frontend hides UI; the backend MUST reject unauthorized
 * requests independently. Never rely solely on these checks for security.
 */

export type Role = 'owner' | 'admin' | 'editor' | 'viewer' | 'guest';
export type Resource = 'board' | 'diagram' | 'whiteboard' | 'workspace' | 'sprint' | 'user';
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'invite' | 'manage';

type PermissionMatrix = Record<Role, Partial<Record<Resource, Action[]>>>;

const PERMISSIONS: PermissionMatrix = {
  owner: {
    board: ['view', 'create', 'edit', 'delete', 'manage'],
    diagram: ['view', 'create', 'edit', 'delete'],
    whiteboard: ['view', 'create', 'edit', 'delete'],
    workspace: ['view', 'create', 'edit', 'delete', 'invite', 'manage'],
    sprint: ['view', 'create', 'edit', 'delete'],
    user: ['view', 'edit', 'delete', 'manage'],
  },
  admin: {
    board: ['view', 'create', 'edit', 'delete', 'manage'],
    diagram: ['view', 'create', 'edit', 'delete'],
    whiteboard: ['view', 'create', 'edit', 'delete'],
    workspace: ['view', 'edit', 'invite', 'manage'],
    sprint: ['view', 'create', 'edit', 'delete'],
    user: ['view', 'edit', 'manage'],
  },
  editor: {
    board: ['view', 'create', 'edit'],
    diagram: ['view', 'create', 'edit'],
    whiteboard: ['view', 'create', 'edit'],
    workspace: ['view'],
    sprint: ['view', 'create', 'edit'],
    user: ['view'],
  },
  viewer: {
    board: ['view'],
    diagram: ['view'],
    whiteboard: ['view'],
    workspace: ['view'],
    sprint: ['view'],
    user: ['view'],
  },
  guest: {
    board: ['view'],
    diagram: ['view'],
    whiteboard: ['view'],
    workspace: [],
    sprint: [],
    user: [],
  },
};

export function can(role: Role | string, action: Action, resource: Resource): boolean {
  const perms = PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms[resource]?.includes(action) ?? false;
}

export type Plan = 'FREE' | 'PRO' | 'PRO_MAX';

interface PlanLimits {
  maxDiagrams: number;
  maxWhiteboards: number;
  maxBoards: number;
  maxCollaborators: number;
  exportFormats: string[];
  versionHistoryDays: number;
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxDiagrams: 5,
    maxWhiteboards: 3,
    maxBoards: 3,
    maxCollaborators: 5,
    exportFormats: ['png'],
    versionHistoryDays: 7,
  },
  PRO: {
    maxDiagrams: Infinity,
    maxWhiteboards: Infinity,
    maxBoards: Infinity,
    maxCollaborators: 50,
    exportFormats: ['png', 'svg', 'pdf', 'json'],
    versionHistoryDays: Infinity,
  },
  PRO_MAX: {
    maxDiagrams: Infinity,
    maxWhiteboards: Infinity,
    maxBoards: Infinity,
    maxCollaborators: Infinity,
    exportFormats: ['png', 'svg', 'pdf', 'json'],
    versionHistoryDays: Infinity,
  },
};

export function getPlanLimits(plan: Plan | string): PlanLimits {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.FREE;
}

export function canExportFormat(plan: Plan | string, format: string): boolean {
  return getPlanLimits(plan).exportFormats.includes(format);
}
