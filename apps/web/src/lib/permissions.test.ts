import { describe, it, expect } from 'vitest';
import { can, getPlanLimits, canExportFormat } from './permissions';
import type { Resource } from './permissions';

describe('can()', () => {
  describe('owner role', () => {
    it('should have full access to all resources', () => {
      const resources: Resource[] = ['board', 'diagram', 'whiteboard', 'workspace', 'sprint', 'user'];
      for (const resource of resources) {
        expect(can('owner', 'view', resource)).toBe(true);
      }
    });

    it('should be able to delete workspaces', () => {
      expect(can('owner', 'delete', 'workspace')).toBe(true);
    });

    it('should be able to manage users', () => {
      expect(can('owner', 'manage', 'user')).toBe(true);
    });

    it('should be able to invite to workspace', () => {
      expect(can('owner', 'invite', 'workspace')).toBe(true);
    });
  });

  describe('admin role', () => {
    it('should be able to manage boards', () => {
      expect(can('admin', 'create', 'board')).toBe(true);
      expect(can('admin', 'edit', 'board')).toBe(true);
      expect(can('admin', 'delete', 'board')).toBe(true);
    });

    it('should be able to invite to workspace', () => {
      expect(can('admin', 'invite', 'workspace')).toBe(true);
    });

    it('should NOT be able to create workspaces', () => {
      expect(can('admin', 'create', 'workspace')).toBe(false);
    });

    it('should NOT be able to delete workspaces', () => {
      expect(can('admin', 'delete', 'workspace')).toBe(false);
    });
  });

  describe('editor role', () => {
    it('should be able to create and edit boards', () => {
      expect(can('editor', 'create', 'board')).toBe(true);
      expect(can('editor', 'edit', 'board')).toBe(true);
    });

    it('should NOT be able to delete boards', () => {
      expect(can('editor', 'delete', 'board')).toBe(false);
    });

    it('should NOT be able to invite members', () => {
      expect(can('editor', 'invite', 'workspace')).toBe(false);
    });
  });

  describe('viewer role', () => {
    it('should only be able to view', () => {
      const resources: Resource[] = ['board', 'diagram', 'whiteboard', 'workspace', 'sprint', 'user'];
      for (const resource of resources) {
        expect(can('viewer', 'view', resource)).toBe(true);
        expect(can('viewer', 'create', resource)).toBe(false);
        expect(can('viewer', 'edit', resource)).toBe(false);
        expect(can('viewer', 'delete', resource)).toBe(false);
      }
    });
  });

  describe('guest role', () => {
    it('should be able to view boards, diagrams, whiteboards', () => {
      expect(can('guest', 'view', 'board')).toBe(true);
      expect(can('guest', 'view', 'diagram')).toBe(true);
      expect(can('guest', 'view', 'whiteboard')).toBe(true);
    });

    it('should NOT have workspace access', () => {
      expect(can('guest', 'view', 'workspace')).toBe(false);
    });
  });

  describe('unknown role', () => {
    it('should deny all access', () => {
      expect(can('unknown', 'view', 'board')).toBe(false);
    });
  });
});

describe('getPlanLimits()', () => {
  it('should return correct FREE limits', () => {
    const limits = getPlanLimits('FREE');
    expect(limits.maxBoards).toBe(3);
    expect(limits.maxDiagrams).toBe(5);
    expect(limits.maxWhiteboards).toBe(3);
    expect(limits.maxCollaborators).toBe(5);
    expect(limits.exportFormats).toEqual(['png']);
    expect(limits.versionHistoryDays).toBe(7);
  });

  it('should return correct PRO limits', () => {
    const limits = getPlanLimits('PRO');
    expect(limits.maxBoards).toBe(Infinity);
    expect(limits.maxCollaborators).toBe(50);
    expect(limits.exportFormats).toContain('svg');
    expect(limits.exportFormats).toContain('pdf');
  });

  it('should return correct PRO_MAX limits', () => {
    const limits = getPlanLimits('PRO_MAX');
    expect(limits.maxCollaborators).toBe(Infinity);
    expect(limits.versionHistoryDays).toBe(Infinity);
  });

  it('should default to FREE for unknown plans', () => {
    const limits = getPlanLimits('UNKNOWN');
    expect(limits.maxBoards).toBe(3);
  });
});

describe('canExportFormat()', () => {
  it('should allow png for FREE', () => {
    expect(canExportFormat('FREE', 'png')).toBe(true);
  });

  it('should deny svg for FREE', () => {
    expect(canExportFormat('FREE', 'svg')).toBe(false);
  });

  it('should allow all formats for PRO', () => {
    expect(canExportFormat('PRO', 'png')).toBe(true);
    expect(canExportFormat('PRO', 'svg')).toBe(true);
    expect(canExportFormat('PRO', 'pdf')).toBe(true);
    expect(canExportFormat('PRO', 'json')).toBe(true);
  });
});
