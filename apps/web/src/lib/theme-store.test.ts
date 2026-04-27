import { describe, it, expect, vi } from 'vitest';
import { resolveSystemTheme, getEffectiveTheme } from './theme-store';

describe('resolveSystemTheme()', () => {
  it('should return light during daytime hours (6-18)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T12:00:00'));

    expect(resolveSystemTheme()).toBe('light');

    vi.useRealTimers();
  });

  it('should return dark during nighttime hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T22:00:00'));

    expect(resolveSystemTheme()).toBe('dark');

    vi.useRealTimers();
  });

  it('should return dark at midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T00:00:00'));

    expect(resolveSystemTheme()).toBe('dark');

    vi.useRealTimers();
  });

  it('should return light at 6 AM exactly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T06:00:00'));

    expect(resolveSystemTheme()).toBe('light');

    vi.useRealTimers();
  });

  it('should return dark at 5:59 AM', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T05:59:00'));

    expect(resolveSystemTheme()).toBe('dark');

    vi.useRealTimers();
  });
});

describe('getEffectiveTheme()', () => {
  it('should return light for light mode', () => {
    expect(getEffectiveTheme('light')).toBe('light');
  });

  it('should return dark for dark mode', () => {
    expect(getEffectiveTheme('dark')).toBe('dark');
  });

  it('should resolve system mode based on time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T14:00:00'));

    expect(getEffectiveTheme('system')).toBe('light');

    vi.setSystemTime(new Date('2026-04-27T23:00:00'));
    expect(getEffectiveTheme('system')).toBe('dark');

    vi.useRealTimers();
  });
});
