import { describe, it, expect, beforeAll } from 'vitest';
import { seedDatabase } from '../src/lib/db/seed';
import { AttendanceService } from '../src/lib/attendance/service';
import { getDb } from '../src/lib/db';
import { Member } from '../src/lib/db/schema';

describe('Robotics Lab Attendance State Machine & Business Logic', () => {
  beforeAll(async () => {
    // Initialize clean database seed before running tests
    await seedDatabase();
  });

  it('records ENTRY for an authorized member who is outside', () => {
    // Sneha Patel (RLR-2024-005) is currently outside in the seed data
    const db = getDb();
    const beforeMember = db.prepare('SELECT * FROM members WHERE id = ?').get('RLR-2024-005') as Member;
    expect(beforeMember.is_inside).toBe(0);

    const result = AttendanceService.processScan({
      memberId: 'RLR-2024-005',
      verificationSource: 'FINGERPRINT_DEMO',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('ENTRY');
    expect(result.member?.isInside).toBe(true);

    const afterMember = db.prepare('SELECT * FROM members WHERE id = ?').get('RLR-2024-005') as Member;
    expect(afterMember.is_inside).toBe(1);
    expect(afterMember.current_session_id).not.toBeNull();
  });

  it('rejects a repeated scan within the duplicate cooldown window', () => {
    // Attempting an immediate scan for Sneha Patel (just scanned) should trigger cooldown rejection
    const cooldownResult = AttendanceService.processScan({
      memberId: 'RLR-2024-005',
      verificationSource: 'FINGERPRINT_DEMO',
    });

    expect(cooldownResult.success).toBe(false);
    expect(cooldownResult.errorCode).toBe('COOLDOWN');
    expect(cooldownResult.cooldownActive).toBe(true);
    expect(cooldownResult.message).toContain('Repeated scan detected');
  });

  it('records EXIT for an authorized member who is currently inside', () => {
    // Aarav Sharma (RLR-2024-001) is currently inside from the seed data
    const db = getDb();
    const beforeMember = db.prepare('SELECT * FROM members WHERE id = ?').get('RLR-2024-001') as Member;
    expect(beforeMember.is_inside).toBe(1);

    const result = AttendanceService.processScan({
      memberId: 'RLR-2024-001',
      verificationSource: 'FINGERPRINT_DEMO',
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('EXIT');
    expect(result.member?.isInside).toBe(false);

    const afterMember = db.prepare('SELECT * FROM members WHERE id = ?').get('RLR-2024-001') as Member;
    expect(afterMember.is_inside).toBe(0);
    expect(afterMember.current_session_id).toBeNull();
  });

  it('rejects an unregistered or unknown fingerprint credential', () => {
    const result = AttendanceService.processScan({
      credentialReference: 'FP-NON-EXISTENT-GUEST-000',
      verificationSource: 'FINGERPRINT_DEMO',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
    expect(result.message).toContain('not recognized');
  });

  it('denies lab entry to an INACTIVE member', () => {
    // Teja Prakash (RLR-2024-010) is INACTIVE
    const result = AttendanceService.processScan({
      memberId: 'RLR-2024-010',
      verificationSource: 'FINGERPRINT_DEMO',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INACTIVE');
    expect(result.message).toContain('Access Denied');
  });

  it('records manual exit by an administrator with full audit trail', () => {
    // Priya Varma (RLR-2024-002) is currently inside
    const db = getDb();
    const priya = db.prepare('SELECT * FROM members WHERE id = ?').get('RLR-2024-002') as Member;
    expect(priya.is_inside).toBe(1);

    const manualResult = AttendanceService.manualCorrection({
      memberId: 'RLR-2024-002',
      action: 'FORCE_EXIT',
      reason: 'Member left for lecture without scanning finger; verified by coordinator Aarav.',
      adminUserId: 'usr-admin-01',
      adminUsername: 'admin',
    });

    expect(manualResult.success).toBe(true);
    expect(manualResult.action).toBe('EXIT');
    expect(manualResult.member?.isInside).toBe(false);

    // Verify audit log entry exists
    const audit = db.prepare("SELECT * FROM audit_logs WHERE target_id = ? AND action = 'ATTENDANCE_CORRECTED'").get('RLR-2024-002') as any;
    expect(audit).toBeDefined();
    expect(audit.username).toBe('admin');
    expect(audit.details).toContain('Member left for lecture');
  });
});
