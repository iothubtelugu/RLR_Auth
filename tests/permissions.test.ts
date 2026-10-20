import { describe, it, expect } from 'vitest';
import { hasPermission } from '../src/lib/auth/session';
import { signToken, verifyToken } from '../src/lib/auth/jwt';

describe('Role-Based Authorization & Session Security', () => {
  it('enforces RBAC permissions appropriately across roles', () => {
    // ADMIN has all permissions
    expect(hasPermission('ADMIN', 'MANAGE_MEMBERS')).toBe(true);
    expect(hasPermission('ADMIN', 'CORRECT_ATTENDANCE')).toBe(true);
    expect(hasPermission('ADMIN', 'MANAGE_SETTINGS')).toBe(true);
    expect(hasPermission('ADMIN', 'MANAGE_DEVICES')).toBe(true);
    expect(hasPermission('ADMIN', 'VIEW_AUDIT_LOGS')).toBe(true);
    expect(hasPermission('ADMIN', 'SCAN_KIOSK')).toBe(true);

    // COORDINATOR can manage members, correct attendance, and scan kiosk, but cannot change system settings or devices
    expect(hasPermission('COORDINATOR', 'MANAGE_MEMBERS')).toBe(true);
    expect(hasPermission('COORDINATOR', 'CORRECT_ATTENDANCE')).toBe(true);
    expect(hasPermission('COORDINATOR', 'SCAN_KIOSK')).toBe(true);
    expect(hasPermission('COORDINATOR', 'MANAGE_SETTINGS')).toBe(false);
    expect(hasPermission('COORDINATOR', 'MANAGE_DEVICES')).toBe(false);

    // OPERATOR can only operate the entrance kiosk
    expect(hasPermission('OPERATOR', 'SCAN_KIOSK')).toBe(true);
    expect(hasPermission('OPERATOR', 'MANAGE_MEMBERS')).toBe(false);
    expect(hasPermission('OPERATOR', 'CORRECT_ATTENDANCE')).toBe(false);
    expect(hasPermission('OPERATOR', 'MANAGE_SETTINGS')).toBe(false);

    // MEMBER has zero admin permissions
    expect(hasPermission('MEMBER', 'MANAGE_MEMBERS')).toBe(false);
    expect(hasPermission('MEMBER', 'CORRECT_ATTENDANCE')).toBe(false);
    expect(hasPermission('MEMBER', 'MANAGE_SETTINGS')).toBe(false);
  });

  it('signs and verifies JWT authentication tokens securely', () => {
    const payload = {
      userId: 'usr-admin-01',
      username: 'admin',
      role: 'ADMIN' as const,
      fullName: 'Prof. S. R. Murthy',
    };

    const token = signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('usr-admin-01');
    expect(decoded?.username).toBe('admin');
    expect(decoded?.role).toBe('ADMIN');

    // Invalid token returns null safely without throwing uncaught exception
    expect(verifyToken('invalid.token.signature')).toBeNull();
  });
});
